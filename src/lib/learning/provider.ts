/**
 * Provider-independent AI service layer.
 * Secrets never leave the server. Browser uses heuristics + optional server proxy.
 * Mock/heuristic providers are clearly labeled — not real language models.
 */

import type {
  AnswerEvaluation,
  FeynmanSession,
  LearningQuestion,
  QuestionType,
} from "./types.ts";
import type { RetrievedChunk } from "./retrieval.ts";
import {
  evaluateAnswerHeuristic,
  evaluateFeynmanHeuristic,
  generateQuestionsFromChunks,
} from "./heuristic.ts";

export type ProviderKind = "heuristic" | "mock-ai" | "server-ai";

export interface ProviderInfo {
  kind: ProviderKind;
  label: string;
  /** True when generation requires network to a server that holds API keys */
  requiresNetwork: boolean;
  /** True when this is a real model backend (not mock/heuristic) */
  isRealModel: boolean;
}

export interface GenerateQuestionsRequest {
  documentId: string;
  documentName?: string;
  subject?: string | null;
  topic?: string | null;
  types?: QuestionType[];
  count?: number;
  retrieved: RetrievedChunk[];
}

export interface EvaluateAnswerRequest {
  question: LearningQuestion;
  studentAnswer: string;
  retrieved?: RetrievedChunk[];
}

export interface FeynmanRequest {
  documentId: string;
  topicLabel: string;
  studentExplanation: string;
  retrieved: RetrievedChunk[];
}

export interface LearningProvider {
  info: ProviderInfo;
  generateQuestions(req: GenerateQuestionsRequest): Promise<LearningQuestion[]>;
  evaluateAnswer(req: EvaluateAnswerRequest): Promise<AnswerEvaluation>;
  evaluateFeynman(req: FeynmanRequest): Promise<FeynmanSession>;
}

/**
 * Always-available offline provider. Grounded in retrieved chunks only.
 */
export function createHeuristicProvider(): LearningProvider {
  return {
    info: {
      kind: "heuristic",
      label: "On-device practice engine (not a language model)",
      requiresNetwork: false,
      isRealModel: false,
    },
    async generateQuestions(req) {
      return generateQuestionsFromChunks(req.retrieved, {
        documentId: req.documentId,
        subject: req.subject,
        topic: req.topic,
        types: req.types,
        count: req.count,
      });
    },
    async evaluateAnswer(req) {
      return evaluateAnswerHeuristic(req.question, req.studentAnswer);
    },
    async evaluateFeynman(req) {
      return evaluateFeynmanHeuristic(
        req.documentId,
        req.topicLabel,
        req.studentExplanation,
        req.retrieved,
      );
    },
  };
}

/**
 * Mock AI provider — same grounding as heuristic, different label for UI testing.
 * Does not call any external API.
 */
export function createMockAiProvider(): LearningProvider {
  const base = createHeuristicProvider();
  return {
    info: {
      kind: "mock-ai",
      label: "Mock AI (development only — not a real model)",
      requiresNetwork: false,
      isRealModel: false,
    },
    async generateQuestions(req) {
      const qs = await base.generateQuestions(req);
      return qs.map((q) => ({ ...q, generatedBy: "mock-ai" as const }));
    },
    async evaluateAnswer(req) {
      const ev = await base.evaluateAnswer(req);
      return { ...ev, evaluatedBy: "mock-ai" as const };
    },
    async evaluateFeynman(req) {
      const fy = await base.evaluateFeynman(req);
      return { ...fy, evaluatedBy: "mock-ai" as const };
    },
  };
}

/**
 * Resolve the browser-side provider.
 * Real API keys must live only on the server; this client never reads them.
 */
export function resolveClientProvider(): LearningProvider {
  // Prefer heuristic offline engine. Server-AI can be wired later via /api routes
  // when a trusted server holds provider credentials.
  return createHeuristicProvider();
}
