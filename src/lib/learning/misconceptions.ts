/**
 * Misconception detection intelligence.
 * Requires repeated / consistent evidence — never diagnoses from a single ambiguous answer.
 * Distinguishes careless mistakes, incomplete answers, missing prerequisites, and conceptual errors.
 */

import type { AnswerEvaluation, AttemptRecord, LearningQuestion, SourceExcerpt } from "./types.ts";
import type { RetrievedChunk } from "./retrieval.ts";

export type MisconceptionCategory =
  | "confused_related_concepts"
  | "incorrect_rule"
  | "cause_effect_mixup"
  | "definition_confusion"
  | "formula_misinterpretation"
  | "inappropriate_application"
  | "repeated_conceptual_error"
  | "other";

export type MisconceptionStatus =
  | "suspected"
  | "confirmed"
  | "improving"
  | "resolved"
  | "needs_reassessment";

export type ErrorKind =
  | "careless_mistake"
  | "incomplete_answer"
  | "missing_prerequisite"
  | "conceptual_misunderstanding"
  | "unevaluable";

export interface MisconceptionObservation {
  id: string;
  attemptId: string | null;
  evaluationId: string | null;
  questionId: string | null;
  studentAnswer: string;
  note: string;
  observedAt: string;
}

export interface MisconceptionRecord {
  id: string;
  /** Primary concept or topic the student is working on */
  concept: string;
  topicLabel: string | null;
  documentId: string | null;
  category: MisconceptionCategory;
  description: string;
  /** Short label for UI, e.g. "Mass vs weight" */
  title: string;
  observations: MisconceptionObservation[];
  supportingExcerpts: SourceExcerpt[];
  confidence: "low" | "medium" | "high";
  status: MisconceptionStatus;
  firstObservedAt: string;
  lastObservedAt: string;
  observationCount: number;
  /** Diagnostic / remediation activity ids when present */
  remediationSessionIds: string[];
  diagnosticQuestionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosticResult {
  errorKind: ErrorKind;
  possibleMisconception: Partial<MisconceptionRecord> | null;
  needsMoreEvidence: boolean;
  diagnosticQuestionPrompt: string | null;
  explanation: string;
  confidence: "low" | "medium" | "high";
}

export interface RemediationActivity {
  id: string;
  misconceptionId: string;
  title: string;
  simpleExplanation: string;
  comparison: string | null;
  textbookPassage: SourceExcerpt | null;
  practicalExample: string;
  distinctionQuestion: string;
  applicationQuestion: string;
  explainYourselfPrompt: string;
  /** True when explanation text is AI/heuristic teaching, not a direct textbook quote */
  teachingExampleIsGenerated: boolean;
  createdAt: string;
}

function id(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((t) => t.length > 2));
}

function overlapRatio(a: string, b: string): number {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / Math.min(A.size, B.size);
}

/** Known concept confusion pairs used offline for pattern hints */
const CONFUSION_PAIRS: Array<{ a: string; b: string; title: string; description: string }> = [
  {
    a: "mass",
    b: "weight",
    title: "Mass vs weight",
    description:
      "Mass is the amount of matter (kg); weight is the gravitational force on that mass (N). They are related but not the same quantity.",
  },
  {
    a: "speed",
    b: "velocity",
    title: "Speed vs velocity",
    description:
      "Speed is scalar (how fast); velocity is vector (speed with direction).",
  },
  {
    a: "energy",
    b: "power",
    title: "Energy vs power",
    description: "Energy is the capacity to do work; power is the rate of energy transfer.",
  },
  {
    a: "mitosis",
    b: "meiosis",
    title: "Mitosis vs meiosis",
    description:
      "Mitosis produces two identical diploid cells; meiosis produces four genetically varied haploid cells.",
  },
  {
    a: "atom",
    b: "molecule",
    title: "Atom vs molecule",
    description: "An atom is the basic unit of an element; a molecule is two or more atoms bonded.",
  },
];

/**
 * Classify a single evaluation into an error kind.
 * Does not create a misconception by itself.
 */
