import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestEmbeddingProvider } from "./test-embedding-provider.ts";
import {
  buildChunkEmbeddings,
  embeddingHitsForQuery,
  simpleContentHash,
  EMBED_BATCH_SIZE,
} from "./embed-index.ts";
import { indexDocumentEmbeddings } from "./index-document.ts";
import { runHybridRetrieval } from "./run-retrieval.ts";
import type { DocumentChunk, DocumentMeta } from "../documents/types.ts";
import { cosineSimilarity } from "./embeddings.ts";

function chunk(id: string, text: string, doc = "d1"): DocumentChunk {
  return {
    id,
    documentId: doc,
    index: 0,
    title: null,
    text,
    pageStart: 1,
    pageEnd: 1,
    charCount: text.length,
  };
}

const docs: DocumentMeta[] = [
  {
    id: "d1",
    name: "Notes",
    originalName: "n.pdf",
    format: "pdf",
    mimeType: "application/pdf",
    sizeBytes: 1,
    pageCount: 1,
    status: "ready",
    statusMessage: null,
    curriculum: {
      systemId: null,
      versionId: null,
      gradeCode: null,
      subjectId: null,
      subjectCode: null,
      topicId: null,
      topicCode: null,
      packId: null,
    },
    contentHash: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    binaryStored: false,
  },
];

describe("embedding index integration (test provider)", () => {
  it("builds and ranks vectors deterministically", async () => {
    const provider = createTestEmbeddingProvider();
    const chunks = [
      chunk("c1", "Photosynthesis converts light energy into chemical energy in plant leaves."),
      chunk("c2", "The capital of France is Paris and it has many museums."),
    ];
    const { records, status } = await buildChunkEmbeddings(chunks, provider);
    assert.equal(status, "indexed");
    assert.equal(records.length, 2);

    const hits = await embeddingHitsForQuery({
      query: "plant leaves light energy chemical",
      chunks,
      embeddings: records,
      provider,
      documents: [{ id: "d1", name: "Notes" }],
    });
    assert.ok(hits.length >= 1);
    assert.equal(hits[0]!.chunkId, "c1");
    assert.ok(hits[0]!.methods.includes("embedding"));
  });

  it("batches more than 16 chunks safely", async () => {
    const provider = createTestEmbeddingProvider();
    const chunks = Array.from({ length: EMBED_BATCH_SIZE + 5 }, (_, i) =>
      chunk(`c${i}`, `Educational passage number ${i} about energy, mass, and force in physics class.`),
    );
    const { records, status } = await buildChunkEmbeddings(chunks, provider);
    assert.ok(status === "indexed" || status === "partial");
    assert.equal(records.length, chunks.length);
  });

  it("hybrid includes embedding method when provider used", async () => {
    const provider = createTestEmbeddingProvider();
    const chunks = [
      chunk("c1", "Transpiration is the loss of water vapour from plant leaves through stomata."),
      chunk("c2", "Newton formulated three laws of motion."),
    ];
    const { records } = await buildChunkEmbeddings(chunks, provider);
    const result = await runHybridRetrieval({
      query: "How do plants lose water through leaves?",
      chunks,
      documents: docs,
      embeddings: records,
      embeddingProvider: provider,
    });
    assert.ok(result.hits.some((h) => h.chunkId === "c1"));
  });

  it("rejects incompatible dimensions via cosine path", () => {
    assert.equal(cosineSimilarity([1, 0], [1, 0, 0]), 0);
  });

  it("content hash is stable", () => {
    assert.equal(simpleContentHash("abc"), simpleContentHash("abc"));
  });

  it("indexDocumentEmbeddings reports unavailable without provider", async () => {
    const r = await indexDocumentEmbeddings({
      meta: docs[0]!,
      chunks: [chunk("c1", "Enough text here to be a usable educational chunk about science.")],
      provider: null,
    });
    assert.equal(r.status, "unavailable");
  });
});

describe("M11.3 pipeline acceptance (test provider)", () => {
  it("import-style index then hybrid query preserves page citations", async () => {
    const provider = createTestEmbeddingProvider();
    const chunks = [
      chunk("c1", "Photosynthesis converts light energy into chemical energy in plant leaves using chlorophyll."),
      chunk("c2", "Paris is the capital of France."),
    ];
    const _idx = await indexDocumentEmbeddings({
      meta: docs[0]!,
      chunks,
      provider,
    });
    // Without IDB in node, put may fail — still check build path
    const built = await buildChunkEmbeddings(chunks, provider);
    assert.ok(built.records.length >= 1);
    const result = await runHybridRetrieval({
      query: "How do plants make food from light?",
      chunks,
      documents: docs,
      embeddings: built.records,
      embeddingProvider: provider,
    });
    assert.ok(result.hits.length >= 1);
    assert.equal(result.hits[0]!.pageStart, 1);
    assert.ok(result.hits[0]!.chunkId);
  });
});
