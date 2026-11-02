/**
 * PDF text extraction and chunking pipeline.
 * Uses pdf.js for text-layer extraction. Does not claim OCR for scanned PDFs.
 */

import type { DocumentChunk, DocumentPage, DocumentProcessingStatus } from "./types.ts";

export interface ExtractionResult {
  status: DocumentProcessingStatus;
  statusMessage: string | null;
  pageCount: number;
  pages: DocumentPage[];
  chunks: DocumentChunk[];
  extractor: string;
}

const EXTRACTOR_ID = "pdfjs-text-v2";
const MIN_MEANINGFUL_CHARS = 40;
const CHUNK_TARGET_CHARS = 900;
const CHUNK_MAX_CHARS = 1600;
const CHUNK_MIN_CHARS = 80;

function isHeadingLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 140) return false;
  if (/^\d+(\.\d+){0,4}\s+\S/.test(t)) return true;
  if (/^(chapter|unit|section|part|topic|lesson|module)\b/i.test(t)) return true;
  // ALL CAPS short headings
  if (t.length <= 80 && /^[A-Z][A-Z0-9\s,;:'"()-]{3,}$/.test(t) && /[A-Z]{3}/.test(t)) {
    return true;
  }
  // Title Case line ending without period, short
  if (
    t.length <= 90 &&
    !/[.!?]$/.test(t) &&
    /^[A-Z][a-zA-Z0-9]/.test(t) &&
    t.split(/\s+/).length <= 12 &&
    t.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).length >= Math.ceil(t.split(/\s+/).length * 0.5)
  ) {
    return true;
  }
  return false;
}

/**
 * Reconstruct paragraph-aware text from pdf.js text items using y-position gaps.
 */
export function reconstructPageText(
  items: Array<{ str: string; transform?: number[] }>,
): string {
  if (items.length === 0) return "";

  type Line = { y: number; parts: string[] };
  const lines: Line[] = [];
  let current: Line | null = null;
  const Y_TOLERANCE = 2.5;

  for (const item of items) {
    const str = item.str ?? "";
    if (!str) continue;
    const y = item.transform && item.transform.length >= 6 ? item.transform[5] : 0;
    if (!current || Math.abs(current.y - y) > Y_TOLERANCE) {
      current = { y, parts: [str] };
      lines.push(current);
    } else {
      const prev = current.parts[current.parts.length - 1] ?? "";
      const needsSpace =
        prev.length > 0 &&
        !/\s$/.test(prev) &&
        !/^\s/.test(str) &&
        !/[-–—]$/.test(prev);
      current.parts.push(needsSpace ? ` ${str}` : str);
    }
  }

  // Sort top-to-bottom (pdf y increases upward)
  lines.sort((a, b) => b.y - a.y);

  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    gaps.push(Math.abs(lines[i - 1].y - lines[i].y));
  }
  const medianGap =
    gaps.length === 0
      ? 12
      : [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 12;
  const paraBreak = medianGap * 1.6;

  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].parts.join("").replace(/[ \t]+/g, " ").trim();
    if (!text) continue;
    if (i > 0 && Math.abs(lines[i - 1].y - lines[i].y) > paraBreak) {
      out.push("");
    }
    out.push(text);
  }
  return out.join("\n");
}

/**
 * Split extracted pages into meaningful chunks while preserving page ranges.
 * Flushes on headings and large paragraph breaks so unrelated sections stay separate.
 */
