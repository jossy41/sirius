/**
 * Revision session helpers — wire into existing practice/evaluation pipeline.
 */

import type { LearningQuestion, PracticeSession } from "../learning/types.ts";
import type { DailyPlanItem, RevisionSession } from "./types.ts";

function rid(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createRevisionSession(input: {
  planItem: DailyPlanItem;
  documentId?: string | null;
  questions?: LearningQuestion[];
}): RevisionSession {
  const now = new Date().toISOString();
  return {
    id: rid("rvs"),
    planItemId: input.planItem.id,
    scheduleId: input.planItem.scheduleId,
    objectiveId: input.planItem.objectiveId,
    packId: input.planItem.packId,
    topicLabel: input.planItem.topicLabel,
    activityType: input.planItem.activityType,
    reason: input.planItem.reason,
    documentId: input.documentId ?? input.planItem.documentId,
    questionIds: (input.questions ?? []).map((q) => q.id),
    status: "active",
    startedAt: now,
    completedAt: null,
    lastEvaluationId: null,
    lastCorrectness: null,
  };
}

export function completeRevisionSession(
  session: RevisionSession,
  result: { evaluationId: string | null; correctness: RevisionSession["lastCorrectness"] },
): RevisionSession {
  return {
    ...session,
    status: "completed",
    completedAt: new Date().toISOString(),
    lastEvaluationId: result.evaluationId,
    lastCorrectness: result.correctness,
  };
}

/** Map a practice session built for revision into question id list. */
export function questionIdsFromPractice(session: PracticeSession | null): string[] {
  return session?.questionIds ?? [];
}
