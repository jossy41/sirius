import type { DocumentChunk, DocumentMeta } from "../documents/types.ts";
import type { RetrievalHit } from "./types.ts";
import { lexicalScore, tokenize } from "./lexical.ts";

/** Lightweight concept expansion — not embeddings. */
const CONCEPT_SYNONYMS: Record<string, string[]> = {
  mass: ["matter", "inertia", "kilogram", "kg"],
  weight: ["gravity", "newton", "force", "heaviness"],
  force: ["newton", "push", "pull", "acceleration"],
  energy: ["joule", "work", "kinetic", "potential"],
  water: ["h2o", "liquid", "moisture", "hydration"],
  plant: ["leaf", "stem", "root", "transpiration", "wilting"],
  transpiration: ["wilting", "stomata", "evaporation", "water loss"],
  // Afaan Oromo educational terms (experimental)
  barumsa: ["learning", "education", "study"],
  jireenya: ["life", "living"],
  // Amharic romanization hooks remain limited; Ethiopic handled via script tokens
};

export function expandQueryTerms(query: string): string[] {
  const base = tokenize(query);
  const extra: string[] = [];
  for (const t of base) {
    for (const [concept, syns] of Object.entries(CONCEPT_SYNONYMS)) {
      if (t === concept || syns.includes(t)) {
        extra.push(concept, ...syns);
      }
    }
  }
  return [...new Set([...base, ...extra])];
}

export function conceptRetrieve(input: {
  query: string;
  chunks: DocumentChunk[];
  documents: DocumentMeta[];
  conceptHints?: string[];
  limit?: number;
}): RetrievalHit[] {
  const terms = [...expandQueryTerms(input.query), ...(input.conceptHints ?? []).map((c) => c.toLowerCase())];
  const titles = new Map(input.documents.map((d) => [d.id, d.name]));
  const scored = input.chunks
    .map((c) => ({ c, score: lexicalScore(c.text, terms) * 0.9 }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 8);
  return scored.map((x) => ({
    chunkId: x.c.id,
    documentId: x.c.documentId,
    documentTitle: titles.get(x.c.documentId) ?? null,
    text: x.c.text,
    pageStart: x.c.pageStart ?? null,
    pageEnd: x.c.pageEnd ?? null,
    score: x.score,
    methods: ["concept_graph" as const],
    reason: "Related wording or concept links matched this passage.",
  }));
}
