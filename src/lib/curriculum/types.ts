/**
 * Curriculum Intelligence data model for Sirius (JOSCH LABS).
 * All relationships use stable string IDs. Display names are not keys.
 * Designed to support multiple education systems without hardcoding Ethiopia.
 */

export type CognitiveLevel = "recall" | "understand" | "apply" | "analyze";

export type CurriculumVersionStatus = "draft" | "active" | "retired";

export type EducationStage = "general" | "preparatory" | string;

export type PrerequisiteKind = "required" | "helpful";

export type SourceKind = "textbook" | "syllabus" | "exam" | "other";

/** Country / ministry level system. First supported: Ethiopia MoE. */
export interface EducationSystem {
  id: string;
  countryCode: string; // ISO 3166-1 alpha-2
  name: string;
  languages: string[];
  defaultLocale: string;
}

/** Immutable once active. Corrections produce a new version. */
export interface CurriculumVersion {
  id: string;
  systemId: string;
  label: string;
  status: CurriculumVersionStatus;
  effectiveFrom: string; // ISO date
  effectiveTo: string | null;
}

export interface GradeLevel {
  id: string;
  versionId: string;
  code: string; // e.g. "9", "11"
  label: string;
  sortOrder: number;
  stage: EducationStage;
}

export interface Stream {
  id: string;
  versionId: string;
  code: string; // e.g. "natural", "social", "common"
  label: string;
  /** Grade codes this stream applies to. Empty = unused. */
  gradeCodes: string[];
}

export interface Subject {
  id: string;
  versionId: string;
  code: string;
  name: string;
  language: string;
  gradeCodes: string[];
  /** Empty = offered to every stream in those grades. */
  streamCodes: string[];
}

export interface Topic {
  id: string;
  subjectId: string;
  parentId: string | null;
  code: string;
  title: string;
  sortOrder: number;
}

export interface Objective {
  id: string;
  topicId: string;
  code: string;
  statement: string;
  cognitiveLevel: CognitiveLevel;
}

export interface Prerequisite {
  objectiveId: string;
  requiresObjectiveId: string;
  kind: PrerequisiteKind;
}

export interface SourceRef {
  id: string;
  /** objectiveId or topicId */
  targetId: string;
  targetType: "objective" | "topic";
  kind: SourceKind;
  citation: string;
  locator: string | null;
  url: string | null;
  license: string | null;
}

export interface ExamBlueprint {
  id: string;
  versionId: string;
  name: string;
  gradeCode: string;
  streamCode: string | null;
  subjectId: string;
}

export interface BlueprintWeight {
  blueprintId: string;
  topicId: string;
  weight: number; // 0..1; weights in one blueprint must sum to 1
  itemCountHint: number | null;
}

/** Portable distribution unit: one version + one grade + stream-or-common. */
export interface CurriculumPackMeta {
  packId: string;
  systemId: string;
  versionId: string;
  gradeCode: string;
  streamCode: string | null; // null = common / all
  title: string;
  description: string;
  contentHash: string;
  createdAt: string;
  /** Development fixture flag — never present official claims when true. */
  isDevelopmentFixture: boolean;
}

export interface CurriculumPackContent {
  system: EducationSystem;
  version: CurriculumVersion;
  grade: GradeLevel;
  streams: Stream[];
  subjects: Subject[];
  topics: Topic[];
  objectives: Objective[];
  prerequisites: Prerequisite[];
  sourceRefs: SourceRef[];
  blueprints: ExamBlueprint[];
  blueprintWeights: BlueprintWeight[];
}

export interface CurriculumPack {
  meta: CurriculumPackMeta;
  content: CurriculumPackContent;
}

/** Installed pack record stored in IndexedDB. */
export interface InstalledPackRecord {
  packId: string;
  meta: CurriculumPackMeta;
  content: CurriculumPackContent;
  installedAt: string;
}
