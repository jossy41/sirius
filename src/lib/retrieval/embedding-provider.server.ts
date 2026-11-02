/**
 * Server-only OpenAI-compatible embeddings adapter.
 * Requires SIRIUS_EMBEDDING_BASE_URL + SIRIUS_EMBEDDING_API_KEY (or reuse SIRIUS_AI_*).
 * Never import from client code.
 */
import type { EmbeddingProvider } from "./embeddings.ts";
import { validateEmbedding } from "./embeddings.ts";

function readConfig(): {
  configured: boolean;
  baseUrl: string | null;
  apiKey: string | null;
  model: string;
} {
  const baseUrl =
    (typeof process !== "undefined" &&
      (process.env.SIRIUS_EMBEDDING_BASE_URL?.trim() || process.env.SIRIUS_AI_BASE_URL?.trim())) ||
    null;
  const apiKey =
    (typeof process !== "undefined" &&
      (process.env.SIRIUS_EMBEDDING_API_KEY?.trim() || process.env.SIRIUS_AI_API_KEY?.trim())) ||
    null;
  const model =
    (typeof process !== "undefined" && process.env.SIRIUS_EMBEDDING_MODEL?.trim()) ||
    "text-embedding-3-small";
  return { configured: Boolean(baseUrl && apiKey), baseUrl, apiKey, model };
}

export function embeddingProviderConfigured(): boolean {
  return readConfig().configured;
}

export function createOpenAICompatibleEmbeddingProvider(): EmbeddingProvider | null {
  const cfg = readConfig();
  if (!cfg.configured || !cfg.baseUrl || !cfg.apiKey) return null;

  return {
    id: "openai_compatible",
    modelId: cfg.model,
    expectedDimensions: null,
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];
      const limited = texts.slice(0, 16).map((t) => t.slice(0, 4000));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const url = cfg.baseUrl!.replace(/\/$/, "") + "/embeddings";
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.apiKey}`,
          },
          body: JSON.stringify({ model: cfg.model, input: limited }),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`embedding_http_${res.status}`);
        }
        const data = (await res.json()) as {
          data?: Array<{ embedding?: number[]; index?: number }>;
        };
        const rows = data.data ?? [];
        const out: number[][] = [];
        for (let i = 0; i < limited.length; i++) {
          const row = rows.find((r) => r.index === i) ?? rows[i];
          const vec = row?.embedding;
          if (!validateEmbedding(vec)) {
            throw new Error("invalid_embedding_vector");
          }
          out.push(vec);
        }
        return out;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
