export type RetrievalMethod = "lexical" | "concept_graph" | "embedding" | "hybrid";

export interface RetrievalHit {
  chunkId: string;
  documentId: string;
  documentTitle: string | null;
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
  score: number;
  methods: RetrievalMethod[];
  reason: string;
}

export interface RetrievalResult {
  hits: RetrievalHit[];
  methodsUsed: RetrievalMethod[];
  query: string;
}

export interface EmbeddingProvider {
  id: string;
  modelId: string;
  embed(texts: string[]): Promise<number[][]>;
}
