/**
 * Milestone 6 — Knowledge Graph, Mastery, Gaps, Recommendations
 * Stabilized: single evidence model, multi-pack graphs, trustworthy mastery.
 */
import { detectPrerequisiteCycles } from "../curriculum/graph.ts";
import type { CurriculumPackContent, Prerequisite } from "../curriculum/types.ts";
import type {
  AttemptRecord,
  AnswerEvaluation,
  LearningQuestion,
  Correctness,
  Difficulty,
  SourceExcerpt,
} from "../learning/types.ts";
import type { MisconceptionRecord } from "../learning/misconceptions.ts";
import type { CognitiveLevel, PrerequisiteKind } from "../curriculum/types.ts";

export type MasteryState =
  | "not_started"
  | "introduced"
  | "practising"
  | "developing"
  | "proficient"
  | "needs_review";

export type EvidenceConfidence = "insufficient" | "low" | "medium" | "high";

export type GapKind =
  | "missing_prerequisite"
  | "weak_foundation"
  | "repeated_misunderstanding"
  | "insufficient_evidence"
  | "needs_revision";

export type RecommendationKind =
  | "study_prerequisite"
  | "address_misconception"
  | "practice_weak_objective"
  | "reassess"
  | "advance_new_objective";

export interface Concept {
  id: string;
  code: string;
  title: string;
  description: string | null;
  subjectHint: string | null;
}

export interface ConceptRelation {
  fromConceptId: string;
  toConceptId: string;
  kind: "depends_on" | "related_to" | "part_of" | "contrasts_with";
  strength: "required" | "helpful" | "weak";
}

export interface ObjectiveConceptMap {
  objectiveId: string;
  conceptId: string;
  role: "primary" | "supporting";
}

export interface KnowledgeGraphSnapshot {
  id: string;
  packId: string | null;
  versionId: string | null;
  concepts: Concept[];
  conceptRelations: ConceptRelation[];
  objectiveConceptMaps: ObjectiveConceptMap[];
  prerequisiteEdges: Array<{
    objectiveId: string;
    requiresObjectiveId: string;
    kind: PrerequisiteKind;
  }>;
  updatedAt: string;
}

/**
 * One learning event. Attempt + evaluation are a single event, not two.
 * Misconceptions are advisory flags, not scored attempts.
 */
export interface ObjectiveEvidence {
  id: string;
  /** Stable key: attempt:<id> | eval:<id> | misconception:<id> | ... */
  provenanceKey: string;
  objectiveId: string | null;
  conceptId: string | null;
  topicLabel: string | null;
  packId: string | null;
  source: "attempt" | "evaluation" | "feynman" | "misconception" | "remediation" | "reassessment";
  sourceId: string;
  /** Linked evaluation id when source is attempt */
  evaluationId: string | null;
  correctness: Correctness | null;
  /** Whether this row contributes to accuracy counts (false for misconception flags) */
  countsTowardAccuracy: boolean;
  evaluationConfidence: "high" | "medium" | "low" | null;
  difficulty: Difficulty | null;
  cognitiveLevel: CognitiveLevel | null;
  misconceptionId: string | null;
  misconceptionStatus: string | null;
  note: string | null;
  sourceExcerpts: SourceExcerpt[];
  recordedAt: string;
}

export interface MasteryAssessment {
  id: string;
  objectiveId: string;
  conceptId: string | null;
  packId: string | null;
  state: MasteryState;
  confidence: EvidenceConfidence;
  evidenceCount: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  recentAccuracy: number | null;
  hasPersistentMisconception: boolean;
  missingPrerequisiteIds: string[];
  lastEvidenceAt: string | null;
  rationale: string;
  updatedAt: string;
}

export interface KnowledgeGap {
  id: string;
  kind: GapKind;
  objectiveId: string | null;
  conceptId: string | null;
  topicLabel: string | null;
  packId: string | null;
  title: string;
  explanation: string;
  prerequisiteIds: string[];
  relatedMisconceptionIds: string[];
  severity: "low" | "medium" | "high";
  evidenceCount: number;
  detectedAt: string;
}

export interface StudyRecommendation {
  id: string;
  kind: RecommendationKind;
  priority: number;
  title: string;
  reason: string;
  objectiveId: string | null;
  conceptId: string | null;
  misconceptionId: string | null;
  documentId: string | null;
  topicLabel: string | null;
  packId: string | null;
  suggestedAction: string;
  createdAt: string;
}

