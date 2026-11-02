/**
 * Zod schemas and referential integrity validation for curriculum packs.
 */

import { z } from "zod";
import { detectPrerequisiteCycles } from "./graph.ts";
import type { CurriculumPack, CurriculumPackContent } from "./types.ts";

const cognitiveLevelSchema = z.enum(["recall", "understand", "apply", "analyze"]);
const versionStatusSchema = z.enum(["draft", "active", "retired"]);
const prerequisiteKindSchema = z.enum(["required", "helpful"]);
const sourceKindSchema = z.enum(["textbook", "syllabus", "exam", "other"]);

export const educationSystemSchema = z.object({
  id: z.string().min(1),
  countryCode: z.string().length(2),
  name: z.string().min(1),
  languages: z.array(z.string().min(1)).min(1),
  defaultLocale: z.string().min(1),
});

export const curriculumVersionSchema = z.object({
  id: z.string().min(1),
  systemId: z.string().min(1),
  label: z.string().min(1),
  status: versionStatusSchema,
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().nullable(),
});

export const gradeLevelSchema = z.object({
  id: z.string().min(1),
  versionId: z.string().min(1),
  code: z.string().min(1),
  label: z.string().min(1),
  sortOrder: z.number().int(),
  stage: z.string().min(1),
});

export const streamSchema = z.object({
  id: z.string().min(1),
  versionId: z.string().min(1),
  code: z.string().min(1),
  label: z.string().min(1),
  gradeCodes: z.array(z.string()),
});

export const subjectSchema = z.object({
  id: z.string().min(1),
  versionId: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  language: z.string().min(1),
  gradeCodes: z.array(z.string()).min(1),
  streamCodes: z.array(z.string()),
});

export const topicSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  parentId: z.string().nullable(),
  code: z.string().min(1),
  title: z.string().min(1),
  sortOrder: z.number().int(),
});

export const objectiveSchema = z.object({
  id: z.string().min(1),
  topicId: z.string().min(1),
  code: z.string().min(1),
  statement: z.string().min(1),
  cognitiveLevel: cognitiveLevelSchema,
});

export const prerequisiteSchema = z.object({
  objectiveId: z.string().min(1),
  requiresObjectiveId: z.string().min(1),
  kind: prerequisiteKindSchema,
});

export const sourceRefSchema = z.object({
  id: z.string().min(1),
  targetId: z.string().min(1),
  targetType: z.enum(["objective", "topic"]),
  kind: sourceKindSchema,
  citation: z.string().min(1),
  locator: z.string().nullable(),
  url: z.string().nullable(),
  license: z.string().nullable(),
});

export const examBlueprintSchema = z.object({
  id: z.string().min(1),
  versionId: z.string().min(1),
  name: z.string().min(1),
  gradeCode: z.string().min(1),
  streamCode: z.string().nullable(),
  subjectId: z.string().min(1),
});

export const blueprintWeightSchema = z.object({
  blueprintId: z.string().min(1),
  topicId: z.string().min(1),
  weight: z.number().min(0).max(1),
  itemCountHint: z.number().int().nonnegative().nullable(),
});

export const curriculumPackMetaSchema = z.object({
  packId: z.string().min(1),
  systemId: z.string().min(1),
  versionId: z.string().min(1),
  gradeCode: z.string().min(1),
  streamCode: z.string().nullable(),
  title: z.string().min(1),
  description: z.string(),
  contentHash: z.string().min(1),
  createdAt: z.string().min(1),
  isDevelopmentFixture: z.boolean(),
});

export const curriculumPackContentSchema = z.object({
  system: educationSystemSchema,
  version: curriculumVersionSchema,
  grade: gradeLevelSchema,
  streams: z.array(streamSchema),
  subjects: z.array(subjectSchema),
  topics: z.array(topicSchema),
  objectives: z.array(objectiveSchema),
  prerequisites: z.array(prerequisiteSchema),
  sourceRefs: z.array(sourceRefSchema),
  blueprints: z.array(examBlueprintSchema),
  blueprintWeights: z.array(blueprintWeightSchema),
});

export const curriculumPackSchema = z.object({
  meta: curriculumPackMetaSchema,
  content: curriculumPackContentSchema,
});

export type ValidationSuccess = { ok: true; pack: CurriculumPack };
export type ValidationFailure = { ok: false; message: string; issues?: string[] };

function uniqueIds(ids: string[], label: string): string | null {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return `Duplicate ${label} id: ${id}`;
    seen.add(id);
  }
  return null;
}

