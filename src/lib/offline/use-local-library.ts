import { createContext, useContext } from "react";
import type { LearnerProfile } from "@/lib/learner/profile";
import type { NoteDraft, StudyNote } from "@/lib/notes/model";
import type { CurriculumPack, InstalledPackRecord } from "@/lib/curriculum/types";
import type { InstallPackResult } from "@/lib/offline/database";
import type { DocumentCurriculumLink, DocumentMeta } from "@/lib/documents/types";
import type { ImportDocumentResult } from "@/lib/documents/import";

export type LibraryStatus = "loading" | "ready" | "error";

export interface LocalLibrary {
  status: LibraryStatus;
  errorMessage: string | null;
  profile: LearnerProfile;
  notes: StudyNote[];
  packs: InstalledPackRecord[];
  documents: DocumentMeta[];
  reload: () => Promise<void>;
  saveProfile: (profile: LearnerProfile) => Promise<void>;
  saveNote: (draft: NoteDraft, id?: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  installPack: (pack: CurriculumPack | unknown) => Promise<InstallPackResult>;
  removePack: (packId: string) => Promise<void>;
  getPack: (packId: string) => InstalledPackRecord | undefined;
  importDocument: (file: File) => Promise<ImportDocumentResult>;
  removeDocument: (id: string) => Promise<void>;
  updateDocumentCurriculum: (id: string, curriculum: DocumentCurriculumLink) => Promise<DocumentMeta>;
  renameDocument: (id: string, name: string) => Promise<DocumentMeta>;
  getDocument: (id: string) => DocumentMeta | undefined;
}

export const LocalLibraryContext = createContext<LocalLibrary | null>(null);

export function useLocalLibrary(): LocalLibrary {
  const library = useContext(LocalLibraryContext);
  if (!library) throw new Error("useLocalLibrary must be used within LocalLibraryProvider");
  return library;
}
