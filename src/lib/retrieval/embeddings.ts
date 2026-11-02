/**
 * Embedding interface + vector utilities.
 * Does NOT fabricate vectors. Without a configured provider, embedding retrieval is inactive.
 */

export interface EmbeddingProvider {
  id: string;
  modelId: string;
  /** Dimension of vectors this provider returns, or null if unknown until first call */
  expectedDimensions: number | null;
  embed(texts: string[]): Promise<number[][]>;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function validateEmbedding(vec: unknown, expectedDim?: number | null): vec is number[] {
  if (!Array.isArray(vec) || vec.length === 0) return false;
  if (expectedDim != null && vec.length !== expectedDim) return false;
  return vec.every((n) => typeof n === "number" && Number.isFinite(n));
}

/** Rank chunks by cosine similarity to a query vector. */
export function rankByEmbedding(
  queryVec: number[],
  items: Array<{ id: string; vector: number[] }>,
  minScore = 0.25,
): Array<{ id: string; score: number }> {
  const out: Array<{ id: string; score: number }> = [];
  for (const item of items) {
    if (!validateEmbedding(item.vector, queryVec.length)) continue;
    const score = cosineSimilarity(queryVec, item.vector);
    if (score >= minScore) out.push({ id: item.id, score });
  }
  return out.sort((a, b) => b.score - a.score);
}
