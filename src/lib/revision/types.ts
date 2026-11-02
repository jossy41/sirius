/**
 * Adaptive Revision Intelligence — types (Milestone 7).
 * Deterministic, explainable scheduling. Offline-first.
 */

import type { Correctness } from "../learning/types.ts";
import type { MasteryState } from "../knowledge/index.ts";

export type RevisionActivityType =
  | "initial_review"
  | "practice"
  | "reassessment"
  | "misconception_remediation"
  | "maintenance"
  | "prerequisite_repair";

export type RevisionOutcome = "completed" | "postponed" | "skipped";

export type RetentionTrend = "first_learning" | "practising" | "stable" | "improving" | "declining" | "recovering" | "unknown";

/** Next-review schedule for one objective within a pack. */
export interface RevisionSchedule {
  id: string;
  objectiveId: string;
  packId: string | null;
  topicLabel: string | null;
  conceptId: string | null;
  activityType: RevisionActivityType;
  /** ISO date when next review is due (start of day local intent) */
  nextReviewAt: string;
  lastReviewedAt: string | null;
  lastOutcome: Correctness | null;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  reviewCount: number;
  intervalDays: number;
  masteryStateAtSchedule: MasteryState | null;
  hasOpenMisconception: boolean;
  /** Human-readable reason for the current schedule decision */
  reason: string;
  postponedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionHistoryEntry {
  id: string;
  scheduleId: string | null;
  objectiveId: string;
  packId: string | null;
  topicLabel: string | null;
  activityType: RevisionActivityType;
  reviewedAt: string;
  wasOverdue: boolean;
  previousScheduledAt: string | null;
  nextScheduledAt: string | null;
  outcome: RevisionOutcome;
  evaluationCorrectness: Correctness | null;
  evaluationId: string | null;
  attemptId: string | null;
  sessionId: string | null;
  note: string | null;
}

export interface DailyPlanItem {
  id: string;
  scheduleId: string;
  objectiveId: string;
  packId: string | null;
  topicLabel: string | null;
  activityType: RevisionActivityType;
  priority: number;
  urgency: "overdue" | "due_today" | "upcoming" | "attention";
  reason: string;
  estimatedMinutes: number;
  documentId: string | null;
  misconceptionId: string | null;
}

export interface DailyRevisionPlan {
  id: string;
  /** YYYY-MM-DD */
  planDate: string;
  items: DailyPlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface RevisionSession {
  id: string;
  planItemId: string | null;
  scheduleId: string | null;
  objectiveId: string;
  packId: string | null;
  topicLabel: string | null;
  activityType: RevisionActivityType;
  reason: string;
  documentId: string | null;
  questionIds: string[];
  status: "active" | "completed" | "abandoned";
  startedAt: string;
  completedAt: string | null;
  lastEvaluationId: string | null;
  lastCorrectness: Correctness | null;
}

export interface RetentionSnapshot {
  objectiveId: string;
  packId: string | null;
  trend: RetentionTrend;
  reviewCount: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  explanation: string;
}
