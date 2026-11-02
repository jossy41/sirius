import { AppError } from "../errors.ts";
import { emptyProfile, normalizeProfile, type LearnerProfile } from "../learner/profile.ts";
import { normalizeNote, sortNotes, type StudyNote } from "../notes/model.ts";
import type { CurriculumPack, InstalledPackRecord } from "../curriculum/types.ts";
import { decideInstall, importPack } from "../curriculum/pack.ts";
import type {
  DocumentBinary,
  DocumentContent,
  DocumentCurriculumLink,
  DocumentMeta,
} from "../documents/types.ts";
import { emptyCurriculumLink } from "../documents/types.ts";
import type {
  AnswerEvaluation,
  AttemptRecord,
  FeynmanSession,
  LearningQuestion,
  PracticeSession,
} from "../learning/types.ts";
import type { MisconceptionRecord } from "../learning/misconceptions.ts";
import type {
  KnowledgeGraphSnapshot,
  MasteryAssessment,
  RecommendationHistoryEntry,
  ObjectiveEvidence,
} from "../knowledge/index.ts";
import type {
  RevisionSchedule,
  RevisionSession,
  RevisionHistoryEntry,
  DailyRevisionPlan,
} from "../revision/types.ts";
import type { ExamDefinition, ExamSession, ExamResult } from "../examination/types.ts";
import type { AiTutorSession } from "../ai/types.ts";

export const SIRIUS_DB_NAME = "sirius";
/**
 * Schema versions:
 * 1 — profile, notes
 * 2 — curriculum packs
 * 3 — documents (meta, content, binary)
 * 4 — learning questions, sessions, evaluations, attempts, Feynman
 * 5 — misconceptions
 * 6 — knowledge graph, mastery, evidence, recommendation history
 * 7 — revision schedules, sessions, history, daily plans
 * 8 — examination definitions, sessions, results
 * 9 — AI tutor sessions (local only)
 */
export const SIRIUS_DB_VERSION = 10;

