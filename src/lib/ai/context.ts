/**
 * Retrieval-first context builder. Document text is untrusted.
 * Uses hybrid lexical + concept retrieval (embeddings optional elsewhere).
 */
import type { DocumentChunk, DocumentMeta } from "../documents/types.ts";
import type { AiGenerateRequest } from "./types.ts";
import { hybridRetrieve } from "../retrieval/hybrid.ts";

const MAX_CHUNKS = 6;
const MAX_CHARS_PER_CHUNK = 900;
const MAX_HISTORY = 6;

export function scoreChunk(text: string, query: string): number {
  const q = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const t = text.toLowerCase();
  let score = 0;
  for (const w of q) {
    if (t.includes(w)) score += 1;
  }
  return score;
}

export function retrieveRelevantChunks(input: {
  query: string;
  chunks: DocumentChunk[];
  documents: DocumentMeta[];
  documentId?: string | null;
  limit?: number;
}): AiGenerateRequest["sourceChunks"] {
  let pool = input.chunks;
  if (input.documentId) pool = pool.filter((c) => c.documentId === input.documentId);
  const result = hybridRetrieve({
    query: input.query,
    chunks: pool,
    documents: input.documents,
    limit: input.limit ?? MAX_CHUNKS,
  });
  if (result.hits.length > 0) {
    return result.hits.map((h) => ({
      documentId: h.documentId,
      documentTitle: h.documentTitle,
      chunkId: h.chunkId,
      pageStart: h.pageStart,
      pageEnd: h.pageEnd,
      text: h.text.slice(0, MAX_CHARS_PER_CHUNK).split(String.fromCharCode(0)).join(""),
    }));
  }
  // Fallback: first pages of preferred doc
  return pool.slice(0, Math.min(3, input.limit ?? MAX_CHUNKS)).map((c) => ({
    documentId: c.documentId,
    documentTitle: input.documents.find((d) => d.id === c.documentId)?.name ?? null,
    chunkId: c.id,
    pageStart: c.pageStart ?? null,
    pageEnd: c.pageEnd ?? null,
    text: c.text.slice(0, MAX_CHARS_PER_CHUNK).split(String.fromCharCode(0)).join(""),
  }));
}

export function boundHistory(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages.slice(-MAX_HISTORY).map((m) => ({
    role: m.role,
    content: m.content.slice(0, 1500),
  }));
}

export function sanitizeUntrustedText(text: string): string {
  return text
    .replace(/ignore (all )?(previous|prior|above) instructions/gi, "[filtered]")
    .replace(/system prompt/gi, "[filtered]")
    .split(String.fromCharCode(0)).join("")
    .slice(0, MAX_CHARS_PER_CHUNK);
}
