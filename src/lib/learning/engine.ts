/**
 * Active learning engine orchestration: retrieve → generate / evaluate.
 */

import type { DocumentContent, DocumentMeta } from "@/lib/documents/types";
import {
  hasSufficientEvidence,
  retrieveFromContent,
  type RetrievedChunk,
} from "./retrieval.ts";
import { resolveClientProvider, type LearningProvider, type ProviderInfo } from "./provider.ts";
import type {
  AnswerEvaluation,
  AttemptRecord,
  FeynmanSession,
  LearningQuestion,
  PracticeSession,
  QuestionType,
} from "./types.ts";
import {
  analyseAnswerForMisconception,
  buildRemediationActivity,
  type DiagnosticResult,
  type MisconceptionRecord,
  type RemediationActivity,
} from "./misconceptions.ts";

export type PracticeBuildResult = {
  ok: true;
  session: PracticeSession;
  questions: LearningQuestion[];
  provider: ProviderInfo;
  retrievedCount: number;
} | {
  ok: false;
  message: string;
  provider: ProviderInfo;
};

export async function buildPracticeSession(
  meta: DocumentMeta,
  content: DocumentContent,
  options: {
    topic?: string | null;
    subject?: string | null;
    count?: number;
    types?: QuestionType[];
    provider?: LearningProvider;
  } = {},
): Promise<PracticeBuildResult> {
  const provider = options.provider ?? resolveClientProvider();
  const topic =
    options.topic?.trim() ||
    meta.curriculum.topicCode ||
    meta.name ||
    "Selected section";

  const retrieved = retrieveFromContent(content, {
    text: `${topic} ${options.subject ?? ""} ${meta.name}`,
    documentId: meta.id,
    limit: 8,
  });

  if (!hasSufficientEvidence(retrieved)) {
    return {
      ok: false,
      message:
        "Not enough extractable text to build a grounded practice session. Import a PDF with a selectable text layer, or pick a different section.",
      provider: provider.info,
    };
  }

  const questions = await provider.generateQuestions({
    documentId: meta.id,
    documentName: meta.name,
    subject: options.subject ?? meta.curriculum.subjectCode,
    topic,
    types: options.types,
    count: options.count ?? 4,
    retrieved,
  });

  if (questions.length === 0) {
    return {
      ok: false,
      message: "Could not form source-grounded questions from the available excerpts.",
      provider: provider.info,
    };
  }

  const session: PracticeSession = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? `ps_${crypto.randomUUID()}`
        : `ps_${Date.now()}`,
    documentId: meta.id,
    documentName: meta.name,
    title: `Practice · ${topic}`,
    topicLabel: topic,
    questionIds: questions.map((q) => q.id),
    createdAt: new Date().toISOString(),
    offlineCapable: !provider.info.requiresNetwork,
    providerLabel: provider.info.label,
  };

  return {
    ok: true,
    session,
    questions,
    provider: provider.info,
    retrievedCount: retrieved.length,
  };
}

export async function evaluateStudentAnswer(
  question: LearningQuestion,
  studentAnswer: string,
  provider?: LearningProvider,
): Promise<AnswerEvaluation> {
  const p = provider ?? resolveClientProvider();
  return p.evaluateAnswer({ question, studentAnswer });
}

export async function runFeynman(
  meta: DocumentMeta,
  content: DocumentContent,
  topicLabel: string,
  studentExplanation: string,
  provider?: LearningProvider,
): Promise<FeynmanSession> {
  const p = provider ?? resolveClientProvider();
  const retrieved: RetrievedChunk[] = retrieveFromContent(content, {
    text: topicLabel,
    documentId: meta.id,
    limit: 5,
  });
  return p.evaluateFeynman({
    documentId: meta.id,
    topicLabel,
    studentExplanation,
    retrieved,
  });
}

export async function diagnoseAnswer(input: {
  evaluation: AnswerEvaluation;
  question: LearningQuestion;
  priorAttempts: AttemptRecord[];
  priorEvaluations: AnswerEvaluation[];
  content?: DocumentContent;
}): Promise<DiagnosticResult> {
  let retrieved: RetrievedChunk[] = [];
  if (input.content) {
    retrieved = retrieveFromContent(input.content, {
      text: input.question.topic ?? input.question.text,
      documentId: input.question.documentId,
      limit: 4,
    });
  }
  return analyseAnswerForMisconception({
    evaluation: input.evaluation,
    question: input.question,
    priorAttempts: input.priorAttempts,
    priorEvaluations: input.priorEvaluations,
    retrieved,
  });
}

export function createRemediation(
  misconception: MisconceptionRecord,
  content: DocumentContent,
): RemediationActivity {
  const retrieved = retrieveFromContent(content, {
    text: `${misconception.title} ${misconception.concept} ${misconception.topicLabel ?? ""}`,
    documentId: misconception.documentId ?? undefined,
    limit: 3,
  });
  return buildRemediationActivity(misconception, retrieved);
}