const PROFILE_STORE = "profile";
const NOTES_STORE = "notes";
const PACKS_STORE = "packs";
const DOCUMENTS_STORE = "documents";
const DOCUMENT_CONTENT_STORE = "documentContent";
const DOCUMENT_BINARY_STORE = "documentBinary";
const QUESTIONS_STORE = "learningQuestions";
const SESSIONS_STORE = "practiceSessions";
const EVALUATIONS_STORE = "answerEvaluations";
const ATTEMPTS_STORE = "learningAttempts";
const FEYNMAN_STORE = "feynmanSessions";
const MISCONCEPTIONS_STORE = "misconceptions";
const KNOWLEDGE_GRAPH_STORE = "knowledgeGraphs";
const MASTERY_STORE = "masteryAssessments";
const OBJECTIVE_EVIDENCE_STORE = "objectiveEvidence";
const RECOMMENDATION_HISTORY_STORE = "recommendationHistory";
const REVISION_SCHEDULE_STORE = "revisionSchedules";
const REVISION_SESSION_STORE = "revisionSessions";
const REVISION_HISTORY_STORE = "revisionHistory";
const DAILY_REVISION_PLAN_STORE = "dailyRevisionPlans";
const EXAM_DEFINITION_STORE = "examDefinitions";
const EXAM_SESSION_STORE = "examSessions";
const EXAM_RESULT_STORE = "examResults";
const TUTOR_SESSION_STORE = "tutorSessions";
const CHUNK_EMBEDDING_STORE = "chunkEmbeddings";
const PROFILE_KEY = "learner";

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new AppError("This browser does not provide on-device storage."));
  }
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(SIRIUS_DB_NAME, SIRIUS_DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = request.result;
        const oldVersion = event.oldVersion;

        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(PROFILE_STORE)) db.createObjectStore(PROFILE_STORE);
          if (!db.objectStoreNames.contains(NOTES_STORE)) {
            db.createObjectStore(NOTES_STORE, { keyPath: "id" });
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(PACKS_STORE)) {
            db.createObjectStore(PACKS_STORE, { keyPath: "packId" });
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
            db.createObjectStore(DOCUMENTS_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(DOCUMENT_CONTENT_STORE)) {
            db.createObjectStore(DOCUMENT_CONTENT_STORE, { keyPath: "documentId" });
          }
          if (!db.objectStoreNames.contains(DOCUMENT_BINARY_STORE)) {
            db.createObjectStore(DOCUMENT_BINARY_STORE, { keyPath: "documentId" });
          }
        }
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains(QUESTIONS_STORE)) {
            db.createObjectStore(QUESTIONS_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
            db.createObjectStore(SESSIONS_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(EVALUATIONS_STORE)) {
            db.createObjectStore(EVALUATIONS_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(ATTEMPTS_STORE)) {
            db.createObjectStore(ATTEMPTS_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(FEYNMAN_STORE)) {
            db.createObjectStore(FEYNMAN_STORE, { keyPath: "id" });
          }
        }
        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains(MISCONCEPTIONS_STORE)) {
            db.createObjectStore(MISCONCEPTIONS_STORE, { keyPath: "id" });
          }
        }
        if (oldVersion < 6) {
          if (!db.objectStoreNames.contains(KNOWLEDGE_GRAPH_STORE)) {
            db.createObjectStore(KNOWLEDGE_GRAPH_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(MASTERY_STORE)) {
            db.createObjectStore(MASTERY_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(OBJECTIVE_EVIDENCE_STORE)) {
            db.createObjectStore(OBJECTIVE_EVIDENCE_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(RECOMMENDATION_HISTORY_STORE)) {
            db.createObjectStore(RECOMMENDATION_HISTORY_STORE, { keyPath: "id" });
          }
        }
        if (oldVersion < 7) {
          if (!db.objectStoreNames.contains(REVISION_SCHEDULE_STORE)) {
            db.createObjectStore(REVISION_SCHEDULE_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(REVISION_SESSION_STORE)) {
            db.createObjectStore(REVISION_SESSION_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(REVISION_HISTORY_STORE)) {
            db.createObjectStore(REVISION_HISTORY_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(DAILY_REVISION_PLAN_STORE)) {
            db.createObjectStore(DAILY_REVISION_PLAN_STORE, { keyPath: "id" });
          }
        }
        if (oldVersion < 8) {
          if (!db.objectStoreNames.contains(EXAM_DEFINITION_STORE)) {
            db.createObjectStore(EXAM_DEFINITION_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(EXAM_SESSION_STORE)) {
            db.createObjectStore(EXAM_SESSION_STORE, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(EXAM_RESULT_STORE)) {
            db.createObjectStore(EXAM_RESULT_STORE, { keyPath: "id" });
          }
        }
        if (oldVersion < 9) {
          if (!db.objectStoreNames.contains(TUTOR_SESSION_STORE)) {
            db.createObjectStore(TUTOR_SESSION_STORE, { keyPath: "id" });
          }
        }
        if (oldVersion < 10) {
          if (!db.objectStoreNames.contains(CHUNK_EMBEDDING_STORE)) {
            const emb = db.createObjectStore(CHUNK_EMBEDDING_STORE, { keyPath: "id" });
            emb.createIndex("by_document", "documentId", { unique: false });
          }
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        databasePromise = null;
        reject(new AppError("Could not open on-device storage."));
      };
      request.onblocked = () => {
        databasePromise = null;
        reject(
          new AppError(
            "On-device storage is open in another tab. Close the other Sirius tab and try again.",
          ),
        );
      };
    });
  }
  return databasePromise;
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = run(tx.objectStore(storeName));
        let succeeded = false;
        request.onsuccess = () => {
          succeeded = true;
        };
        tx.oncomplete = () => {
          if (!succeeded) {
            reject(new AppError("Could not read on-device storage."));
            return;
          }
          resolve(request.result);
        };
        tx.onerror = () => {
          reject(
            new AppError(
              mode === "readonly"
                ? "Could not read on-device storage."
                : "Could not save on this device.",
            ),
          );
        };
        tx.onabort = () => {
          reject(new AppError("Saving was interrupted."));
        };
      }),
  );
}

export async function readProfile(): Promise<LearnerProfile> {
  const value = await runTransaction<unknown>(PROFILE_STORE, "readonly", (store) =>
    store.get(PROFILE_KEY),
  );
  if (!value) return emptyProfile();
  return normalizeProfile(value);
}

export async function writeProfile(profile: LearnerProfile): Promise<LearnerProfile> {
  const normalized = normalizeProfile({ ...profile, updatedAt: new Date().toISOString() });
  await runTransaction(PROFILE_STORE, "readwrite", (store) => store.put(normalized, PROFILE_KEY));
  return normalized;
}

export async function listNotes(): Promise<StudyNote[]> {
  const value = await runTransaction<unknown[]>(NOTES_STORE, "readonly", (store) => store.getAll());
  const notes = value
    .map((item) => normalizeNote(item))
    .filter((item): item is StudyNote => item !== null);
  return sortNotes(notes);
}

export async function saveNote(note: StudyNote): Promise<StudyNote> {
  const normalized = normalizeNote(note);
  if (!normalized) throw new AppError("This note is missing a title.");
  await runTransaction(NOTES_STORE, "readwrite", (store) => store.put(normalized));
  return normalized;
}

export async function deleteNote(id: string): Promise<void> {
  await runTransaction(NOTES_STORE, "readwrite", (store) => store.delete(id));
}

// --- Curriculum packs (schema v2) ---

export async function listInstalledPacks(): Promise<InstalledPackRecord[]> {
  const value = await runTransaction<unknown[]>(PACKS_STORE, "readonly", (store) => store.getAll());
  return (value ?? [])
    .filter((item): item is InstalledPackRecord => {
      return (
        typeof item === "object" &&
        item !== null &&
        "packId" in item &&
        "meta" in item &&
        "content" in item
      );
    })
    .sort((a, b) => a.meta.title.localeCompare(b.meta.title));
}

export async function getInstalledPack(packId: string): Promise<InstalledPackRecord | undefined> {
  const value = await runTransaction<unknown>(PACKS_STORE, "readonly", (store) => store.get(packId));
  if (!value || typeof value !== "object" || !("packId" in value)) return undefined;
  return value as InstalledPackRecord;
}

export type InstallPackResult =
  | { status: "installed"; record: InstalledPackRecord }
  | { status: "replaced"; record: InstalledPackRecord }
  | { status: "skipped"; record: InstalledPackRecord }
  | { status: "rejected"; message: string; issues?: string[] };

/**
 * Validate and install a curriculum pack. Does not touch profile or notes stores.
 */
export async function installPack(raw: unknown): Promise<InstallPackResult> {
  const imported = await importPack(raw, { verifyHash: true });
  if (!imported.ok) {
    return { status: "rejected", message: imported.message, issues: imported.issues };
  }

  const pack = imported.pack;
  const existing = await getInstalledPack(pack.meta.packId);
  const decision = decideInstall(pack, existing);

  if (decision.action === "skip") {
    return { status: "skipped", record: decision.existing };
  }
  if (decision.action === "reject") {
    return { status: "rejected", message: decision.reason };
  }

  const record: InstalledPackRecord = {
    packId: pack.meta.packId,
    meta: pack.meta,
    content: pack.content,
    installedAt: new Date().toISOString(),
  };

  await runTransaction(PACKS_STORE, "readwrite", (store) => store.put(record));

  return {
    status: decision.action === "replace" ? "replaced" : "installed",
    record,
  };
}

export async function removePack(packId: string): Promise<void> {
  await runTransaction(PACKS_STORE, "readwrite", (store) => store.delete(packId));
}

/** Convenience: install a typed CurriculumPack. */
export async function installCurriculumPack(pack: CurriculumPack): Promise<InstallPackResult> {
  return installPack(pack);
}


// ---------------------------------------------------------------------------
// Documents (schema v3)
// ---------------------------------------------------------------------------

function normalizeDocumentMeta(raw: unknown): DocumentMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id) return null;
  const curriculum =
    r.curriculum && typeof r.curriculum === "object"
      ? ({
          systemId: typeof (r.curriculum as DocumentCurriculumLink).systemId === "string" ? (r.curriculum as DocumentCurriculumLink).systemId : null,
          versionId: typeof (r.curriculum as DocumentCurriculumLink).versionId === "string" ? (r.curriculum as DocumentCurriculumLink).versionId : null,
          gradeCode: typeof (r.curriculum as DocumentCurriculumLink).gradeCode === "string" ? (r.curriculum as DocumentCurriculumLink).gradeCode : null,
          subjectId: typeof (r.curriculum as DocumentCurriculumLink).subjectId === "string" ? (r.curriculum as DocumentCurriculumLink).subjectId : null,
          subjectCode: typeof (r.curriculum as DocumentCurriculumLink).subjectCode === "string" ? (r.curriculum as DocumentCurriculumLink).subjectCode : null,
          topicId: typeof (r.curriculum as DocumentCurriculumLink).topicId === "string" ? (r.curriculum as DocumentCurriculumLink).topicId : null,
          topicCode: typeof (r.curriculum as DocumentCurriculumLink).topicCode === "string" ? (r.curriculum as DocumentCurriculumLink).topicCode : null,
          packId: typeof (r.curriculum as DocumentCurriculumLink).packId === "string" ? (r.curriculum as DocumentCurriculumLink).packId : null,
        } satisfies DocumentCurriculumLink)
      : emptyCurriculumLink();
  return {
    id: r.id,
    name: typeof r.name === "string" ? r.name : "Untitled",
    originalName: typeof r.originalName === "string" ? r.originalName : "document.pdf",
    format: "pdf",
    mimeType: typeof r.mimeType === "string" ? r.mimeType : "application/pdf",
    sizeBytes: typeof r.sizeBytes === "number" ? r.sizeBytes : 0,
    pageCount: typeof r.pageCount === "number" ? r.pageCount : null,
    status: (typeof r.status === "string" ? r.status : "pending") as DocumentMeta["status"],
    statusMessage: typeof r.statusMessage === "string" ? r.statusMessage : null,
    curriculum,
    contentHash: typeof r.contentHash === "string" ? r.contentHash : null,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
    binaryStored: Boolean(r.binaryStored),
  };
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  const value = await runTransaction<unknown[]>(DOCUMENTS_STORE, "readonly", (store) => store.getAll());
  return (value ?? [])
    .map(normalizeDocumentMeta)
    .filter((d): d is DocumentMeta => d !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

export async function getDocumentMeta(id: string): Promise<DocumentMeta | undefined> {
  const value = await runTransaction<unknown>(DOCUMENTS_STORE, "readonly", (store) => store.get(id));
  return normalizeDocumentMeta(value) ?? undefined;
}

export async function putDocumentMeta(meta: DocumentMeta): Promise<DocumentMeta> {
  await runTransaction(DOCUMENTS_STORE, "readwrite", (store) => store.put(meta));
  return meta;
}

export async function getDocumentContent(documentId: string): Promise<DocumentContent | undefined> {
  const value = await runTransaction<unknown>(DOCUMENT_CONTENT_STORE, "readonly", (store) => store.get(documentId));
  if (!value || typeof value !== "object") return undefined;
  return value as DocumentContent;
}

export async function putDocumentContent(content: DocumentContent): Promise<void> {
  await runTransaction(DOCUMENT_CONTENT_STORE, "readwrite", (store) => store.put(content));
}

export async function getDocumentBinary(documentId: string): Promise<DocumentBinary | undefined> {
  const value = await runTransaction<unknown>(DOCUMENT_BINARY_STORE, "readonly", (store) => store.get(documentId));
  if (!value || typeof value !== "object") return undefined;
  const r = value as DocumentBinary;
  if (!r.blob) return undefined;
  return r;
}

export async function putDocumentBinary(binary: DocumentBinary): Promise<void> {
  await runTransaction(DOCUMENT_BINARY_STORE, "readwrite", (store) => store.put(binary));
}

export async function deleteDocument(documentId: string): Promise<void> {
  try {
    await deleteChunkEmbeddingsForDocument(documentId);
  } catch {
    /* embedding store may be missing on older sessions */
  }
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([DOCUMENTS_STORE, DOCUMENT_CONTENT_STORE, DOCUMENT_BINARY_STORE], "readwrite");
    tx.objectStore(DOCUMENTS_STORE).delete(documentId);
    tx.objectStore(DOCUMENT_CONTENT_STORE).delete(documentId);
    tx.objectStore(DOCUMENT_BINARY_STORE).delete(documentId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new AppError("Could not remove document from this device."));
    tx.onabort = () => reject(new AppError("Removing the document was interrupted."));
  });
}

