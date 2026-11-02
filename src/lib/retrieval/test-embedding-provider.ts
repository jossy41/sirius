/**
 * Deterministic test-only embedding provider. NOT a live model.
 * Same text always yields the same vector; similar words share dimensions.
 */
import type { EmbeddingProvider } from "./embeddings.ts";

const DIM = 16;

function hashToken(t: string): number {
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return h;
}

export function createTestEmbeddingProvider(): EmbeddingProvider {
  return {
    id: "test_deterministic",
    modelId: "test-embed-v1",
    expectedDimensions: DIM,
    async embed(texts: string[]): Promise<number[][]> {
      return texts.map((text) => {
        const vec = new Array<number>(DIM).fill(0);
        const tokens = text.toLowerCase().split(/[^a-z0-9\u1200-\u137F]+/).filter((w) => w.length > 1);
        for (const tok of tokens) {
          const h = hashToken(tok);
          vec[h % DIM] += 1;
          vec[(h >> 4) % DIM] += 0.5;
        }
        // L2 normalize
        const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
        return vec.map((x) => x / norm);
      });
    },
  };
}
