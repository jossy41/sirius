import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Field, controlClassName } from "@/components/ui/field";
import {
  getRevisionSession,
  putRevisionSession,
  putRevisionSchedule,
  putRevisionHistory,
  listRevisionSchedules,
  listMasteryAssessments,
  listMisconceptions,
  listDocuments,
  putAnswerEvaluation,
  putAttempt,
  listLearningQuestions,
  putLearningQuestions,
} from "@/lib/offline/database";
import { loadDocumentDetail } from "@/lib/documents/import";
import { buildPracticeSession, evaluateStudentAnswer } from "@/lib/learning/engine";
import { applyReviewOutcome, isOverdue } from "@/lib/revision/scheduler";
import { completeRevisionSession } from "@/lib/revision/session";
import type { RevisionSession } from "@/lib/revision/types";
import type { AnswerEvaluation, LearningQuestion } from "@/lib/learning/types";

export function RevisionSessionPage() {
  const params = useParams({ strict: false }) as { sessionId?: string };
  const sessionId = params.sessionId;
  const [session, setSession] = useState<RevisionSession | null>(null);
  const [questions, setQuestions] = useState<LearningQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    const s = await getRevisionSession(sessionId);
    setSession(s ?? null);
    if (!s) return;
    if (s.questionIds.length > 0) {
      const all = await listLearningQuestions();
      setQuestions(all.filter((q) => s.questionIds.includes(q.id)));
      return;
    }
    // 1) Reuse existing practice questions matching topic/objective (no document required)
    const allQs = await listLearningQuestions();
    const topic = (s.topicLabel || "").toLowerCase();
    const obj = s.objectiveId || "";
    const matched = allQs.filter((q) => {
      if (obj && !obj.startsWith("topic:") && q.objectiveId === obj) return true;
      if (topic && (q.topic || "").toLowerCase().includes(topic)) return true;
      if (obj.startsWith("topic:") && (q.topic || "").toLowerCase().includes(obj.slice(6).toLowerCase())) return true;
      return false;
    }).slice(0, 3);
    if (matched.length > 0) {
      const updated = { ...s, questionIds: matched.map((q) => q.id), documentId: matched[0]?.documentId ?? s.documentId };
      await putRevisionSession(updated);
      setSession(updated);
      setQuestions(matched);
      return;
    }
    // 2) Generate from a document only if one is linked or clearly relevant
    const docs = await listDocuments();
    const readyDocs = docs.filter((d) => d.status === "ready");
    let chosen = s.documentId ? readyDocs.find((d) => d.id === s.documentId) : undefined;
    if (!chosen && topic) {
      chosen = readyDocs.find((d) =>
        (d.name || "").toLowerCase().includes(topic) ||
        (d.curriculum?.topicCode || "").toLowerCase().includes(topic) ||
        (d.curriculum?.subjectCode || "").toLowerCase().includes(topic),
      );
    }
    if (!chosen) {
      setError(
        matched.length === 0 && readyDocs.length === 0
          ? "No practice questions or offline documents are available for this objective yet. Complete a practice session on this topic first, or import a relevant document."
          : "No practice questions match this objective, and no clearly related offline document was found. Open Practice with a document on this topic, or import a relevant PDF with selectable text.",
      );
      return;
    }
    try {
      const detail = await loadDocumentDetail(chosen.id);
      if (!detail?.content) {
        setError("Document content is not available offline.");
        return;
      }
      const built = await buildPracticeSession(detail.meta, detail.content, {
        topic: s.topicLabel || s.objectiveId,
        count: 2,
      });
      if (!built.ok) {
        setError(built.message);
        return;
      }
      await putLearningQuestions(built.questions);
      const updated = {
        ...s,
        documentId: chosen.id,
        questionIds: built.questions.map((q) => q.id),
      };
      await putRevisionSession(updated);
      setSession(updated);
      setQuestions(built.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start revision activity.");
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    const q = questions[index];
    if (!q || !session) return;
    setBusy(true);
    setError(null);
    try {
      const ev = await evaluateStudentAnswer(q, answer);
      await putAnswerEvaluation(ev);
      const attemptId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? `at_${crypto.randomUUID()}`
          : `at_${Date.now()}`;
      await putAttempt({
        id: attemptId,
        sessionId: null,
        questionId: q.id,
        documentId: q.documentId,
        studentAnswer: answer,
        evaluationId: ev.id,
        correctness: ev.correctness,
        topicLabel: q.topic ?? session.topicLabel,
        createdAt: new Date().toISOString(),
      });
      setEvaluation(ev);

      const [schedules, mastery, mcs] = await Promise.all([
        listRevisionSchedules(),
        listMasteryAssessments(),
        listMisconceptions(),
      ]);
      const existing = schedules.find((s) => s.id === session.scheduleId) ?? null;
      const m =
        mastery.find(
          (x) =>
            x.objectiveId === session.objectiveId &&
            (x.packId ?? null) === (session.packId ?? null),
        ) ?? null;
      const nextSched = applyReviewOutcome({
        existing,
        objectiveId: session.objectiveId,
        packId: session.packId,
        topicLabel: session.topicLabel,
        conceptId: m?.conceptId ?? null,
        mastery: m,
        misconceptions: mcs,
        correctness: ev.correctness,
      });
      await putRevisionSchedule(nextSched);
      await putRevisionHistory({
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? `rh_${crypto.randomUUID()}`
            : `rh_${Date.now()}`,
        scheduleId: nextSched.id,
        objectiveId: session.objectiveId,
        packId: session.packId,
        topicLabel: session.topicLabel,
        activityType: session.activityType,
        reviewedAt: new Date().toISOString(),
        wasOverdue: existing ? isOverdue(existing) : false,
        previousScheduledAt: existing?.nextReviewAt ?? null,
        nextScheduledAt: nextSched.nextReviewAt,
        outcome: "completed",
        evaluationCorrectness: ev.correctness,
        evaluationId: ev.id,
        attemptId,
        sessionId: session.id,
        note: null,
      });

      if (index >= questions.length - 1) {
        const completed = completeRevisionSession(session, {
          evaluationId: ev.id,
          correctness: ev.correctness,
        });
        await putRevisionSession(completed);
        setSession(completed);
        setDoneMessage(
          `Session complete. Next review around ${nextSched.nextReviewAt.slice(0, 10)}. ${nextSched.reason}`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-muted">Session not found.</p>
        <Link to="/revision" className="text-primary underline">
          Back to revision
        </Link>
      </div>
    );
  }

  const q = questions[index];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-24">
      <header className="space-y-2">
        <p className="text-sm text-muted">
          <Link to="/revision" className="underline">
            Revision
          </Link>
        </p>
        <h1 className="font-serif text-3xl text-ink">Revision session</h1>
        <p className="text-sm text-muted">{session.reason}</p>
        <p className="text-xs text-muted">
          {session.topicLabel || session.objectiveId} · {session.activityType.replace(/_/g, " ")}
        </p>
      </header>

      {error && <Panel className="border-rose-500/40 bg-rose-500/5 text-sm">{error}</Panel>}
      {doneMessage && (
        <Panel className="space-y-2">
          <p className="text-sm text-ink">{doneMessage}</p>
          <Link to="/revision" className="text-primary underline text-sm">
            Return to today&apos;s plan
          </Link>
        </Panel>
      )}

      {q && session.status === "active" && (
        <Panel className="space-y-3">
          <p className="text-xs text-muted">
            Question {index + 1} of {questions.length || 1}
          </p>
          <p className="text-ink">{q.text}</p>
          {q.sourceExcerpts?.[0] && (
            <p className="text-xs text-muted">
              Source pp. {q.sourceExcerpts[0].pageStart}–{q.sourceExcerpts[0].pageEnd}
            </p>
          )}
          <Field label="Your answer" htmlFor="revision-answer">
            <textarea id="revision-answer"
              className={controlClassName}
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </Field>
          <Button type="button" variant="primary" disabled={busy || !answer.trim()} onClick={() => void submit()}>
            {busy ? "Checking…" : "Submit"}
          </Button>
          {evaluation && (
            <div className="rounded-md border border-line p-3 text-sm">
              <p className="font-medium text-ink">{evaluation.correctness}</p>
              <p className="mt-1 text-muted">{evaluation.explanation}</p>
              {index < questions.length - 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-2"
                  onClick={() => {
                    setIndex((i) => i + 1);
                    setAnswer("");
                    setEvaluation(null);
                  }}
                >
                  Next question
                </Button>
              )}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
