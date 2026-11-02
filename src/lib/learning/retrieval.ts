/**
 * Hybrid retrieval for educational grounding.
 * Keyword / phrase / terminology / normalized matching + ranking.
 * Designed so semantic embeddings can plug in later without changing call sites.
 * Does not claim to be semantic AI when only lexical methods are active.
 */

import type { DocumentChunk, DocumentContent } from "@/lib/documents/types";
import type { SourceExcerpt } from "./types.ts";

export interface RetrievalQuery {
  /** Free-text focus (topic, section title, keywords) */
  text: string;
  documentId?: string;
  /** Prefer chunks whose page range overlaps */
  pageHint?: number | null;
  /** Optional curriculum filters (soft boost / filter) */
  topicHint?: string | null;
  objectiveHint?: string | null;
  limit?: number;
  /** Minimum lexical score to keep (0–1 scale after normalization) */
  minScore?: number;
}

export interface RetrievedChunk {
  chunk: DocumentChunk;
  score: number;
  /** Breakdown for transparency / debugging; not shown as "AI confidence" */
  signals: RetrievalSignals;
  excerpt: SourceExcerpt;
}

export interface RetrievalSignals {
  keyword: number;
  phrase: number;
  exactTerm: number;
  normalized: number;
  title: number;
  pageProximity: number;
  length: number;
  concept: number;
}

