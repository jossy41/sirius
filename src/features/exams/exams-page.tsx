import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Field, controlClassName } from "@/components/ui/field";
import {
  listLearningQuestions,
  listInstalledPacks,
  listExamDefinitions,
  listExamSessions,
  listExamResults,
  putExamDefinition,
  putExamSession,
} from "@/lib/offline/database";
import {
  selectExamQuestions,
  buildExamDefinition,
  snapshotQuestions,
  createExamSession,
} from "@/lib/examination/engine";
import type { ExamDefinition, ExamSession, ExamResult } from "@/lib/examination/types";
import type { InstalledPackRecord } from "@/lib/curriculum/types";

export function ExamsPage() {
  const navigate = useNavigate();
  const [defs, setDefs] = useState<ExamDefinition[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [packs, setPacks] = useState<InstalledPackRecord[]>([]);
  const [packId, setPackId] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [minutes, setMinutes] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [d, s, r, p] = await Promise.all([
      listExamDefinitions(),
      listExamSessions(),
      listExamResults(),
      listInstalledPacks(),
    ]);
    setDefs(d);
    setSessions(s);
    setResults(r);
    setPacks(p);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createAssessment() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const questions = await listLearningQuestions();
      const selected = selectExamQuestions({
        packId: packId || null,
        topicLabels: topic.trim() ? [topic.trim()] : [],
        questionCount: count,
        durationMinutes: minutes,
        availableQuestions: questions,
      });
      if (!selected.ok) {
        setError(selected.message ?? "Could not build assessment.");
        return;
      }
      if (selected.message) setInfo(selected.message);
      const def = buildExamDefinition(
        {
          packId: packId || null,
          topicLabels: topic.trim() ? [topic.trim()] : [],
          questionCount: count,
          durationMinutes: minutes,
          availableQuestions: questions,
        },
        selected.questions,
      );
      const snaps = snapshotQuestions(selected.questions);
      const session = createExamSession(def, snaps);
      await putExamDefinition(def);
      await putExamSession(session);
      await refresh();
      void navigate({ to: "/exams/$examId", params: { examId: session.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create assessment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-24">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl text-ink">Exams</h1>
        <p className="text-sm text-muted">
          Practice assessments built from your offline questions. These are not official past papers
          unless a curriculum blueprint is configured and clearly labelled.
        </p>
      </header>

      <Panel className="space-y-3">
        <h2 className="font-serif text-xl text-ink">New practice assessment</h2>
        {packs.length > 0 && (
          <Field label="Curriculum pack" htmlFor="exam-pack">
            <select
              id="exam-pack"
              className={controlClassName}
              value={packId}
              onChange={(e) => setPackId(e.target.value)}
            >
              <option value="">Any / none</option>
              {packs.map((p) => (
                <option key={p.packId} value={p.packId}>
                  {p.meta?.title ?? p.packId}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Topic filter (optional)" htmlFor="exam-topic">
          <input
            id="exam-topic"
            className={controlClassName}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. mass and weight"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Questions" htmlFor="exam-count">
            <input
              id="exam-count"
              type="number"
              min={1}
              max={30}
              className={controlClassName}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 5)}
            />
          </Field>
          <Field label="Minutes" htmlFor="exam-mins">
            <input
              id="exam-mins"
              type="number"
              min={5}
              max={180}
              className={controlClassName}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value) || 20)}
            />
          </Field>
        </div>
        {error && <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
        {info && <p className="text-sm text-muted">{info}</p>}
        <Button type="button" variant="primary" disabled={busy} onClick={() => void createAssessment()}>
          {busy ? "Preparing…" : "Start practice assessment"}
        </Button>
      </Panel>

      <Panel className="space-y-2">
        <h2 className="font-serif text-xl text-ink">In progress</h2>
        {sessions.filter((s) => s.status === "in_progress" || s.status === "ready").length === 0 ? (
          <p className="text-sm text-muted">No active sessions.</p>
        ) : (
          <ul className="space-y-2">
            {sessions
              .filter((s) => s.status === "in_progress" || s.status === "ready")
              .map((s) => (
                <li key={s.id}>
                  <Link
                    to="/exams/$examId"
                    params={{ examId: s.id }}
                    className="text-primary underline text-sm"
                  >
                    Session {s.status} · {s.questionSnapshots.length} questions
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </Panel>

      <Panel className="space-y-2">
        <h2 className="font-serif text-xl text-ink">History</h2>
        {results.length === 0 ? (
          <p className="text-sm text-muted">No completed assessments yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {results.slice(0, 12).map((r) => (
              <li key={r.id}>
                <Link
                  to="/exams/results/$examId"
                  params={{ examId: r.sessionId }}
                  className="text-primary underline"
                >
                  {r.title}
                </Link>
                <span className="text-muted">
                  {" "}
                  · {r.marksEarned}/{r.totalMarks} · {r.submittedAt.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="space-y-1 text-sm text-muted">
        <p>Heuristic marking is not a teacher grade. Low-confidence answers may need manual review.</p>
        <p>Source-grounded questions keep page references when available.</p>
      </Panel>
    </div>
  );
}
