import type { RetrievalHit } from "./types.ts";

export function precisionAtK(hits: RetrievalHit[], relevantIds: Set<string>, k: number): number {
  const top = hits.slice(0, k);
  if (top.length === 0) return 0;
  const hitsRel = top.filter((h) => relevantIds.has(h.chunkId)).length;
  return hitsRel / top.length;
}

export function recallAtK(hits: RetrievalHit[], relevantIds: Set<string>, k: number): number {
  if (relevantIds.size === 0) return 0;
  const top = hits.slice(0, k);
  const hitsRel = top.filter((h) => relevantIds.has(h.chunkId)).length;
  return hitsRel / relevantIds.size;
}

export function mrr(hits: RetrievalHit[], relevantIds: Set<string>): number {
  for (let i = 0; i < hits.length; i++) {
    if (relevantIds.has(hits[i]!.chunkId)) return 1 / (i + 1);
  }
  return 0;
}
