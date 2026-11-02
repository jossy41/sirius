import type { DocumentChunk, DocumentMeta } from "../documents/types.ts";
import type { KnowledgeGraphSnapshot } from "../knowledge/index.ts";
import type { EmbeddingProvider } from "./embeddings.ts";
import type { ChunkEmbeddingRecord } from "./embed-index.ts";
import { embeddingHitsForQuery } from "./embed-index.ts";
import { hybridRetrieve } from "./hybrid.ts";
import type { ContentLanguage } from "./language.ts";
import type { RetrievalResult } from "./types.ts";

export async function runHybridRetrieval(input: {
  query: string;
  chunks: DocumentChunk[];
  documents: DocumentMeta[];
  embeddings?: ChunkEmbeddingRecord[];
  embeddingProvider?: EmbeddingProvider | null;
  graph?: KnowledgeGraphSnapshot | null;
  language?: ContentLanguage;
  limit?: number;
}): Promise<RetrievalResult> {
  let embeddingHits = undefined;
  if (input.embeddingProvider && input.embeddings && input.embeddings.length > 0) {
    try {
      embeddingHits = await embeddingHitsForQuery({
        query: input.query,
        chunks: input.chunks,
        embeddings: input.embeddings,
        provider: input.embeddingProvider,
        documents: input.documents.map((d) => ({ id: d.id, name: d.name })),
        limit: input.limit,
      });
    } catch {
      embeddingHits = undefined;
    }
  }
  return hybridRetrieve({
    query: input.query,
    chunks: input.chunks,
    documents: input.documents,
    graph: input.graph ?? null,
    language: input.language,
    limit: input.limit,
    embeddingHits,
  });
}
