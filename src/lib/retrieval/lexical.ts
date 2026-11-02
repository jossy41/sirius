import type { DocumentChunk, DocumentMeta } from "../documents/types.ts";
import type { RetrievalHit } from "./types.ts";
import { tokenizeLanguageAware, type ContentLanguage, detectScriptLanguage } from "./language.ts";

export function tokenize(q: string, language?: ContentLanguage): string[] {
  const lang = language ?? detectScriptLanguage(q);
  return tokenizeLanguageAware(q, lang);
}

export function lexicalScore(text: string, terms: string[], language?: ContentLanguage): number {
  const lang = language ?? detectScriptLanguage(text);
  const tokens = new Set(tokenizeLanguageAware(text, lang));
  const t = text.toLowerCase();
  let score = 0;
  for (const w of terms) {
    if (tokens.has(w) || t.includes(w)) score += 1;
    if (w.length > 4 && t.includes(w.slice(0, -1))) score += 0.25;
  }
  return score;
}

export function lexicalRetrieve(input: {
  query: string;
  chunks: DocumentChunk[];
  documents: DocumentMeta[];
  limit?: number;
  language?: ContentLanguage;
}): RetrievalHit[] {
  const lang = input.language ?? detectScriptLanguage(input.query);
  const terms = tokenize(input.query, lang);
  if (terms.length === 0) return [];
  const titles = new Map(input.documents.map((d) => [d.id, d.name]));
  const scored = input.chunks
    .map((c) => {
      const score = lexicalScore(c.text, terms, lang);
      return { c, score };
    })
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
    methods: ["lexical" as const],
    reason: "Matched words from your question in this passage.",
  }));
}