export async function findDocumentByHash(contentHash: string): Promise<DocumentMeta | undefined> {
  const all = await listDocuments();
  return all.find((d) => d.contentHash === contentHash);
}


// ---------------------------------------------------------------------------
// Learning activity (schema v4)
// ---------------------------------------------------------------------------

export async function putLearningQuestion(q: LearningQuestion): Promise<void> {
  await runTransaction(QUESTIONS_STORE, "readwrite", (store) => store.put(q));
}

export async function putLearningQuestions(qs: LearningQuestion[]): Promise<void> {
  for (const q of qs) await putLearningQuestion(q);
}

export async function getLearningQuestion(id: string): Promise<LearningQuestion | undefined> {
  const value = await runTransaction<unknown>(QUESTIONS_STORE, "readonly", (store) => store.get(id));
  return value && typeof value === "object" ? (value as LearningQuestion) : undefined;
}

export async function listLearningQuestions(): Promise<LearningQuestion[]> {
  const value = await runTransaction<unknown[]>(QUESTIONS_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as LearningQuestion[]).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
}

export async function putPracticeSession(session: PracticeSession): Promise<void> {
  await runTransaction(SESSIONS_STORE, "readwrite", (store) => store.put(session));
}

export async function listPracticeSessions(): Promise<PracticeSession[]> {
  const value = await runTransaction<unknown[]>(SESSIONS_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as PracticeSession[]).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
}