export function classifyErrorKind(
  evaluation: AnswerEvaluation,
  question: LearningQuestion,
): ErrorKind {
  if (evaluation.correctness === "unevaluable") return "unevaluable";
  if (evaluation.correctness === "correct") return "careless_mistake"; // not used for diagnosis
  if (evaluation.confidence === "low" || evaluation.evidenceLevel === "insufficient") {
    return "unevaluable";
  }

  const answer = normalize(evaluation.studentAnswer);
  const expected = normalize(question.expectedAnswer ?? question.sourceExcerpts[0]?.text ?? "");

  // Isolated MC miss is treated as careless unless a broader pattern is established later
  if (question.type === "multiple_choice" && evaluation.correctness === "incorrect") {
    return "careless_mistake";
  }

  if (!answer || answer.length < 8) return "incomplete_answer";

  const ratio = overlapRatio(answer, expected);
  if (ratio >= 0.15 && ratio < 0.35) return "incomplete_answer";

  // Check known confusion pairs in the student answer / topic context
  for (const pair of CONFUSION_PAIRS) {
    const hasA = answer.includes(pair.a);
    const hasB = answer.includes(pair.b);
    const topicHas =
      normalize(question.topic ?? "").includes(pair.a) ||
      normalize(question.topic ?? "").includes(pair.b) ||
      expected.includes(pair.a) ||
      expected.includes(pair.b);
    if (topicHas && (hasA || hasB)) {
      return "conceptual_misunderstanding";
    }
  }

  if (evaluation.missingOrIncorrect.length >= 2 && ratio < 0.2) {
    return "conceptual_misunderstanding";
  }

  if (ratio < 0.12) return "conceptual_misunderstanding";
  return "incomplete_answer";
}

/**
 * Evidence sufficiency rules for promoting a suspected misconception.
 * Policy: never confirm from one ambiguous answer.
 */
export function isEvidenceSufficient(
  observations: MisconceptionObservation[],
  errorKinds: ErrorKind[],
): { sufficient: boolean; confidence: "low" | "medium" | "high" } {
  const conceptual = errorKinds.filter((k) => k === "conceptual_misunderstanding").length;
  const total = observations.length;

  if (total < 2) {
    return { sufficient: false, confidence: "low" };
  }
  if (conceptual >= 2 && total >= 2) {
    return { sufficient: true, confidence: conceptual >= 3 ? "high" : "medium" };
  }
  if (total >= 3 && conceptual >= 1) {
    return { sufficient: true, confidence: "medium" };
  }
  return { sufficient: false, confidence: "low" };
}

export function detectConfusionPair(
  studentAnswer: string,
  topic: string | null,
  expected: string,
): (typeof CONFUSION_PAIRS)[number] | null {
  const answer = normalize(studentAnswer);
  const ctx = normalize(`${topic ?? ""} ${expected}`);
  for (const pair of CONFUSION_PAIRS) {
    const inCtx = ctx.includes(pair.a) || ctx.includes(pair.b);
    const mentionsPair = answer.includes(pair.a) || answer.includes(pair.b);
    const usesWrong =
      (answer.includes(pair.a) && ctx.includes(pair.b) && !answer.includes(pair.b)) ||
      (answer.includes(pair.b) && ctx.includes(pair.a) && !answer.includes(pair.a));
    if (inCtx && (usesWrong || mentionsPair)) return pair;
  }
  return null;
}

/**
 * Analyse one evaluation in the context of prior attempts on the same topic.
 * Returns a diagnostic result; may request another question instead of diagnosing.
 */
