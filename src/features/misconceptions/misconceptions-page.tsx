/**
 * Misconception history and remediation entry points.
 * Student-facing language; no AI jargon.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { listMisconceptions } from "@/lib/offline/database";
import type { MisconceptionRecord } from "@/lib/learning/misconceptions";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";

const statusLabel: Record<MisconceptionRecord["status"], string> = {
  suspected: "Looking into this",
  confirmed: "Needs attention",
  improving: "Improving",
  resolved: "Resolved",
  needs_reassessment: "Check again",
};

export function MisconceptionsPage() {
  const [items, setItems] = useState<MisconceptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMisconceptions()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your learning notes on this device.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted">Learning support</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          What you are working on
        </h1>
        <p className="text-sm text-muted">
          Sirius looks for patterns across your practice answers. A single slip is never treated as a
          fixed misunderstanding. When enough evidence appears, you will see a clear explanation and
          a short practice path grounded in your textbook.
        </p>
      </header>

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && (
        <Panel className="border-destructive/40 bg-destructive/5 text-sm">{error}</Panel>
      )}

      {!loading && !error && items.length === 0 && (
        <Panel className="space-y-3">
          <p className="text-sm text-foreground">
            No patterns recorded yet. Keep practising from your library documents. When the same
            idea trips you up more than once, it will show up here with the pages to re-read.
          </p>
          <Button asChild variant="secondary">
            <Link to="/practice">Go to Practice</Link>
          </Button>
        </Panel>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((m) => (
          <li key={m.id}>
            <Panel className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-medium text-foreground">{m.title}</h2>
                  <p className="text-xs text-muted">
                    {statusLabel[m.status]} · {m.observationCount} observation
                    {m.observationCount === 1 ? "" : "s"} · confidence {m.confidence}
                  </p>
                </div>
              </div>
              <p className="text-sm text-foreground/90">{m.description}</p>
              {m.supportingExcerpts[0] && (
                <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted">
                  Textbook pages {m.supportingExcerpts[0].pageStart}–
                  {m.supportingExcerpts[0].pageEnd}
                  {m.documentId ? (
                    <>
                      {" "}
                      ·{" "}
                      <Link
                        className="underline underline-offset-2"
                        to="/library/$documentId"
                        params={{ documentId: m.documentId }}
                      >
                        Open document
                      </Link>
                    </>
                  ) : null}
                </p>
              )}
              <p className="text-xs text-muted">
                First noticed {new Date(m.firstObservedAt).toLocaleDateString()} · Last{" "}
                {new Date(m.lastObservedAt).toLocaleDateString()}
              </p>
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  );
}
