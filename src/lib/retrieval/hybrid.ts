import type { DocumentChunk, DocumentMeta } from "../documents/types.ts";
import type { KnowledgeGraphSnapshot } from "../knowledge/index.ts";
import type { RetrievalHit, RetrievalMethod, RetrievalResult } from "./types.ts";
import { lexicalRetrieve } from "./lexical.ts";
import { conceptRetrieve } from "./concept.ts";
import { graphAssistRetrieve } from "./graph.ts";
import type { ContentLanguage } from "./language.ts";

function mergeHits(lists: RetrievalHit[][]): RetrievalHit[] {
  const map = new Map<string, RetrievalHit>();
  for (const list of lists) {
    for (const h of list) {
      const key = `${h.documentId}:${h.chunkId}`;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { ...h, methods: [...h.methods] });
      } else {
        prev.score += h.score;
        for (const m of h.methods) {
          if (!prev.methods.includes(m)) prev.methods.push(m);
        }
        if (h.reason && !prev.reason.includes(h.reason.slice(0, 40))) {
          prev.reason = `${prev.reason} ${h.reason}`;
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => b.score - a.score);
}

/**
 * Hybrid retrieval: lexical + concept + optional graph + optional embedding hits.
 * Embedding hits must be precomputed by a real provider — never synthetic vectors.
 */
export function hybridRetrieve(input: {
  query: string;
  chunks: DocumentChunk[];
  documents: DocumentMeta[];
  conceptHints?: string[];
  graph?: KnowledgeGraphSnapshot | null;
  limit?: number;
  language?: ContentLanguage;
  embeddingHits?: RetrievalHit[];
}): RetrievalResult {
  const lexical = lexicalRetrieve({
    query: input.query,
    chunks: input.chunks,
    documents: input.documents,
    limit: input.limit,
    language: input.language,
  });
  const concept = conceptRetrieve({
    query: input.query,
    chunks: input.chunks,
    documents: input.documents,
    conceptHints: input.conceptHints,
    limit: input.limit,
  });
  const graph = input.graph
    ? graphAssistRetrieve({
        query: input.query,
        chunks: input.chunks,
        documents: input.documents,
        graph: input.graph,
        limit: input.limit,
      })
    : [];
  const embedding = input.embeddingHits ?? [];

  const methodsUsed: RetrievalMethod[] = ["lexical", "concept_graph"];
  if (embedding.length) methodsUsed.push("embedding");

  const merged = mergeHits([lexical, concept, graph, embedding]);
  const hits = merged.slice(0, input.limit ?? 8).map((h) => ({
    ...h,
    methods:
      h.methods.length > 1
        ? (["hybrid", ...h.methods.filter((m) => m !== "hybrid")] as RetrievalMethod[])
        : h.methods,
    reason:
      h.methods.length > 1 ? "Combined word match and related-concept signals." : h.reason,
  }));
  if (hits.some((h) => h.methods.length > 1) && !methodsUsed.includes("hybrid")) {
    methodsUsed.push("hybrid");
  }
  return { hits, methodsUsed, query: input.query };
}
