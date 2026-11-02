/**
 * Active learning model — questions, evaluations, Feynman sessions, history.
 * All records stay on-device. Source references must point at real chunks/pages.
 */

export type QuestionType =
  | "multiple_choice"
  | "short_answer"
  | "conceptual"
  | "application"
  | "analysis"
  | "explain_own_words";

export type Difficulty = "easy" | "medium" | "hard";

export type CognitiveLevel = "recall" | "understand" | "apply" | "analyze";

export type EvidenceLevel =
  | "direct" // supported by textbook excerpt
  | "derived" // reasonable explanation grounded in excerpt
  | "insufficient"; // not enough source material

export interface SourceExcerpt {
  documentId: string;
  chunkId: string | null;
  pageStart: number;
  pageEnd: number;
  text: string;
}

export interface LearningQuestion {
  id: string;
  type: QuestionType;
  text: string;
  /** Separate from cognitive level */
  difficulty: Difficulty;
  cognitiveLevel: CognitiveLevel;
  subject: string | null;
  topic: string | null;
  objectiveId: string | null;
  documentId: string;
  sourceExcerpts: SourceExcerpt[];
  choices: string[] | null; // MC only
  correctChoiceIndex: number | null; // MC only
  expectedAnswer: string | null;
  markingGuidance: string | null;
  explanation: string;
  evidenceLevel: EvidenceLevel;
  generatedBy: "heuristic" | "mock-ai" | "ai";
  createdAt: string;
}

export type Correctness = "correct" | "partial" | "incorrect" | "unevaluable";

export interface AnswerEvaluation {
  id: string;
  questionId: string;
  studentAnswer: string;
  correctness: Correctness;
  explanation: string;
  understood: string[];
  missingOrIncorrect: string[];
  suggestedImprovement: string;
  sourceExcerpts: SourceExcerpt[];
  confidence: "high" | "medium" | "low";
  evidenceLevel: EvidenceLevel;
  evaluatedBy: "heuristic" | "mock-ai" | "ai";
  createdAt: string;
}

export interface FeynmanSession {
  id: string;
  documentId: string;
  topicLabel: string;
  studentExplanation: string;
  feedback: string;
  correctUnderstanding: string[];
  missingConcepts: string[];
  confusedIdeas: string[];
  unsupportedStatements: string[];
  simplerExplanation: string;
  followUpQuestion: string;
  sourceExcerpts: SourceExcerpt[];
  evidenceLevel: EvidenceLevel;
  evaluatedBy: "heuristic" | "mock-ai" | "ai";
  createdAt: string;
}

export interface PracticeSession {
  id: string;
  documentId: string;
  documentName: string;
  title: string;
  topicLabel: string | null;
  questionIds: string[];
  createdAt: string;
  /** true when session was generated offline/heuristically without cloud AI */
  offlineCapable: boolean;
  providerLabel: string;
}

export interface AttemptRecord {
  id: string;
  sessionId: string | null;
  questionId: string;
  documentId: string;
  studentAnswer: string;
  evaluationId: string;
  correctness: Correctness;
  topicLabel: string | null;
  createdAt: string;
}

export interface LearningHistorySummary {
  attempts: number;
  correct: number;
  partial: number;
  incorrect: number;
  unevaluable: number;
  topics: string[];
  lastPractisedAt: string | null;
}

// ---------------------------------------------------------------------------
// Misconception intelligence (Milestone 5)
// ---------------------------------------------------------------------------

export type {
  MisconceptionCategory,
  MisconceptionStatus,
  MisconceptionRecord,
  MisconceptionObservation,
  DiagnosticResult,
  RemediationActivity,
  ErrorKind,
} from "./misconceptions.ts";
