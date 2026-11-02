import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import {
  listRevisionSchedules,
  listMasteryAssessments,
  listMisconceptions,
  listRevisionHistory,
  listDailyRevisionPlans,
  putDailyRevisionPlan,
  putRevisionSchedule,
  putRevisionSession,
  putRevisionHistory,
  listKnowledgeGraphs,
  listExamDefinitions,
} from "@/lib/offline/database";
import { buildDailyPlan } from "@/lib/revision/planner";
import { postponeSchedule, isOverdue } from "@/lib/revision/scheduler";
import { createRevisionSession } from "@/lib/revision/session";
import { buildStudyPlan, type DailyStudyPlan } from "@/lib/revision/study-plan";
import type { DailyPlanItem, DailyRevisionPlan, RevisionSchedule, RevisionHistoryEntry } from "@/lib/revision/types";
import type { MasteryAssessment } from "@/lib/knowledge/index";
import { useNavigate } from "@tanstack/react-router";

export function RevisionPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DailyRevisionPlan | null>(null);
  const [studyPlan, setStudyPlan] = useState<DailyStudyPlan | null>(null);
  const [misconceptionRows, setMisconceptionRows] = useState<Array<{ id: string; title: string; status: string; objectiveId: string | null }>>([]);
  const [examHints, setExamHints] = useState<Array<{ id: string; title: string }>>([]);
  const [budget, setBudget] = useState(45);
  const [schedules, setSchedules] = useState<RevisionSchedule[]>([]);
  const [_history, setHistory] = useState<RevisionHistoryEntry[]>([]);
  const [_mastery, setMastery] = useState<MasteryAssessment[]>([]);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [sched, mast, mcs, hist, plans, graphs] = await Promise.all([
        listRevisionSchedules(),
        listMasteryAssessments(),
        listMisconceptions(),
        listRevisionHistory(),
        listDailyRevisionPlans(),
        listKnowledgeGraphs(),
      ]);
      setSchedules(sched);
      setMisconceptionRows(
        (mcs as Array<{ id: string; title?: string; concept?: string; status?: string; topicLabel?: string | null }>)
          .filter((m) => m.status !== "resolved")
          .map((m) => ({
            id: m.id,
            title: m.title || m.concept || "Learning difficulty",
            status: m.status || "suspected",
            objectiveId: null,
          })),
      );
      setMastery(mast);
      setHistory(hist);
      const today = new Date().toISOString().slice(0, 10);
      const existing = plans.find((p) => p.planDate === today) ?? null;
      const next = buildDailyPlan({
        schedules: sched,
        mastery: mast,
        misconceptions: mcs,
        graphs,
        existingPlan: existing,
      });
      // Persist any newly seeded schedules
      for (const item of next.items) {
        const s = sched.find((x) => x.id === item.scheduleId);
        if (!s && item.scheduleId.startsWith("rs_")) {
          // seeded inside planner only in memory — ensure schedule row exists via mastery
          const m = mast.find(
            (x) =>
              x.objectiveId === item.objectiveId &&
              (x.packId ?? null) === (item.packId ?? null),
          );
          if (m) {
            const { seedScheduleFromMastery } = await import("@/lib/revision/scheduler");
            const seeded = seedScheduleFromMastery({
              mastery: m,
              topicLabel: item.topicLabel,
              misconceptions: mcs,
            });
            await putRevisionSchedule(seeded);
          }
        }
      }
      await putDailyRevisionPlan(next);
      setPlan(next);
      setSchedules(await listRevisionSchedules());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load revision plan.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function startItem(item: DailyPlanItem) {
    const session = createRevisionSession({ planItem: item, documentId: item.documentId });
    await putRevisionSession(session);
    void navigate({ to: "/revision/session/$sessionId", params: { sessionId: session.id } });
  }

  async function postponeItem(item: DailyPlanItem) {
    const sched = schedules.find((s) => s.id === item.scheduleId);
    if (sched) {
      const next = postponeSchedule(sched, 1);
      await putRevisionSchedule(next);
      await putRevisionHistory({
        id: `rh_${Date.now()}`,
        scheduleId: sched.id,
        objectiveId: sched.objectiveId,
        packId: sched.packId,
        topicLabel: sched.topicLabel,
        activityType: sched.activityType,
        reviewedAt: new Date().toISOString(),
        wasOverdue: isOverdue(sched),
        previousScheduledAt: sched.nextReviewAt,
        nextScheduledAt: next.nextReviewAt,
        outcome: "postponed",
        evaluationCorrectness: null,
        evaluationId: null,
        attemptId: null,
        sessionId: null,
        note: "Postponed by learner",
      });
    }
    await refresh();
  }

  async function skipItem(item: DailyPlanItem) {
    const sched = schedules.find((s) => s.id === item.scheduleId);
    if (sched) {
      const next = postponeSchedule(sched, 2);
      await putRevisionSchedule(next);
      await putRevisionHistory({
        id: `rh_${Date.now()}`,
        scheduleId: sched.id,
        objectiveId: sched.objectiveId,
        packId: sched.packId,
        topicLabel: sched.topicLabel,
        activityType: sched.activityType,
        reviewedAt: new Date().toISOString(),
        wasOverdue: isOverdue(sched),
        previousScheduledAt: sched.nextReviewAt,
        nextScheduledAt: next.nextReviewAt,
        outcome: "skipped",
        evaluationCorrectness: null,
        evaluationId: null,
        attemptId: null,
        sessionId: null,
        note: "Skipped by learner",
      });
    }
    await refresh();
  }

  const overdue = schedules.filter((s) => isOverdue(s));
  const upcoming = schedules
    .filter((s) => !isOverdue(s) && new Date(s.nextReviewAt) > new Date())
    .slice(0, 5);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-24 md:pb-8">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl leading-tight text-ink md:text-4xl">Revision</h1>
        <p className="text-pretty text-muted">
          A practical plan for what to revisit today, based on your local practice evidence — not a
          fixed timetable for every learner.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void refresh()}>
            {busy ? "Updating…" : "Refresh plan"}
          </Button>
          <Link
            to="/revision/history"
            className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm font-medium"
          >
            History
          </Link>
          <Link
            to="/progress"
            className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm font-medium"
          >
            Progress
          </Link>
        </div>
      </header>

      {error && <Panel className="border-rose-500/40 bg-rose-500/5 text-sm">{error}</Panel>}

      <Panel className="space-y-3">
        <h2 className="font-serif text-xl text-ink">Today&apos;s plan</h2>
        {!plan || plan.items.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing urgent is due. Keep practising topics you care about, or check Progress for
            gaps.
          </p>
        ) : (
          <ul className="space-y-3">
            {plan.items.map((item) => (
              <li key={item.id} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">
                      {item.topicLabel || item.objectiveId}
                    </p>
                    <p className="text-xs text-muted">
                      {item.activityType.replace(/_/g, " ")} · {item.urgency.replace(/_/g, " ")} · ~
                      {item.estimatedMinutes} min
                      {item.packId ? ` · ${item.packId}` : ""}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted">{item.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="primary" onClick={() => void startItem(item)}>
                    Start
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void postponeItem(item)}>
                    Postpone
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void skipItem(item)}>
                    Skip
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="space-y-2">
        <h2 className="font-serif text-xl text-ink">Overdue</h2>
        {overdue.length === 0 ? (
          <p className="text-sm text-muted">No overdue reviews.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {overdue.slice(0, 6).map((s) => (
              <li key={s.id} className="text-muted">
                <span className="text-ink">{s.topicLabel || s.objectiveId}</span> — due{" "}
                {s.nextReviewAt.slice(0, 10)}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="space-y-2">
        <h2 className="font-serif text-xl text-ink">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">No upcoming reviews scheduled yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {upcoming.map((s) => (
              <li key={s.id} className="text-muted">
                <span className="text-ink">{s.topicLabel || s.objectiveId}</span> —{" "}
                {s.nextReviewAt.slice(0, 10)} · {s.intervalDays}d interval
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="space-y-2">
        <h2 className="font-serif text-xl text-ink">How scheduling works</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted">
          <li>Successful reviews gradually space out the next check.</li>
          <li>Difficulty or open misconceptions bring the next review sooner.</li>
          <li>You can postpone or skip — the plan will not loop the same item endlessly.</li>
          <li>Scheduling is deterministic and local; it is not a measured memory model.</li>
        </ul>
      </Panel>
      <Panel className="space-y-3">
        <h2 className="font-serif text-xl text-ink">Today&apos;s study plan</h2>
        <p className="text-sm text-muted">
          Prioritized from misconceptions, due revision, and practice. Adjust your time budget and regenerate.
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          Minutes available
          <input
            type="number"
            min={15}
            max={240}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value) || 45)}
            className="w-20 rounded border border-line bg-surface px-2 py-1 text-ink"
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void (async () => {
            try {
              const exams = await listExamDefinitions();
              setExamHints(
                (exams as Array<{ id: string; title?: string; name?: string }>)
                  .slice(0, 3)
                  .map((e) => ({ id: e.id, title: e.title || e.name || "Practice assessment" })),
              );
            } catch {
              setExamHints([]);
            }
            const today = new Date().toISOString().slice(0, 10);
            const sp = buildStudyPlan({
              date: today,
              preferences: {
                subjectLabels: [],
                topicLabels: [],
                minutesPerDay: budget,
                targetDate: null,
                priorities: ["misconceptions", "revision", "practice", "exams"],
              },
              dueRevisionTitles: schedules
                .filter((s) => {
                  const due = isOverdue(s) || new Date(s.nextReviewAt).getTime() <= Date.now() + 2 * 86400000;
                  return due;
                })
                .slice(0, 6)
                .map((s) => ({
                  id: s.id,
                  title: s.topicLabel || s.objectiveId || "Revision item",
                  objectiveId: s.objectiveId,
                })),
              misconceptionTitles: misconceptionRows
                .filter((m) => m.status !== "resolved")
                .map((m) => ({
                  id: m.id,
                  title: m.title,
                  objectiveId: m.objectiveId,
                })),
              examPrep: examHints,
              practiceHints: (_mastery || [])
                .filter((m) => m.state === "needs_review" || m.state === "developing")
                .slice(0, 5)
                .map((m) => ({
                  id: m.id,
                  title: m.objectiveId,
                  objectiveId: m.objectiveId,
                })),
            });
            setStudyPlan(sp);
            })();
          }}
        >
          Generate plan
        </Button>
        {studyPlan && (
          <ul className="space-y-2 text-sm">
            {studyPlan.items.map((item) => (
              <li key={item.id} className="rounded border border-line p-2">
                <p className="font-medium text-ink">{item.title}</p>
                <p className="text-xs text-muted">{item.reason} · ~{item.estimatedMinutes} min</p>
                <Link to={item.href as "/practice"} className="text-xs text-primary underline">
                  Open
                </Link>
              </li>
            ))}
            <li className="text-xs text-muted">Total ~{studyPlan.totalMinutes} minutes</li>
          </ul>
        )}
      </Panel>
    </div>
  );
}
