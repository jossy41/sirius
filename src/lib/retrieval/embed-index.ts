/**
 * Embedding index lifecycle: validate, batch, attach, rank — provider-agnostic.
 */
import type { DocumentChunk } from "../documents/types.ts";
import type { EmbeddingProvider } from "./embeddings.ts";
import { cosineSimilarity, validateEmbedding } from "./embeddings.ts";
import type { RetrievalHit } from "./types.ts";

export const EMBED_BATCH_SIZE = 16;

export interface ChunkEmbeddingRecord {
  id: string;
  chunkId: string;
  documentId: string;
  modelId: string;
  dimensions: number;
  vector: number[];
  contentHash: string | null;
  updatedAt: string;
}

export type IndexingStatus =
  | "pending"
  | "processing"
  | "indexed"
  | "partial"
  | "failed"
  | "unavailable";

export function simpleContentHash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/**
 * Build embeddings in batches of EMBED_BATCH_SIZE.
 * Partial success returns records built so far; throws only if zero usable chunks fail hard.
 */
export async function buildChunkEmbeddings(
  chunks: DocumentChunk[],
  provider: EmbeddingProvider,
  options?: { onBatchComplete?: (done: number, total: number) => void },
): Promise<{ records: ChunkEmbeddingRecord[]; status: IndexingStatus; error?: string }> {
  const usable = chunks.filter((c) => c.text && c.text.trim().length >= 20);
  if (usable.length === 0) {
    return { records: [], status: "unavailable", error: "no_usable_chunks" };
  }

  const now = new Date().toISOString();
  const out: ChunkEmbeddingRecord[] = [];
  let batchFailures = 0;

  for (let offset = 0; offset < usable.length; offset += EMBED_BATCH_SIZE) {
    const batch = usable.slice(offset, offset + EMBED_BATCH_SIZE);
    const texts = batch.map((c) => c.text.slice(0, 4000));
    try {
      const vectors = await provider.embed(texts);
      if (vectors.length !== batch.length) {
        batchFailures += 1;
        continue;
      }
      for (let i = 0; i < batch.length; i++) {
        const vec = vectors[i]!;
        if (!validateEmbedding(vec, provider.expectedDimensions)) continue;
        const c = batch[i]!;
        out.push({
          id: c.id,
          chunkId: c.id,
          documentId: c.documentId,
          modelId: provider.modelId,
          dimensions: vec.length,
          vector: vec,
          contentHash: simpleContentHash(c.text),
          updatedAt: now,
        });
      }
    } catch {
      batchFailures += 1;
    }
    options?.onBatchComplete?.(Math.min(offset + EMBED_BATCH_SIZE, usable.length), usable.length);
  }

  if (out.length === 0) {
    return { records: [], status: "failed", error: "all_batches_failed" };
  }
  if (batchFailures > 0 || out.length < usable.length) {
    return { records: out, status: "partial" };
  }
  return { records: out, status: "indexed" };
}

export async function embeddingHitsForQuery(input: {
  query: string;
  chunks: DocumentChunk[];
  embeddings: ChunkEmbeddingRecord[];
  provider: EmbeddingProvider;
  documents: Array<{ id: string; name: string }>;
  limit?: number;
  minScore?: number;
}): Promise<RetrievalHit[]> {
  if (input.embeddings.length === 0) return [];
  const modelId = input.provider.modelId;
  const compatible = input.embeddings.filter((e) => e.modelId === modelId);
  if (compatible.length === 0) return [];

  const dim = compatible[0]!.dimensions;
  if (compatible.some((e) => e.dimensions !== dim)) return [];

  const [qVec] = await input.provider.embed([input.query.slice(0, 4000)]);
  if (!validateEmbedding(qVec, dim)) return [];

  const byChunk = new Map(input.chunks.map((c) => [c.id, c]));
  const titles = new Map(input.documents.map((d) => [d.id, d.name]));
  const scored: RetrievalHit[] = [];
  for (const emb of compatible) {
    if (!validateEmbedding(emb.vector, dim)) continue;
    const score = cosineSimilarity(qVec!, emb.vector);
    if (score < (input.minScore ?? 0.2)) continue;
    const c = byChunk.get(emb.chunkId);
    if (!c) continue;
    scored.push({
      chunkId: emb.chunkId,
      documentId: emb.documentId,
      documentTitle: titles.get(emb.documentId) ?? null,
      text: c.text,
      pageStart: c.pageStart ?? null,
      pageEnd: c.pageEnd ?? null,
      score: score * 4,
      methods: ["embedding"],
      reason: `Semantic similarity via ${emb.modelId}.`,
    });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, input.limit ?? 8);
}
