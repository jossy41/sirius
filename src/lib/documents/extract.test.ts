import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildChunks, validatePdfFile } from "./extract.ts";
import type { DocumentPage } from "./types.ts";

describe("validatePdfFile", () => {
  it("accepts a PDF by name and type", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "notes.pdf", { type: "application/pdf" });
    assert.equal(validatePdfFile(file).ok, true);
  });
  it("rejects non-PDF", () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    assert.equal(validatePdfFile(file).ok, false);
  });
  it("rejects empty file", () => {
    const file = new File([], "empty.pdf", { type: "application/pdf" });
    assert.equal(validatePdfFile(file).ok, false);
  });
  it("rejects oversized PDF above 100 MB", () => {
    const file = new File([new Uint8Array(1)], "huge.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 101 * 1024 * 1024 });
    const result = validatePdfFile(file);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /100 MB/);
  });
  it("accepts PDF at the 100 MB boundary when otherwise valid", () => {
    const file = new File([new Uint8Array(1)], "border.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 100 * 1024 * 1024 });
    assert.equal(validatePdfFile(file).ok, true);
  });
});

describe("buildChunks", () => {
  it("preserves page numbers and generates chunks", () => {
    const pages: DocumentPage[] = [
      {
        pageNumber: 1,
        text: "Chapter 1 Introduction\nThis is the first paragraph about matter and energy in grade eleven physics.",
        charCount: 90,
      },
      {
        pageNumber: 2,
        text: "The second page continues with more content about kinematics and measurement systems used in the laboratory.",
        charCount: 110,
      },
    ];
    const chunks = buildChunks("doc_test", pages);
    assert.ok(chunks.length >= 1);
    assert.equal(chunks[0].pageStart, 1);
    assert.ok(chunks[0].pageEnd >= 1);
    assert.equal(chunks[0].documentId, "doc_test");
  });
  it("returns empty for empty pages", () => {
    assert.equal(buildChunks("doc_empty", []).length, 0);
  });
});
