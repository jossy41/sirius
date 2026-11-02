/**
 * Client-side EmbeddingProvider that calls the server embed function.
 * Requires a valid consent token. Never holds API keys.
 */
import type { EmbeddingProvider } from "./embeddings.ts";
import { embedTextsServer } from "./embed-server-fn.ts";
import { EMBED_BATCH_SIZE } from "./embed-index.ts";

export function createServerEmbeddingClient(consentToken: string): EmbeddingProvider {
  return {
    id: "server_openai_compatible",
    modelId: "server-configured",
    expectedDimensions: null,
    async embed(texts: string[]): Promise<number[][]> {
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
        const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
        const res = await embedTextsServer({
          data: { texts: batch, consentToken },
        });
        if (!res.ok || res.vectors.length !== batch.length) {
          throw new Error(res.reason ?? "embed_batch_failed");
        }
        if (res.modelId) {
          (this as EmbeddingProvider).modelId = res.modelId;
        }
        out.push(...res.vectors);
      }
      return out;
    },
  };
}
