import type { DocumentChunk, DocumentMeta } from "../documents/types.ts";
import { retrieveRelevantChunks, boundHistory } from "./context.ts";
import { offlineHeuristicProvider } from "./offline-provider.ts";
import { mockProvider } from "./mock-provider.ts";
import type { AiGenerateRequest, AiGenerateResponse, AiLearningMode, UiLanguage } from "./types.ts";
import type { ChunkEmbeddingRecord } from "../retrieval/embed-index.ts";
import type { EmbeddingProvider } from "../retrieval/embeddings.ts";
import { runHybridRetrieval } from "../retrieval/run-retrieval.ts";

export type ClientTutorPrefer = "offline" | "mock";

export async function runClientTutorTurn(input: {
  mode: AiLearningMode;
  userMessage: string;
  language?: UiLanguage;
  topicLabel?: string | null;
  objectiveId?: string | null;
  objectiveStatement?: string | null;
  misconceptionTitle?: string | null;
  misconceptionDescription?: string | null;
  documentId?: string | null;
  chunks: DocumentChunk[];
  documents: DocumentMeta[];
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  prefer?: ClientTutorPrefer;
  allowGeneralExplanation?: boolean;
  /** Optional local embedding index + provider (e.g. after indexing) */
  embeddings?: ChunkEmbeddingRecord[];
  embeddingProvider?: EmbeddingProvider | null;
}): Promise<AiGenerateResponse> {
  const query = [
    input.userMessage,
    input.topicLabel,
    input.objectiveStatement,
    input.misconceptionTitle,
  ]
    .filter(Boolean)
    .join(" ");

  let sourceChunks = retrieveRelevantChunks({
    query,
    chunks: input.chunks,
    documents: input.documents,
    documentId: input.documentId,
  });

  // Prefer hybrid with embedding hits when index + provider available
  if (input.embeddingProvider && input.embeddings && input.embeddings.length > 0) {
    try {
      let pool = input.chunks;
      if (input.documentId) pool = pool.filter((c) => c.documentId === input.documentId);
      const result = await runHybridRetrieval({
        query,
        chunks: pool,
        documents: input.documents,
        embeddings: input.embeddings,
        embeddingProvider: input.embeddingProvider,
        limit: 6,
      });
      if (result.hits.length > 0) {
        sourceChunks = result.hits.map((h) => ({
          documentId: h.documentId,
          documentTitle: h.documentTitle,
          chunkId: h.chunkId,
          pageStart: h.pageStart,
          pageEnd: h.pageEnd,
          text: h.text.slice(0, 900),
        }));
      }
    } catch {
      /* keep lexical sourceChunks */
    }
  }

  const req: AiGenerateRequest = {
    mode: input.mode,
    userMessage: input.userMessage.slice(0, 4000),
    language: input.language ?? "en",
    topicLabel: input.topicLabel,
    objectiveId: input.objectiveId,
    objectiveStatement: input.objectiveStatement,
    misconceptionTitle: input.misconceptionTitle,
    misconceptionDescription: input.misconceptionDescription,
    sourceChunks,
    history: boundHistory(input.history ?? []),
    allowGeneralExplanation: input.allowGeneralExplanation ?? true,
  };

  if (input.prefer === "mock") return mockProvider.generate(req);
  return offlineHeuristicProvider.generate(req);
}