export function analyseAnswerForMisconception(input: {
  evaluation: AnswerEvaluation;
  question: LearningQuestion;
  priorAttempts: AttemptRecord[];
  priorEvaluations: AnswerEvaluation[];
  retrieved?: RetrievedChunk[];
}): DiagnosticResult {
  const { evaluation, question } = input;
  // Never double-count the current evaluation / attempt
  const priorAttempts = input.priorAttempts.filter(
    (a) => a.evaluationId !== evaluation.id && a.id !== evaluation.id,
  );
  const priorEvaluations = input.priorEvaluations.filter((e) => e.id !== evaluation.id);
  const errorKind = classifyErrorKind(evaluation, question);

  if (errorKind === "unevaluable") {
    return {
      errorKind,
      possibleMisconception: null,
      needsMoreEvidence: true,
      diagnosticQuestionPrompt: null,
      explanation:
        "This response cannot be evaluated confidently with the available source material. No misconception is recorded.",
      confidence: "low",
    };
  }

  if (evaluation.correctness === "correct") {
    return {
      errorKind: "careless_mistake",
      possibleMisconception: null,
      needsMoreEvidence: false,
      diagnosticQuestionPrompt: null,
      explanation: "The answer matches the source-supported idea. No misconception signal.",
      confidence: "high",
    };
  }

  if (errorKind === "careless_mistake" || errorKind === "incomplete_answer") {
    const sameTopicWrong = priorAttempts.filter(
      (a) =>
        a.topicLabel === question.topic &&
        (a.correctness === "incorrect" || a.correctness === "partial"),
    ).length;

    if (sameTopicWrong < 1 && errorKind === "careless_mistake") {
      return {
        errorKind,
        possibleMisconception: null,
        needsMoreEvidence: false,
        diagnosticQuestionPrompt: null,
        explanation:
          "This looks like an isolated mistake or incomplete answer, not a stable misconception. Review the cited pages and try a similar question.",
        confidence: "medium",
      };
    }
  }

  const pair = detectConfusionPair(
    evaluation.studentAnswer,
    question.topic,
    question.expectedAnswer ?? "",
  );

  const category: MisconceptionCategory = pair
    ? "confused_related_concepts"
    : errorKind === "conceptual_misunderstanding"
      ? "repeated_conceptual_error"
      : "definition_confusion";

  const title = pair?.title ?? `Difficulty with ${question.topic ?? "this topic"}`;
  const description =
    pair?.description ??
    (evaluation.missingOrIncorrect.join(" ") ||
      "Student response diverges from the source-supported idea in a way that may indicate a conceptual gap.");

  const relatedWrong = priorAttempts.filter(
    (a) =>
      (a.topicLabel === question.topic || a.documentId === question.documentId) &&
      a.correctness !== "correct",
  );

  const observations: MisconceptionObservation[] = [
    {
      id: id("obs"),
      attemptId: null,
      evaluationId: evaluation.id,
      questionId: question.id,
      studentAnswer: evaluation.studentAnswer,
      note: evaluation.explanation.slice(0, 240),
      observedAt: evaluation.createdAt,
    },
    ...relatedWrong.slice(0, 4).map((a) => ({
      id: id("obs"),
      attemptId: a.id,
      evaluationId: a.evaluationId,
      questionId: a.questionId,
      studentAnswer: a.studentAnswer,
      note: `Prior ${a.correctness} attempt`,
      observedAt: a.createdAt,
    })),
  ];

  const errorKinds: ErrorKind[] = [
    errorKind,
    ...priorEvaluations
      .filter((e) => e.correctness === "incorrect" || e.correctness === "partial")
      .map((e) =>
        classifyErrorKind(e, question),
      ),
  ];

  const { sufficient, confidence } = isEvidenceSufficient(observations, errorKinds);

  if (!sufficient) {
    return {
      errorKind,
      possibleMisconception: {
        concept: pair?.a ?? question.topic ?? "topic",
        topicLabel: question.topic,
        documentId: question.documentId,
        category,
        description,
        title,
        observations,
        supportingExcerpts: evaluation.sourceExcerpts,
        confidence: "low",
        status: "suspected",
      },
      needsMoreEvidence: true,
      diagnosticQuestionPrompt: pair
        ? `Explain the difference between ${pair.a} and ${pair.b} using an everyday example. Which one is measured in kilograms?`
        : `In your own words, what is the key idea on pages ${question.sourceExcerpts[0]?.pageStart ?? "?"}–${question.sourceExcerpts[0]?.pageEnd ?? "?"}? Give one concrete example.`,
      explanation:
        "There is a possible misunderstanding, but evidence is not yet strong enough to confirm a misconception. A short diagnostic question will help clarify.",
      confidence: "low",
    };
  }

  const now = new Date().toISOString();
  return {
    errorKind: "conceptual_misunderstanding",
    possibleMisconception: {
      id: id("mc"),
      concept: pair?.a ?? question.topic ?? "topic",
      topicLabel: question.topic,
      documentId: question.documentId,
      category,
      description,
      title,
      observations,
      supportingExcerpts: evaluation.sourceExcerpts,
      confidence,
      status: "confirmed",
      firstObservedAt: observations[observations.length - 1]?.observedAt ?? now,
      lastObservedAt: now,
      observationCount: observations.length,
      remediationSessionIds: [],
      diagnosticQuestionIds: [],
      createdAt: now,
      updatedAt: now,
    },
    needsMoreEvidence: false,
    diagnosticQuestionPrompt: null,
    explanation: `Evidence from ${observations.length} related responses supports a ${category.replace(/_/g, " ")} pattern: ${title}.`,
    confidence,
  };
}

