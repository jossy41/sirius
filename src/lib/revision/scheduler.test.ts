import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyReviewOutcome,
  seedScheduleFromMastery,
  isDue,
  postponeSchedule,
  addDaysISO,
  computeRetentionTrend,
} from "./scheduler.ts";
import { buildDailyPlan } from "./planner.ts";
import type { MasteryAssessment } from "../knowledge/index.ts";
import type { MisconceptionRecord } from "../learning/misconceptions.ts";

function mastery(partial: Partial<MasteryAssessment> & { objectiveId: string }): MasteryAssessment {
  return {
    id: `mas_${partial.objectiveId}`,
    conceptId: null,
    packId: partial.packId ?? "packA",
    state: "practising",
    confidence: "medium",
    evidenceCount: 2,
    correctCount: 1,
    incorrectCount: 1,
    partialCount: 0,
    recentAccuracy: 0.5,
    hasPersistentMisconception: false,
    missingPrerequisiteIds: [],
    lastEvidenceAt: null,
    rationale: "test",
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe("revision scheduler", () => {
  it("schedules first review with short interval", () => {
    const s = seedScheduleFromMastery({
      mastery: mastery({ objectiveId: "obj1", state: "introduced" }),
      topicLabel: "mass",
      misconceptions: [],
    });
    assert.ok(s.intervalDays >= 1);
    assert.ok(s.nextReviewAt);
    assert.ok(s.reason.length > 10);
  });

  it("lengthens interval after successive correct reviews", () => {
    let s = applyReviewOutcome({
      existing: null,
      objectiveId: "obj1",
      packId: "packA",
      topicLabel: "mass",
      conceptId: null,
      mastery: mastery({ objectiveId: "obj1", state: "developing" }),
      misconceptions: [],
      correctness: "correct",
    });
    const first = s.intervalDays;
    s = applyReviewOutcome({
      existing: s,
      objectiveId: "obj1",
      packId: "packA",
      topicLabel: "mass",
      conceptId: null,
      mastery: mastery({ objectiveId: "obj1", state: "proficient" }),
      misconceptions: [],
      correctness: "correct",
    });
    assert.ok(s.intervalDays >= first);
    assert.equal(s.consecutiveSuccesses, 2);
  });

  it("shortens interval after incorrect review", () => {
    const base = applyReviewOutcome({
      existing: null,
      objectiveId: "obj1",
      packId: "packA",
      topicLabel: "mass",
      conceptId: null,
      mastery: mastery({ objectiveId: "obj1", state: "proficient" }),
      misconceptions: [],
      correctness: "correct",
    });
    const failed = applyReviewOutcome({
      existing: base,
      objectiveId: "obj1",
      packId: "packA",
      topicLabel: "mass",
      conceptId: null,
      mastery: mastery({ objectiveId: "obj1", state: "needs_review" }),
      misconceptions: [],
      correctness: "incorrect",
    });
    assert.equal(failed.intervalDays, 1);
    assert.equal(failed.consecutiveFailures, 1);
  });

  it("open misconception forces soon review", () => {
    const mc: MisconceptionRecord = {
      id: "mc1",
      concept: "mass",
      topicLabel: "mass",
      documentId: "d1",
      category: "confused_related_concepts",
      description: "x",
      title: "Mass vs weight",
      observations: [],
      supportingExcerpts: [],
      confidence: "high",
      status: "confirmed",
      firstObservedAt: new Date().toISOString(),
      lastObservedAt: new Date().toISOString(),
      observationCount: 2,
      remediationSessionIds: [],
      diagnosticQuestionIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const s = applyReviewOutcome({
      existing: null,
      objectiveId: "obj1",
      packId: "packA",
      topicLabel: "mass",
      conceptId: null,
      mastery: mastery({ objectiveId: "obj1", hasPersistentMisconception: true }),
      misconceptions: [mc],
      correctness: null,
    });
    assert.equal(s.activityType, "misconception_remediation");
    assert.equal(s.intervalDays, 1);
  });

  it("postpone moves due date", () => {
    const s = seedScheduleFromMastery({
      mastery: mastery({ objectiveId: "obj1" }),
      topicLabel: "t",
      misconceptions: [],
    });
    const p = postponeSchedule(s, 1);
    assert.ok(p.postponedUntil);
    assert.equal(isDue(p), false);
  });

  it("retention trend stays unknown without history", () => {
    const t = computeRetentionTrend(null, []);
    assert.equal(t.trend, "unknown");
  });
});

describe("daily planner", () => {
  it("orders misconception work before maintenance", () => {
    const overdueSched = seedScheduleFromMastery({
      mastery: mastery({ objectiveId: "obj_mc", state: "needs_review", hasPersistentMisconception: true }),
      topicLabel: "mass",
      misconceptions: [],
    });
    overdueSched.nextReviewAt = addDaysISO(new Date().toISOString(), -3);
    overdueSched.hasOpenMisconception = true;
    overdueSched.activityType = "misconception_remediation";

    const plan = buildDailyPlan({
      schedules: [overdueSched],
      mastery: [mastery({ objectiveId: "obj_mc", state: "needs_review", hasPersistentMisconception: true })],
      misconceptions: [],
    });
    assert.ok(plan.items.length >= 1);
    assert.equal(plan.items[0]!.urgency === "overdue" || plan.items[0]!.activityType === "misconception_remediation", true);
  });

  it("empty plan when nothing due", () => {
    const future = seedScheduleFromMastery({
      mastery: mastery({ objectiveId: "obj1", state: "proficient" }),
      topicLabel: "t",
      misconceptions: [],
    });
    future.nextReviewAt = addDaysISO(new Date().toISOString(), 14);
    const plan = buildDailyPlan({
      schedules: [future],
      mastery: [mastery({ objectiveId: "obj1", state: "proficient" })],
      misconceptions: [],
    });
    assert.equal(plan.items.length, 0);
  });
});
