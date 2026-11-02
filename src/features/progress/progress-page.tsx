import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import {
  listAttempts,
  listAnswerEvaluations,
  listMisconceptions,
  listLearningQuestions,
  listInstalledPacks,
  putMasteryAssessment,
  putKnowledgeGraph,
  listKnowledgeGraphs,
} from "@/lib/offline/database";
import type { MisconceptionRecord } from "@/lib/learning/misconceptions";
import {
  assessAcrossPacks,
  assessAllObjectives,
  detectKnowledgeGaps,
  buildRecommendations,
  buildKnowledgeGraphSnapshot,
  validateKnowledgeGraph,
  type MasteryAssessment,
  type KnowledgeGap,
  type StudyRecommendation,
  type KnowledgeGraphSnapshot,
  type MasteryState,
} from "@/lib/knowledge/index";
import type { InstalledPackRecord } from "@/lib/curriculum/types";
import { createRevisionSession } from "@/lib/revision/session";
import { putRevisionSession } from "@/lib/offline/database";
import { useNavigate } from "@tanstack/react-router";

const STATE_LABEL: Record<MasteryState, string> = {
  not_started: "Not started",
  introduced: "Introduced",
  practising: "Practising",
  developing: "Developing",
  proficient: "Secure for now",
  needs_review: "Needs another look",
};
const STATE_TONE: Record<MasteryState, string> = {
  not_started: "bg-muted/40 text-muted",
  introduced: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  practising: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  developing: "bg-violet-500/15 text-violet-900 dark:text-violet-100",
  proficient: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
  needs_review: "bg-rose-500/15 text-rose-900 dark:text-rose-100",
};

const ALL_PACKS = "__all__";

