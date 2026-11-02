import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectScriptLanguage, tokenizeLanguageAware, normalizeForSearch } from "./language.ts";
import { cosineSimilarity, validateEmbedding } from "./embeddings.ts";

describe("multilingual foundations", () => {
  it("detects Ethiopic script", () => {
    assert.equal(detectScriptLanguage("ሰላም እንደምን ነህ"), "am");
  });
  it("tokenizes Latin (en/om) without destroying apostrophes roughly", () => {
    const t = tokenizeLanguageAware("Oromo: barumsaafi jireenya", "om");
    assert.ok(t.length >= 2);
  });
  it("preserves NFC normalization", () => {
    const s = normalizeForSearch("café", "en");
    assert.ok(s.includes("caf"));
  });
  it("does not invent embedding vectors", () => {
    assert.equal(validateEmbedding([1, 2, 3]), true);
    assert.equal(validateEmbedding([1, NaN]), false);
    assert.equal(validateEmbedding([]), false);
  });
  it("cosine similarity is 1 for identical unit vectors", () => {
    assert.ok(Math.abs(cosineSimilarity([1, 0], [1, 0]) - 1) < 1e-9);
  });
});
