export const TITLE_MAX = 120;
export const SUBJECT_MAX = 60;
export const BODY_MAX = 8000;

export interface NoteDraft {
  title: string;
  subject: string;
  body: string;
}

export interface StudyNote extends NoteDraft {
  id: string;
  updatedAt: string;
}

export type NoteValidation = { ok: true; value: NoteDraft } | { ok: false; message: string };

export function validateNoteDraft(input: NoteDraft): NoteValidation {
  const title = input.title.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!title) return { ok: false, message: "Add a title so you can find this note." };
  if (title.length > TITLE_MAX) {
    return { ok: false, message: `Title must be ${TITLE_MAX} characters or fewer.` };
  }
  if (subject.length > SUBJECT_MAX) {
    return { ok: false, message: `Subject must be ${SUBJECT_MAX} characters or fewer.` };
  }
  if (body.length > BODY_MAX) {
    return { ok: false, message: `Note must be ${BODY_MAX} characters or fewer.` };
  }
  return { ok: true, value: { title, subject, body } };
}

export function normalizeNote(input: unknown): StudyNote | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.length === 0) return null;
  const draft = validateNoteDraft({
    title: typeof record.title === "string" ? record.title : "",
    subject: typeof record.subject === "string" ? record.subject : "",
    body: typeof record.body === "string" ? record.body : "",
  });
  if (!draft.ok) return null;
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : "";
  return { id: record.id, ...draft.value, updatedAt };
}

export function sortNotes(notes: StudyNote[]): StudyNote[] {
  return [...notes].sort((a, b) => {
    if (a.updatedAt === b.updatedAt) return 0;
    return a.updatedAt < b.updatedAt ? 1 : -1;
  });
}

export function noteCountLabel(count: number): string {
  if (count === 0) return "Nothing written yet.";
  if (count === 1) return "1 note on this device.";
  return `${count} notes on this device.`;
}

export function createNoteId(): string {
  return crypto.randomUUID();
}

export function formatNoteTime(iso: string, options?: { timeZone?: string }): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: options?.timeZone,
  }).format(date);
}
