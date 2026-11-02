import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  analyseAnswerForMisconception,
  classifyErrorKind,
  isEvidenceSufficient,
  nextMisconceptionStatus,
  validateMisconceptionRecord,
  buildRemediationActivity,
  type MisconceptionRecord,
} from "./misconceptions.ts";
import type { AnswerEvaluation, LearningQuestion } from "./types.ts";

function sampleQuestion(overrides: Partial<LearningQuestion> = {}): LearningQuestion {
  return {
    id: "q1",
    type: "short_answer",
    text: "What is the difference between mass and weight?",
    difficulty: "medium",
    cognitiveLevel: "understand",
    subject: "physics",
    topic: "mass and weight",
    objectiveId: null,
    documentId: "doc1",
    sourceExcerpts: [
      {
        documentId: "doc1",
        chunkId: "c0",
        pageStart: 10,
        pageEnd: 11,
        text: "Mass is the amount of matter in an object measured in kilograms. Weight is the gravitational force on that mass measured in newtons.",
      },
    ],
    choices: null,
    correctChoiceIndex: null,
    expectedAnswer: "Mass is amount of matter; weight is gravitational force on mass.",
    markingGuidance: null,
    explanation: "Mass and weight are related but different quantities.",
    evidenceLevel: "direct",
    generatedBy: "heuristic",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function sampleEval(overrides: Partial<AnswerEvaluation> = {}): AnswerEvaluation {
  return {
    id: "ev1",
    questionId: "q1",
    studentAnswer: "Mass and weight are the same thing measured in kg",
    correctness: "incorrect",
    explanation: "Does not match source",
    understood: [],
    missingOrIncorrect: ["Confused mass with weight"],
    suggestedImprovement: "Re-read pages 10–11",
    sourceExcerpts: sampleQuestion().sourceExcerpts,
    confidence: "medium",
    evidenceLevel: "direct",
    evaluatedBy: "heuristic",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("misconception schema validation", () => {
  it("accepts a well-formed record", () => {
    const now = new Date().toISOString();
    const rec: MisconceptionRecord = {
      id: "mc1",
      concept: "mass",
      topicLabel: "mass and weight",
      documentId: "doc1",
      category: "confused_related_concepts",
      description: "Confuses mass with weight",
      title: "Mass vs weight",
      observations: [],
      supportingExcerpts: [],
      confidence: "medium",
      status: "confirmed",
      firstObservedAt: now,
      lastObservedAt: now,
      observationCount: 2,
      remediationSessionIds: [],
      diagnosticQuestionIds: [],
      createdAt: now,
      updatedAt: now,
    };
    assert.equal(validateMisconceptionRecord(rec), true);
  });

  it("rejects incomplete objects", () => {
    assert.equal(validateMisconceptionRecord({ id: "x" }), false);
  });
});

describe("error kind classification", () => {
  it("flags empty answers as incomplete", () => {
    const ev = sampleEval({ studentAnswer: "  ", correctness: "incorrect" });
    assert.equal(classifyErrorKind(ev, sampleQuestion()), "incomplete_answer");
  });

  it("detects mass/weight conceptual confusion", () => {
    const ev = sampleEval({
      studentAnswer: "Weight is the amount of matter in kilograms",
    });
    assert.equal(classifyErrorKind(ev, sampleQuestion()), "conceptual_misunderstanding");
  });

  it("treats isolated MC miss as careless", () => {
    const q = sampleQuestion({
      type: "multiple_choice",
      choices: ["a", "b", "c"],
      correctChoiceIndex: 0,
    });
    const ev = sampleEval({ studentAnswer: "b", correctness: "incorrect" });
    assert.equal(classifyErrorKind(ev, q), "careless_mistake");
  });
});

describe("evidence sufficiency", () => {
  it("requires more than one observation", () => {
    const r = isEvidenceSufficient(
      [{ id: "o1", attemptId: null, evaluationId: "e1", questionId: "q1", studentAnswer: "x", note: "", observedAt: "" }],
      ["conceptual_misunderstanding"],
    );
    assert.equal(r.sufficient, false);
    assert.equal(r.confidence, "low");
  });

  it("confirms with two conceptual signals", () => {
    const obs = [
      { id: "o1", attemptId: null, evaluationId: "e1", questionId: "q1", studentAnswer: "x", note: "", observedAt: "" },
      { id: "o2", attemptId: null, evaluationId: "e2", questionId: "q2", studentAnswer: "y", note: "", observedAt: "" },
    ];
    const r = isEvidenceSufficient(obs, [
      "conceptual_misunderstanding",
      "conceptual_misunderstanding",
    ]);
    assert.equal(r.sufficient, true);
    assert.ok(r.confidence === "medium" || r.confidence === "high");
  });
});

describe("diagnostic analysis", () => {
  it("asks for more evidence on first wrong conceptual answer", () => {
    const result = analyseAnswerForMisconception({
      evaluation: sampleEval(),
      question: sampleQuestion(),
      priorAttempts: [],
      priorEvaluations: [],
    });
    assert.equal(result.needsMoreEvidence, true);
    assert.ok(result.diagnosticQuestionPrompt);
    assert.ok(result.possibleMisconception);
    assert.equal(result.possibleMisconception?.status, "suspected");
  });

  it("does not diagnose correct answers", () => {
    const result = analyseAnswerForMisconception({
      evaluation: sampleEval({ correctness: "correct", studentAnswer: "Mass is matter; weight is force" }),
      question: sampleQuestion(),
      priorAttempts: [],
      priorEvaluations: [],
    });
    assert.equal(result.possibleMisconception, null);
    assert.equal(result.needsMoreEvidence, false);
  });
});

describe("status transitions", () => {
  it("moves confirmed → improving after correct reassessment", () => {
    assert.equal(nextMisconceptionStatus("confirmed", "correct_reassessment", 1), "improving");
  });

  it("does not resolve after a single correct response", () => {
    assert.notEqual(nextMisconceptionStatus("confirmed", "correct_reassessment", 1), "resolved");
  });

  it("resolves after sustained improvement", () => {
    assert.equal(nextMisconceptionStatus("improving", "correct_reassessment", 2), "resolved");
  });
});

describe("remediation", () => {
  it("builds activity with textbook distinction", () => {
    const now = new Date().toISOString();
    const mc: MisconceptionRecord = {
      id: "mc1",
      concept: "mass",
      topicLabel: "mass and weight",
      documentId: "doc1",
      category: "confused_related_concepts",
      description: "Confuses mass with weight",
      title: "Mass vs weight",
      observations: [],
      supportingExcerpts: sampleQuestion().sourceExcerpts,
      confidence: "medium",
      status: "confirmed",
      firstObservedAt: now,
      lastObservedAt: now,
      observationCount: 2,
      remediationSessionIds: [],
      diagnosticQuestionIds: [],
      createdAt: now,
      updatedAt: now,
    };
    const activity = buildRemediationActivity(mc, []);
    assert.ok(activity.simpleExplanation.length > 10);
    assert.ok(activity.distinctionQuestion);
    assert.ok(activity.explainYourselfPrompt);
    assert.equal(activity.teachingExampleIsGenerated, true);
  });
});
