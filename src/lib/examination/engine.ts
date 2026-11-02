/**
 * Examination generation, validation, and marks helpers.
 * Uses existing LearningQuestion stock; does not invent official past papers.
 */

import type { Difficulty, LearningQuestion, QuestionType } from "../learning/types.ts";
import type {
  ExamDefinition,
  ExamGenerateInput,
  ExamKind,
  ExamQuestionSnapshot,
  ExamSession,
  ExamBlueprintConfig,
} from "./types.ts";

function rid(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const MARKS_BY_TYPE: Record<QuestionType, number> = {
  multiple_choice: 1,
  short_answer: 2,
  conceptual: 3,
  application: 3,
  analysis: 4,
  explain_own_words: 3,
};

export function validateBlueprintConfig(bp: ExamBlueprintConfig): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (bp.questionCount < 1) errors.push("Blueprint question count must be at least 1.");
  if (bp.durationMinutes < 1) errors.push("Duration must be at least 1 minute.");
  if (bp.totalMarks < 1) errors.push("Total marks must be positive.");
  const weightSum = bp.topicWeights.reduce((s, w) => s + w.weight, 0);
  if (bp.topicWeights.length > 0 && Math.abs(weightSum - 1) > 0.05) {
    errors.push(`Topic weights should sum near 1 (got ${weightSum.toFixed(2)}).`);
  }
  return { ok: errors.length === 0, errors };
}

function marksFor(q: LearningQuestion): number {
  return MARKS_BY_TYPE[q.type] ?? 2;
}

function matchesScope(q: LearningQuestion, input: ExamGenerateInput): boolean {
  if (input.objectiveIds && input.objectiveIds.length > 0) {
    if (q.objectiveId && input.objectiveIds.includes(q.objectiveId)) return true;
  }
  if (input.topicLabels && input.topicLabels.length > 0) {
    const t = (q.topic || "").toLowerCase();
    if (input.topicLabels.some((x) => t.includes(x.toLowerCase()) || x.toLowerCase().includes(t))) {
      return true;
    }
  }
  if (input.subjectLabel && q.subject) {
    if (q.subject.toLowerCase().includes(input.subjectLabel.toLowerCase())) return true;
  }
  // If no filters, allow any
  if (
    (!input.objectiveIds || input.objectiveIds.length === 0) &&
    (!input.topicLabels || input.topicLabels.length === 0) &&
    !input.subjectLabel
  ) {
    return true;
  }
  return Boolean(
    input.objectiveIds?.length && q.objectiveId && input.objectiveIds.includes(q.objectiveId),
  );
}

/**
 * Select unique questions for an assessment without fabricating content.
 */
export function selectExamQuestions(input: ExamGenerateInput): {
  ok: boolean;
  questions: LearningQuestion[];
  message?: string;
} {
  const target = input.questionCount ?? 10;
  const pool = input.availableQuestions.filter((q) => matchesScope(q, input));
  if (pool.length === 0) {
    return {
      ok: false,
      questions: [],
      message:
        "No stored practice questions match the selected topics or objectives. Generate practice on this subject first, or import a relevant document.",
    };
  }

  const byDiff: Record<Difficulty, LearningQuestion[]> = {
    easy: [],
    medium: [],
    hard: [],
  };
  for (const q of pool) byDiff[q.difficulty].push(q);

  const picked: LearningQuestion[] = [];
  const seen = new Set<string>();
  const seenText = new Set<string>();

  const take = (list: LearningQuestion[], n: number) => {
    for (const q of list) {
      if (picked.length >= target) break;
      if (n <= 0) break;
      if (seen.has(q.id)) continue;
      const norm = q.text.trim().toLowerCase();
      if (seenText.has(norm)) continue;
      seen.add(q.id);
      seenText.add(norm);
      picked.push(q);
      n -= 1;
    }
  };

  if (input.difficulty && input.difficulty !== "mixed") {
    take(byDiff[input.difficulty], target);
  } else {
    const easyN = Math.max(1, Math.floor(target * 0.3));
    const hardN = Math.max(0, Math.floor(target * 0.2));
    const medN = target - easyN - hardN;
    take(byDiff.easy, easyN);
    take(byDiff.medium, medN);
    take(byDiff.hard, hardN);
  }
  // Fill remainder from any difficulty
  if (picked.length < target) take(pool, target - picked.length);

  if (picked.length === 0) {
    return { ok: false, questions: [], message: "Could not select unique questions from the available pool." };
  }
  if (picked.length < target) {
    return {
      ok: true,
      questions: picked,
      message: `Only ${picked.length} unique matching questions were available (requested ${target}). This is a limited practice assessment, not a full examination.`,
    };
  }
  return { ok: true, questions: picked };
}

