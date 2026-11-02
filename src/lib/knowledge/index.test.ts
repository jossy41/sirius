import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildConceptId,
  buildKnowledgeGraphSnapshot,
  validateKnowledgeGraph,
  assessMastery,
  collectObjectiveEvidence,
  dedupeEvidence,
  detectKnowledgeGaps,
  buildRecommendations,
  masteryAssessmentId,
  assessAcrossPacks,
} from "./index.ts";
import type { AttemptRecord, AnswerEvaluation, } from "../learning/types.ts";
import type { MisconceptionRecord } from "../learning/misconceptions.ts";
import type { CurriculumPackContent } from "../curriculum/types.ts";

const content = {
  system: { id: "sys1", countryCode: "XX", name: "Test", languages: ["en"], defaultLocale: "en" },
  version: { id: "v1", systemId: "sys1", label: "2026", status: "active", effectiveFrom: "2026-01-01", effectiveTo: null },
  grade: { id: "g9", versionId: "v1", code: "9", label: "Grade 9", sortOrder: 9, stage: "general" },
  streams: [],
  subjects: [{ id: "sub1", versionId: "v1", code: "PHY", name: "Physics", language: "en", gradeCodes: ["9"], streamCodes: [] }],
  topics: [
    { id: "t1", subjectId: "sub1", parentId: null, code: "forces", title: "Forces", sortOrder: 1 },
    { id: "t2", subjectId: "sub1", parentId: "t1", code: "mass_weight", title: "Mass and weight", sortOrder: 2 },
  ],
  objectives: [
    { id: "obj1", topicId: "t2", code: "mw1", statement: "Distinguish mass and weight", cognitiveLevel: "understand" },
    { id: "obj2", topicId: "t2", code: "mw2", statement: "Calculate weight from mass", cognitiveLevel: "apply" },
  ],
  prerequisites: [{ objectiveId: "obj2", requiresObjectiveId: "obj1", kind: "required" }],
  sourceRefs: [],
  blueprints: [],
  blueprintWeights: [],
} as CurriculumPackContent;

