import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Panel } from "@/components/ui/panel";
import { listExamResults, getExamSession } from "@/lib/offline/database";
import type { ExamResult } from "@/lib/examination/types";

export function ExamResultsPage() {
  const params = useParams({ strict: false }) as { examId?: string };
  const [result, setResult] = useState<ExamResult | null>(null);

  useEffect(() => {
    void (async () => {
      const all = await listExamResults();
      const r =
        all.find((x) => x.sessionId === params.examId) ??
        all.find((x) => x.id === params.examId) ??
        null;
      setResult(r);
      if (!r && params.examId) {
        await getExamSession(params.examId);
      }
    })();
  }, [params.examId]);

  if (!result) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-muted">Result not found.</p>
        <Link to={"/exams" as any} className="underline text-primary">
          Exams
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-24">
      <header className="space-y-2">
        <p className="text-sm text-muted">
          <Link to={"/exams" as any} className="underline">
            Exams
          </Link>
        </p>
        <h1 className="font-serif text-3xl text-ink">{result.title}</h1>
        <p className="text-sm text-muted">{result.assessmentLabel}</p>
      </header>

      <Panel className="space-y-2">
        <p className="text-3xl font-semibold tabular-nums text-ink">
          {result.marksEarned} / {result.totalMarks}
        </p>
        <p className="text-sm text-muted">
          Submitted {result.submittedAt.slice(0, 16).replace("T", " ")}
          {result.timeTakenSeconds != null
            ? ` · ${Math.floor(result.timeTakenSeconds / 60)}m ${result.timeTakenSeconds % 60}s`
            : ""}
        </p>
        {result.manualReviewCount > 0 && (
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {result.manualReviewCount} answer(s) need human judgment (low confidence or unevaluable).
          </p>
        )}
      </Panel>

      {result.topicBreakdown.length > 0 && (
        <Panel className="space-y-2">
          <h2 className="font-serif text-xl text-ink">By topic</h2>
          <ul className="text-sm space-y-1">
            {result.topicBreakdown.map((t) => (
              <li key={t.topic}>
                {t.topic}: {t.earned}/{t.available}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel className="space-y-3">
        <h2 className="font-serif text-xl text-ink">Questions</h2>
        {result.questionResults.map((q, i) => (
          <div key={q.snapshotId} className="border-b border-line pb-2 text-sm">
            <p className="font-medium text-ink">
              Q{i + 1}: {q.correctness} · {q.marksAwarded}/{q.marksAvailable}
              {q.requiresManualReview ? " · review" : ""}
            </p>
            <p className="text-muted">{q.explanation}</p>
            {q.sourceExcerpts[0] && (
              <p className="text-xs text-muted">
                Source pp. {q.sourceExcerpts[0].pageStart}–{q.sourceExcerpts[0].pageEnd}
              </p>
            )}
          </div>
        ))}
      </Panel>

      <Panel className="text-sm text-muted">
        <p>
          Marks are heuristic, not an official grade. Use Progress and Revision for next steps based
          on this evidence.
        </p>
        <p className="mt-2">
          <Link to="/revision" className="underline text-primary">
            Open revision
          </Link>
          {" · "}
          <Link to="/progress" className="underline text-primary">
            Progress
          </Link>
        </p>
      </Panel>
    </div>
  );
}
