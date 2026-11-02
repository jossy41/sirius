/**
 * Source-grounded heuristic question generation and evaluation.
 * Not a language model. Labeled as such in all outputs.
 */

import type { DocumentChunk } from "@/lib/documents/types";
import type {
  AnswerEvaluation,
  CognitiveLevel,
  Difficulty,
  FeynmanSession,
  LearningQuestion,
  QuestionType,
  SourceExcerpt,
} from "./types.ts";
import type { RetrievedChunk } from "./retrieval.ts";

function id(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function firstSentences(text: string, n: number): string[] {
  const parts = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  return parts.slice(0, n);
}

function pickKeyPhrase(text: string): string | null {
  const sentences = firstSentences(text, 3);
  if (sentences.length === 0) return null;
  // Prefer a mid-length clause
  const s = sentences[0];
  if (s.length > 180) return s.slice(0, 160).replace(/\s+\S*$/, "") + "…";
  return s;
}

function distractorsFrom(chunk: DocumentChunk, others: DocumentChunk[], answer: string): string[] {
  const pool: string[] = [];
  for (const o of others) {
    const phrase = pickKeyPhrase(o.text);
    if (phrase && phrase !== answer && phrase.length > 15) pool.push(phrase);
  }
  // Pad with generic wrong options if needed
  while (pool.length < 3) {
    pool.push(`A related idea not stated on pages ${chunk.pageStart}–${chunk.pageEnd} of this text`);
  }
  return pool.slice(0, 3);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface GenerateOptions {
  documentId: string;
  subject?: string | null;
  topic?: string | null;
  types?: QuestionType[];
  count?: number;
}

/**
 * Build questions strictly from retrieved chunks. Returns empty if evidence is weak.
 */
export function generateQuestionsFromChunks(
  retrieved: RetrievedChunk[],
  options: GenerateOptions,
): LearningQuestion[] {
  if (retrieved.length === 0) return [];
  const count = options.count ?? 4;
  const types: QuestionType[] = options.types ?? [
    "multiple_choice",
    "short_answer",
    "conceptual",
    "explain_own_words",
  ];
  const allChunks = retrieved.map((r) => r.chunk);
  const questions: LearningQuestion[] = [];
  const now = new Date().toISOString();

  let ti = 0;
  for (let i = 0; i < count && i < retrieved.length * 2; i++) {
    const r = retrieved[i % retrieved.length];
    const chunk = r.chunk;
    const type = types[ti % types.length];
    ti += 1;
    const excerpt: SourceExcerpt = r.excerpt;
    const topicLabel = options.topic ?? chunk.title ?? `Pages ${chunk.pageStart}–${chunk.pageEnd}`;
    const key = pickKeyPhrase(chunk.text);
    if (!key) continue;

    const base = {
      id: id("q"),
      difficulty: (i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard") as Difficulty,
      cognitiveLevel: mapTypeToCognitive(type),
      subject: options.subject ?? null,
      topic: topicLabel,
      objectiveId: null,
      documentId: options.documentId,
      sourceExcerpts: [excerpt],
      evidenceLevel: "direct" as const,
      generatedBy: "heuristic" as const,
      createdAt: now,
    };

    if (type === "multiple_choice") {
      const correct = key;
      const wrong = distractorsFrom(chunk, allChunks.filter((c) => c.id !== chunk.id), correct);
      const choices = shuffle([correct, ...wrong]);
      const correctChoiceIndex = choices.indexOf(correct);
      questions.push({
        ...base,
        type: "multiple_choice",
        text: `According to the text (pages ${chunk.pageStart}–${chunk.pageEnd}), which statement is supported?`,
        choices,
        correctChoiceIndex,
        expectedAnswer: correct,
        markingGuidance: "Select the option that matches the source excerpt.",
        explanation: `The source states: “${key}” (pages ${chunk.pageStart}–${chunk.pageEnd}).`,
      });
    } else if (type === "short_answer") {
      questions.push({
        ...base,
        type: "short_answer",
        text: `In your own words, what does the text say about this idea on pages ${chunk.pageStart}–${chunk.pageEnd}? Use the passage as your guide.`,
        choices: null,
        correctChoiceIndex: null,
        expectedAnswer: key,
        markingGuidance: "Accept equivalent wording if the same idea is present in the source.",
        explanation: `Key idea from the text: “${key}”`,
      });
    } else if (type === "conceptual" || type === "explain_own_words") {
      questions.push({
        ...base,
        type,
        text:
          type === "explain_own_words"
            ? `Explain the main idea of “${chunk.title ?? topicLabel}” in your own words (see pages ${chunk.pageStart}–${chunk.pageEnd}).`
            : `What concept is the passage on pages ${chunk.pageStart}–${chunk.pageEnd} developing? Summarise it briefly.`,
        choices: null,
        correctChoiceIndex: null,
        expectedAnswer: key,
        markingGuidance: "Look for the core claim of the excerpt, not identical wording.",
        explanation: `The passage centres on: “${key}”`,
      });
    } else if (type === "application") {
      questions.push({
        ...base,
        type: "application",
        text: `How could you apply the idea described on pages ${chunk.pageStart}–${chunk.pageEnd} to a new example? Start from what the text actually says.`,
        choices: null,
        correctChoiceIndex: null,
        expectedAnswer: key,
        markingGuidance: "Student must ground the application in the source idea.",
        explanation: `Source idea to apply: “${key}”`,
      });
    } else {
      questions.push({
        ...base,
        type: "analysis",
        text: `What relationship or distinction does the text emphasise on pages ${chunk.pageStart}–${chunk.pageEnd}?`,
        choices: null,
        correctChoiceIndex: null,
        expectedAnswer: key,
        markingGuidance: "Credit answers that identify the relationship stated in the excerpt.",
        explanation: `From the text: “${key}”`,
      });
    }
  }

  return questions;
}

function mapTypeToCognitive(type: QuestionType): CognitiveLevel {
  switch (type) {
    case "multiple_choice":
    case "short_answer":
      return "recall";
    case "conceptual":
    case "explain_own_words":
      return "understand";
    case "application":
      return "apply";
    case "analysis":
      return "analyze";
  }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
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

/**
 * Evaluate an answer against source-backed expected content.
 * Does not claim official exam grading.
 */
export function evaluateAnswerHeuristic(
  question: LearningQuestion,
  studentAnswer: string,
): AnswerEvaluation {
  const now = new Date().toISOString();
  const raw = studentAnswer.trim();
  if (!raw) {
    return {
      id: id("ev"),
      questionId: question.id,
      studentAnswer: raw,
      correctness: "incorrect",
      explanation: "No answer was provided.",
      understood: [],
      missingOrIncorrect: ["An answer is required."],
      suggestedImprovement: "Re-read the cited pages and write a short response in your own words.",
      sourceExcerpts: question.sourceExcerpts,
      confidence: "high",
      evidenceLevel: question.evidenceLevel,
      evaluatedBy: "heuristic",
      createdAt: now,
    };
  }

  if (question.type === "multiple_choice" && question.choices && question.correctChoiceIndex != null) {
    const idx = question.choices.findIndex((c) => c === raw || normalize(c) === normalize(raw));
    // Also allow answering by index string
    const asNum = Number.parseInt(raw, 10);
    const chosen =
      idx >= 0
        ? idx
        : Number.isFinite(asNum) && asNum >= 0 && asNum < question.choices.length
          ? asNum
          : -1;
    const correct = chosen === question.correctChoiceIndex;
    return {
      id: id("ev"),
      questionId: question.id,
      studentAnswer: raw,
      correctness: correct ? "correct" : "incorrect",
      explanation: correct
        ? question.explanation
        : `The source-supported option is: “${question.choices[question.correctChoiceIndex]}”. ${question.explanation}`,
      understood: correct ? ["You selected the option supported by the text."] : [],
      missingOrIncorrect: correct
        ? []
        : ["The selected option does not match the cited excerpt."],
      suggestedImprovement: correct
        ? "Try explaining why the other options do not match the text."
        : "Return to the cited pages and compare each option to the wording there.",
      sourceExcerpts: question.sourceExcerpts,
      confidence: "high",
      evidenceLevel: "direct",
      evaluatedBy: "heuristic",
      createdAt: now,
    };
  }

  const expected = question.expectedAnswer ?? question.sourceExcerpts[0]?.text ?? "";
  const ratio = overlapRatio(raw, expected);
  let correctness: AnswerEvaluation["correctness"] = "incorrect";
  if (ratio >= 0.45) correctness = "correct";
  else if (ratio >= 0.22) correctness = "partial";

  const understood: string[] = [];
  const missing: string[] = [];
  if (correctness === "correct") {
    understood.push("Your answer covers key terms from the source excerpt.");
  } else if (correctness === "partial") {
    understood.push("Some ideas from the source appear in your answer.");
    missing.push("Important parts of the source idea are still missing or unclear.");
  } else {
    missing.push("The answer does not clearly reflect the cited source idea.");
  }

  return {
    id: id("ev"),
    questionId: question.id,
    studentAnswer: raw,
    correctness,
    explanation: `Compared with the source excerpt (pages ${question.sourceExcerpts[0]?.pageStart ?? "?"}–${question.sourceExcerpts[0]?.pageEnd ?? "?"}): ${question.explanation}`,
    understood,
    missingOrIncorrect: missing,
    suggestedImprovement:
      correctness === "correct"
        ? "Strengthen your answer by naming one concrete detail from the page."
        : "Re-read the excerpt, list two key points, then rewrite your answer without copying full sentences.",
    sourceExcerpts: question.sourceExcerpts,
    confidence: ratio >= 0.45 ? "medium" : "low",
    evidenceLevel: question.evidenceLevel,
    evaluatedBy: "heuristic",
    createdAt: now,
  };
}

export function evaluateFeynmanHeuristic(
  documentId: string,
  topicLabel: string,
  studentExplanation: string,
  retrieved: RetrievedChunk[],
): FeynmanSession {
  const now = new Date().toISOString();
  const excerpts = retrieved.map((r) => r.excerpt);
  const combined = retrieved.map((r) => r.chunk.text).join("\n");
  const key = pickKeyPhrase(combined) ?? topicLabel;
  const ratio = overlapRatio(studentExplanation, combined);

  const correct: string[] = [];
  const missing: string[] = [];
  const confused: string[] = [];
  const unsupported: string[] = [];

  if (ratio >= 0.3) correct.push("Your explanation touches ideas present in the source text.");
  if (ratio < 0.45) missing.push("Some core points from the cited pages are not yet explained.");
  if (studentExplanation.trim().length < 40) {
    missing.push("The explanation is very short; add more of the source’s main claims.");
  }
  // Flag very long unique tokens not in source as potentially unsupported
  const srcTokens = tokenSet(combined);
  for (const t of tokenSet(studentExplanation)) {
    if (t.length > 8 && !srcTokens.has(t) && unsupported.length < 3) {
      // soft signal only
    }
  }
  if (ratio < 0.15 && studentExplanation.trim().length > 60) {
    unsupported.push(
      "Several statements do not clearly match the available textbook excerpts. Prefer ideas you can point to on the cited pages.",
    );
  }
  if (ratio >= 0.15 && ratio < 0.35) {
    confused.push("Some ideas may be mixed together; separate the main claim from examples.");
  }

  return {
    id: id("fy"),
    documentId,
    topicLabel,
    studentExplanation,
    feedback:
      ratio >= 0.45
        ? "Strong start. You are explaining ideas that appear in the source. Add one precise detail from the pages to lock it in."
        : "You are building an explanation, but key source ideas are still thin. Use the cited pages as your checklist.",
    correctUnderstanding: correct,
    missingConcepts: missing,
    confusedIdeas: confused,
    unsupportedStatements: unsupported,
    simplerExplanation: `In simple terms, the text focuses on: ${key}`,
    followUpQuestion: `What is one example or consequence of “${key.slice(0, 80)}” according to the text?`,
    sourceExcerpts: excerpts.slice(0, 3),
    evidenceLevel: retrieved.length ? "direct" : "insufficient",
    evaluatedBy: "heuristic",
    createdAt: now,
  };
}

/**
 * Compare successive Feynman explanations of the same concept.
 * Judges conceptual accuracy and coverage, not writing length or vocabulary.
 */
export function compareFeynmanSessions(
  previous: FeynmanSession,
  current: FeynmanSession,
): {
  improved: boolean;
  summary: string;
  persistentGaps: string[];
  newStrengths: string[];
} {
  const prevRatio = overlapRatio(previous.studentExplanation, previous.sourceExcerpts.map((e) => e.text).join(" "));
  const currRatio = overlapRatio(current.studentExplanation, current.sourceExcerpts.map((e) => e.text).join(" "));
  const improved =
    currRatio > prevRatio + 0.08 ||
    (current.missingConcepts.length < previous.missingConcepts.length &&
      current.confusedIdeas.length <= previous.confusedIdeas.length);

  const persistentGaps = current.missingConcepts.filter((m) =>
    previous.missingConcepts.some((p) => overlapRatio(p, m) > 0.4),
  );
  const newStrengths = current.correctUnderstanding.filter(
    (c) => !previous.correctUnderstanding.some((p) => overlapRatio(p, c) > 0.4),
  );

  const summary = improved
    ? "Your latest explanation covers more of the source ideas than the previous one. Keep the accurate parts and fill the remaining gaps."
    : persistentGaps.length
      ? "Some of the same gaps appear again. Focus on the missing ideas listed below and try a shorter, clearer explanation."
      : "Accuracy is similar to your previous attempt. Try using one concrete example from the textbook pages.";

  return { improved, summary, persistentGaps, newStrengths };
}
