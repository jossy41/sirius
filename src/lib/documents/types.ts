/**
 * Document intelligence model for imported learning materials.
 * Offline-first; curriculum association is optional.
 */

export type DocumentFormat = "pdf";

export type DocumentProcessingStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed"
  | "unreadable"
  | "empty"
  | "scanned";

export interface DocumentCurriculumLink {
  systemId: string | null;
  versionId: string | null;
  gradeCode: string | null;
  subjectId: string | null;
  subjectCode: string | null;
  topicId: string | null;
  topicCode: string | null;
  packId: string | null;
}

export interface DocumentMeta {
  id: string;
  name: string;
  originalName: string;
  format: DocumentFormat;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  status: DocumentProcessingStatus;
  statusMessage: string | null;
  curriculum: DocumentCurriculumLink;
  contentHash: string | null;
  createdAt: string;
  updatedAt: string;
  binaryStored: boolean;
}

export interface DocumentPage {
  pageNumber: number;
  text: string;
  charCount: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  index: number;
  title: string | null;
  text: string;
  pageStart: number;
  pageEnd: number;
  charCount: number;
}

export interface DocumentContent {
  documentId: string;
  pages: DocumentPage[];
  chunks: DocumentChunk[];
  extractedAt: string;
  extractor: string;
}

export interface DocumentBinary {
  documentId: string;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
}

export function emptyCurriculumLink(): DocumentCurriculumLink {
  return {
    systemId: null,
    versionId: null,
    gradeCode: null,
    subjectId: null,
    subjectCode: null,
    topicId: null,
    topicCode: null,
    packId: null,
  };
}