export interface RecommendationHistoryEntry {
  id: string;
  recommendationId: string;
  kind: RecommendationKind;
  title: string;
  actedOn: boolean;
  createdAt: string;
}

function rid(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Deterministic mastery row id so dashboard refresh does not invent new keys. */
export function masteryAssessmentId(objectiveId: string, packId: string | null): string {
  return `mas_${packId ?? "local"}__${objectiveId}`;
}

export function buildConceptId(code: string): string {
  return `concept:${code.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

export function deriveConceptsFromPack(content: CurriculumPackContent) {
  const concepts: Concept[] = [];
  const maps: ObjectiveConceptMap[] = [];
  const relations: ConceptRelation[] = [];
  const seen = new Set<string>();
  const topicsById = new Map(content.topics.map((t) => [t.id, t]));

  for (const topic of content.topics) {
    const code = topic.code || topic.id;
    const cid = buildConceptId(code);
    if (!seen.has(cid)) {
      seen.add(cid);
      concepts.push({
        id: cid,
        code,
        title: topic.title,
        description: null,
        subjectHint: null,
      });
    }
    if (topic.parentId) {
      const parent = topicsById.get(topic.parentId);
      if (parent) {
        relations.push({
          fromConceptId: cid,
          toConceptId: buildConceptId(parent.code || parent.id),
          kind: "part_of",
          strength: "required",
        });
      }
    }
  }

  for (const obj of content.objectives) {
    const topic = topicsById.get(obj.topicId);
    const topicCode = topic?.code || topic?.id || obj.topicId;
    const primaryCid = buildConceptId(topicCode);
    maps.push({ objectiveId: obj.id, conceptId: primaryCid, role: "primary" });
    if (obj.code && obj.code !== topicCode) {
      const ocid = buildConceptId(obj.code);
      if (!seen.has(ocid)) {
        seen.add(ocid);
        concepts.push({
          id: ocid,
          code: obj.code,
          title: obj.statement.slice(0, 80),
          description: obj.statement,
          subjectHint: null,
        });
      }
      maps.push({ objectiveId: obj.id, conceptId: ocid, role: "supporting" });
      relations.push({
        fromConceptId: ocid,
        toConceptId: primaryCid,
        kind: "part_of",
        strength: "helpful",
      });
    }
  }

  for (const pre of content.prerequisites) {
    const fromMaps = maps.filter((m) => m.objectiveId === pre.objectiveId && m.role === "primary");
    const toMaps = maps.filter(
      (m) => m.objectiveId === pre.requiresObjectiveId && m.role === "primary",
    );
    for (const f of fromMaps) {
      for (const t of toMaps) {
        if (f.conceptId === t.conceptId) continue;
        relations.push({
          fromConceptId: f.conceptId,
          toConceptId: t.conceptId,
          kind: "depends_on",
          strength: pre.kind === "required" ? "required" : "helpful",
        });
      }
    }
  }

  return { concepts, maps, relations };
}

export function buildKnowledgeGraphSnapshot(
  content: CurriculumPackContent,
  packId: string | null,
): KnowledgeGraphSnapshot {
  const { concepts, maps, relations } = deriveConceptsFromPack(content);
  return {
    id: `kgs_${packId ?? content.version?.id ?? "local"}`,
    packId,
    versionId: content.version?.id ?? null,
    concepts,
    conceptRelations: relations,
    objectiveConceptMaps: maps,
    prerequisiteEdges: content.prerequisites.map((p) => ({
      objectiveId: p.objectiveId,
      requiresObjectiveId: p.requiresObjectiveId,
      kind: p.kind,
    })),
    updatedAt: new Date().toISOString(),
  };
}

function detectConceptCycles(
  relations: ConceptRelation[],
): { ok: true } | { ok: false; message: string } {
  const depends = relations.filter((r) => r.kind === "depends_on");
  const adj = new Map<string, string[]>();
  for (const r of depends) {
    if (!adj.has(r.toConceptId)) adj.set(r.toConceptId, []);
    adj.get(r.toConceptId)!.push(r.fromConceptId);
    if (!adj.has(r.fromConceptId)) adj.set(r.fromConceptId, []);
  }
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];
  function dfs(node: string): string | null {
    visited.add(node);
    stack.add(node);
    path.push(node);
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) {
        const c = dfs(next);
        if (c) return c;
      } else if (stack.has(next)) {
        return [...path.slice(path.indexOf(next)), next].join(" → ");
      }
    }
    stack.delete(node);
    path.pop();
    return null;
  }
  for (const n of adj.keys()) {
    if (!visited.has(n)) {
      const c = dfs(n);
      if (c) return { ok: false, message: `Concept dependency cycle: ${c}` };
    }
  }
  return { ok: true };
}

export function validateKnowledgeGraph(snapshot: KnowledgeGraphSnapshot): {
  ok: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const conceptIds = new Set(snapshot.concepts.map((c) => c.id));
  for (const rel of snapshot.conceptRelations) {
    if (!conceptIds.has(rel.fromConceptId) || !conceptIds.has(rel.toConceptId)) {
      errors.push(`Unknown concept in relation ${rel.fromConceptId} → ${rel.toConceptId}`);
    }
  }
  const cycle = detectPrerequisiteCycles(snapshot.prerequisiteEdges as Prerequisite[]);
  if (!cycle.ok) errors.push(cycle.message);
  const cc = detectConceptCycles(snapshot.conceptRelations);
  if (!cc.ok) errors.push(cc.message);
  return { ok: errors.length === 0, errors, warnings };
}

export function missingRequiredPrerequisites(
  objectiveId: string,
  edges: KnowledgeGraphSnapshot["prerequisiteEdges"],
  masteryByObjective: Map<string, { state: string }>,
): string[] {
  return edges
    .filter((e) => e.objectiveId === objectiveId && e.kind === "required")
    .map((e) => e.requiresObjectiveId)
    .filter((id) => {
      const m = masteryByObjective.get(id);
      return !m || (m.state !== "proficient" && m.state !== "developing");
    });
}

function matchesScope(
  topicLabel: string | null | undefined,
  objectiveId: string | null | undefined,
  qObjectiveId: string | null | undefined,
  qTopic: string | null | undefined,
  attemptTopic: string | null | undefined,
): boolean {
  if (objectiveId && qObjectiveId === objectiveId) return true;
  if (topicLabel && (attemptTopic === topicLabel || qTopic === topicLabel)) return true;
  return false;
}

/**
 * Build a single evidence list for one objective/topic scope.
 *
 * Rules:
 * - Each attempt is one learning event. Its evaluation enriches it; it is not a second event.
 * - Evaluations without a matching attempt are included once (orphan safety).
 * - Misconceptions are non-scoring flags (countsTowardAccuracy = false).
 * - Deduplicate by provenanceKey so repeated dashboard refresh cannot inflate counts.
 */
export function collectObjectiveEvidence(input: {
  objectiveId: string | null;
  topicLabel: string | null;
  conceptId: string | null;
  packId?: string | null;
  attempts: AttemptRecord[];
  evaluations: AnswerEvaluation[];
  questions: LearningQuestion[];
  misconceptions: MisconceptionRecord[];
}): ObjectiveEvidence[] {
  const qById = new Map(input.questions.map((q) => [q.id, q]));
  const evalById = new Map(input.evaluations.map((e) => [e.id, e]));
  const byKey = new Map<string, ObjectiveEvidence>();

  for (const a of input.attempts) {
    if (!a || typeof a.id !== "string") continue;
    const q = a.questionId ? qById.get(a.questionId) : undefined;
    if (
      !matchesScope(
        input.topicLabel,
        input.objectiveId,
        q?.objectiveId ?? null,
        q?.topic ?? null,
        a.topicLabel,
      )
    ) {
      continue;
    }

    const ev = a.evaluationId ? evalById.get(a.evaluationId) : undefined;
    const correctness = ev?.correctness ?? a.correctness ?? null;
    const provenanceKey = `attempt:${a.id}`;

    byKey.set(provenanceKey, {
      id: provenanceKey,
      provenanceKey,
      objectiveId: q?.objectiveId ?? input.objectiveId,
      conceptId: input.conceptId,
      topicLabel: a.topicLabel ?? q?.topic ?? input.topicLabel,
      packId: input.packId ?? null,
      source: "attempt",
      sourceId: a.id,
      evaluationId: a.evaluationId ?? null,
      correctness,
      countsTowardAccuracy: correctness === "correct" || correctness === "partial" || correctness === "incorrect",
      evaluationConfidence: ev?.confidence ?? null,
      difficulty: q?.difficulty ?? null,
      cognitiveLevel: q?.cognitiveLevel ?? null,
      misconceptionId: null,
      misconceptionStatus: null,
      note: ev?.explanation?.slice(0, 240) ?? null,
      sourceExcerpts: ev?.sourceExcerpts ?? [],
      recordedAt: a.createdAt || ev?.createdAt || new Date().toISOString(),
    });
  }

  // Orphan evaluations (no attempt row) — still one event each
  const linkedEvalIds = new Set(
    [...byKey.values()].map((e) => e.evaluationId).filter(Boolean) as string[],
  );
  for (const ev of input.evaluations) {
    if (!ev || typeof ev.id !== "string") continue;
    if (linkedEvalIds.has(ev.id)) continue;
    const q = ev.questionId ? qById.get(ev.questionId) : undefined;
    if (
      !matchesScope(
        input.topicLabel,
        input.objectiveId,
        q?.objectiveId ?? null,
        q?.topic ?? null,
        null,
      )
    ) {
      continue;
    }
    const provenanceKey = `eval:${ev.id}`;
    byKey.set(provenanceKey, {
      id: provenanceKey,
      provenanceKey,
      objectiveId: q?.objectiveId ?? input.objectiveId,
      conceptId: input.conceptId,
      topicLabel: q?.topic ?? input.topicLabel,
      packId: input.packId ?? null,
      source: "evaluation",
      sourceId: ev.id,
      evaluationId: ev.id,
      correctness: ev.correctness,
      countsTowardAccuracy:
        ev.correctness === "correct" ||
        ev.correctness === "partial" ||
        ev.correctness === "incorrect",
      evaluationConfidence: ev.confidence ?? null,
      difficulty: q?.difficulty ?? null,
      cognitiveLevel: q?.cognitiveLevel ?? null,
      misconceptionId: null,
      misconceptionStatus: null,
      note: ev.explanation?.slice(0, 240) ?? null,
      sourceExcerpts: ev.sourceExcerpts ?? [],
      recordedAt: ev.createdAt || new Date().toISOString(),
    });
  }

  // Misconception flags — do NOT count toward accuracy
  for (const m of input.misconceptions) {
    if (!m || typeof m.id !== "string") continue;
    const active =
      m.status === "confirmed" ||
      m.status === "needs_reassessment" ||
      m.status === "improving" ||
      m.status === "suspected";
    if (!active) continue; // resolved/other do not flag

    const topicMatch = input.topicLabel && m.topicLabel === input.topicLabel;
    const conceptMatch = input.conceptId && m.concept === input.conceptId;
    if (!topicMatch && !conceptMatch && input.topicLabel) continue;
    if (!topicMatch && !conceptMatch && !input.topicLabel && input.objectiveId) {
      // no topical link — skip unless both scope fields null
      continue;
    }

    const provenanceKey = `misconception:${m.id}`;
    byKey.set(provenanceKey, {
      id: provenanceKey,
      provenanceKey,
      objectiveId: input.objectiveId,
      conceptId: input.conceptId,
      topicLabel: m.topicLabel ?? input.topicLabel,
      packId: input.packId ?? null,
      source: "misconception",
      sourceId: m.id,
      evaluationId: null,
      correctness: null,
      countsTowardAccuracy: false,
      evaluationConfidence: m.confidence === "high" || m.confidence === "medium" || m.confidence === "low" ? m.confidence : null,
      difficulty: null,
      cognitiveLevel: null,
      misconceptionId: m.id,
      misconceptionStatus: m.status,
      note: `${m.status}: ${m.title}`,
      sourceExcerpts: m.supportingExcerpts ?? [],
      recordedAt: m.lastObservedAt || m.updatedAt || new Date().toISOString(),
    });
  }

  return [...byKey.values()].sort((a, b) =>
    a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : 0,
  );
}

/** Deduplicate any pre-built evidence list by provenanceKey. */
export function dedupeEvidence(items: ObjectiveEvidence[]): ObjectiveEvidence[] {
  const map = new Map<string, ObjectiveEvidence>();
  for (const item of items) {
    const key = item.provenanceKey || item.id;
    const prev = map.get(key);
    if (!prev || (item.recordedAt && prev.recordedAt && item.recordedAt > prev.recordedAt)) {
      map.set(key, item);
    }
  }
  return [...map.values()].sort((a, b) =>
    a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : 0,
  );
}

export function assessMastery(input: {
  objectiveId: string;
  conceptId: string | null;
  packId?: string | null;
  evidence: ObjectiveEvidence[];
  graph?: KnowledgeGraphSnapshot | null;
  masteryByObjective?: Map<string, { state: MasteryState }>;
}): MasteryAssessment {
  const evidence = dedupeEvidence(input.evidence);
  const scored = evidence.filter((e) => e.countsTowardAccuracy && e.correctness);
  // High-confidence (or unknown) outcomes drive mastery; low-confidence correct
  // still counts as practice but cannot alone justify proficiency.
  const reliable = scored.filter(
    (e) => e.evaluationConfidence !== "low" && e.correctness !== "unevaluable",
  );
  const correctCount = scored.filter((e) => e.correctness === "correct").length;
  const reliableCorrect = reliable.filter((e) => e.correctness === "correct").length;
  const partialCount = scored.filter((e) => e.correctness === "partial").length;
  const incorrectCount = scored.filter((e) => e.correctness === "incorrect").length;
  const evidenceCount = scored.length;

  // Active misconception flags only (resolved do not persist as negative)
  const hasPersistentMisconception = evidence.some(
    (e) =>
      e.source === "misconception" &&
      e.misconceptionId &&
      (e.misconceptionStatus === "confirmed" ||
        e.misconceptionStatus === "needs_reassessment" ||
        e.misconceptionStatus === "improving"),
  );

  const recent = scored.slice(-5);
  const recentScored = recent.filter((e) => e.correctness !== null);
  const recentAccuracy =
    recentScored.length >= 2
      ? recentScored.filter((e) => e.correctness === "correct").length / recentScored.length
      : null;

  const missingPrerequisiteIds =
    input.graph && input.masteryByObjective
      ? missingRequiredPrerequisites(
          input.objectiveId,
          input.graph.prerequisiteEdges,
          input.masteryByObjective,
        )
      : [];

  let state: MasteryState = "not_started";
  let rationale = "No scored practice evidence yet.";

  if (evidenceCount === 0) {
    if (hasPersistentMisconception) {
      state = "needs_review";
      rationale =
        "A confirmed misconception pattern exists, but there are not yet enough scored attempts to measure recovery.";
    } else {
      state = "not_started";
      rationale = "No scored practice evidence yet.";
    }
  } else if (hasPersistentMisconception && (recentAccuracy === null || recentAccuracy < 0.7)) {
    state = "needs_review";
    rationale =
      "A confirmed or recurring misconception is still active and recent accuracy is not yet stable.";
  } else if (evidenceCount === 1) {
    state = scored[0]?.correctness === "correct" ? "introduced" : "practising";
    rationale = "Only a single scored attempt is available — more practice is needed.";
  } else if (evidenceCount < 3) {
    state = "practising";
    rationale = "Early practice phase; evidence is still limited.";
  } else if (
    recentAccuracy !== null &&
    recentAccuracy >= 0.8 &&
    correctCount >= 3 &&
    reliableCorrect >= 2 &&
    !hasPersistentMisconception &&
    missingPrerequisiteIds.length === 0
  ) {
    state = "proficient";
    rationale =
      "Multiple correct attempts with consistent recent performance and no open misconception or missing required prerequisite.";
  } else if (
    recentAccuracy !== null &&
    recentAccuracy >= 0.5 &&
    correctCount >= 2 &&
    !hasPersistentMisconception
  ) {
    state = "developing";
    rationale = "Growing accuracy across attempts; continue deliberate practice.";
  } else if (incorrectCount >= 2 && (recentAccuracy === null || recentAccuracy < 0.4)) {
    state = "needs_review";
    rationale = "Repeated incorrect responses suggest the idea needs revisiting.";
  } else {
    state = "practising";
    rationale = "Active practice with mixed results so far.";
  }

  if (state === "proficient" && missingPrerequisiteIds.length > 0) {
    state = "developing";
    rationale += " Required prerequisites are not yet secure.";
  }

  // Resolved misconceptions: if only resolved flags remain, hasPersistentMisconception is false
  // and recovery path above can reach developing/proficient with new correct evidence.

  const consistent =
    recentAccuracy !== null && recentAccuracy >= 0.7 && !hasPersistentMisconception;
  let confidence: EvidenceConfidence = "insufficient";
  if (evidenceCount === 0) confidence = "insufficient";
  else if (evidenceCount === 1) confidence = "low";
  else if (evidenceCount === 2) confidence = consistent ? "medium" : "low";
  else if (evidenceCount >= 4 && consistent) confidence = "high";
  else if (evidenceCount >= 2) confidence = "medium";

  // Unevaluable / low-confidence evaluations reduce confidence one step
  const lowQuality = scored.filter(
    (e) => e.evaluationConfidence === "low" || e.correctness === "unevaluable",
  ).length;
  if (lowQuality > 0 && confidence === "high") confidence = "medium";
  if (lowQuality >= evidenceCount && evidenceCount > 0 && confidence === "medium") {
    confidence = "low";
  }

  return {
    id: masteryAssessmentId(input.objectiveId, input.packId ?? null),
    objectiveId: input.objectiveId,
    conceptId: input.conceptId,
    packId: input.packId ?? null,
    state,
    confidence,
    evidenceCount,
    correctCount,
    incorrectCount,
    partialCount,
    recentAccuracy,
    hasPersistentMisconception,
    missingPrerequisiteIds,
    lastEvidenceAt: evidence.length ? evidence[evidence.length - 1]!.recordedAt : null,
    rationale,
    updatedAt: new Date().toISOString(),
  };
}

export function assessAllObjectives(input: {
  objectiveIds: string[];
  graph: KnowledgeGraphSnapshot | null;
  packId?: string | null;
  attempts: AttemptRecord[];
  evaluations: AnswerEvaluation[];
  questions: LearningQuestion[];
  misconceptions: MisconceptionRecord[];
}): MasteryAssessment[] {
  const packId = input.packId ?? input.graph?.packId ?? null;
  const masteryByObjective = new Map<string, { state: MasteryState }>();
  const firstPass: MasteryAssessment[] = [];

  for (const objectiveId of input.objectiveIds) {
    const conceptId =
      input.graph?.objectiveConceptMaps.find(
        (m) => m.objectiveId === objectiveId && m.role === "primary",
      )?.conceptId ?? null;
    const topicLabel =
      input.questions.find((q) => q.objectiveId === objectiveId)?.topic ??
      (objectiveId.startsWith("topic:") ? objectiveId.slice(6) : null);
    const evidence = collectObjectiveEvidence({
      objectiveId: objectiveId.startsWith("topic:") ? null : objectiveId,
      topicLabel,
      conceptId,
      packId,
      attempts: input.attempts,
      evaluations: input.evaluations,
      questions: input.questions,
      misconceptions: input.misconceptions,
    });
    const a = assessMastery({ objectiveId, conceptId, packId, evidence });
    masteryByObjective.set(objectiveId, { state: a.state });
    firstPass.push(a);
  }

  return firstPass.map((r) => {
    const conceptId = r.conceptId;
    const topicLabel =
      input.questions.find((q) => q.objectiveId === r.objectiveId)?.topic ??
      (r.objectiveId.startsWith("topic:") ? r.objectiveId.slice(6) : null);
    const evidence = collectObjectiveEvidence({
      objectiveId: r.objectiveId.startsWith("topic:") ? null : r.objectiveId,
      topicLabel,
      conceptId,
      packId,
      attempts: input.attempts,
      evaluations: input.evaluations,
      questions: input.questions,
      misconceptions: input.misconceptions,
    });
    return assessMastery({
      objectiveId: r.objectiveId,
      conceptId,
      packId,
      evidence,
      graph: input.graph,
      masteryByObjective,
    });
  });
}

/** Assess across multiple pack graphs without mixing objective id namespaces. */
export function assessAcrossPacks(input: {
  packs: Array<{ packId: string; graph: KnowledgeGraphSnapshot; objectiveIds: string[] }>;
  attempts: AttemptRecord[];
  evaluations: AnswerEvaluation[];
  questions: LearningQuestion[];
  misconceptions: MisconceptionRecord[];
}): MasteryAssessment[] {
  const results: MasteryAssessment[] = [];
  for (const pack of input.packs) {
    results.push(
      ...assessAllObjectives({
        objectiveIds: pack.objectiveIds,
        graph: pack.graph,
        packId: pack.packId,
        attempts: input.attempts,
        evaluations: input.evaluations,
        questions: input.questions,
        misconceptions: input.misconceptions,
      }),
    );
  }
  return results;
}

export function detectKnowledgeGaps(input: {
  mastery: MasteryAssessment[];
  misconceptions: MisconceptionRecord[];
  graph: KnowledgeGraphSnapshot | null;
}): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];
  const now = new Date().toISOString();
  const seenMc = new Set<string>();

  for (const m of input.mastery) {
    if (m.missingPrerequisiteIds.length > 0) {
      gaps.push({
        id: `gap_pre_${m.packId ?? "local"}_${m.objectiveId}`,
        kind: "missing_prerequisite",
        objectiveId: m.objectiveId,
        conceptId: m.conceptId,
        topicLabel: null,
        packId: m.packId,
        title: "Earlier ideas may need attention first",
        explanation:
          "Progress on this objective is limited by required prerequisites that do not yet show secure evidence.",
        prerequisiteIds: m.missingPrerequisiteIds,
        relatedMisconceptionIds: [],
        severity: m.state === "needs_review" ? "high" : "medium",
        evidenceCount: m.evidenceCount,
        detectedAt: now,
      });
    }
    if (m.state === "needs_review" && m.hasPersistentMisconception) {
      gaps.push({
        id: `gap_mc_${m.packId ?? "local"}_${m.objectiveId}`,
        kind: "repeated_misunderstanding",
        objectiveId: m.objectiveId,
        conceptId: m.conceptId,
        topicLabel: null,
        packId: m.packId,
        title: "Recurring difficulty on this idea",
        explanation:
          "More than one related response points to the same conceptual pattern. Targeted clarification helps more than more of the same practice.",
        prerequisiteIds: m.missingPrerequisiteIds,
        relatedMisconceptionIds: [],
        severity: "high",
        evidenceCount: m.evidenceCount,
        detectedAt: now,
      });
    }
    if (
      m.confidence === "insufficient" ||
      (m.evidenceCount > 0 && m.evidenceCount < 2 && m.state !== "not_started")
    ) {
      gaps.push({
        id: `gap_ins_${m.packId ?? "local"}_${m.objectiveId}`,
        kind: "insufficient_evidence",
        objectiveId: m.objectiveId,
        conceptId: m.conceptId,
        topicLabel: null,
        packId: m.packId,
        title: "Not enough practice evidence yet",
        explanation:
          "Only limited scored attempts exist for this objective. A few more varied questions will make progress clearer.",
        prerequisiteIds: [],
        relatedMisconceptionIds: [],
        severity: "low",
        evidenceCount: m.evidenceCount,
        detectedAt: now,
      });
    }
  }

  for (const mc of input.misconceptions) {
    if (mc.status !== "confirmed" && mc.status !== "needs_reassessment") continue;
    if (seenMc.has(mc.id)) continue;
    seenMc.add(mc.id);
    gaps.push({
      id: `gap_mcid_${mc.id}`,
      kind: "repeated_misunderstanding",
      objectiveId: null,
      conceptId: null,
      topicLabel: mc.topicLabel,
      packId: null,
      title: mc.title,
      explanation:
        mc.description ||
        "A confirmed misconception pattern has been recorded from repeated evidence.",
      prerequisiteIds: [],
      relatedMisconceptionIds: [mc.id],
      severity: mc.confidence === "high" ? "high" : "medium",
      evidenceCount: mc.observationCount,
      detectedAt: now,
    });
  }

  const sev = { high: 0, medium: 1, low: 2 };
  return gaps.sort(
    (a, b) => sev[a.severity] - sev[b.severity] || b.evidenceCount - a.evidenceCount,
  );
}

export function buildRecommendations(input: {
  mastery: MasteryAssessment[];
  gaps: KnowledgeGap[];
  misconceptions: MisconceptionRecord[];
  graph: KnowledgeGraphSnapshot | null;
  preferredDocumentId?: string | null;
}): StudyRecommendation[] {
  const recs: StudyRecommendation[] = [];
  const now = new Date().toISOString();
  const seenObj = new Set<string>();
  const seenMc = new Set<string>();
  const KP: Record<RecommendationKind, number> = {
    study_prerequisite: 1,
    address_misconception: 2,
    practice_weak_objective: 3,
    reassess: 4,
    advance_new_objective: 5,
  };

  // Skip objectives already proficient when recommending practice
  const proficient = new Set(
    input.mastery.filter((m) => m.state === "proficient").map((m) => m.objectiveId),
  );

  for (const gap of input.gaps.filter(
    (g) => g.kind === "missing_prerequisite" || g.kind === "weak_foundation",
  )) {
    for (const preId of gap.prerequisiteIds.slice(0, 2)) {
      if (seenObj.has(preId) || proficient.has(preId)) continue;
      seenObj.add(preId);
      recs.push({
        id: rid("rec"),
        kind: "study_prerequisite",
        priority: KP.study_prerequisite,
        title: "Strengthen an earlier idea first",
        reason: gap.explanation,
        objectiveId: preId,
        conceptId: gap.conceptId,
        misconceptionId: null,
        documentId: input.preferredDocumentId ?? null,
        topicLabel: gap.topicLabel,
        packId: gap.packId,
        suggestedAction:
          "Open the related topic or generate a short practice set focused on the prerequisite.",
        createdAt: now,
      });
    }
  }

  for (const mc of input.misconceptions) {
    if (mc.status !== "confirmed" && mc.status !== "needs_reassessment") continue;
    if (seenMc.has(mc.id)) continue;
    seenMc.add(mc.id);
    recs.push({
      id: rid("rec"),
      kind: "address_misconception",
      priority: KP.address_misconception,
      title: `Clarify: ${mc.title}`,
      reason: `Confirmed from ${mc.observationCount} related responses (${mc.confidence} confidence).`,
      objectiveId: null,
      conceptId: null,
      misconceptionId: mc.id,
      documentId: mc.documentId,
      topicLabel: mc.topicLabel,
      packId: null,
      suggestedAction:
        "Use Support to review the comparison, textbook passage, and distinction questions.",
      createdAt: now,
    });
  }

  for (const m of input.mastery) {
    if (m.state !== "needs_review" && m.state !== "practising") continue;
    if (m.evidenceCount < 1 || seenObj.has(m.objectiveId) || m.hasPersistentMisconception) continue;
    if (proficient.has(m.objectiveId)) continue;
    seenObj.add(m.objectiveId);
    recs.push({
      id: rid("rec"),
      kind: "practice_weak_objective",
      priority: KP.practice_weak_objective,
      title: "More deliberate practice on this objective",
      reason: m.rationale,
      objectiveId: m.objectiveId,
      conceptId: m.conceptId,
      misconceptionId: null,
      documentId: input.preferredDocumentId ?? null,
      topicLabel: null,
      packId: m.packId,
      suggestedAction: "Generate a short practice session on this topic.",
      createdAt: now,
    });
  }

  for (const mc of input.misconceptions) {
    if (mc.status !== "improving" || seenMc.has(mc.id)) continue;
    seenMc.add(mc.id);
    recs.push({
      id: rid("rec"),
      kind: "reassess",
      priority: KP.reassess,
      title: `Check understanding: ${mc.title}`,
      reason:
        "Earlier remediation showed improvement. Fresh questions will confirm whether the idea is secure.",
      objectiveId: null,
      conceptId: null,
      misconceptionId: mc.id,
      documentId: mc.documentId,
      topicLabel: mc.topicLabel,
      packId: null,
      suggestedAction:
        "Answer a new distinction or application question without looking at notes first.",
      createdAt: now,
    });
  }

  for (const m of input.mastery) {
    if (
      (m.state !== "not_started" && m.state !== "introduced") ||
      m.missingPrerequisiteIds.length > 0 ||
      seenObj.has(m.objectiveId)
    ) {
      continue;
    }
    seenObj.add(m.objectiveId);
    recs.push({
      id: rid("rec"),
      kind: "advance_new_objective",
      priority: KP.advance_new_objective,
      title: "Ready for a new objective",
      reason:
        "Required prerequisites show enough evidence to begin this objective without known blockers.",
      objectiveId: m.objectiveId,
      conceptId: m.conceptId,
      misconceptionId: null,
      documentId: input.preferredDocumentId ?? null,
      topicLabel: null,
      packId: m.packId,
      suggestedAction: "Start with an introduced-level question, then build up difficulty.",
      createdAt: now,
    });
  }

  return recs.sort((a, b) => a.priority - b.priority).slice(0, 12);
}
