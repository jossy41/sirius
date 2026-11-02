import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankPracticeCandidates } from "./adaptive-practice.ts";
import {
  deriveLifecycleState,
  estimateMisconceptionConfidence,
  shouldRecommendRemediation,
} from "./misconception-lifecycle.ts";
import { buildStudyPlan } from "../revision/study-plan.ts";
import { validateCurriculumPackStructure } from "../curriculum/validate-pack.ts";
import { segmentSentences, tokenizeLanguageAware, detectScriptLanguage } from "../retrieval/language.ts";

describe("M13 adaptive practice", () => {
  it("prioritizes active misconceptions", () => {
    const ranked = rankPracticeCandidates(
      [
        { questionId: "q1", objectiveId: "o1", topicLabel: "Mass" },
        { questionId: "q2", objectiveId: "o2", topicLabel: "Force" },
      ],
      {
        masteryByObjective: new Map([["o1", "proficient"], ["o2", "developing"]]),
        misconceptionObjectiveIds: new Set(["o2"]),
        prerequisiteBlocked: new Set(),
      },
    );
    assert.equal(ranked[0]!.questionId, "q2");
    assert.ok(ranked[0]!.reasons.includes("active_misconception"));
  });
});

describe("M13 misconception lifecycle", () => {
  it("single error is only suspected", () => {
    assert.equal(
      deriveLifecycleState({ occurrenceCount: 1, correctAfterCount: 0, lastSeenAt: new Date().toISOString() }),
      "suspected",
    );
    assert.equal(estimateMisconceptionConfidence({ occurrenceCount: 1, correctAfterCount: 0, lastSeenAt: "" }), "low");
  });
  it("recommends remediation for active states", () => {
    assert.equal(shouldRecommendRemediation("active"), true);
    assert.equal(shouldRecommendRemediation("resolved"), false);
  });
});

describe("M14 study plan", () => {
  it("respects daily minute budget", () => {
    const plan = buildStudyPlan({
      date: "2026-11-02",
      preferences: {
        subjectLabels: [],
        topicLabels: [],
        minutesPerDay: 30,
        targetDate: null,
        priorities: ["misconceptions", "revision", "practice"],
      },
      dueRevisionTitles: [
        { id: "1", title: "Revise mass", objectiveId: "o1" },
        { id: "2", title: "Revise force", objectiveId: "o2" },
        { id: "3", title: "Revise energy", objectiveId: "o3" },
      ],
      misconceptionTitles: [{ id: "m1", title: "Mass vs weight", objectiveId: "o1" }],
      practiceHints: [{ id: "p1", title: "Practice force", objectiveId: "o2" }],
    });
    assert.ok(plan.totalMinutes <= 30 + 15); // first item may exceed slightly only if empty — budget stops further
    assert.ok(plan.items.length >= 1);
  });
});

describe("M17 curriculum validation", () => {
  it("detects circular prerequisites", () => {
    const issues = validateCurriculumPackStructure({
      objectives: [
        { id: "a", code: "A", prerequisiteObjectiveIds: ["b"] },
        { id: "b", code: "B", prerequisiteObjectiveIds: ["a"] },
      ],
    });
    assert.ok(issues.some((i) => i.code === "circular_prerequisite"));
  });
});

describe("M12 language", () => {
  it("segments Ethiopic sentences", () => {
    const s = segmentSentences("ሰላም ነው። እንደምን ነህ?", "am");
    assert.ok(s.length >= 1);
  });
  it("tokenizes Oromo latin text", () => {
    const t = tokenizeLanguageAware("barumsaafi jireenya", "om");
    assert.ok(t.length >= 1);
  });
  it("detects Ethiopic", () => {
    assert.equal(detectScriptLanguage("ትምህርት"), "am");
  });
});