export async function getPracticeSession(id: string): Promise<PracticeSession | undefined> {
  const value = await runTransaction<unknown>(SESSIONS_STORE, "readonly", (store) => store.get(id));
  return value && typeof value === "object" ? (value as PracticeSession) : undefined;
}

export async function putAnswerEvaluation(ev: AnswerEvaluation): Promise<void> {
  await runTransaction(EVALUATIONS_STORE, "readwrite", (store) => store.put(ev));
}

export async function listAnswerEvaluations(): Promise<AnswerEvaluation[]> {
  const value = await runTransaction<unknown[]>(EVALUATIONS_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as AnswerEvaluation[]).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
}

export async function putAttempt(attempt: AttemptRecord): Promise<void> {
  await runTransaction(ATTEMPTS_STORE, "readwrite", (store) => store.put(attempt));
}

export async function listAttempts(): Promise<AttemptRecord[]> {
  const value = await runTransaction<unknown[]>(ATTEMPTS_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as AttemptRecord[]).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
}

export async function putFeynmanSession(session: FeynmanSession): Promise<void> {
  await runTransaction(FEYNMAN_STORE, "readwrite", (store) => store.put(session));
}

export async function listFeynmanSessions(): Promise<FeynmanSession[]> {
  const value = await runTransaction<unknown[]>(FEYNMAN_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as FeynmanSession[]).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
}


