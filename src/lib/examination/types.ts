/**
 * Examination Intelligence types (Milestone 8).
 * Practice assessments and blueprint-driven exams — never invent official papers.
 */

import type { Difficulty, QuestionType, Correctness, SourceExcerpt, LearningQuestion } from "../learning/types.ts";
import type { CognitiveLevel } from "../curriculum/types.ts";

export type ExamKind = "practice_assessment" | "blueprint_exam";
export type ExamStatus = "draft" | "ready" | "in_progress" | "submitted" | "evaluated";
export type ExamAnswerStatus = "unanswered" | "answered" | "flagged";

export interface ExamBlueprintConfig {
  blueprintId: string | null;
  packId: string | null;
  versionId: string | null;
  subjectId: string | null;
  gradeCode: string | null;
  streamCode: string | null;
  /** Weights by topic id when available */
  topicWeights: Array<{ topicId: string; weight: number; itemCountHint: number | null }>;
  totalMarks: number;
  durationMinutes: number;
  questionCount: number;
}

export interface ExamQuestionSnapshot {
  id: string;
  order: number;
  questionId: string;
  type: QuestionType;
  text: string;
  difficulty: Difficulty;
  cognitiveLevel: CognitiveLevel;
  objectiveId: string | null;
  topicLabel: string | null;
  subject: string | null;
  documentId: string | null;
  sourceExcerpts: SourceExcerpt[];
  choices: string[] | null;
  correctChoiceIndex: number | null;
  expectedAnswer: string | null;
  marks: number;
  /** true when text is AI/heuristic teaching, not a direct textbook quote */
  teachingExampleIsGenerated: boolean;
  evidenceLevel: "direct" | "derived" | "insufficient";
}

export interface ExamDefinition {
  id: string;
  kind: ExamKind;
  title: string;
  packId: string | null;
  versionId: string | null;
  subjectLabel: string | null;
  topicLabels: string[];
  objectiveIds: string[];
  blueprintId: string | null;
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  difficultyTarget: { easy: number; medium: number; hard: number } | null;
  instructions: string;
  isOfficialSimulation: boolean;
  /** Honest label when no blueprint */
  assessmentLabel: string;
  createdAt: string;
}

export interface ExamSession {
  id: string;
  examId: string;
  status: ExamStatus;
  startedAt: string | null;
  /** Absolute end timestamp (ISO) — survives refresh */
  endsAt: string | null;
  submittedAt: string | null;
  durationMinutes: number;
  questionSnapshots: ExamQuestionSnapshot[];
  /** questionSnapshotId -> answer text or choice index as string */
  answers: Record<string, string>;
  answerStatus: Record<string, ExamAnswerStatus>;
  currentIndex: number;
  packId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExamQuestionResult {
  snapshotId: string;
  questionId: string;
  correctness: Correctness;
  marksAwarded: number;
  marksAvailable: number;
  explanation: string;
  confidence: "high" | "medium" | "low";
  requiresManualReview: boolean;
  evaluationId: string | null;
  objectiveId: string | null;
  topicLabel: string | null;
  sourceExcerpts: SourceExcerpt[];
}

export interface ExamResult {
  id: string;
  examId: string;
  sessionId: string;
  kind: ExamKind;
  title: string;
  packId: string | null;
  submittedAt: string;
  timeTakenSeconds: number | null;
  totalMarks: number;
  marksEarned: number;
  questionResults: ExamQuestionResult[];
  topicBreakdown: Array<{ topic: string; earned: number; available: number }>;
  objectiveBreakdown: Array<{ objectiveId: string; earned: number; available: number }>;
  misconceptionIds: string[];
  manualReviewCount: number;
  assessmentLabel: string;
  createdAt: string;
}

export interface ExamGenerateInput {
  packId: string | null;
  versionId?: string | null;
  subjectLabel?: string | null;
  topicLabels?: string[];
  objectiveIds?: string[];
  questionCount?: number;
  durationMinutes?: number;
  difficulty?: Difficulty | "mixed";
  blueprint?: ExamBlueprintConfig | null;
  availableQuestions: LearningQuestion[];
}