export function buildChunks(documentId: string, pages: DocumentPage[]): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let buffer = "";
  let pageStart = 1;
  let pageEnd = 1;
  let title: string | null = null;
  let index = 0;

  function flush() {
    const text = buffer.trim();
    if (!text || text.length < CHUNK_MIN_CHARS) {
      // keep tiny remainder only if nothing else will absorb it
      if (text.length > 0 && text.length < CHUNK_MIN_CHARS && chunks.length > 0) {
        const last = chunks[chunks.length - 1];
        last.text = `${last.text}\n\n${text}`.trim();
        last.charCount = last.text.length;
        last.pageEnd = pageEnd;
      }
      buffer = "";
      title = null;
      return;
    }
    chunks.push({
      id: `${documentId}-c${index}`,
      documentId,
      index,
      title,
      text,
      pageStart,
      pageEnd,
      charCount: text.length,
    });
    index += 1;
    buffer = "";
    title = null;
  }

  for (const page of pages) {
    const paragraphs = page.text.split(/\n\s*\n/);
    for (const para of paragraphs) {
      const lines = para.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        if (buffer.length > CHUNK_TARGET_CHARS) flush();
        continue;
      }

      const first = lines[0];
      if (isHeadingLine(first) && buffer.length >= CHUNK_MIN_CHARS) {
        flush();
        title = first;
        pageStart = page.pageNumber;
        pageEnd = page.pageNumber;
        buffer = lines.join("\n");
        if (buffer.length >= CHUNK_MAX_CHARS) flush();
        continue;
      }

      if (!buffer) {
        pageStart = page.pageNumber;
        if (isHeadingLine(first)) title = first;
      }
      pageEnd = page.pageNumber;
      const block = lines.join("\n");
      buffer += (buffer ? "\n\n" : "") + block;

      if (buffer.length >= CHUNK_MAX_CHARS) {
        flush();
      } else if (buffer.length >= CHUNK_TARGET_CHARS && lines.length <= 2 && isHeadingLine(first)) {
        // heading-ish short para after enough content — keep with next via flush
        flush();
      }
    }
  }
  flush();
  return chunks;
}

function classifyExtraction(
  pages: DocumentPage[],
  pageCount: number,
): { status: DocumentProcessingStatus; statusMessage: string | null } {
  if (pageCount === 0) {
    return { status: "empty", statusMessage: "PDF has no pages." };
  }
  const totalChars = pages.reduce((n, p) => n + p.charCount, 0);
  const pagesWithText = pages.filter((p) => p.charCount >= 8).length;

  if (totalChars < MIN_MEANINGFUL_CHARS) {
    if (pageCount > 0) {
      return {
        status: "scanned",
        statusMessage:
          "Little or no selectable text was found. This PDF may be scanned. OCR is not available yet.",
      };
    }
    return { status: "empty", statusMessage: "No readable text found." };
  }

  if (pagesWithText === 0) {
    return {
      status: "unreadable",
      statusMessage: "Text could not be extracted from any page.",
    };
  }

  return { status: "ready", statusMessage: null };
}

/**
 * Extract text from a PDF ArrayBuffer using pdf.js.
 * Caller should only invoke this in a browser context.
 */
export async function extractPdfText(
  data: ArrayBuffer,
  documentId: string,
): Promise<ExtractionResult> {
  try {
    const pdfjs = await import("pdfjs-dist");
    if (pdfjs.GlobalWorkerOptions) {
      // Main-thread extraction keeps deployment simple; large PDFs may briefly block.
      pdfjs.GlobalWorkerOptions.workerSrc = "";
    }

    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data), useSystemFonts: true });
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const pages: DocumentPage[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items: Array<{ str: string; transform?: number[] }> = [];
      for (const item of textContent.items) {
        if (item && typeof item === "object" && "str" in item) {
          items.push({
            str: String((item as { str: string }).str),
            transform: (item as { transform?: number[] }).transform,
          });
        }
      }
      const text = reconstructPageText(items);
      pages.push({
        pageNumber: i,
        text,
        charCount: text.length,
      });
    }

    const { status, statusMessage } = classifyExtraction(pages, pageCount);
    const chunks = status === "ready" ? buildChunks(documentId, pages) : [];

    return {
      status,
      statusMessage,
      pageCount,
      pages,
      chunks,
      extractor: EXTRACTOR_ID,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown extraction error";
    return {
      status: "failed",
      statusMessage: `Extraction failed: ${message}`,
      pageCount: 0,
      pages: [],
      chunks: [],
      extractor: EXTRACTOR_ID,
    };
  }
}

/** Maximum accepted PDF size (100 MiB). Large files may still fail on low-memory devices during extraction. */
export const MAX_PDF_BYTES = 100 * 1024 * 1024;
export const MAX_PDF_MB = 100;

export function validatePdfFile(file: File): { ok: true } | { ok: false; message: string } {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  const isPdf =
    type === "application/pdf" || type === "application/x-pdf" || name.endsWith(".pdf");
  if (!isPdf) return { ok: false, message: "Only PDF files are supported in this version." };
  if (file.size <= 0) return { ok: false, message: "The file is empty." };
  if (file.size > MAX_PDF_BYTES) {
    return {
      ok: false,
      message: `PDF is larger than ${MAX_PDF_MB} MB. Choose a smaller file, or split the document.`,
    };
  }
  return { ok: true };
}

export async function hashArrayBuffer(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
