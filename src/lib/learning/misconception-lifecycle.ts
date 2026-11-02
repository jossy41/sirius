/**
 * Misconception lifecycle: detect → evidence → confidence → remediate → resolve.
 * One incorrect answer never permanently labels a learner.
 */

export type MisconceptionLifecycleState =
  | "suspected"
  | "active"
  | "improving"
  | "resolved"
  | "reopened";

export interface LifecycleInput {
  occurrenceCount: number;
  correctAfterCount: number;
  lastSeenAt: string;
  resolvedAt?: string | null;
  now?: Date;
}

export const LIFECYCLE_THRESHOLDS = {
  activeAtIncorrect: 2,
  improvingAtCorrect: 2,
  resolvedMinCorrect: 3,
  resolvedCorrectMargin: 2,
} as const;

export function estimateMisconceptionConfidence(input: LifecycleInput): "low" | "medium" | "high" {
  if (input.occurrenceCount <= 1) return "low";
  if (input.occurrenceCount === 2) return "medium";
  return "high";
}

export function deriveLifecycleState(input: LifecycleInput): MisconceptionLifecycleState {
  const incorrect = input.occurrenceCount;
  const correct = input.correctAfterCount;

  if (input.resolvedAt && incorrect === 0) return "resolved";

  // Positive evidence clearly outweighs incorrect history
  if (
    correct >= LIFECYCLE_THRESHOLDS.resolvedMinCorrect &&
    correct >= incorrect + LIFECYCLE_THRESHOLDS.resolvedCorrectMargin
  ) {
    return "resolved";
  }

  if (incorrect <= 0) return "resolved";

  if (incorrect === 1 && correct === 0) return "suspected";

  if (correct >= LIFECYCLE_THRESHOLDS.improvingAtCorrect && incorrect > 0) {
    return "improving";
  }

  if (incorrect >= LIFECYCLE_THRESHOLDS.activeAtIncorrect && correct === 0) {
    return "active";
  }

  if (incorrect >= 1 && correct === 0) {
    return incorrect >= LIFECYCLE_THRESHOLDS.activeAtIncorrect ? "active" : "suspected";
  }

  // Some correct but not yet improving threshold
  if (correct > 0 && incorrect > correct) return "reopened";
  if (correct > 0) return "improving";

  return "active";
}

export function shouldRecommendRemediation(state: MisconceptionLifecycleState): boolean {
  return state === "suspected" || state === "active" || state === "reopened" || state === "improving";
}

export function lifecycleLabel(state: MisconceptionLifecycleState): string {
  switch (state) {
    case "suspected":
      return "Possible misunderstanding (needs more evidence)";
    case "active":
      return "Needs attention";
    case "improving":
      return "Improving after practice";
    case "resolved":
      return "Appears resolved";
    case "reopened":
      return "Returned after earlier progress";
  }
}

export function toStoredStatus(
  state: MisconceptionLifecycleState,
): "suspected" | "confirmed" | "improving" | "resolved" | "needs_reassessment" {
  switch (state) {
    case "suspected":
      return "suspected";
    case "active":
    case "reopened":
      return "confirmed";
    case "improving":
      return "improving";
    case "resolved":
      return "resolved";
  }
}

export function aggregateLifecycleFromObservations(
  observations: Array<{
    attemptId?: string | null;
    evaluationId?: string | null;
    kind?: "incorrect" | "correct";
  }>,
  resolvedAt?: string | null,
): LifecycleInput {
  const seen = new Set<string>();
  let incorrect = 0;
  let correct = 0;
  let lastSeenAt = new Date(0).toISOString();
  for (const o of observations) {
    const key = o.evaluationId || o.attemptId || JSON.stringify(o);
    if (seen.has(key)) continue;
    seen.add(key);
    if (o.kind === "correct") correct += 1;
    else incorrect += 1;
    lastSeenAt = new Date().toISOString();
  }
  return {
    occurrenceCount: incorrect,
    correctAfterCount: correct,
    lastSeenAt,
    resolvedAt: resolvedAt ?? null,
  };
}

export function applyNewEvidence(
  prev: LifecycleInput,
  evidence: "incorrect" | "correct",
): { next: LifecycleInput; state: MisconceptionLifecycleState } {
  const next: LifecycleInput = {
    occurrenceCount: prev.occurrenceCount,
    correctAfterCount: prev.correctAfterCount,
    lastSeenAt: new Date().toISOString(),
    resolvedAt: prev.resolvedAt ?? null,
  };
  if (evidence === "incorrect") {
    if (prev.resolvedAt) {
      next.occurrenceCount = 1;
      next.correctAfterCount = 0; // new episode; recovery must be earned again
      next.resolvedAt = null;
    } else {
      next.occurrenceCount += 1;
      next.resolvedAt = null;
    }
  } else {
    next.correctAfterCount += 1;
    const state = deriveLifecycleState(next);
    if (state === "resolved") {
      next.resolvedAt = new Date().toISOString();
    }
  }
  return { next, state: deriveLifecycleState(next) };
}