function attempt(partial: Partial<AttemptRecord> & Pick<AttemptRecord, "id" | "correctness">): AttemptRecord {
  return {
    sessionId: null,
    questionId: "q1",
    documentId: "d1",
    studentAnswer: "answer",
    evaluationId: partial.evaluationId ?? `ev_${partial.id}`,
    topicLabel: "mass and weight",
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

function evaluation(partial: Partial<AnswerEvaluation> & Pick<AnswerEvaluation, "id" | "correctness">): AnswerEvaluation {
  return {
    questionId: "q1",
    studentAnswer: "answer",
    explanation: "feedback",
    understood: [],
    missingOrIncorrect: [],
    suggestedImprovement: "",
    sourceExcerpts: [],
    confidence: "medium",
    evidenceLevel: "direct",
    evaluatedBy: "heuristic",
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe("knowledge graph", () => {
  it("builds stable concept ids", () => {
    assert.equal(buildConceptId("Mass Weight"), "concept:mass_weight");
  });
  it("builds snapshot and validates", () => {
    const snap = buildKnowledgeGraphSnapshot(content, "pack1");
    assert.equal(snap.packId, "pack1");
    assert.ok(snap.concepts.length >= 2);
    assert.equal(validateKnowledgeGraph(snap).ok, true);
  });
  it("rejects prerequisite cycles", () => {
    const snap = buildKnowledgeGraphSnapshot(content, "pack1");
    const cyclic = {
      ...snap,
      prerequisiteEdges: [
        { objectiveId: "obj1", requiresObjectiveId: "obj2", kind: "required" as const },
        { objectiveId: "obj2", requiresObjectiveId: "obj1", kind: "required" as const },
      ],
    };
    assert.equal(validateKnowledgeGraph(cyclic).ok, false);
  });
});

describe("evidence accounting", () => {
  it("does not double-count attempt and its evaluation", () => {
    const attempts = [attempt({ id: "a1", correctness: "incorrect", evaluationId: "e1" })];
    const evaluations = [evaluation({ id: "e1", correctness: "incorrect" })];
    const evidence = collectObjectiveEvidence({
      objectiveId: null,
      topicLabel: "mass and weight",
      conceptId: null,
      attempts,
      evaluations,
      questions: [],
      misconceptions: [],
    });
    const scored = evidence.filter((e) => e.countsTowardAccuracy);
    assert.equal(scored.length, 1);
    assert.equal(scored[0]!.source, "attempt");
    assert.equal(scored[0]!.evaluationId, "e1");
  });

  it("dedupeEvidence collapses duplicate provenance keys", () => {
    const attempts = [attempt({ id: "a1", correctness: "correct", evaluationId: "e1" })];
    const evaluations = [evaluation({ id: "e1", correctness: "correct" })];
    const once = collectObjectiveEvidence({
      objectiveId: null,
      topicLabel: "mass and weight",
      conceptId: null,
      attempts,
      evaluations,
      questions: [],
      misconceptions: [],
    });
    const doubled = dedupeEvidence([...once, ...once, ...once]);
    assert.equal(doubled.filter((e) => e.countsTowardAccuracy).length, 1);
  });

  it("misconceptions do not inflate incorrect attempt counts", () => {
    const mc: MisconceptionRecord = {
      id: "mc1",
      concept: "mass",
      topicLabel: "mass and weight",
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
      observationCount: 3,
      remediationSessionIds: [],
      diagnosticQuestionIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const attempts = [attempt({ id: "a1", correctness: "incorrect", evaluationId: "e1" })];
    const evidence = collectObjectiveEvidence({
      objectiveId: null,
      topicLabel: "mass and weight",
      conceptId: null,
      attempts,
      evaluations: [evaluation({ id: "e1", correctness: "incorrect" })],
      questions: [],
      misconceptions: [mc],
    });
    const m = assessMastery({ objectiveId: "obj1", conceptId: null, evidence });
    assert.equal(m.incorrectCount, 1);
    assert.equal(m.hasPersistentMisconception, true);
  });

  it("uses evaluation correctness over attempt when both present", () => {
    const attempts = [attempt({ id: "a1", correctness: "partial", evaluationId: "e1" })];
    const evaluations = [evaluation({ id: "e1", correctness: "correct" })];
    const evidence = collectObjectiveEvidence({
      objectiveId: null,
      topicLabel: "mass and weight",
      conceptId: null,
      attempts,
      evaluations,
      questions: [],
      misconceptions: [],
    });
    assert.equal(evidence[0]!.correctness, "correct");
  });
});

describe("mastery", () => {
  it("does not award proficient from one correct attempt", () => {
    const evidence = collectObjectiveEvidence({
      objectiveId: null,
      topicLabel: "mass and weight",
      conceptId: null,
      attempts: [attempt({ id: "a1", correctness: "correct" })],
      evaluations: [],
      questions: [],
      misconceptions: [],
    });
    const m = assessMastery({ objectiveId: "obj1", conceptId: null, evidence });
    assert.notEqual(m.state, "proficient");
    assert.ok(m.state === "introduced" || m.state === "practising");
  });

  it("reaches proficient with consistent evidence", () => {
    const attempts = [1, 2, 3, 4].map((n) =>
      attempt({
        id: `a${n}`,
        correctness: "correct",
        evaluationId: `e${n}`,
        createdAt: new Date(Date.now() + n * 1000).toISOString(),
      }),
    );
    const evidence = collectObjectiveEvidence({
      objectiveId: null,
      topicLabel: "mass and weight",
      conceptId: null,
      attempts,
      evaluations: [],
      questions: [],
      misconceptions: [],
    });
    assert.equal(assessMastery({ objectiveId: "obj1", conceptId: null, evidence }).state, "proficient");
  });

  it("uses stable mastery ids across refresh", () => {
    assert.equal(masteryAssessmentId("obj1", "packA"), masteryAssessmentId("obj1", "packA"));
    assert.notEqual(masteryAssessmentId("obj1", "packA"), masteryAssessmentId("obj1", "packB"));
  });

  it("resolved misconception stops blocking when new correct evidence exists", () => {
    const resolved: MisconceptionRecord = {
      id: "mc1",
      concept: "mass",
      topicLabel: "mass and weight",
      documentId: "d1",
      category: "confused_related_concepts",
      description: "x",
      title: "Mass vs weight",
      observations: [],
      supportingExcerpts: [],
      confidence: "high",
      status: "resolved",
      firstObservedAt: new Date().toISOString(),
      lastObservedAt: new Date().toISOString(),
      observationCount: 3,
      remediationSessionIds: [],
      diagnosticQuestionIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const attempts = [1, 2, 3, 4].map((n) =>
      attempt({
        id: `a${n}`,
        correctness: "correct",
        evaluationId: `e${n}`,
        createdAt: new Date(Date.now() + n * 1000).toISOString(),
      }),
    );
    const evidence = collectObjectiveEvidence({
      objectiveId: null,
      topicLabel: "mass and weight",
      conceptId: null,
      attempts,
      evaluations: [],
      questions: [],
      misconceptions: [resolved],
    });
    const m = assessMastery({ objectiveId: "obj1", conceptId: null, evidence });
    assert.equal(m.hasPersistentMisconception, false);
    assert.equal(m.state, "proficient");
  });

  it("prerequisite gating blocks proficient", () => {
    const snap = buildKnowledgeGraphSnapshot(content, "pack1");
    const attempts = [1, 2, 3, 4].map((n) =>
      attempt({
        id: `a${n}`,
        correctness: "correct",
        evaluationId: `e${n}`,
        createdAt: new Date(Date.now() + n * 1000).toISOString(),
      }),
    );
    const evidence = collectObjectiveEvidence({
      objectiveId: null,
      topicLabel: "mass and weight",
      conceptId: null,
      attempts,
      evaluations: [],
      questions: [],
      misconceptions: [],
    });
    const masteryByObjective = new Map([["obj1", { state: "not_started" as const }]]);
    const m = assessMastery({
      objectiveId: "obj2",
      conceptId: null,
      evidence,
      graph: snap,
      masteryByObjective,
    });
    assert.notEqual(m.state, "proficient");
    assert.ok(m.missingPrerequisiteIds.includes("obj1"));
  });
});

describe("multi-pack", () => {
  it("assesses packs independently without mixing objective ids", () => {
    const g1 = buildKnowledgeGraphSnapshot(content, "packA");
    const contentB = {
      ...content,
      objectives: [
        { id: "obj1", topicId: "t2", code: "other", statement: "Different obj same id", cognitiveLevel: "understand" as const },
      ],
      prerequisites: [],
    };
    const g2 = buildKnowledgeGraphSnapshot(contentB, "packB");
    const results = assessAcrossPacks({
      packs: [
        { packId: "packA", graph: g1, objectiveIds: ["obj1", "obj2"] },
        { packId: "packB", graph: g2, objectiveIds: ["obj1"] },
      ],
      attempts: [],
      evaluations: [],
      questions: [],
      misconceptions: [],
    });
    const ids = results.map((r) => r.id);
    assert.ok(ids.includes(masteryAssessmentId("obj1", "packA")));
    assert.ok(ids.includes(masteryAssessmentId("obj1", "packB")));
    assert.notEqual(
      results.find((r) => r.packId === "packA" && r.objectiveId === "obj1")?.id,
      results.find((r) => r.packId === "packB" && r.objectiveId === "obj1")?.id,
    );
  });
});

describe("gaps and recommendations", () => {
  it("surfaces confirmed misconceptions and skips proficient for practice recs", () => {
    const mc: MisconceptionRecord = {
      id: "mc1",
      concept: "mass",
      topicLabel: "mass and weight",
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
      observationCount: 3,
      remediationSessionIds: [],
      diagnosticQuestionIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const gaps = detectKnowledgeGaps({ mastery: [], misconceptions: [mc], graph: null });
    assert.ok(gaps.some((g) => g.kind === "repeated_misunderstanding"));
    const recs = buildRecommendations({ mastery: [], gaps, misconceptions: [mc], graph: null });
    assert.ok(recs.some((r) => r.kind === "address_misconception"));
    assert.ok(recs[0]!.reason.length > 10);
  });
});

describe("multi-pack prerequisite isolation", () => {
  it("gap in pack A does not satisfy pack B prerequisites", () => {
    const contentA = content;
    const contentB = {
      ...content,
      version: { ...content.version, id: "vB" },
      objectives: [
        { id: "obj1", topicId: "t2", code: "x1", statement: "B obj1", cognitiveLevel: "understand" as const },
        { id: "obj2", topicId: "t2", code: "x2", statement: "B obj2", cognitiveLevel: "apply" as const },
      ],
      prerequisites: [{ objectiveId: "obj2", requiresObjectiveId: "obj1", kind: "required" as const }],
    };
    const gA = buildKnowledgeGraphSnapshot(contentA, "packA");
    const gB = buildKnowledgeGraphSnapshot(contentB, "packB");
    const results = assessAcrossPacks({
      packs: [
        { packId: "packA", graph: gA, objectiveIds: ["obj1", "obj2"] },
        { packId: "packB", graph: gB, objectiveIds: ["obj1", "obj2"] },
      ],
      attempts: [],
      evaluations: [],
      questions: [],
      misconceptions: [],
    });
    const a2 = results.find((r) => r.packId === "packA" && r.objectiveId === "obj2");
    const b2 = results.find((r) => r.packId === "packB" && r.objectiveId === "obj2");
    assert.ok(a2 && b2);
    // Both miss prereq within their own pack — not shared
    assert.ok(a2!.missingPrerequisiteIds.includes("obj1") || a2!.state === "not_started");
    assert.ok(b2!.missingPrerequisiteIds.includes("obj1") || b2!.state === "not_started");
    assert.notEqual(a2!.id, b2!.id);
  });
});
