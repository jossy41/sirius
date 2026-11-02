/**
 * Automatic document embedding after successful import.
 * Never fails the import itself — indexing is best-effort when authorized.
 */
import type { DocumentChunk, DocumentMeta } from "../documents/types.ts";
import { putChunkEmbeddings, deleteChunkEmbeddingsForDocument } from "../offline/database.ts";
import type { EmbeddingProvider } from "./embeddings.ts";
import { buildChunkEmbeddings, type IndexingStatus } from "./embed-index.ts";

export async function indexDocumentEmbeddings(input: {
  meta: DocumentMeta;
  chunks: DocumentChunk[];
  provider: EmbeddingProvider | null;
}): Promise<{ status: IndexingStatus; indexedCount: number; error?: string }> {
  if (!input.provider) {
    return { status: "unavailable", indexedCount: 0, error: "no_provider" };
  }
  if (!input.chunks.length) {
    return { status: "unavailable", indexedCount: 0, error: "no_chunks" };
  }

  try {
    // Replace prior vectors for this document (re-index)
    await deleteChunkEmbeddingsForDocument(input.meta.id);
  } catch {
    /* ignore */
  }

  try {
    const result = await buildChunkEmbeddings(input.chunks, input.provider);
    if (result.records.length > 0) {
      await putChunkEmbeddings(result.records);
    }
    return {
      status: result.status,
      indexedCount: result.records.length,
      error: result.error,
    };
  } catch (e) {
    return {
      status: "failed",
      indexedCount: 0,
      error: e instanceof Error ? e.message : "index_failed",
    };
  }
}
