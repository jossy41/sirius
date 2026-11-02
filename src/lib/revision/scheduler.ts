/**
 * Explainable spaced-repetition scheduler.
 * Intervals grow with success and shrink with difficulty — not a scientific retention %.
 */

import type { MasteryAssessment, MasteryState } from "../knowledge/index.ts";
import type { MisconceptionRecord } from "../learning/misconceptions.ts";
import type { Correctness } from "../learning/types.ts";
import type { RevisionActivityType, RevisionSchedule, RetentionSnapshot, RetentionTrend } from "./types.ts";

const MIN_INTERVAL = 1;
const MAX_INTERVAL = 60;

export function scheduleId(objectiveId: string, packId: string | null): string {
  return `rs_${packId ?? "local"}__${objectiveId}`;
}

function startOfDayISO(d = new Date()): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function activityForState(
  state: MasteryState | null,
  hasMc: boolean,
  missingPrereq: boolean,
): RevisionActivityType {
  if (hasMc) return "misconception_remediation";
  if (missingPrereq) return "prerequisite_repair";
  if (!state || state === "not_started") return "initial_review";
  if (state === "needs_review" || state === "practising") return "practice";
  if (state === "introduced" || state === "developing") return "reassessment";
  return "maintenance";
}

function baseIntervalDays(
  state: MasteryState | null,
  consecutiveSuccesses: number,
  hasMc: boolean,
): number {
  if (hasMc) return 1;
  if (!state || state === "not_started" || state === "needs_review") return 1;
  if (state === "introduced" || state === "practising") return Math.min(2 + consecutiveSuccesses, 4);
  if (state === "developing") return Math.min(3 + consecutiveSuccesses * 2, 10);
  // proficient maintenance
  return Math.min(7 + consecutiveSuccesses * 3, MAX_INTERVAL);
}

/**
 * Create or update a schedule after a review outcome.
 */
