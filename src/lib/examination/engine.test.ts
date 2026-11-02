import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  selectExamQuestions,
  buildExamDefinition,
  snapshotQuestions,
  createExamSession,
  startExamSession,
  remainingSeconds,
  saveAnswer,
  submitExamSession,
  validateBlueprintConfig,
} from "./engine.ts";
import type { LearningQuestion } from "../learning/types.ts";

function q(partial: Partial<LearningQuestion> & { id: string; text: string }): LearningQuestion {
  return {
    type: "short_answer",
    difficulty: "medium",
    cognitiveLevel: "understand",
    subject: "physics",
    topic: "mass and weight",
    objectiveId: "obj1",
    documentId: "doc1",
    sourceExcerpts: [
      { documentId: "doc1", chunkId: "c0", pageStart: 1, pageEnd: 2, text: "Mass is matter." },
    ],
    choices: null,
    correctChoiceIndex: null,
    expectedAnswer: "Mass is amount of matter",
    markingGuidance: null,
    explanation: "",
    evidenceLevel: "direct",
    generatedBy: "heuristic",
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe("examination engine", () => {
  it("validates blueprint weights", () => {
    const bad = validateBlueprintConfig({
      blueprintId: "bp1",
      packId: "p",
      versionId: "v",
      subjectId: "s",
      gradeCode: "9",
      streamCode: null,
      topicWeights: [{ topicId: "t", weight: 0.5, itemCountHint: 2 }],
      totalMarks: 10,
      durationMinutes: 30,
      questionCount: 5,
    });
    assert.equal(bad.ok, false);
  });

  it("selects unique questions and avoids inventing content", () => {
    const pool = [1, 2, 3, 4, 5].map((n) =>
      q({ id: `q${n}`, text: `Question number ${n} about mass?` }),
    );
    const res = selectExamQuestions({
      packId: null,
      topicLabels: ["mass"],
      questionCount: 3,
      availableQuestions: pool,
    });
    assert.equal(res.ok, true);
    assert.equal(res.questions.length, 3);
    const ids = new Set(res.questions.map((x) => x.id));
    assert.equal(ids.size, 3);
  });

  it("fails clearly when pool is empty", () => {
    const res = selectExamQuestions({
      packId: null,
      topicLabels: ["nonexistent-topic-xyz"],
      questionCount: 5,
      availableQuestions: [q({ id: "q1", text: "Other", topic: "chemistry" })],
    });
    assert.equal(res.ok, false);
    assert.ok(res.message && res.message.length > 20);
  });

  it("labels practice assessments as non-official", () => {
    const qs = [q({ id: "q1", text: "What is mass?" })];
    const def = buildExamDefinition(
      { packId: "p1", availableQuestions: qs, questionCount: 1 },
      qs,
    );
    assert.equal(def.isOfficialSimulation, false);
    assert.ok(def.assessmentLabel.toLowerCase().includes("practice"));
  });

  it("preserves remaining time across logical refresh via endsAt", () => {
    const qs = [q({ id: "q1", text: "Q?" })];
    const def = buildExamDefinition({ packId: null, availableQuestions: qs }, qs);
    let session = createExamSession(def, snapshotQuestions(qs));
    const start = new Date("2026-01-01T10:00:00.000Z");
    session = startExamSession(session, start);
    assert.equal(session.status, "in_progress");
    assert.ok(session.endsAt);
    const mid = new Date("2026-01-01T10:05:00.000Z");
    const rem = remainingSeconds(session, mid);
    assert.ok(rem < session.durationMinutes * 60);
    assert.ok(rem > 0);
    // "refresh" — same endsAt
    const rem2 = remainingSeconds({ ...session }, mid);
    assert.equal(rem, rem2);
  });

  it("save and submit are idempotent for double submit", () => {
    const qs = [q({ id: "q1", text: "Q?" })];
    const def = buildExamDefinition({ packId: null, availableQuestions: qs }, qs);
    const snaps = snapshotQuestions(qs);
    let session = startExamSession(createExamSession(def, snaps));
    session = saveAnswer(session, snaps[0]!.id, "my answer");
    assert.equal(session.answerStatus[snaps[0]!.id], "answered");
    const once = submitExamSession(session);
    const twice = submitExamSession(once);
    assert.equal(once.submittedAt, twice.submittedAt);
    assert.equal(twice.status, "submitted");
  });

  it("does not duplicate question text in selection", () => {
    const pool = [
      q({ id: "q1", text: "Same text" }),
      q({ id: "q2", text: "Same text" }),
      q({ id: "q3", text: "Different" }),
    ];
    const res = selectExamQuestions({
      packId: null,
      questionCount: 5,
      availableQuestions: pool,
    });
    assert.ok(res.questions.length <= 2);
  });
});