/** Lightweight synonym / concept groups for common science pairs (offline). */
const CONCEPT_GROUPS: string[][] = [
  ["mass", "weight", "inertia"],
  ["force", "net force", "resultant"],
  ["velocity", "speed", "acceleration"],
  ["energy", "work", "power"],
  ["photosynthesis", "chlorophyll", "glucose"],
  ["atom", "molecule", "element", "compound"],
  ["cell", "nucleus", "membrane", "organelle"],
  ["acid", "base", "ph", "neutralization"],
  ["current", "voltage", "resistance", "ohm"],
  ["mitosis", "meiosis", "cell division"],
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Language-aware tokenization interface.
 * Current implementation is Latin-script oriented; non-space-separated scripts
 * (e.g. future Amharic/Oromo handling) should supply a custom tokenizer.
 */
export function tokenize(text: string, language = "en"): string[] {
  const norm = normalizeText(text);
  if (!norm) return [];
  // Placeholder for script-specific tokenizers (Amharic, Afaan Oromo, etc.)
  if (language !== "en" && language !== "latn") {
    // Fall back to whitespace + punctuation split; do not claim language accuracy.
    return norm.split(/\s+/).filter((t) => t.length > 1);
  }
  return norm
    .split(/\s+/)
    .filter((t) => t.length > 2 || /^[a-z]{2}$/.test(t));
}

function extractPhrases(text: string, max = 6): string[] {
  const tokens = tokenize(text);
  const phrases: string[] = [];
  for (let i = 0; i < tokens.length - 1 && phrases.length < max; i++) {
    phrases.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return phrases;
}

function conceptBoost(queryTokens: string[], hay: string): number {
  let boost = 0;
  const hayTokens = new Set(tokenize(hay));
  for (const group of CONCEPT_GROUPS) {
    const qHit = group.some((g) => queryTokens.includes(g) || queryTokens.some((t) => g.includes(t)));
    const hHit = group.some((g) => hayTokens.has(g) || hay.includes(g));
    if (qHit && hHit) boost += 0.08;
  }
  return Math.min(boost, 0.24);
}

/**
 * Hybrid lexical score. Deterministic, offline, no network.
 * Scale is roughly 0–1.5 before clamping in ranking.
 */
export function scoreChunkDetailed(
  queryText: string,
  chunk: DocumentChunk,
  options: { pageHint?: number | null; topicHint?: string | null } = {},
): { score: number; signals: RetrievalSignals } {
  const queryTokens = tokenize(queryText);
  const phrases = extractPhrases(queryText);
  const hayRaw = `${chunk.title ?? ""} ${chunk.text}`;
  const hay = normalizeText(hayRaw);
  const titleNorm = normalizeText(chunk.title ?? "");

  let keywordHits = 0;
  const seen = new Set<string>();
  for (const t of queryTokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    if (hay.includes(t)) keywordHits += 1;
  }
  const keyword = queryTokens.length === 0 ? 0.05 : keywordHits / queryTokens.length;

  let phraseHits = 0;
  for (const p of phrases) {
    if (hay.includes(p)) phraseHits += 1;
  }
  const phrase = phrases.length === 0 ? 0 : phraseHits / phrases.length;

  // Exact multi-word terminology (quoted-style): reward longer contiguous matches
  let exactTerm = 0;
  const longer = queryTokens.filter((t) => t.length >= 5);
  for (const t of longer) {
    if (hay.includes(t)) exactTerm += 0.05;
  }
  exactTerm = Math.min(exactTerm, 0.25);

  // Normalized whole-query containment soft match
  const qNorm = normalizeText(queryText);
  const normalized =
    qNorm.length > 8 && hay.includes(qNorm.slice(0, Math.min(40, qNorm.length)))
      ? 0.15
      : 0;

  const title =
    titleNorm && queryTokens.some((t) => titleNorm.includes(t))
      ? 0.18
      : titleNorm && phrases.some((p) => titleNorm.includes(p))
        ? 0.12
        : 0;

  let pageProximity = 0;
  if (options.pageHint != null) {
    if (chunk.pageStart <= options.pageHint && chunk.pageEnd >= options.pageHint) {
      pageProximity = 0.22;
    } else {
      const dist = Math.min(
        Math.abs(chunk.pageStart - options.pageHint),
        Math.abs(chunk.pageEnd - options.pageHint),
      );
      if (dist <= 2) pageProximity = 0.1;
    }
  }

  const length =
    chunk.charCount < 40 ? -0.25 : chunk.charCount > 2500 ? -0.05 : chunk.charCount < 80 ? -0.1 : 0;

  const concept = conceptBoost(queryTokens, hay);

  // Topic hint soft boost
  let topicBoost = 0;
  if (options.topicHint) {
    const th = normalizeText(options.topicHint);
    if (th && (hay.includes(th) || titleNorm.includes(th))) topicBoost = 0.12;
  }

  const score =
    keyword * 0.45 +
    phrase * 0.25 +
    exactTerm +
    normalized +
    title +
    pageProximity +
    length +
    concept +
    topicBoost;

  return {
    score: Math.max(0, score),
    signals: {
      keyword,
      phrase,
      exactTerm,
      normalized,
      title,
      pageProximity,
      length,
      concept,
    },
  };
}

/** Back-compat simple score used by older tests */
export function scoreChunk(queryTokens: string[], chunk: DocumentChunk): number {
  const q = queryTokens.join(" ");
  return scoreChunkDetailed(q, chunk).score;
}

export function retrieveFromContent(
  content: DocumentContent,
  query: RetrievalQuery,
): RetrievedChunk[] {
  const limit = query.limit ?? 5;
  const minScore = query.minScore ?? 0.08;
  const scored: RetrievedChunk[] = [];

  for (const chunk of content.chunks) {
    if (query.documentId && chunk.documentId !== query.documentId) continue;
    const { score, signals } = scoreChunkDetailed(query.text, chunk, {
      pageHint: query.pageHint,
      topicHint: query.topicHint ?? query.objectiveHint,
    });
    if (score < minScore) continue;
    scored.push({
      chunk,
      score,
      signals,
      excerpt: {
        documentId: chunk.documentId,
        chunkId: chunk.id,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        text: chunk.text.slice(0, 700),
      },
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export function hasSufficientEvidence(results: RetrievedChunk[], minScore = 0.2): boolean {
  return results.length > 0 && results[0].score >= minScore;
}

export function excerptsFrom(results: RetrievedChunk[]): SourceExcerpt[] {
  return results.map((r) => r.excerpt);
}

/**
 * Future embedding hook. Callers should prefer this interface when a vector
 * backend becomes available; current implementation delegates to hybrid lexical.
 */
export async function retrieveHybrid(
  content: DocumentContent,
  query: RetrievalQuery,
  _embeddingProvider?: { embed: (text: string) => Promise<number[]> } | null,
): Promise<RetrievedChunk[]> {
  // When embeddings are unavailable, retain reliable offline lexical retrieval.
  return retrieveFromContent(content, query);
}