// ---------------------------------------------------------------------------
// Misconceptions (schema v5)
// ---------------------------------------------------------------------------

export async function putMisconception(record: MisconceptionRecord): Promise<void> {
  await runTransaction(MISCONCEPTIONS_STORE, "readwrite", (store) => store.put(record));
}

export async function getMisconception(id: string): Promise<MisconceptionRecord | undefined> {
  const value = await runTransaction<unknown>(MISCONCEPTIONS_STORE, "readonly", (store) =>
    store.get(id),
  );
  return value && typeof value === "object" ? (value as MisconceptionRecord) : undefined;
}

export async function listMisconceptions(): Promise<MisconceptionRecord[]> {
  const value = await runTransaction<unknown[]>(MISCONCEPTIONS_STORE, "readonly", (store) =>
    store.getAll(),
  );
  return ((value ?? []) as MisconceptionRecord[]).sort((a, b) =>
    a.lastObservedAt < b.lastObservedAt ? 1 : a.lastObservedAt > b.lastObservedAt ? -1 : 0,
  );
}

export async function deleteMisconception(id: string): Promise<void> {
  await runTransaction(MISCONCEPTIONS_STORE, "readwrite", (store) => store.delete(id));
}


// Knowledge graph & mastery (schema v6)
export async function putKnowledgeGraph(snapshot: KnowledgeGraphSnapshot): Promise<void> {
  await runTransaction(KNOWLEDGE_GRAPH_STORE, "readwrite", (store) => store.put(snapshot));
}
export async function listKnowledgeGraphs(): Promise<KnowledgeGraphSnapshot[]> {
  const value = await runTransaction<unknown[]>(KNOWLEDGE_GRAPH_STORE, "readonly", (store) => store.getAll());
  return (value ?? []) as KnowledgeGraphSnapshot[];
}
export async function putMasteryAssessment(assessment: MasteryAssessment): Promise<void> {
  await runTransaction(MASTERY_STORE, "readwrite", (store) => store.put(assessment));
}
export async function listMasteryAssessments(): Promise<MasteryAssessment[]> {
  const value = await runTransaction<unknown[]>(MASTERY_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as MasteryAssessment[]).sort((a, b) => a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0);
}
export async function putObjectiveEvidence(item: ObjectiveEvidence): Promise<void> {
  await runTransaction(OBJECTIVE_EVIDENCE_STORE, "readwrite", (store) => store.put(item));
}
export async function listObjectiveEvidence(): Promise<ObjectiveEvidence[]> {
  const value = await runTransaction<unknown[]>(OBJECTIVE_EVIDENCE_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as ObjectiveEvidence[]).sort((a, b) => a.recordedAt < b.recordedAt ? 1 : a.recordedAt > b.recordedAt ? -1 : 0);
}
export async function putRecommendationHistory(entry: RecommendationHistoryEntry): Promise<void> {
  await runTransaction(RECOMMENDATION_HISTORY_STORE, "readwrite", (store) => store.put(entry));
}
export async function listRecommendationHistory(): Promise<RecommendationHistoryEntry[]> {
  const value = await runTransaction<unknown[]>(RECOMMENDATION_HISTORY_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as RecommendationHistoryEntry[]).sort((a, b) => a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
}


// Revision intelligence (schema v7)
export async function putRevisionSchedule(s: RevisionSchedule): Promise<void> {
  await runTransaction(REVISION_SCHEDULE_STORE, "readwrite", (store) => store.put(s));
}
export async function listRevisionSchedules(): Promise<RevisionSchedule[]> {
  const value = await runTransaction<unknown[]>(REVISION_SCHEDULE_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as RevisionSchedule[]).sort((a, b) =>
    a.nextReviewAt < b.nextReviewAt ? -1 : a.nextReviewAt > b.nextReviewAt ? 1 : 0,
  );
}
export async function putRevisionSession(s: RevisionSession): Promise<void> {
  await runTransaction(REVISION_SESSION_STORE, "readwrite", (store) => store.put(s));
}
export async function getRevisionSession(id: string): Promise<RevisionSession | undefined> {
  const value = await runTransaction<unknown>(REVISION_SESSION_STORE, "readonly", (store) => store.get(id));
  return value && typeof value === "object" ? (value as RevisionSession) : undefined;
}
export async function listRevisionSessions(): Promise<RevisionSession[]> {
  const value = await runTransaction<unknown[]>(REVISION_SESSION_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as RevisionSession[]).sort((a, b) =>
    a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0,
  );
}
export async function putRevisionHistory(e: RevisionHistoryEntry): Promise<void> {
  await runTransaction(REVISION_HISTORY_STORE, "readwrite", (store) => store.put(e));
}
export async function listRevisionHistory(): Promise<RevisionHistoryEntry[]> {
  const value = await runTransaction<unknown[]>(REVISION_HISTORY_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as RevisionHistoryEntry[]).sort((a, b) =>
    a.reviewedAt < b.reviewedAt ? 1 : a.reviewedAt > b.reviewedAt ? -1 : 0,
  );
}
export async function putDailyRevisionPlan(plan: DailyRevisionPlan): Promise<void> {
  await runTransaction(DAILY_REVISION_PLAN_STORE, "readwrite", (store) => store.put(plan));
}
export async function listDailyRevisionPlans(): Promise<DailyRevisionPlan[]> {
  const value = await runTransaction<unknown[]>(DAILY_REVISION_PLAN_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as DailyRevisionPlan[]).sort((a, b) =>
    a.planDate < b.planDate ? 1 : a.planDate > b.planDate ? -1 : 0,
  );
}


// Examination intelligence (schema v8)
export async function putExamDefinition(d: ExamDefinition): Promise<void> {
  await runTransaction(EXAM_DEFINITION_STORE, "readwrite", (store) => store.put(d));
}
export async function listExamDefinitions(): Promise<ExamDefinition[]> {
  const value = await runTransaction<unknown[]>(EXAM_DEFINITION_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as ExamDefinition[]).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
}
export async function getExamDefinition(id: string): Promise<ExamDefinition | undefined> {
  const value = await runTransaction<unknown>(EXAM_DEFINITION_STORE, "readonly", (store) => store.get(id));
  return value && typeof value === "object" ? (value as ExamDefinition) : undefined;
}
export async function putExamSession(s: ExamSession): Promise<void> {
  await runTransaction(EXAM_SESSION_STORE, "readwrite", (store) => store.put(s));
}
export async function getExamSession(id: string): Promise<ExamSession | undefined> {
  const value = await runTransaction<unknown>(EXAM_SESSION_STORE, "readonly", (store) => store.get(id));
  return value && typeof value === "object" ? (value as ExamSession) : undefined;
}
export async function listExamSessions(): Promise<ExamSession[]> {
  const value = await runTransaction<unknown[]>(EXAM_SESSION_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as ExamSession[]).sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
  );
}
export async function putExamResult(r: ExamResult): Promise<void> {
  await runTransaction(EXAM_RESULT_STORE, "readwrite", (store) => store.put(r));
}
export async function getExamResult(id: string): Promise<ExamResult | undefined> {
  const value = await runTransaction<unknown>(EXAM_RESULT_STORE, "readonly", (store) => store.get(id));
  return value && typeof value === "object" ? (value as ExamResult) : undefined;
}
export async function listExamResults(): Promise<ExamResult[]> {
  const value = await runTransaction<unknown[]>(EXAM_RESULT_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as ExamResult[]).sort((a, b) =>
    a.submittedAt < b.submittedAt ? 1 : a.submittedAt > b.submittedAt ? -1 : 0,
  );
}


