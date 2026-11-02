import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppError } from "@/lib/errors";
import {
  deleteNote,
  listNotes,
  listInstalledPacks,
  listDocuments,
  readProfile,
  saveNote,
  writeProfile,
  installPack as dbInstallPack,
  removePack as dbRemovePack,
  type InstallPackResult,
} from "@/lib/offline/database";
import { emptyProfile, type LearnerProfile } from "@/lib/learner/profile";
import { createNoteId, sortNotes, validateNoteDraft, type NoteDraft, type StudyNote } from "@/lib/notes/model";
import type { CurriculumPack, InstalledPackRecord } from "@/lib/curriculum/types";
import { LocalLibraryContext, type LibraryStatus } from "@/lib/offline/use-local-library";
import type { DocumentCurriculumLink, DocumentMeta } from "@/lib/documents/types";
import {
  importPdfDocument,
  removeDocument as removeDocumentService,
  updateDocumentCurriculum as updateCurriculumService,
  renameDocument as renameDocumentService,
  type ImportDocumentResult,
} from "@/lib/documents/import";
import { getStoredConsentToken, hasExternalAiConsent } from "@/lib/ai/consent";
import { createServerEmbeddingClient } from "@/lib/retrieval/server-embedding-client";
import { getDocumentContent } from "@/lib/offline/database";
import { indexDocumentEmbeddings } from "@/lib/retrieval/index-document";

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function LocalLibraryProvider({ children }: { children: ReactNode }) {
  const requestId = useRef(0);
  const [status, setStatus] = useState<LibraryStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<LearnerProfile>(emptyProfile);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [packs, setPacks] = useState<InstalledPackRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setStatus("loading");
    setErrorMessage(null);
    try {
      const [nextProfile, nextNotes, nextPacks, nextDocs] = await Promise.all([
        readProfile(),
        listNotes(),
        listInstalledPacks(),
        listDocuments(),
      ]);
      if (id !== requestId.current) return;
      setProfile(nextProfile);
      setNotes(nextNotes);
      setPacks(nextPacks);
      setDocuments(nextDocs);
      setStatus("ready");
    } catch (error) {
      if (id !== requestId.current) return;
      setStatus("error");
      setErrorMessage(messageFrom(error, "Could not open on-device storage."));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveProfile = useCallback(async (next: LearnerProfile) => {
    const saved = await writeProfile(next);
    requestId.current += 1;
    setProfile(saved);
    setStatus("ready");
    setErrorMessage(null);
  }, []);

  const saveNoteDraft = useCallback(async (draft: NoteDraft, id?: string) => {
    const validated = validateNoteDraft(draft);
    if (!validated.ok) throw new AppError(validated.message);
    const note: StudyNote = {
      id: id ?? createNoteId(),
      ...validated.value,
      updatedAt: new Date().toISOString(),
    };
    const saved = await saveNote(note);
    requestId.current += 1;
    setNotes((current) => sortNotes([saved, ...current.filter((item) => item.id !== saved.id)]));
    setStatus("ready");
    setErrorMessage(null);
  }, []);

  const removeNote = useCallback(async (id: string) => {
    await deleteNote(id);
    requestId.current += 1;
    setNotes((current) => current.filter((item) => item.id !== id));
    setStatus("ready");
  }, []);

  const installPack = useCallback(async (pack: CurriculumPack | unknown): Promise<InstallPackResult> => {
    const result = await dbInstallPack(pack);
    if (result.status === "installed" || result.status === "replaced") {
      requestId.current += 1;
      setPacks((current) => {
        const without = current.filter((p) => p.packId !== result.record.packId);
        return [...without, result.record].sort((a, b) => a.meta.title.localeCompare(b.meta.title));
      });
      setStatus("ready");
      setErrorMessage(null);
    } else if (result.status === "skipped") {
      setPacks((current) => {
        if (current.some((p) => p.packId === result.record.packId)) return current;
        return [...current, result.record].sort((a, b) => a.meta.title.localeCompare(b.meta.title));
      });
    }
    return result;
  }, []);

  const removePack = useCallback(async (packId: string) => {
    await dbRemovePack(packId);
    requestId.current += 1;
    setPacks((current) => current.filter((p) => p.packId !== packId));
    setStatus("ready");
  }, []);

  const getPack = useCallback((packId: string) => packs.find((p) => p.packId === packId), [packs]);

  const importDocument = useCallback(async (file: File): Promise<ImportDocumentResult> => {
    let embeddingProvider = null;
    try {
      if (hasExternalAiConsent()) {
        const token = getStoredConsentToken();
        if (token) embeddingProvider = createServerEmbeddingClient(token);
      }
    } catch { /* stay offline */ }
    const result = await importPdfDocument(file, { embeddingProvider });
    // Secondary path: if import skipped index (provider null) but we have token now, try index
    if (result.status === "imported" && result.meta.status === "ready" && embeddingProvider) {
      try {
        const content = await getDocumentContent(result.meta.id);
        if (content?.chunks?.length) {
          await indexDocumentEmbeddings({
            meta: result.meta,
            chunks: content.chunks,
            provider: embeddingProvider,
          });
        }
      } catch { /* non-fatal */ }
    }
    if (result.status === "imported" || result.status === "duplicate") {
      requestId.current += 1;
      setDocuments((current) => {
        const without = current.filter((d) => d.id !== result.meta.id);
        return [result.meta, ...without].sort((a, b) =>
          a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
        );
      });
      setStatus("ready");
      setErrorMessage(null);
    }
    return result;
  }, []);

  const removeDocument = useCallback(async (id: string) => {
    await removeDocumentService(id);
    requestId.current += 1;
    setDocuments((current) => current.filter((d) => d.id !== id));
    setStatus("ready");
  }, []);

  const updateDocumentCurriculum = useCallback(async (id: string, curriculum: DocumentCurriculumLink) => {
    const next = await updateCurriculumService(id, curriculum);
    requestId.current += 1;
    setDocuments((current) => current.map((d) => (d.id === id ? next : d)));
    setStatus("ready");
    return next;
  }, []);

  const renameDocument = useCallback(async (id: string, name: string) => {
    const next = await renameDocumentService(id, name);
    requestId.current += 1;
    setDocuments((current) => current.map((d) => (d.id === id ? next : d)));
    setStatus("ready");
    return next;
  }, []);

  const getDocument = useCallback((id: string) => documents.find((d) => d.id === id), [documents]);

  return (
    <LocalLibraryContext.Provider
      value={{
        status,
        errorMessage,
        profile,
        notes,
        packs,
        documents,
        reload,
        saveProfile,
        saveNote: saveNoteDraft,
        deleteNote: removeNote,
        installPack,
        removePack,
        getPack,
        importDocument,
        removeDocument,
        updateDocumentCurriculum,
        renameDocument,
        getDocument,
      }}
    >
      {children}
    </LocalLibraryContext.Provider>
  );
}
