import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasSufficientEvidence, retrieveFromContent, scoreChunk, scoreChunkDetailed } from "./retrieval.ts";
import type { DocumentContent } from "@/lib/documents/types";
import { generateQuestionsFromChunks, evaluateAnswerHeuristic } from "./heuristic.ts";

const content: DocumentContent = {
  documentId: "doc1",
  extractedAt: new Date().toISOString(),
  extractor: "test",
  pages: [],
  chunks: [
    {
      id: "doc1-c0",
      documentId: "doc1",
      index: 0,
      title: "Newton’s first law",
      text: "Newton’s first law states that an object remains at rest or in uniform motion unless acted upon by a net external force. This is also called the law of inertia.",
      pageStart: 12,
      pageEnd: 12,
      charCount: 160,
    },
    {
      id: "doc1-c1",
      documentId: "doc1",
      index: 1,
      title: "Photosynthesis",
      text: "Photosynthesis converts light energy into chemical energy in plants using chlorophyll.",
      pageStart: 40,
      pageEnd: 41,
      charCount: 90,
    },
  ],
};

describe("retrieval", () => {
  it("ranks relevant chunks higher", () => {
    const results = retrieveFromContent(content, { text: "inertia Newton force", limit: 2 });
    assert.ok(results.length >= 1);
    assert.equal(results[0].chunk.id, "doc1-c0");
    assert.ok(hasSufficientEvidence(results));
    assert.ok(results[0].signals);
    assert.ok(typeof results[0].signals.keyword === "number");
  });

  it("scores zero overlap low", () => {
    const score = scoreChunk(["zzzznotfound"], content.chunks[0]);
    assert.ok(score < 0.2);
  });

  it("boosts concept pairs", () => {
    const detailed = scoreChunkDetailed("mass weight gravity", {
      id: "c",
      documentId: "d",
      index: 0,
      title: "Mass and weight",
      text: "Mass is measured in kilograms while weight depends on gravity.",
      pageStart: 1,
      pageEnd: 1,
      charCount: 80,
    });
    assert.ok(detailed.score > 0.2);
    assert.ok(detailed.signals.concept >= 0);
  });
});

describe("heuristic generation", () => {
  it("generates questions with source pages", () => {
    const retrieved = retrieveFromContent(content, { text: "Newton inertia", limit: 2 });
    const qs = generateQuestionsFromChunks(retrieved, { documentId: "doc1", count: 3 });
    assert.ok(qs.length >= 1);
    for (const q of qs) {
      assert.ok(q.sourceExcerpts.length >= 1);
      assert.equal(q.documentId, "doc1");
      assert.equal(q.evidenceLevel, "direct");
      assert.ok(q.sourceExcerpts[0].pageStart >= 1);
    }
  });

  it("returns empty when no chunks", () => {
    assert.equal(generateQuestionsFromChunks([], { documentId: "doc1" }).length, 0);
  });
});

describe("heuristic evaluation", () => {
  it("marks matching MC correct", () => {
    const retrieved = retrieveFromContent(content, { text: "Newton", limit: 1 });
    const qs = generateQuestionsFromChunks(retrieved, {
      documentId: "doc1",
      count: 1,
      types: ["multiple_choice"],
    });
    assert.ok(qs[0]);
    const q = qs[0];
    const correct = q.choices![q.correctChoiceIndex!];
    const ev = evaluateAnswerHeuristic(q, correct);
    assert.equal(ev.correctness, "correct");
  });

  it("handles empty written answer", () => {
    const retrieved = retrieveFromContent(content, { text: "Newton", limit: 1 });
    const qs = generateQuestionsFromChunks(retrieved, {
      documentId: "doc1",
      count: 1,
      types: ["short_answer"],
    });
    const ev = evaluateAnswerHeuristic(qs[0], "   ");
    assert.equal(ev.correctness, "incorrect");
  });
});