// AI tutor sessions (schema v9) — local only
export async function putTutorSession(s: AiTutorSession): Promise<void> {
  await runTransaction(TUTOR_SESSION_STORE, "readwrite", (store) => store.put(s));
}
export async function listTutorSessions(): Promise<AiTutorSession[]> {
  const value = await runTransaction<unknown[]>(TUTOR_SESSION_STORE, "readonly", (store) => store.getAll());
  return ((value ?? []) as AiTutorSession[]).sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
  );
}
export async function deleteTutorSession(id: string): Promise<void> {
  await runTransaction(TUTOR_SESSION_STORE, "readwrite", (store) => store.delete(id));
}

export async function listDocumentChunks(): Promise<import("../documents/types.ts").DocumentChunk[]> {
  const docs = await listDocuments();
  const all: import("../documents/types.ts").DocumentChunk[] = [];
  for (const d of docs) {
    const content = await getDocumentContent(d.id);
    if (content?.chunks?.length) all.push(...content.chunks);
  }
  return all;
}


export async function putChunkEmbeddings(records: import("../retrieval/embed-index.ts").ChunkEmbeddingRecord[]): Promise<void> {
  if (records.length === 0) return;
  for (const r of records) {
    await runTransaction(CHUNK_EMBEDDING_STORE, "readwrite", (store) => store.put(r));
  }
}

export async function listChunkEmbeddings(documentId?: string): Promise<import("../retrieval/embed-index.ts").ChunkEmbeddingRecord[]> {
  const all = await runTransaction<import("../retrieval/embed-index.ts").ChunkEmbeddingRecord[]>(
    CHUNK_EMBEDDING_STORE,
    "readonly",
    (store) => store.getAll(),
  );
  const list = Array.isArray(all) ? all : [];
  if (!documentId) return list;
  return list.filter((r) => r.documentId === documentId);
}

export async function deleteChunkEmbeddingsForDocument(documentId: string): Promise<void> {
  const all = await listChunkEmbeddings(documentId);
  for (const r of all) {
    await runTransaction(CHUNK_EMBEDDING_STORE, "readwrite", (store) => store.delete(r.id));
  }
}