export function applyReviewOutcome(input: {
  existing: RevisionSchedule | null;
  objectiveId: string;
  packId: string | null;
  topicLabel: string | null;
  conceptId: string | null;
  mastery: MasteryAssessment | null;
  misconceptions: MisconceptionRecord[];
  correctness: Correctness | null;
  now?: string;
}): RevisionSchedule {
  const now = input.now ?? new Date().toISOString();
  const today = startOfDayISO(new Date(now));
  const openMc = input.misconceptions.some((m) => {
    if (m.status !== "confirmed" && m.status !== "needs_reassessment" && m.status !== "improving") {
      return false;
    }
    if (input.topicLabel && m.topicLabel === input.topicLabel) return true;
    if (input.conceptId && m.concept === input.conceptId) return true;
    return !input.topicLabel && !input.conceptId;
  });

  const prev = input.existing;
  let consecutiveSuccesses = prev?.consecutiveSuccesses ?? 0;
  let consecutiveFailures = prev?.consecutiveFailures ?? 0;
  const reviewCount = (prev?.reviewCount ?? 0) + (input.correctness ? 1 : 0);

  if (input.correctness === "correct") {
    consecutiveSuccesses += 1;
    consecutiveFailures = 0;
  } else if (input.correctness === "incorrect" || input.correctness === "partial") {
    consecutiveFailures += 1;
    consecutiveSuccesses = 0;
  }

  const state = input.mastery?.state ?? prev?.masteryStateAtSchedule ?? null;
  const missingPrereq = (input.mastery?.missingPrerequisiteIds.length ?? 0) > 0;
  const activityType = activityForState(state, openMc, missingPrereq);

  let interval = baseIntervalDays(state, consecutiveSuccesses, openMc);
  if (openMc) {
    interval = MIN_INTERVAL;
  } else if (input.correctness === "incorrect") {
    interval = MIN_INTERVAL;
  } else if (input.correctness === "partial") {
    interval = Math.max(MIN_INTERVAL, Math.floor(interval / 2));
  } else if (input.correctness === "correct" && consecutiveSuccesses >= 2) {
    interval = Math.min(MAX_INTERVAL, interval + consecutiveSuccesses);
  } else if (input.correctness === "unevaluable" || input.correctness === null) {
    interval = prev?.intervalDays ?? baseIntervalDays(state, consecutiveSuccesses, false);
  }

  // Long gap since last success → pull forward
  if (prev?.lastReviewedAt) {
    const gap = daysBetween(prev.lastReviewedAt, now);
    if (gap > (prev.intervalDays || 7) * 2 && state === "proficient") {
      interval = Math.min(interval, 3);
    }
  }

  const nextReviewAt = addDaysISO(today, interval);
  let reason: string;
  if (openMc) {
    reason = "Review today because a confirmed misconception is still open on this idea.";
  } else if (input.correctness === "incorrect") {
    reason = "Review again soon because the latest response showed difficulty.";
  } else if (input.correctness === "correct" && consecutiveSuccesses >= 2) {
    reason = `Review is scheduled further out because recent assessments show consistent understanding (${consecutiveSuccesses} successful reviews in a row).`;
  } else if (!prev || reviewCount <= 1) {
    reason = "First or early review for this objective — short interval until evidence builds.";
  } else if (missingPrereq) {
    reason = "Schedule prioritises foundation work because required prerequisites are not yet secure.";
  } else {
    reason = `Next review in about ${interval} day${interval === 1 ? "" : "s"} based on mastery state (${state ?? "unknown"}) and recent outcomes.`;
  }

  const id = prev?.id ?? scheduleId(input.objectiveId, input.packId);
  return {
    id,
    objectiveId: input.objectiveId,
    packId: input.packId,
    topicLabel: input.topicLabel,
    conceptId: input.conceptId,
    activityType,
    nextReviewAt,
    lastReviewedAt: input.correctness ? now : prev?.lastReviewedAt ?? null,
    lastOutcome: input.correctness ?? prev?.lastOutcome ?? null,
    consecutiveSuccesses,
    consecutiveFailures,
    reviewCount,
    intervalDays: interval,
    masteryStateAtSchedule: state,
    hasOpenMisconception: openMc,
    reason,
    postponedUntil: null,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
}

/** Seed schedules for objectives that have mastery but no schedule yet. */
export function seedScheduleFromMastery(input: {
  mastery: MasteryAssessment;
  topicLabel: string | null;
  misconceptions: MisconceptionRecord[];
  now?: string;
}): RevisionSchedule {
  return applyReviewOutcome({
    existing: null,
    objectiveId: input.mastery.objectiveId,
    packId: input.mastery.packId,
    topicLabel: input.topicLabel,
    conceptId: input.mastery.conceptId,
    mastery: input.mastery,
    misconceptions: input.misconceptions,
    correctness: null,
    now: input.now,
  });
}

export function isDue(schedule: RevisionSchedule, now = new Date()): boolean {
  if (schedule.postponedUntil && new Date(schedule.postponedUntil) > now) return false;
  return new Date(schedule.nextReviewAt) <= now;
}

export function isOverdue(schedule: RevisionSchedule, now = new Date()): boolean {
  if (schedule.postponedUntil && new Date(schedule.postponedUntil) > now) return false;
  const due = new Date(schedule.nextReviewAt);
  const dayMs = 24 * 60 * 60 * 1000;
  return now.getTime() - due.getTime() > dayMs;
}

export function postponeSchedule(schedule: RevisionSchedule, days = 1, now = new Date()): RevisionSchedule {
  const until = addDaysISO(startOfDayISO(now), days);
  return {
    ...schedule,
    postponedUntil: until,
    nextReviewAt: until,
    reason: `Postponed by the learner; next check around ${until.slice(0, 10)}.`,
    updatedAt: now.toISOString(),
  };
}

export function computeRetentionTrend(
  schedule: RevisionSchedule | null,
  historyOutcomes: Correctness[],
): RetentionSnapshot {
  const objectiveId = schedule?.objectiveId ?? "unknown";
  const packId = schedule?.packId ?? null;
  const reviewCount = schedule?.reviewCount ?? historyOutcomes.length;
  if (reviewCount === 0) {
    return {
      objectiveId,
      packId,
      trend: "unknown",
      reviewCount: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      explanation: "No review outcomes recorded yet.",
    };
  }
  if (reviewCount === 1) {
    return {
      objectiveId,
      packId,
      trend: "first_learning",
      reviewCount,
      lastSuccessAt: schedule?.lastOutcome === "correct" ? schedule.lastReviewedAt : null,
      lastFailureAt:
        schedule?.lastOutcome === "incorrect" || schedule?.lastOutcome === "partial"
          ? schedule.lastReviewedAt
          : null,
      explanation: "Only one review so far — too early to judge retention over time.",
    };
  }
  const recent = historyOutcomes.slice(-4);
  const correct = recent.filter((c) => c === "correct").length;
  const incorrect = recent.filter((c) => c === "incorrect" || c === "partial").length;
  let trend: RetentionTrend = "practising";
  let explanation = "Still building a pattern of outcomes.";
  if (schedule?.hasOpenMisconception) {
    trend = "recovering";
    explanation = "Open misconception work is in progress; retention is not yet stable.";
  } else if (correct >= 3 && incorrect === 0) {
    trend = "stable";
    explanation = "Recent reviews were consistently successful.";
  } else if (correct > incorrect && (schedule?.consecutiveSuccesses ?? 0) >= 2) {
    trend = "improving";
    explanation = "Recent outcomes are better than earlier ones.";
  } else if (incorrect >= 2 && correct <= 1) {
    trend = "declining";
    explanation = "Recent reviews show more difficulty than before.";
  }
  return {
    objectiveId,
    packId,
    trend,
    reviewCount,
    lastSuccessAt: schedule?.lastOutcome === "correct" ? schedule.lastReviewedAt : null,
    lastFailureAt:
      schedule?.lastOutcome === "incorrect" || schedule?.lastOutcome === "partial"
        ? schedule.lastReviewedAt
        : null,
    explanation,
  };
}
