/**
 * Examination evaluation — reuses learning evaluation heuristics; honest about uncertainty.
 */

import type { AnswerEvaluation, LearningQuestion } from "../learning/types.ts";
import { evaluateStudentAnswer } from "../learning/engine.ts";
import type {
  ExamQuestionResult,
  ExamQuestionSnapshot,
  ExamResult,
  ExamSession,
  ExamDefinition,
} from "./types.ts";
import type { MisconceptionRecord } from "../learning/misconceptions.ts";

function rid(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function snapshotToQuestion(s: ExamQuestionSnapshot): LearningQuestion {
  return {
    id: s.questionId,
    type: s.type,
    text: s.text,
    difficulty: s.difficulty,
    cognitiveLevel: s.cognitiveLevel,
    subject: s.subject,
    topic: s.topicLabel,
    objectiveId: s.objectiveId,
    documentId: s.documentId ?? "exam",
    sourceExcerpts: s.sourceExcerpts,
    choices: s.choices,
    correctChoiceIndex: s.correctChoiceIndex,
    expectedAnswer: s.expectedAnswer,
    markingGuidance: null,
    explanation: "",
    evidenceLevel: s.evidenceLevel,
    generatedBy: "heuristic",
    createdAt: new Date().toISOString(),
  };
}

function marksFromCorrectness(
  correctness: AnswerEvaluation["correctness"],
  available: number,
  confidence: AnswerEvaluation["confidence"],
): { awarded: number; manual: boolean } {
  if (correctness === "unevaluable" || confidence === "low") {
    return { awarded: 0, manual: true };
  }
  if (correctness === "correct") return { awarded: available, manual: false };
  if (correctness === "partial") return { awarded: Math.max(0.5, available * 0.5), manual: false };
  return { awarded: 0, manual: false };
}

export async function evaluateExamSession(input: {
  session: ExamSession;
  definition: ExamDefinition;
  misconceptions?: MisconceptionRecord[];
}): Promise<{ result: ExamResult; evaluations: AnswerEvaluation[] }> {
  const evaluations: AnswerEvaluation[] = [];
  const questionResults: ExamQuestionResult[] = [];

  for (const snap of input.session.questionSnapshots) {
    const raw = input.session.answers[snap.id] ?? "";
    const q = snapshotToQuestion(snap);
    let ev: AnswerEvaluation;
    if (!raw.trim()) {
      ev = {
        id: rid("ev"),
        questionId: q.id,
        studentAnswer: "",
        correctness: "incorrect",
        explanation: "No answer was submitted for this question.",
        understood: [],
        missingOrIncorrect: ["Unanswered"],
        suggestedImprovement: "Attempt every question when time allows.",
        sourceExcerpts: snap.sourceExcerpts,
        confidence: "high",
        evidenceLevel: snap.evidenceLevel,
        evaluatedBy: "heuristic",
        createdAt: new Date().toISOString(),
      };
    } else {
      ev = await evaluateStudentAnswer(q, raw);
    }
    evaluations.push(ev);
    const { awarded, manual } = marksFromCorrectness(ev.correctness, snap.marks, ev.confidence);
    questionResults.push({
      snapshotId: snap.id,
      questionId: snap.questionId,
      correctness: ev.correctness,
      marksAwarded: awarded,
      marksAvailable: snap.marks,
      explanation: ev.explanation,
      confidence: ev.confidence,
      requiresManualReview: manual || ev.correctness === "unevaluable",
      evaluationId: ev.id,
      objectiveId: snap.objectiveId,
      topicLabel: snap.topicLabel,
      sourceExcerpts: snap.sourceExcerpts,
    });
  }

  const topicMap = new Map<string, { earned: number; available: number }>();
  const objMap = new Map<string, { earned: number; available: number }>();
  for (const r of questionResults) {
    const topic = r.topicLabel || "General";
    const t = topicMap.get(topic) ?? { earned: 0, available: 0 };
    t.earned += r.marksAwarded;
    t.available += r.marksAvailable;
    topicMap.set(topic, t);
    if (r.objectiveId) {
      const o = objMap.get(r.objectiveId) ?? { earned: 0, available: 0 };
      o.earned += r.marksAwarded;
      o.available += r.marksAvailable;
      objMap.set(r.objectiveId, o);
    }
  }

  let timeTaken: number | null = null;
  if (input.session.startedAt && input.session.submittedAt) {
    timeTaken = Math.max(
      0,
      Math.floor(
        (new Date(input.session.submittedAt).getTime() -
          new Date(input.session.startedAt).getTime()) /
          1000,
      ),
    );
  }

  const marksEarned = questionResults.reduce((s, r) => s + r.marksAwarded, 0);
  const totalMarks = questionResults.reduce((s, r) => s + r.marksAvailable, 0);

  const result: ExamResult = {
    id: rid("exr"),
    examId: input.definition.id,
    sessionId: input.session.id,
    kind: input.definition.kind,
    title: input.definition.title,
    packId: input.definition.packId,
    submittedAt: input.session.submittedAt ?? new Date().toISOString(),
    timeTakenSeconds: timeTaken,
    totalMarks,
    marksEarned,
    questionResults,
    topicBreakdown: [...topicMap.entries()].map(([topic, v]) => ({ topic, ...v })),
    objectiveBreakdown: [...objMap.entries()].map(([objectiveId, v]) => ({ objectiveId, ...v })),
    misconceptionIds: [],
    manualReviewCount: questionResults.filter((r) => r.requiresManualReview).length,
    assessmentLabel: input.definition.assessmentLabel,
    createdAt: new Date().toISOString(),
  };

  return { result, evaluations };
}

/** Build attempt records for exam answers without double-counting on re-eval. */
export function examEvidenceProvenanceKey(sessionId: string, snapshotId: string): string {
  return `exam:${sessionId}:${snapshotId}`;
}