export function buildExamDefinition(
  input: ExamGenerateInput,
  questions: LearningQuestion[],
): ExamDefinition {
  const hasBlueprint = Boolean(input.blueprint?.blueprintId);
  const kind: ExamKind = hasBlueprint ? "blueprint_exam" : "practice_assessment";
  const totalMarks = questions.reduce((s, q) => s + marksFor(q), 0);
  const duration =
    input.durationMinutes ??
    input.blueprint?.durationMinutes ??
    Math.max(15, questions.length * 3);
  const topics = [
    ...new Set(
      [
        ...(input.topicLabels ?? []),
        ...questions.map((q) => q.topic).filter(Boolean),
      ].filter(Boolean) as string[],
    ),
  ];
  return {
    id: rid("exam"),
    kind,
    title: hasBlueprint
      ? `Exam · ${input.subjectLabel ?? "Subject"}`
      : `Practice assessment · ${topics[0] ?? input.subjectLabel ?? "Topics"}`,
    packId: input.packId,
    versionId: input.versionId ?? input.blueprint?.versionId ?? null,
    subjectLabel: input.subjectLabel ?? null,
    topicLabels: topics,
    objectiveIds: [
      ...new Set(
        [
          ...(input.objectiveIds ?? []),
          ...questions.map((q) => q.objectiveId).filter(Boolean),
        ].filter(Boolean) as string[],
      ),
    ],
    blueprintId: input.blueprint?.blueprintId ?? null,
    durationMinutes: duration,
    totalMarks,
    questionCount: questions.length,
    difficultyTarget: null,
    instructions: hasBlueprint
      ? "This assessment follows a curriculum blueprint configuration available on this device. It is not an official past paper."
      : "This is a practice assessment built from your offline practice questions. It is not an official examination or past paper.",
    isOfficialSimulation: false,
    assessmentLabel: hasBlueprint
      ? "Blueprint-guided practice exam (not official)"
      : "Practice assessment (not an official examination)",
    createdAt: new Date().toISOString(),
  };
}

export function snapshotQuestions(questions: LearningQuestion[]): ExamQuestionSnapshot[] {
  return questions.map((q, i) => ({
    id: rid("eqs"),
    order: i,
    questionId: q.id,
    type: q.type,
    text: q.text,
    difficulty: q.difficulty,
    cognitiveLevel: q.cognitiveLevel,
    objectiveId: q.objectiveId,
    topicLabel: q.topic,
    subject: q.subject,
    documentId: q.documentId,
    sourceExcerpts: q.sourceExcerpts ?? [],
    choices: q.choices,
    correctChoiceIndex: q.correctChoiceIndex,
    expectedAnswer: q.expectedAnswer,
    marks: marksFor(q),
    teachingExampleIsGenerated: q.generatedBy !== "heuristic" ? true : q.evidenceLevel !== "direct",
    evidenceLevel: q.evidenceLevel,
  }));
}

export function createExamSession(def: ExamDefinition, snapshots: ExamQuestionSnapshot[]): ExamSession {
  const now = new Date().toISOString();
  return {
    id: rid("exs"),
    examId: def.id,
    status: "ready",
    startedAt: null,
    endsAt: null,
    submittedAt: null,
    durationMinutes: def.durationMinutes,
    questionSnapshots: snapshots,
    answers: {},
    answerStatus: Object.fromEntries(snapshots.map((s) => [s.id, "unanswered" as const])),
    currentIndex: 0,
    packId: def.packId,
    createdAt: now,
    updatedAt: now,
  };
}

/** Start timer using absolute end timestamp so refresh preserves remaining time. */
export function startExamSession(session: ExamSession, now = new Date()): ExamSession {
  if (session.status === "in_progress" && session.endsAt) return session;
  const ends = new Date(now.getTime() + session.durationMinutes * 60 * 1000);
  return {
    ...session,
    status: "in_progress",
    startedAt: session.startedAt ?? now.toISOString(),
    endsAt: ends.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function remainingSeconds(session: ExamSession, now = new Date()): number {
  if (!session.endsAt) return session.durationMinutes * 60;
  const ms = new Date(session.endsAt).getTime() - now.getTime();
  return Math.max(0, Math.floor(ms / 1000));
}

export function saveAnswer(
  session: ExamSession,
  snapshotId: string,
  answer: string,
  flagged = false,
): ExamSession {
  return {
    ...session,
    answers: { ...session.answers, [snapshotId]: answer },
    answerStatus: {
      ...session.answerStatus,
      [snapshotId]: flagged ? "flagged" : answer.trim() ? "answered" : "unanswered",
    },
    updatedAt: new Date().toISOString(),
  };
}

export function submitExamSession(session: ExamSession, now = new Date()): ExamSession {
  if (session.status === "submitted" || session.status === "evaluated") return session;
  return {
    ...session,
    status: "submitted",
    submittedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
