/**
 * Daily revision planner — prioritises overdue, misconceptions, weak prereqs, due reviews.
 */

import type { MasteryAssessment } from "../knowledge/index.ts";
import type { MisconceptionRecord } from "../learning/misconceptions.ts";
import type { KnowledgeGraphSnapshot } from "../knowledge/index.ts";
import {
  isDue,
  isOverdue,
  seedScheduleFromMastery,
} from "./scheduler.ts";
import type {
  DailyPlanItem,
  DailyRevisionPlan,
  RevisionSchedule,
} from "./types.ts";

function rid(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function planDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

const TYPE_PRIORITY: Record<string, number> = {
  misconception_remediation: 1,
  prerequisite_repair: 2,
  practice: 3,
  reassessment: 4,
  initial_review: 5,
  maintenance: 6,
};

export function buildDailyPlan(input: {
  schedules: RevisionSchedule[];
  mastery: MasteryAssessment[];
  misconceptions: MisconceptionRecord[];
  graphs?: KnowledgeGraphSnapshot[];
  maxItems?: number;
  now?: Date;
  existingPlan?: DailyRevisionPlan | null;
}): DailyRevisionPlan {
  const now = input.now ?? new Date();
  const planDate = planDateString(now);
  const maxItems = input.maxItems ?? 8;
  const masteryByKey = new Map(
    input.mastery.map((m) => [`${m.packId ?? "local"}:${m.objectiveId}`, m]),
  );

  // Ensure schedules exist for mastery rows that need attention
  const scheduleMap = new Map(input.schedules.map((s) => [s.id, s]));
  for (const m of input.mastery) {
    const sid = `rs_${m.packId ?? "local"}__${m.objectiveId}`;
    if (!scheduleMap.has(sid)) {
      if (
        m.state === "not_started" ||
        m.state === "needs_review" ||
        m.state === "practising" ||
        m.hasPersistentMisconception
      ) {
        const seeded = seedScheduleFromMastery({
          mastery: m,
          topicLabel: null,
          misconceptions: input.misconceptions,
          now: now.toISOString(),
        });
        scheduleMap.set(seeded.id, seeded);
      }
    }
  }

  const items: DailyPlanItem[] = [];
  const seen = new Set<string>();

  // Avoid re-adding postponed-beyond-today items
  for (const schedule of scheduleMap.values()) {
    if (schedule.postponedUntil && new Date(schedule.postponedUntil) > now) continue;
    const key = `${schedule.packId ?? ""}:${schedule.objectiveId}`;
    if (seen.has(key)) continue;

    const overdue = isOverdue(schedule, now);
    const due = isDue(schedule, now);
    const m = masteryByKey.get(`${schedule.packId ?? "local"}:${schedule.objectiveId}`);

    let urgency: DailyPlanItem["urgency"] = "upcoming";
    let include = false;
    if (overdue) {
      urgency = "overdue";
      include = true;
    } else if (due) {
      urgency = "due_today";
      include = true;
    } else if (schedule.hasOpenMisconception || m?.hasPersistentMisconception) {
      urgency = "attention";
      include = true;
    } else if (m?.state === "needs_review") {
      urgency = "attention";
      include = true;
    }

    if (!include) continue;
    seen.add(key);

    const priorityBase = TYPE_PRIORITY[schedule.activityType] ?? 9;
    const priority =
      priorityBase +
      (overdue ? 0 : due ? 1 : 2) +
      (schedule.hasOpenMisconception ? 0 : 1);

    let reason = schedule.reason;
    if (overdue) {
      reason = `Overdue review: ${schedule.reason}`;
    }

    items.push({
      id: rid("dpi"),
      scheduleId: schedule.id,
      objectiveId: schedule.objectiveId,
      packId: schedule.packId,
      topicLabel: schedule.topicLabel,
      activityType: schedule.activityType,
      priority,
      urgency,
      reason,
      estimatedMinutes:
        schedule.activityType === "misconception_remediation"
          ? 15
          : schedule.activityType === "maintenance"
            ? 8
            : 10,
      documentId: null,
      misconceptionId: null,
    });
  }

  // Confirmed misconceptions without a schedule still surface
  for (const mc of input.misconceptions) {
    if (mc.status !== "confirmed" && mc.status !== "needs_reassessment") continue;
    const key = `mc:${mc.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: rid("dpi"),
      scheduleId: `mc_sched_${mc.id}`,
      objectiveId: mc.topicLabel ? `topic:${mc.topicLabel}` : mc.concept,
      packId: null,
      topicLabel: mc.topicLabel,
      activityType: "misconception_remediation",
      priority: 1,
      urgency: "attention",
      reason: `Confirmed pattern “${mc.title}” still needs targeted clarification.`,
      estimatedMinutes: 15,
      documentId: mc.documentId,
      misconceptionId: mc.id,
    });
  }

  items.sort((a, b) => a.priority - b.priority || a.objectiveId.localeCompare(b.objectiveId));

  // If learner postponed items earlier today, keep plan stable when possible
  if (input.existingPlan && input.existingPlan.planDate === planDate) {
    const postponedIds = new Set(
      input.schedules.filter((s) => s.postponedUntil && new Date(s.postponedUntil) > now).map((s) => s.id),
    );
    const filtered = items.filter((i) => !postponedIds.has(i.scheduleId));
    return {
      id: input.existingPlan.id,
      planDate,
      items: filtered.slice(0, maxItems),
      createdAt: input.existingPlan.createdAt,
      updatedAt: now.toISOString(),
    };
  }

  return {
    id: rid("drp"),
    planDate,
    items: items.slice(0, maxItems),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
