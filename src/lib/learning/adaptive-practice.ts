/**
 * Adaptive practice selection using mastery, misconceptions, and prerequisites.
 * Source-grounded: only ranks existing question ids — does not invent content.
 */

export type PracticePriorityReason =
  | "active_misconception"
  | "prerequisite_gap"
  | "needs_review"
  | "developing"
  | "not_started"
  | "reinforce";

export interface PracticeCandidate {
  questionId: string;
  objectiveId: string | null;
  topicLabel: string | null;
  difficulty?: "easy" | "medium" | "hard" | null;
}

export interface AdaptiveContext {
  masteryByObjective: Map<string, string>; // objectiveId -> MasteryState
  misconceptionObjectiveIds: Set<string>;
  prerequisiteBlocked: Set<string>;
}

export interface RankedPractice {
  questionId: string;
  score: number;
  reasons: PracticePriorityReason[];
  objectiveId: string | null;
  topicLabel: string | null;
}

const STATE_WEIGHT: Record<string, number> = {
  needs_review: 50,
  developing: 40,
  practising: 30,
  introduced: 25,
  not_started: 20,
  proficient: 5,
};

export function rankPracticeCandidates(
  candidates: PracticeCandidate[],
  ctx: AdaptiveContext,
  limit = 10,
): RankedPractice[] {
  const ranked: RankedPractice[] = [];
  for (const c of candidates) {
    const reasons: PracticePriorityReason[] = [];
    let score = 10;
    const obj = c.objectiveId;
    if (obj && ctx.misconceptionObjectiveIds.has(obj)) {
      score += 60;
      reasons.push("active_misconception");
    }
    if (obj && ctx.prerequisiteBlocked.has(obj)) {
      score += 45;
      reasons.push("prerequisite_gap");
    }
    const state = obj ? ctx.masteryByObjective.get(obj) : undefined;
    if (state) {
      score += STATE_WEIGHT[state] ?? 15;
      if (state === "needs_review") reasons.push("needs_review");
      else if (state === "developing" || state === "practising") reasons.push("developing");
      else if (state === "not_started" || state === "introduced") reasons.push("not_started");
      else if (state === "proficient") reasons.push("reinforce");
    } else {
      score += 18;
      reasons.push("not_started");
    }
    if (c.difficulty === "hard") score += 3;
    if (c.difficulty === "easy" && state === "proficient") score -= 5;
    ranked.push({
      questionId: c.questionId,
      score,
      reasons: reasons.length ? reasons : ["not_started"],
      objectiveId: c.objectiveId,
      topicLabel: c.topicLabel,
    });
  }
  return ranked.sort((a, b) => b.score - a.score).slice(0, limit);
}
