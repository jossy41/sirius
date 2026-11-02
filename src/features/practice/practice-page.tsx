import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Field, controlClassName } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { useLocalLibrary } from "@/lib/offline/use-local-library";
import { loadDocumentDetail } from "@/lib/documents/import";
import { buildPracticeSession, diagnoseAnswer, evaluateStudentAnswer, runFeynman } from "@/lib/learning/engine";
import type {
  AnswerEvaluation,
  FeynmanSession,
  LearningQuestion,
  PracticeSession,
} from "@/lib/learning/types";
import {
  listAttempts,
  listAnswerEvaluations,
  listFeynmanSessions,
  listMisconceptions,
  listPracticeSessions,
  putAnswerEvaluation,
  putAttempt,
  putFeynmanSession,
  putLearningQuestions,
  putMisconception,
  putPracticeSession,
} from "@/lib/offline/database";
import {
  findMatchingMisconception,
  mergeMisconceptionEvidence,
} from "@/lib/learning/misconceptions";
import { useEffect } from "react";

export function PracticePage() {
  const library = useLocalLibrary();
  const readyDocs = useMemo(
    () => library.documents.filter((d) => d.status === "ready"),
    [library.documents],
  );

  const [documentId, setDocumentId] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [questions, setQuestions] = useState<LearningQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);

  const [feynmanTopic, setFeynmanTopic] = useState("");
  const [feynmanText, setFeynmanText] = useState("");
  const [feynmanResult, setFeynmanResult] = useState<FeynmanSession | null>(null);

  const [historySessions, setHistorySessions] = useState<PracticeSession[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    void Promise.all([listPracticeSessions(), listAttempts(), listFeynmanSessions()]).then(
      ([sessions, attempts]) => {
        setHistorySessions(sessions);
        setAttemptCount(attempts.length);
      },
    );
  }, [session, evaluation, feynmanResult]);

  async function startSession() {
    setBusy(true);
    setError(null);
    setEvaluation(null);
    setSession(null);
    setQuestions([]);
    setIndex(0);
    setAnswer("");
    try {
      if (!documentId) {
        setError("Choose a document with extracted text.");
        return;
      }
      const detail = await loadDocumentDetail(documentId);
      if (!detail?.content) {
        setError("Document content is not available offline.");
        return;
      }
      const result = await buildPracticeSession(detail.meta, detail.content, {
        topic: topic || null,
        subject: detail.meta.curriculum.subjectCode,
        count: 4,
      });
      setProviderLabel(result.provider.label);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await putLearningQuestions(result.questions);
      await putPracticeSession(result.session);
      setSession(result.session);
      setQuestions(result.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start practice.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer() {
    const q = questions[index];
    if (!q) return;
    setBusy(true);
    setError(null);
    try {
      const ev = await evaluateStudentAnswer(q, answer);
      const [allAttempts, allEvaluations, existingMisconceptions] = await Promise.all([
        listAttempts(),
        listAnswerEvaluations(),
        listMisconceptions(),
      ]);
      const relatedAttempts = allAttempts.filter(
        (a) =>
          a.evaluationId !== ev.id &&
          (a.topicLabel === q.topic || a.documentId === q.documentId),
      );
      const relatedEvaluations = allEvaluations.filter(
        (e) =>
          e.id !== ev.id &&
          relatedAttempts.some((a) => a.evaluationId === e.id || a.questionId === e.questionId),
      );

      await putAnswerEvaluation(ev);
      await putAttempt({
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? `at_${crypto.randomUUID()}`
            : `at_${Date.now()}`,
        sessionId: session?.id ?? null,
        questionId: q.id,
        documentId: q.documentId,
        studentAnswer: answer,
        evaluationId: ev.id,
        correctness: ev.correctness,
        topicLabel: q.topic,
        createdAt: new Date().toISOString(),
      });

      try {
        const diag = await diagnoseAnswer({
          evaluation: ev,
          question: q,
          priorAttempts: relatedAttempts,
          priorEvaluations: relatedEvaluations,
        });
        if (diag.possibleMisconception) {
          const match = findMatchingMisconception(
            existingMisconceptions,
            diag.possibleMisconception,
          );
          if (match) {
            await putMisconception(mergeMisconceptionEvidence(match, diag.possibleMisconception));
          } else if (
            !diag.needsMoreEvidence &&
            diag.possibleMisconception.id &&
            diag.possibleMisconception.status === "confirmed"
          ) {
            await putMisconception(
              diag.possibleMisconception as import("@/lib/learning/misconceptions").MisconceptionRecord,
            );
          } else if (diag.possibleMisconception.title) {
            const now = new Date().toISOString();
            await putMisconception({
              id:
                typeof crypto !== "undefined" && crypto.randomUUID
                  ? `mc_${crypto.randomUUID()}`
                  : `mc_${Date.now()}`,
              concept: diag.possibleMisconception.concept ?? q.topic ?? "topic",
              topicLabel: diag.possibleMisconception.topicLabel ?? q.topic,
              documentId: diag.possibleMisconception.documentId ?? q.documentId,
              category: diag.possibleMisconception.category ?? "other",
              description: diag.possibleMisconception.description ?? "",
              title: diag.possibleMisconception.title,
              observations: diag.possibleMisconception.observations ?? [],
              supportingExcerpts: diag.possibleMisconception.supportingExcerpts ?? [],
              confidence: "low",
              status: "suspected",
              firstObservedAt: now,
              lastObservedAt: now,
              observationCount: diag.possibleMisconception.observations?.length ?? 1,
              remediationSessionIds: [],
              diagnosticQuestionIds: [],
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      } catch {
        // Diagnosis must never block core evaluation
      }
      setEvaluation(ev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitFeynman() {
    setBusy(true);
    setError(null);
    setFeynmanResult(null);
    try {
      if (!documentId) {
        setError("Choose a document first.");
        return;
      }
      const detail = await loadDocumentDetail(documentId);
      if (!detail?.content) {
        setError("Document content is not available offline.");
        return;
      }
      const fy = await runFeynman(
        detail.meta,
        detail.content,
        feynmanTopic.trim() || detail.meta.name,
        feynmanText,
      );
      await putFeynmanSession(fy);
      setFeynmanResult(fy);
      setProviderLabel(fy.evaluatedBy === "heuristic" ? "On-device practice engine (not a language model)" : fy.evaluatedBy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not evaluate explanation.");
    } finally {
      setBusy(false);
    }
  }

  const current = questions[index] ?? null;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-muted uppercase">Practice</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Active learning</h1>
        <p className="max-w-2xl text-muted">
          Practice from your imported textbooks. Questions and feedback are grounded in extracted
          excerpts with page references. Cloud language models are not required for this on-device
          engine.
        </p>
      </header>

      <Panel className="space-y-3">
        <p className="text-sm text-muted">
          Offline practice works with previously generated sessions and the on-device engine.
          {providerLabel ? (
            <>
              {" "}
              Active engine: <span className="font-medium text-ink">{providerLabel}</span>.
            </>
          ) : null}
        </p>
        <p className="text-sm text-muted">
          Local history: {historySessions.length} session{historySessions.length === 1 ? "" : "s"},{" "}
          {attemptCount} attempt{attemptCount === 1 ? "" : "s"}.
        </p>
      </Panel>

      <Panel className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">Start a practice session</h2>
        <Field label="Document" htmlFor="pr-doc">
          <select
            id="pr-doc"
            className={controlClassName}
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
          >
            <option value="">Select a ready document</option>
            {readyDocs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        {readyDocs.length === 0 ? (
          <p className="text-sm text-muted">
            No ready documents yet.{" "}
            <Link to="/library" className="text-primary hover:underline">
              Import a PDF with selectable text
            </Link>
            .
          </p>
        ) : null}
        <Field label="Topic or focus (optional)" htmlFor="pr-topic">
          <input
            id="pr-topic"
            className={controlClassName}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Newton’s laws, photosynthesis"
          />
        </Field>
        <Button type="button" disabled={busy || !documentId} onClick={() => void startSession()}>
          {busy ? "Building…" : "Generate practice"}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </Panel>

      {session && current ? (
        <Panel className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold">{session.title}</h2>
            <p className="text-sm text-muted">
              Question {index + 1} of {questions.length}
            </p>
          </div>
          <p className="text-sm text-muted">
            {current.type.replace(/_/g, " ")} · {current.difficulty} · cognitive:{" "}
            {current.cognitiveLevel} · {current.generatedBy}
          </p>
          <p className="text-lg text-ink">{current.text}</p>
          {current.sourceExcerpts[0] ? (
            <p className="text-sm text-muted">
              Source: pages {current.sourceExcerpts[0].pageStart}–{current.sourceExcerpts[0].pageEnd}
            </p>
          ) : null}

          {current.type === "multiple_choice" && current.choices ? (
            <fieldset className="space-y-2">
              <legend className="sr-only">Choices</legend>
              {current.choices.map((c) => (
                <label key={c} className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md border border-line bg-paper px-3 py-2">
                  <input
                    type="radio"
                    name={`q-${current.id}`}
                    className="mt-1"
                    checked={answer === c}
                    onChange={() => setAnswer(c)}
                  />
                  <span>{c}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            <Field label="Your answer" htmlFor="pr-answer">
              <textarea
                id="pr-answer"
                className={`${controlClassName} min-h-28 py-2`}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write in your own words…"
              />
            </Field>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy || !answer.trim()} onClick={() => void submitAnswer()}>
              Check answer
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={index >= questions.length - 1}
              onClick={() => {
                setIndex((i) => Math.min(i + 1, questions.length - 1));
                setAnswer("");
                setEvaluation(null);
              }}
            >
              Next
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={index <= 0}
              onClick={() => {
                setIndex((i) => Math.max(i - 1, 0));
                setAnswer("");
                setEvaluation(null);
              }}
            >
              Previous
            </Button>
          </div>

          {evaluation ? (
            <div className="space-y-2 rounded-md border border-line bg-paper p-4">
              <p className="font-semibold capitalize text-ink">{evaluation.correctness}</p>
              <p className="text-sm text-muted">
                Confidence: {evaluation.confidence} · Evidence: {evaluation.evidenceLevel} ·{" "}
                {evaluation.evaluatedBy}
              </p>
              <p>{evaluation.explanation}</p>
              {evaluation.understood.length > 0 ? (
                <div>
                  <p className="text-sm font-semibold">Understood</p>
                  <ul className="list-disc pl-5 text-sm">
                    {evaluation.understood.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {evaluation.missingOrIncorrect.length > 0 ? (
                <div>
                  <p className="text-sm font-semibold">Missing or incorrect</p>
                  <ul className="list-disc pl-5 text-sm">
                    {evaluation.missingOrIncorrect.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="text-sm">
                <span className="font-semibold">Suggestion: </span>
                {evaluation.suggestedImprovement}
              </p>
              <p className="text-xs text-muted">
                This is practice feedback, not an official examination result.
              </p>
            </div>
          ) : null}
        </Panel>
      ) : null}

      <Panel className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">Explain it yourself</h2>
        <p className="text-sm text-muted">
          Describe a topic in your own words. Sirius checks your explanation against the textbook
          excerpts on this device and suggests how to deepen it.
        </p>
        <Field label="Topic" htmlFor="fy-topic">
          <input
            id="fy-topic"
            className={controlClassName}
            value={feynmanTopic}
            onChange={(e) => setFeynmanTopic(e.target.value)}
            placeholder="Topic to explain"
          />
        </Field>
        <Field label="Your explanation" htmlFor="fy-text">
          <textarea
            id="fy-text"
            className={`${controlClassName} min-h-32 py-2`}
            value={feynmanText}
            onChange={(e) => setFeynmanText(e.target.value)}
          />
        </Field>
        <Button
          type="button"
          disabled={busy || !documentId || !feynmanText.trim()}
          onClick={() => void submitFeynman()}
        >
          Get feedback
        </Button>
        {feynmanResult ? (
          <div className="space-y-2 rounded-md border border-line bg-paper p-4">
            <p>{feynmanResult.feedback}</p>
            <p className="text-sm font-semibold">Simpler take</p>
            <p className="text-sm">{feynmanResult.simplerExplanation}</p>
            <p className="text-sm font-semibold">Follow-up</p>
            <p className="text-sm">{feynmanResult.followUpQuestion}</p>
            {feynmanResult.sourceExcerpts[0] ? (
              <p className="text-xs text-muted">
                Grounded in pages {feynmanResult.sourceExcerpts[0].pageStart}–
                {feynmanResult.sourceExcerpts[0].pageEnd}
              </p>
            ) : null}
          </div>
        ) : null}
      </Panel>

      {historySessions.length > 0 ? (
        <Panel className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">Saved sessions</h2>
          <ul className="space-y-2 text-sm">
            {historySessions.slice(0, 8).map((s) => (
              <li key={s.id} className="rounded-md border border-line bg-paper px-3 py-2">
                <span className="font-medium">{s.title}</span>
                <span className="text-muted">
                  {" "}
                  · {s.documentName} · {new Date(s.createdAt).toLocaleString()} ·{" "}
                  {s.offlineCapable ? "offline-capable" : "needs network"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
