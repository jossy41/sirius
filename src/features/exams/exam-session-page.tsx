import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Field, controlClassName } from "@/components/ui/field";
import {
  getExamSession,
  putExamSession,
  getExamDefinition,
  putExamResult,
  putAnswerEvaluation,
  putAttempt,
} from "@/lib/offline/database";
import {
  startExamSession,
  remainingSeconds,
  saveAnswer,
  submitExamSession,
} from "@/lib/examination/engine";
import { evaluateExamSession, examEvidenceProvenanceKey } from "@/lib/examination/evaluate";
import type { ExamSession } from "@/lib/examination/types";

export function ExamSessionPage() {
  const params = useParams({ strict: false }) as { examId?: string };
  const examId = params.examId;
  const navigate = useNavigate();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [left, setLeft] = useState(0);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(async (s: ExamSession) => {
    await putExamSession(s);
    setSession(s);
  }, []);

  const load = useCallback(async () => {
    if (!examId) return;
    let s = await getExamSession(examId);
    if (!s) return;
    if (s.status === "ready") {
      s = startExamSession(s);
      await putExamSession(s);
    }
    setSession(s);
    const snap = s.questionSnapshots[s.currentIndex];
    setAnswer(snap ? s.answers[snap.id] ?? "" : "");
    setLeft(remainingSeconds(s));
  }, [examId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!session || session.status !== "in_progress") return;
    const t = setInterval(() => {
      const rem = remainingSeconds(session);
      setLeft(rem);
      if (rem <= 0) {
        void autoSubmit();
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.endsAt, session?.status]);

  async function autoSubmit() {
    if (!session || session.status === "submitted" || session.status === "evaluated") return;
    await finish(session);
  }

  async function saveCurrent() {
    if (!session) return;
    const snap = session.questionSnapshots[session.currentIndex];
    if (!snap) return;
    const next = saveAnswer(session, snap.id, answer);
    await persist(next);
  }

  async function goTo(i: number) {
    if (!session) return;
    const snap = session.questionSnapshots[session.currentIndex];
    let s = session;
    if (snap) s = saveAnswer(session, snap.id, answer);
    s = { ...s, currentIndex: i, updatedAt: new Date().toISOString() };
    await persist(s);
    const n = s.questionSnapshots[i];
    setAnswer(n ? s.answers[n.id] ?? "" : "");
  }

  async function finish(s: ExamSession) {
    setBusy(true);
    setError(null);
    try {
      const snap = s.questionSnapshots[s.currentIndex];
      let cur = snap ? saveAnswer(s, snap.id, answer) : s;
      cur = submitExamSession(cur);
      await putExamSession(cur);
      const def = await getExamDefinition(cur.examId);
      if (!def) {
        setError("Exam definition missing.");
        return;
      }
      const { result, evaluations } = await evaluateExamSession({ session: cur, definition: def });
      for (const ev of evaluations) {
        await putAnswerEvaluation(ev);
      }
      // One attempt per question — provenance via exam session + snapshot
      for (const qr of result.questionResults) {
        const snapQ = cur.questionSnapshots.find((x) => x.id === qr.snapshotId);
        await putAttempt({
          id: examEvidenceProvenanceKey(cur.id, qr.snapshotId),
          sessionId: cur.id,
          questionId: qr.questionId,
          documentId: snapQ?.documentId ?? "exam",
          studentAnswer: cur.answers[qr.snapshotId] ?? "",
          evaluationId: qr.evaluationId ?? "",
          correctness: qr.correctness,
          topicLabel: qr.topicLabel,
          createdAt: result.submittedAt,
        });
      }
      await putExamResult(result);
      cur = { ...cur, status: "evaluated", updatedAt: new Date().toISOString() };
      await putExamSession(cur);
      setSession(cur);
      void navigate({ to: "/exams/results/$examId", params: { examId: cur.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-muted">Session not found.</p>
        <Link to={"/exams" as any} className="underline text-primary">
          Exams
        </Link>
      </div>
    );
  }

  const snap = session.questionSnapshots[session.currentIndex];
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted">
            <Link to={"/exams" as any} className="underline">
              Exams
            </Link>
          </p>
          <h1 className="font-serif text-2xl text-ink">Assessment</h1>
        </div>
        <div className="rounded-md border border-line px-3 py-1 font-mono text-lg tabular-nums">
          {mm}:{ss}
        </div>
      </header>

      {error && <Panel className="text-sm text-rose-700">{error}</Panel>}

      <div className="flex flex-wrap gap-1">
        {session.questionSnapshots.map((q, i) => (
          <button
            key={q.id}
            type="button"
            className={`size-8 rounded text-xs ${
              i === session.currentIndex
                ? "bg-primary text-white"
                : session.answerStatus[q.id] === "answered"
                  ? "bg-emerald-500/20"
                  : "border border-line"
            }`}
            onClick={() => void goTo(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {snap && (
        <Panel className="space-y-3">
          <p className="text-xs text-muted">
            {snap.marks} mark{snap.marks === 1 ? "" : "s"} · {snap.type.replace(/_/g, " ")} ·{" "}
            {snap.difficulty}
          </p>
          <p className="text-ink">{snap.text}</p>
          {snap.sourceExcerpts[0] && (
            <p className="text-xs text-muted">
              Source pp. {snap.sourceExcerpts[0].pageStart}–{snap.sourceExcerpts[0].pageEnd}
            </p>
          )}
          {snap.choices ? (
            <div className="space-y-2">
              {snap.choices.map((c, i) => (
                <label key={i} className="flex gap-2 text-sm">
                  <input
                    type="radio"
                    name="choice"
                    checked={answer === String(i)}
                    onChange={() => setAnswer(String(i))}
                  />
                  {c}
                </label>
              ))}
            </div>
          ) : (
            <Field label="Answer" htmlFor="exam-ans">
              <textarea
                id="exam-ans"
                className={controlClassName}
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </Field>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void saveCurrent()}>
              Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={session.currentIndex <= 0}
              onClick={() => void goTo(session.currentIndex - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={session.currentIndex >= session.questionSnapshots.length - 1}
              onClick={() => void goTo(session.currentIndex + 1)}
            >
              Next
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => void finish(session)}
            >
              {busy ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