/**
 * Full structural + referential validation of a curriculum pack.
 * Does not recompute the content hash (callers may verify separately).
 */
export function validateCurriculumPack(raw: unknown): ValidationSuccess | ValidationFailure {
  const parsed = curriculumPackSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    return {
      ok: false,
      message: "Pack failed schema validation.",
      issues,
    };
  }

  const pack = parsed.data as CurriculumPack;
  const content = pack.content;
  const issues: string[] = [];

  // Meta consistency
  if (pack.meta.systemId !== content.system.id) {
    issues.push("meta.systemId does not match content.system.id");
  }
  if (pack.meta.versionId !== content.version.id) {
    issues.push("meta.versionId does not match content.version.id");
  }
  if (pack.meta.gradeCode !== content.grade.code) {
    issues.push("meta.gradeCode does not match content.grade.code");
  }
  if (content.version.systemId !== content.system.id) {
    issues.push("version.systemId does not match system.id");
  }
  if (content.grade.versionId !== content.version.id) {
    issues.push("grade.versionId does not match version.id");
  }

  // Unique IDs
  const idChecks = [
    uniqueIds([content.system.id], "system"),
    uniqueIds([content.version.id], "version"),
    uniqueIds([content.grade.id], "grade"),
    uniqueIds(
      content.streams.map((s) => s.id),
      "stream",
    ),
    uniqueIds(
      content.subjects.map((s) => s.id),
      "subject",
    ),
    uniqueIds(
      content.topics.map((t) => t.id),
      "topic",
    ),
    uniqueIds(
      content.objectives.map((o) => o.id),
      "objective",
    ),
    uniqueIds(
      content.sourceRefs.map((s) => s.id),
      "sourceRef",
    ),
    uniqueIds(
      content.blueprints.map((b) => b.id),
      "blueprint",
    ),
  ];
  for (const err of idChecks) {
    if (err) issues.push(err);
  }

  const subjectIds = new Set(content.subjects.map((s) => s.id));
  const topicIds = new Set(content.topics.map((t) => t.id));
  const objectiveIds = new Set(content.objectives.map((o) => o.id));
  const blueprintIds = new Set(content.blueprints.map((b) => b.id));
  const streamCodes = new Set(content.streams.map((s) => s.code));
  const gradeCode = content.grade.code;

  for (const stream of content.streams) {
    if (stream.versionId !== content.version.id) {
      issues.push(`Stream ${stream.id} has wrong versionId`);
    }
  }

  // Stream–grade combinations: meta stream must exist and apply to the pack grade
  if (pack.meta.streamCode !== null) {
    const metaStream = content.streams.find((s) => s.code === pack.meta.streamCode);
    if (!metaStream) {
      issues.push(`meta.streamCode ${pack.meta.streamCode} not found in content.streams`);
    } else if (metaStream.gradeCodes.length > 0 && !metaStream.gradeCodes.includes(gradeCode)) {
      issues.push(
        `Stream ${pack.meta.streamCode} does not apply to pack grade ${gradeCode}`,
      );
    }
  }

  for (const subject of content.subjects) {
    if (subject.versionId !== content.version.id) {
      issues.push(`Subject ${subject.id} has wrong versionId`);
    }
    if (!subject.gradeCodes.includes(gradeCode)) {
      issues.push(`Subject ${subject.id} does not list pack grade ${gradeCode}`);
    }
    for (const sc of subject.streamCodes) {
      if (!streamCodes.has(sc)) {
        issues.push(`Subject ${subject.id} references unknown stream code ${sc}`);
      } else {
        const stream = content.streams.find((s) => s.code === sc);
        if (
          stream &&
          stream.gradeCodes.length > 0 &&
          !stream.gradeCodes.includes(gradeCode)
        ) {
          issues.push(
            `Subject ${subject.id} stream ${sc} does not apply to pack grade ${gradeCode}`,
          );
        }
      }
    }
  }

  for (const topic of content.topics) {
    if (!subjectIds.has(topic.subjectId)) {
      issues.push(`Topic ${topic.id} references missing subject ${topic.subjectId}`);
    }
    if (topic.parentId !== null && !topicIds.has(topic.parentId)) {
      issues.push(`Topic ${topic.id} references missing parent ${topic.parentId}`);
    }
  }

  // Detect topic parent cycles (shallow tree)
  {
    const parentMap = new Map(content.topics.map((t) => [t.id, t.parentId]));
    for (const topic of content.topics) {
      const seen = new Set<string>();
      let current: string | null = topic.id;
      while (current) {
        if (seen.has(current)) {
          issues.push(`Topic parent cycle involving ${topic.id}`);
          break;
        }
        seen.add(current);
        current = parentMap.get(current) ?? null;
      }
    }
  }

  for (const objective of content.objectives) {
    if (!topicIds.has(objective.topicId)) {
      issues.push(`Objective ${objective.id} references missing topic ${objective.topicId}`);
    }
  }

  for (const prereq of content.prerequisites) {
    if (!objectiveIds.has(prereq.objectiveId)) {
      issues.push(`Prerequisite references missing objective ${prereq.objectiveId}`);
    }
    if (!objectiveIds.has(prereq.requiresObjectiveId)) {
      issues.push(`Prerequisite references missing required objective ${prereq.requiresObjectiveId}`);
    }
    if (prereq.objectiveId === prereq.requiresObjectiveId) {
      issues.push(`Prerequisite self-reference on ${prereq.objectiveId}`);
    }
  }

  const cycleResult = detectPrerequisiteCycles(content.prerequisites);
  if (!cycleResult.ok) {
    issues.push(cycleResult.message);
  }

  for (const ref of content.sourceRefs) {
    if (ref.targetType === "objective" && !objectiveIds.has(ref.targetId)) {
      issues.push(`SourceRef ${ref.id} targets missing objective ${ref.targetId}`);
    }
    if (ref.targetType === "topic" && !topicIds.has(ref.targetId)) {
      issues.push(`SourceRef ${ref.id} targets missing topic ${ref.targetId}`);
    }
  }

  for (const bp of content.blueprints) {
    if (bp.versionId !== content.version.id) {
      issues.push(`Blueprint ${bp.id} has wrong versionId`);
    }
    if (!subjectIds.has(bp.subjectId)) {
      issues.push(`Blueprint ${bp.id} references missing subject ${bp.subjectId}`);
    }
    if (bp.gradeCode !== gradeCode) {
      issues.push(`Blueprint ${bp.id} gradeCode does not match pack grade`);
    }
    if (bp.streamCode !== null) {
      if (!streamCodes.has(bp.streamCode)) {
        issues.push(`Blueprint ${bp.id} references unknown stream code ${bp.streamCode}`);
      } else {
        const stream = content.streams.find((s) => s.code === bp.streamCode);
        if (
          stream &&
          stream.gradeCodes.length > 0 &&
          !stream.gradeCodes.includes(gradeCode)
        ) {
          issues.push(
            `Blueprint ${bp.id} stream ${bp.streamCode} does not apply to pack grade ${gradeCode}`,
          );
        }
      }
    }
  }

  for (const w of content.blueprintWeights) {
    if (!blueprintIds.has(w.blueprintId)) {
      issues.push(`BlueprintWeight references missing blueprint ${w.blueprintId}`);
    }
    if (!topicIds.has(w.topicId)) {
      issues.push(`BlueprintWeight references missing topic ${w.topicId}`);
    }
  }

  // Every blueprint must have weights that sum to ~1
  const weightsByBlueprint = new Map<string, number>();
  for (const w of content.blueprintWeights) {
    weightsByBlueprint.set(w.blueprintId, (weightsByBlueprint.get(w.blueprintId) ?? 0) + w.weight);
  }
  for (const bp of content.blueprints) {
    if (!weightsByBlueprint.has(bp.id)) {
      issues.push(`Blueprint ${bp.id} has no weights`);
      continue;
    }
    const sum = weightsByBlueprint.get(bp.id)!;
    if (Math.abs(sum - 1) > 1e-6) {
      issues.push(`Blueprint ${bp.id} weights sum to ${sum}, expected 1`);
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      message: "Pack failed referential validation.",
      issues,
    };
  }

  return { ok: true, pack };
}

/** Validate only the content portion (useful for fixtures before meta is attached). */
export function validatePackContent(content: unknown): { ok: true; content: CurriculumPackContent } | ValidationFailure {
  const parsed = curriculumPackContentSchema.safeParse(content);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Content failed schema validation.",
      issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  // Re-use pack validator with a temporary meta shell
  const temp: CurriculumPack = {
    meta: {
      packId: "temp",
      systemId: parsed.data.system.id,
      versionId: parsed.data.version.id,
      gradeCode: parsed.data.grade.code,
      streamCode: null,
      title: "temp",
      description: "",
      contentHash: "temp",
      createdAt: new Date().toISOString(),
      isDevelopmentFixture: true,
    },
    content: parsed.data as CurriculumPackContent,
  };
  const result = validateCurriculumPack(temp);
  if (!result.ok) return result;
  return { ok: true, content: result.pack.content };
}