/**
 * Build a targeted remediation activity grounded in source excerpts.
 */
export function buildRemediationActivity(
  misconception: MisconceptionRecord,
  retrieved: RetrievedChunk[],
): RemediationActivity {
  const passage = retrieved[0]?.excerpt ?? misconception.supportingExcerpts[0] ?? null;
  const pair = CONFUSION_PAIRS.find(
    (p) =>
      misconception.title.toLowerCase().includes(p.a) ||
      misconception.title.toLowerCase().includes(p.b),
  );

  const simple =
    pair?.description ??
    (misconception.description ||
      "Review the idea carefully using the textbook passage below.");

  const comparison = pair
    ? `${pair.a.charAt(0).toUpperCase() + pair.a.slice(1)} is not the same as ${pair.b}. ${pair.description}`
    : null;

  const example = pair
    ? pair.a === "mass" && pair.b === "weight"
      ? "A bag of sugar has the same mass on Earth and on the Moon, but its weight is smaller on the Moon because gravity is weaker."
      : `Think of a situation where mixing up the ideas in “${misconception.title}” would lead to a wrong prediction.`
    : `Apply the idea from the passage to a new everyday situation.`;

  return {
    id: id("rem"),
    misconceptionId: misconception.id,
    title: `Clarify: ${misconception.title}`,
    simpleExplanation: simple,
    comparison,
    textbookPassage: passage,
    practicalExample: example,
    distinctionQuestion: pair
      ? `Which statement is true? (a) ${pair.a} and ${pair.b} are the same quantity. (b) ${pair.description}`
      : `What is the main distinction this topic requires you to keep clear?`,
    applicationQuestion: pair
      ? `Give one real-world example that shows why ${pair.a} and ${pair.b} must be treated differently.`
      : `Use the textbook idea to solve a new short problem in your own words.`,
    explainYourselfPrompt: `Explain “${misconception.title}” in your own words as if teaching a classmate. Use a simple example.`,
    teachingExampleIsGenerated: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Status transitions — require meaningful reassessment, not a single lucky correct answer.
 */
export function nextMisconceptionStatus(
  current: MisconceptionStatus,
  event: "more_evidence" | "correct_reassessment" | "incorrect_reassessment" | "manual_resolve",
  consecutiveCorrectReassessments: number,
): MisconceptionStatus {
  if (event === "manual_resolve") return "resolved";
  if (event === "more_evidence") {
    if (current === "suspected") return "confirmed";
    if (current === "improving") return "needs_reassessment";
    return current === "resolved" ? "needs_reassessment" : current;
  }
  if (event === "incorrect_reassessment") {
    if (current === "improving" || current === "resolved") return "needs_reassessment";
    return current === "suspected" ? "confirmed" : current;
  }
  // correct_reassessment
  if (consecutiveCorrectReassessments >= 2) {
    if (current === "confirmed" || current === "needs_reassessment") return "improving";
    if (current === "improving") return "resolved";
  }
  if (consecutiveCorrectReassessments === 1 && current === "confirmed") {
    return "improving";
  }
  return current;
}

export function validateMisconceptionRecord(raw: unknown): raw is MisconceptionRecord {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.concept === "string" &&
    typeof r.category === "string" &&
    typeof r.description === "string" &&
    typeof r.title === "string" &&
    Array.isArray(r.observations) &&
    typeof r.confidence === "string" &&
    typeof r.status === "string" &&
    typeof r.observationCount === "number"
  );
}


/**
 * Merge new diagnostic evidence into an existing misconception record.
 * Deduplicates observations, recalculates confidence & status, preserves timestamps.
 */
export function mergeMisconceptionEvidence(
  existing: MisconceptionRecord,
  incoming: Partial<MisconceptionRecord> & { observations?: MisconceptionObservation[] },
): MisconceptionRecord {
  const byKey = new Map<string, MisconceptionObservation>();
  for (const o of existing.observations ?? []) {
    byKey.set(o.evaluationId ?? o.attemptId ?? o.id, o);
  }
  for (const o of incoming.observations ?? []) {
    const key = o.evaluationId ?? o.attemptId ?? o.id;
    if (!byKey.has(key)) byKey.set(key, o);
  }
  const observations = [...byKey.values()].sort((a, b) =>
    a.observedAt < b.observedAt ? -1 : a.observedAt > b.observedAt ? 1 : 0,
  );
  const conceptualCount = observations.filter(
    (o) =>
      /conceptual|confused|diverges/i.test(o.note) ||
      (o.studentAnswer?.trim().length ?? 0) >= 8,
  ).length;
  const errorKinds: ErrorKind[] = observations.map((_, i) =>
    i < conceptualCount ? "conceptual_misunderstanding" : "incomplete_answer",
  );
  const { sufficient, confidence } = isEvidenceSufficient(observations, errorKinds);
  let status: MisconceptionStatus = existing.status;
  if (sufficient && (status === "suspected" || !status)) status = "confirmed";

  const excerptMap = new Map<string, SourceExcerpt>();
  for (const e of existing.supportingExcerpts ?? []) {
    excerptMap.set(`${e.documentId}:${e.pageStart}:${e.text.slice(0, 40)}`, e);
  }
  for (const e of incoming.supportingExcerpts ?? []) {
    excerptMap.set(`${e.documentId}:${e.pageStart}:${e.text.slice(0, 40)}`, e);
  }
  const firstObservedAt =
    observations[0]?.observedAt ?? existing.firstObservedAt ?? existing.createdAt;
  const lastObservedAt =
    observations[observations.length - 1]?.observedAt ??
    existing.lastObservedAt ??
    new Date().toISOString();

  return {
    ...existing,
    concept: incoming.concept ?? existing.concept,
    topicLabel: incoming.topicLabel ?? existing.topicLabel,
    documentId: incoming.documentId ?? existing.documentId,
    category: (incoming.category as MisconceptionCategory) ?? existing.category,
    description: incoming.description ?? existing.description,
    title: incoming.title ?? existing.title,
    observations,
    supportingExcerpts: [...excerptMap.values()],
    confidence,
    status,
    firstObservedAt,
    lastObservedAt,
    observationCount: observations.length,
    updatedAt: new Date().toISOString(),
  };
}

export function findMatchingMisconception(
  existing: MisconceptionRecord[],
  candidate: Partial<MisconceptionRecord>,
): MisconceptionRecord | undefined {
  return existing.find(
    (m) =>
      (candidate.title && m.title === candidate.title) ||
      (candidate.concept &&
        m.concept === candidate.concept &&
        (m.documentId ?? null) === (candidate.documentId ?? null)) ||
      (candidate.topicLabel &&
        m.topicLabel === candidate.topicLabel &&
        (m.documentId ?? null) === (candidate.documentId ?? null)),
  );
}
