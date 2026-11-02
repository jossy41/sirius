import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hybridRetrieve } from "./hybrid.ts";
import { lexicalRetrieve } from "./lexical.ts";
import { expandQueryTerms } from "./concept.ts";
import { precisionAtK, recallAtK, mrr } from "./evaluate.ts";
import type { DocumentChunk, DocumentMeta } from "../documents/types.ts";

function chunk(id: string, text: string, page = 1): DocumentChunk {
  return {
    id, documentId: "d1", index: 0, title: null, text, pageStart: page, pageEnd: page, charCount: text.length,
  };
}

const docs: DocumentMeta[] = [{
  id: "d1", name: "Biology notes", originalName: "b.pdf", format: "pdf", mimeType: "application/pdf",
  sizeBytes: 1, pageCount: 3, status: "ready", statusMessage: null,
  curriculum: { systemId: null, versionId: null, gradeCode: null, subjectId: null, subjectCode: null, topicId: null, topicCode: null, packId: null },
  contentHash: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), binaryStored: false,
}];

describe("hybrid retrieval", () => {
  it("finds lexical matches", () => {
    const chunks = [
      chunk("c1", "Photosynthesis converts light energy into chemical energy."),
      chunk("c2", "Transpiration is water loss from leaves through stomata."),
    ];
    const hits = lexicalRetrieve({ query: "transpiration water leaves", chunks, documents: docs });
    assert.ok(hits.length >= 1);
    assert.equal(hits[0]!.chunkId, "c2");
  });

  it("expands concepts for different wording", () => {
    const expanded = expandQueryTerms("plant loses too much water");
    assert.ok(expanded.includes("water") || expanded.includes("plant"));
    const chunks = [
      chunk("c1", "Transpiration causes wilting when water loss is high."),
      chunk("c2", "Newton's second law relates force and acceleration."),
    ];
    const result = hybridRetrieve({ query: "What happens when a plant loses too much water?", chunks, documents: docs });
    assert.ok(result.hits.length >= 1);
    assert.equal(result.hits[0]!.chunkId, "c1");
    assert.ok(result.methodsUsed.includes("lexical") || result.methodsUsed.includes("concept_graph"));
  });

  it("reports development metrics on fixture", () => {
    const chunks = [
      chunk("rel", "Mass is the amount of matter in a body."),
      chunk("irrel", "The capital of France is Paris."),
    ];
    const result = hybridRetrieve({ query: "amount of matter mass", chunks, documents: docs });
    const relevant = new Set(["rel"]);
    const p = precisionAtK(result.hits, relevant, 1);
    const r = recallAtK(result.hits, relevant, 3);
    const m = mrr(result.hits, relevant);
    assert.ok(p >= 0 && p <= 1);
    assert.ok(r >= 0 && r <= 1);
    assert.ok(m >= 0 && m <= 1);
    assert.equal(result.hits[0]?.chunkId, "rel");
  });
});
