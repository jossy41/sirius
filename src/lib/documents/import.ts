/**
 * Document import orchestration: validate → store binary → extract → persist content.
 */

import {
  deleteDocument,
  findDocumentByHash,
  getDocumentContent,
  getDocumentMeta,
  listDocuments,
  putDocumentBinary,
  putDocumentContent,
  putDocumentMeta,
} from "@/lib/offline/database";
import { extractPdfText, hashArrayBuffer, validatePdfFile } from "@/lib/documents/extract";
import {
  emptyCurriculumLink,
  type DocumentContent,
  type DocumentCurriculumLink,
  type DocumentMeta,
} from "@/lib/documents/types";
import type { EmbeddingProvider } from "@/lib/retrieval/embeddings";
import { indexDocumentEmbeddings } from "@/lib/retrieval/index-document";

export type ImportDocumentResult =
  | { status: "imported"; meta: DocumentMeta }
  | { status: "duplicate"; meta: DocumentMeta }
  | { status: "rejected"; message: string };

function createDocumentId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `doc_${crypto.randomUUID()}`;
  }
  return `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function importPdfDocument(
  file: File,
  options: { skipDuplicateCheck?: boolean; embeddingProvider?: EmbeddingProvider | null } = {},
): Promise<ImportDocumentResult> {
  const validation = validatePdfFile(file);
  if (!validation.ok) return { status: "rejected", message: validation.message };

  let data: ArrayBuffer;
  try {
    data = await file.arrayBuffer();
  } catch {
    return { status: "rejected", message: "Could not read the file." };
  }

  const contentHash = await hashArrayBuffer(data);
  if (!options.skipDuplicateCheck) {
    const existing = await findDocumentByHash(contentHash);
    if (existing) return { status: "duplicate", meta: existing };
  }

  const id = createDocumentId();
  const now = new Date().toISOString();
  const displayName = file.name.replace(/\.pdf$/i, "") || "Untitled PDF";

  let meta: DocumentMeta = {
    id,
    name: displayName,
    originalName: file.name,
    format: "pdf",
    mimeType: file.type || "application/pdf",
    sizeBytes: file.size,
    pageCount: null,
    status: "processing",
    statusMessage: "Extracting text…",
    curriculum: emptyCurriculumLink(),
    contentHash,
    createdAt: now,
    updatedAt: now,
    binaryStored: false,
  };

  try {
    await putDocumentMeta(meta);
  } catch {
    return { status: "rejected", message: "Could not save document metadata on this device." };
  }

  try {
    await putDocumentBinary({
      documentId: id,
      blob: new Blob([data], { type: "application/pdf" }),
      mimeType: "application/pdf",
      sizeBytes: file.size,
    });
    meta = { ...meta, binaryStored: true, updatedAt: new Date().toISOString() };
    await putDocumentMeta(meta);
  } catch {
    meta = {
      ...meta,
      status: "failed",
      statusMessage: "Could not store the PDF on this device. Storage may be full.",
      updatedAt: new Date().toISOString(),
    };
    await putDocumentMeta(meta).catch(() => undefined);
    return { status: "imported", meta };
  }

  const extraction = await extractPdfText(data, id);
  const content: DocumentContent = {
    documentId: id,
    pages: extraction.pages,
    chunks: extraction.chunks,
    extractedAt: new Date().toISOString(),
    extractor: extraction.extractor,
  };

  try {
    if (extraction.status === "ready" || extraction.pages.length > 0) {
      await putDocumentContent(content);
    }
  } catch {
    /* content storage failed; meta still useful */
  }

  meta = {
    ...meta,
    pageCount: extraction.pageCount || null,
    status: extraction.status,
    statusMessage: extraction.statusMessage,
    updatedAt: new Date().toISOString(),
  };
  await putDocumentMeta(meta);

  // Best-effort embedding index — never blocks or fails the import.
  if (options.embeddingProvider && content.chunks.length > 0 && meta.status === "ready") {
    try {
      const idx = await indexDocumentEmbeddings({
        meta,
        chunks: content.chunks,
        provider: options.embeddingProvider,
      });
      meta = {
        ...meta,
        statusMessage:
          idx.status === "indexed"
            ? `Ready · ${idx.indexedCount} passages indexed`
            : idx.status === "partial"
              ? `Ready · partial index (${idx.indexedCount})`
              : meta.statusMessage,
      };
      await putDocumentMeta(meta);
    } catch {
      /* offline library still works */
    }
  }

  return { status: "imported", meta };
}

export async function updateDocumentCurriculum(
  documentId: string,
  curriculum: DocumentCurriculumLink,
): Promise<DocumentMeta> {
  const existing = await getDocumentMeta(documentId);
  if (!existing) throw new Error("Document not found.");
  const next: DocumentMeta = { ...existing, curriculum, updatedAt: new Date().toISOString() };
  await putDocumentMeta(next);
  return next;
}

export async function renameDocument(documentId: string, name: string): Promise<DocumentMeta> {
  const existing = await getDocumentMeta(documentId);
  if (!existing) throw new Error("Document not found.");
  const trimmed = name.trim().slice(0, 200);
  if (!trimmed) throw new Error("Name cannot be empty.");
  const next: DocumentMeta = { ...existing, name: trimmed, updatedAt: new Date().toISOString() };
  await putDocumentMeta(next);
  return next;
}

export async function removeDocument(documentId: string): Promise<void> {
  await deleteDocument(documentId);
}

export async function loadDocumentLibrary(): Promise<DocumentMeta[]> {
  return listDocuments();
}

export async function loadDocumentDetail(documentId: string): Promise<{
  meta: DocumentMeta;
  content: DocumentContent | null;
} | null> {
  const meta = await getDocumentMeta(documentId);
  if (!meta) return null;
  const content = (await getDocumentContent(documentId)) ?? null;
  return { meta, content };
}

export { getDocumentBinary } from "@/lib/offline/database";