export function ProgressPage() {
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mastery, setMastery] = useState<MasteryAssessment[]>([]);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [recs, setRecs] = useState<StudyRecommendation[]>([]);
  const [misconceptions, setMisconceptions] = useState<MisconceptionRecord[]>([]);
  const [graphs, setGraphs] = useState<KnowledgeGraphSnapshot[]>([]);
  const [packs, setPacks] = useState<InstalledPackRecord[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string>(ALL_PACKS);
  const [attemptCount, setAttemptCount] = useState(0);
  const navigate = useNavigate();

  async function startRevisionFromRec(r: StudyRecommendation) {
    const activityType =
      r.kind === "address_misconception"
        ? "misconception_remediation"
        : r.kind === "study_prerequisite"
          ? "prerequisite_repair"
          : r.kind === "reassess"
            ? "reassessment"
            : "practice";
    const planItem = {
      id: `dpi_rec_${Date.now()}`,
      scheduleId: `rs_${r.packId ?? "local"}__${r.objectiveId ?? r.misconceptionId ?? "topic"}`,
      objectiveId: r.objectiveId ?? (r.topicLabel ? `topic:${r.topicLabel}` : "unknown"),
      packId: r.packId,
      topicLabel: r.topicLabel,
      activityType: activityType as import("@/lib/revision/types").RevisionActivityType,
      priority: r.priority,
      urgency: "attention" as const,
      reason: r.reason,
      estimatedMinutes: 10,
      documentId: r.documentId,
      misconceptionId: r.misconceptionId,
    };
    // Validate pack isolation: objective must belong to same pack when both known
    if (r.packId && r.objectiveId && !r.objectiveId.startsWith("topic:")) {
      const graphs = await listKnowledgeGraphs();
      const g = graphs.find((x) => x.packId === r.packId);
      if (g) {
        const known = new Set(g.objectiveConceptMaps.map((m) => m.objectiveId));
        for (const e of g.prerequisiteEdges) {
          known.add(e.objectiveId);
          known.add(e.requiresObjectiveId);
        }
        if (!known.has(r.objectiveId)) {
          setError("That recommendation points to an objective that is not in the selected curriculum pack.");
          return;
        }
      }
    }
    const session = createRevisionSession({ planItem, documentId: r.documentId });
    await putRevisionSession(session);
    void navigate({ to: "/revision/session/$sessionId", params: { sessionId: session.id } });
  }

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [attempts, evaluations, questions, mcs, installed, existingGraphs] =
        await Promise.all([
          listAttempts(),
          listAnswerEvaluations(),
          listLearningQuestions(),
          listMisconceptions(),
          listInstalledPacks(),
          listKnowledgeGraphs(),
        ]);
      setAttemptCount(attempts.length);
      setMisconceptions(mcs);
      setPacks(installed);

      const builtGraphs: KnowledgeGraphSnapshot[] = [];
      for (const pack of installed) {
        if (!pack?.content || !pack.packId) continue;
        const snapshot = buildKnowledgeGraphSnapshot(pack.content, pack.packId);
        const integrity = validateKnowledgeGraph(snapshot);
        if (integrity.ok) {
          await putKnowledgeGraph(snapshot);
          builtGraphs.push(snapshot);
        }
      }
      // Keep graphs for packs that were removed from install list only if still referenced
      for (const g of existingGraphs) {
        if (g.packId && !builtGraphs.some((b) => b.packId === g.packId)) {
          // Retained offline for historical evidence linkage; not actively assessed
        }
      }
      setGraphs(builtGraphs);

      const packInputs = builtGraphs.map((graph) => {
        const objectiveIds = new Set<string>();
        for (const m of graph.objectiveConceptMaps) objectiveIds.add(m.objectiveId);
        for (const e of graph.prerequisiteEdges) {
          objectiveIds.add(e.objectiveId);
          objectiveIds.add(e.requiresObjectiveId);
        }
        for (const q of questions) {
          if (q.objectiveId && objectiveIds.has(q.objectiveId)) objectiveIds.add(q.objectiveId);
        }
        return {
          packId: graph.packId ?? "local",
          graph,
          objectiveIds: [...objectiveIds],
        };
      });

      let assessments: MasteryAssessment[] = [];
      if (packInputs.length > 0) {
        assessments = assessAcrossPacks({
          packs: packInputs,
          attempts,
          evaluations,
          questions,
          misconceptions: mcs,
        });
      } else {
        // No packs: topic-level pseudo objectives from attempts
        const topicIds = new Set<string>();
        for (const a of attempts) if (a.topicLabel) topicIds.add(`topic:${a.topicLabel}`);
        assessments = assessAllObjectives({
          objectiveIds: [...topicIds],
          graph: null,
          packId: null,
          attempts,
          evaluations,
          questions,
          misconceptions: mcs,
        });
      }

      for (const a of assessments) await putMasteryAssessment(a);
      setMastery(assessments);

      // Gaps and recommendations are computed per pack graph so prerequisites
      // never cross curriculum boundaries, then merged with pack identity preserved.
      const allGaps: typeof gaps extends infer G ? any[] : any[] = [];
      const allRecs: any[] = [];
      if (packInputs.length > 0) {
        for (const pack of packInputs) {
          const packMastery = assessments.filter((a) => a.packId === pack.packId);
          const packGaps = detectKnowledgeGaps({
            mastery: packMastery,
            misconceptions: mcs,
            graph: pack.graph,
          }).map((g) => ({ ...g, packId: g.packId ?? pack.packId }));
          allGaps.push(...packGaps);
          allRecs.push(
            ...buildRecommendations({
              mastery: packMastery,
              gaps: packGaps,
              misconceptions: mcs,
              graph: pack.graph,
            }).map((r) => ({ ...r, packId: r.packId ?? pack.packId })),
          );
        }
      } else {
        const detected = detectKnowledgeGaps({
          mastery: assessments,
          misconceptions: mcs,
          graph: null,
        });
        allGaps.push(...detected);
        allRecs.push(
          ...buildRecommendations({
            mastery: assessments,
            gaps: detected,
            misconceptions: mcs,
            graph: null,
          }),
        );
      }
      // Deduplicate recommendation titles within the same pack
      const seenRec = new Set<string>();
      const mergedRecs = [];
      for (const r of allRecs.sort((a, b) => a.priority - b.priority)) {
        const key = `${r.packId ?? ""}:${r.kind}:${r.objectiveId ?? ""}:${r.misconceptionId ?? ""}:${r.title}`;
        if (seenRec.has(key)) continue;
        seenRec.add(key);
        mergedRecs.push(r);
      }
      setGaps(allGaps);
      setRecs(mergedRecs.slice(0, 20));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load progress.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredMastery = useMemo(() => {
    if (selectedPackId === ALL_PACKS) return mastery;
    return mastery.filter((m) => m.packId === selectedPackId);
  }, [mastery, selectedPackId]);

  const filteredGaps = useMemo(() => {
    if (selectedPackId === ALL_PACKS) return gaps;
    return gaps.filter((g) => !g.packId || g.packId === selectedPackId);
  }, [gaps, selectedPackId]);

  const filteredRecs = useMemo(() => {
    if (selectedPackId === ALL_PACKS) return recs;
    return recs.filter((r) => !r.packId || r.packId === selectedPackId);
  }, [recs, selectedPackId]);

  const activeGraph = useMemo(() => {
    if (selectedPackId === ALL_PACKS) return graphs[0] ?? null;
    return graphs.find((g) => g.packId === selectedPackId) ?? null;
  }, [graphs, selectedPackId]);

  const proficient = useMemo(
    () => filteredMastery.filter((m) => m.state === "proficient").length,
    [filteredMastery],
  );
  const developing = useMemo(
    () =>
      filteredMastery.filter((m) => m.state === "developing" || m.state === "practising").length,
    [filteredMastery],
  );
  const review = useMemo(
    () =>
      filteredMastery.filter((m) => m.state === "needs_review").length +
      misconceptions.filter((m) => m.status === "confirmed").length,
    [filteredMastery, misconceptions],
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-24 md:pb-8">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl leading-tight text-ink md:text-4xl">
          Knowledge & Progress
        </h1>
        <p className="text-pretty text-muted">
          Progress reflects evidence on this device — not a permanent label. Understanding can
          improve through practice and reassessment.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void refresh()}
          >
            {busy ? "Updating…" : "Refresh evidence"}
          </Button>
          <Link
            to="/practice"
            className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm font-medium"
          >
            Practice
          </Link>
          <Link
            to="/misconceptions"
            className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm font-medium"
          >
            Support
          </Link>
        </div>
      </header>

      {packs.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="pack-filter" className="text-xs font-medium text-muted">
            Curriculum pack
          </label>
          <select
            id="pack-filter"
            className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink"
            value={selectedPackId}
            onChange={(e) => setSelectedPackId(e.target.value)}
          >
            <option value={ALL_PACKS}>All installed packs</option>
            {packs.map((p) => (
              <option key={p.packId} value={p.packId}>
                {p.meta?.title ?? p.packId}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <Panel className="border-rose-500/40 bg-rose-500/5 text-sm">{error}</Panel>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Attempts", attemptCount],
            ["Secure for now", proficient],
            ["Developing", developing],
            ["Needs a look", review],
          ] as const
        ).map(([l, v]) => (
          <div key={l} className="rounded-xl border border-line bg-surface/70 px-3 py-3">
            <p className="text-2xl font-semibold tabular-nums text-ink">{v}</p>
            <p className="text-xs text-muted">{l}</p>
          </div>
        ))}
      </section>

      <Panel className="space-y-3">
        <h2 className="font-serif text-xl text-ink">Suggested next steps</h2>
        {filteredRecs.length === 0 ? (
          <p className="text-sm text-muted">
            {attemptCount === 0
              ? "Complete a few practice questions to unlock personalised next steps."
              : "No urgent next steps right now."}
          </p>
        ) : (
          <ul className="space-y-3">
            {filteredRecs.slice(0, 6).map((r) => (
              <li key={r.id} className="rounded-lg border border-line bg-surface/60 p-3">
                <p className="font-medium text-ink">{r.title}</p>
                <p className="mt-1 text-sm text-muted">{r.reason}</p>
                <p className="mt-2 text-sm text-ink">{r.suggestedAction}</p>
                {r.packId && (
                  <p className="mt-1 text-xs text-muted">Curriculum: {r.packId}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => void startRevisionFromRec(r)}>
                    Start revision
                  </Button>
                  <a
                    href={`/tutor?topic=${encodeURIComponent(r.topicLabel ?? "")}&objectiveId=${encodeURIComponent(r.objectiveId ?? "")}&misconceptionId=${encodeURIComponent(r.misconceptionId ?? "")}&mode=${r.kind === "address_misconception" ? "misconception" : "explain"}`}
                    className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm"
                  >
                    Open tutor
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="space-y-3">
        <h2 className="font-serif text-xl text-ink">Important gaps</h2>
        {filteredGaps.length === 0 ? (
          <p className="text-sm text-muted">No major gaps detected from current evidence.</p>
        ) : (
          <ul className="space-y-3">
            {filteredGaps.slice(0, 6).map((g) => (
              <li key={g.id} className="rounded-lg border border-line p-3">
                <p className="font-medium text-ink">{g.title}</p>
                <p className="mt-1 text-sm text-muted">{g.explanation}</p>
                {g.packId && (
                  <p className="mt-1 text-xs text-muted">Curriculum: {g.packId}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="space-y-3">
        <h2 className="font-serif text-xl text-ink">Objective progress</h2>
        {filteredMastery.length === 0 ? (
          <p className="text-sm text-muted">Practice answers will appear here as evidence builds.</p>
        ) : (
          <ul className="space-y-2">
            {filteredMastery.slice(0, 16).map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-1 rounded-lg border border-line px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {m.objectiveId.startsWith("topic:")
                      ? m.objectiveId.slice(6)
                      : m.objectiveId}
                  </p>
                  <p className="text-xs text-muted">
                    {m.evidenceCount} evidence · {m.rationale}
                    {m.packId ? ` · ${m.packId}` : ""}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATE_TONE[m.state]}`}
                >
                  {STATE_LABEL[m.state]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {activeGraph && (
        <Panel className="space-y-2">
          <h2 className="font-serif text-xl text-ink">Study map</h2>
          <p className="text-sm text-muted">
            {activeGraph.concepts.length} ideas · {activeGraph.prerequisiteEdges.length}{" "}
            prerequisite links · {activeGraph.objectiveConceptMaps.length} objective connections
            {activeGraph.packId ? ` · pack ${activeGraph.packId}` : ""}
          </p>
          {graphs.length > 1 && selectedPackId === ALL_PACKS && (
            <p className="text-xs text-muted">
              {graphs.length} curriculum packs installed. Filter above to focus on one.
            </p>
          )}
        </Panel>
      )}

      <Panel className="space-y-2">
        <h2 className="font-serif text-xl text-ink">How this works</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted">
          <li>Opening a document or finishing a lesson is not the same as understanding.</li>
          <li>
            Mastery states update only from scored attempts (each attempt counts once, even with an
            evaluation).
          </li>
          <li>A single ambiguous answer never confirms a misconception.</li>
          <li>Everything here stays on this device unless you choose to export it.</li>
        </ul>
      </Panel>
    </div>
  );
}