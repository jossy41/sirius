import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Panel } from "@/components/ui/panel";
import { listRevisionHistory } from "@/lib/offline/database";
import type { RevisionHistoryEntry } from "@/lib/revision/types";

export function RevisionHistoryPage() {
  const [rows, setRows] = useState<RevisionHistoryEntry[]>([]);

  useEffect(() => {
    void listRevisionHistory().then(setRows);
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-24">
      <header className="space-y-2">
        <p className="text-sm text-muted">
          <Link to="/revision" className="underline">
            Revision
          </Link>
        </p>
        <h1 className="font-serif text-3xl text-ink">Revision history</h1>
        <p className="text-muted text-sm">Completed, postponed, and skipped reviews on this device.</p>
      </header>
      <Panel className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No revision history yet.</p>
        ) : (
          <ul className="space-y-3">
            {rows.slice(0, 40).map((r) => (
              <li key={r.id} className="border-b border-line pb-2 text-sm">
                <p className="font-medium text-ink">
                  {r.topicLabel || r.objectiveId}{" "}
                  <span className="font-normal text-muted">· {r.outcome}</span>
                </p>
                <p className="text-xs text-muted">
                  {r.reviewedAt.slice(0, 16).replace("T", " ")}
                  {r.evaluationCorrectness ? ` · ${r.evaluationCorrectness}` : ""}
                  {r.wasOverdue ? " · was overdue" : ""}
                  {r.nextScheduledAt ? ` · next ${r.nextScheduledAt.slice(0, 10)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
