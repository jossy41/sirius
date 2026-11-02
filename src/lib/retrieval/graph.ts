/**
 * Knowledge-graph-assisted retrieval hints — limited expansion, no invented edges.
 */
import type { KnowledgeGraphSnapshot } from "../knowledge/index.ts";
import type { DocumentChunk, DocumentMeta } from "../documents/types.ts";
import type { RetrievalHit } from "./types.ts";
import { lexicalScore, tokenize } from "./lexical.ts";

const MAX_EXPAND = 4;

export function conceptHintsFromGraph(
  query: string,
  graph: KnowledgeGraphSnapshot | null,
): string[] {
  if (!graph) return [];
  const terms = new Set(tokenize(query));
  const hints: string[] = [];
  for (const c of graph.concepts) {
    const title = c.title.toLowerCase();
    const code = c.code.toLowerCase();
    if ([...terms].some((t) => title.includes(t) || code.includes(t) || t.includes(code))) {
      hints.push(c.title, c.code);
      // related concepts via edges (one hop)
      for (const rel of graph.conceptRelations) {
        if (rel.fromConceptId === c.id || rel.toConceptId === c.id) {
          const otherId = rel.fromConceptId === c.id ? rel.toConceptId : rel.fromConceptId;
          const other = graph.concepts.find((x) => x.id === otherId);
          if (other) hints.push(other.title);
        }
      }
    }
    if (hints.length >= MAX_EXPAND * 3) break;
  }
  return [...new Set(hints)].slice(0, MAX_EXPAND * 2);
}

export function graphAssistRetrieve(input: {
  query: string;
  chunks: DocumentChunk[];
  documents: DocumentMeta[];
  graph: KnowledgeGraphSnapshot | null;
  limit?: number;
}): RetrievalHit[] {
  const hints = conceptHintsFromGraph(input.query, input.graph);
  if (hints.length === 0) return [];
  const terms = [...tokenize(input.query), ...hints.map((h) => h.toLowerCase())];
  const titles = new Map(input.documents.map((d) => [d.id, d.name]));
  const scored = input.chunks
    .map((c) => ({ c, score: lexicalScore(c.text, terms) * 0.85 }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 6);
  return scored.map((x) => ({
    chunkId: x.c.id,
    documentId: x.c.documentId,
    documentTitle: titles.get(x.c.documentId) ?? null,
    text: x.c.text,
    pageStart: x.c.pageStart ?? null,
    pageEnd: x.c.pageEnd ?? null,
    score: x.score,
    methods: ["concept_graph" as const],
    reason: "Related curriculum concepts suggested this passage.",
  }));
}
