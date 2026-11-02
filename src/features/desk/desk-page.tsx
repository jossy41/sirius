import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { AppError } from "@/lib/errors";
import {
  BODY_MAX,
  SUBJECT_MAX,
  TITLE_MAX,
  formatNoteTime,
  validateNoteDraft,
  type StudyNote,
} from "@/lib/notes/model";
import { useLocalLibrary } from "@/lib/offline/use-local-library";

export function DeskPage() {
  const library = useLocalLibrary();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hash = useRouterState({ select: (state) => state.location.hash });

  useEffect(() => {
    if (library.status !== "ready" || !hash) return;
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    const target = document.getElementById(id);
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [hash, library.status, library.notes]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setSubject("");
    setBody("");
    setFormError(null);
    setActionError(null);
  }

  function editNote(note: StudyNote) {
    setEditingId(note.id);
    setTitle(note.title);
    setSubject(note.subject);
    setBody(note.body);
    setFormError(null);
    setActionError(null);
    setMessage(null);
    setConfirmingId(null);
    const form = document.getElementById("note-form");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    form?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    document.getElementById("note-title")?.focus();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validated = validateNoteDraft({ title, subject, body });
    if (!validated.ok) {
      setFormError(validated.message);
      setActionError(null);
      setMessage(null);
      return;
    }
    setSaving(true);
    setFormError(null);
    setActionError(null);
    try {
      await library.saveNote(validated.value, editingId ?? undefined);
      resetForm();
      setMessage("Saved on this device.");
    } catch (error) {
      setMessage(null);
      setActionError(null);
      setFormError(error instanceof Error ? error.message : "Could not save on this device.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setFormError(null);
    setActionError(null);
    try {
      await library.deleteNote(id);
      if (editingId === id) resetForm();
      setConfirmingId(null);
      setMessage("Deleted from this device.");
    } catch (error) {
      setMessage(null);
      setActionError(error instanceof AppError ? error.message : "Could not delete this note.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <header>
        <h1 className="font-serif text-4xl leading-tight text-ink">Desk</h1>
        <p className="mt-3 text-lg text-pretty text-muted">
          Notes saved in this browser. Clearing site data for Sirius deletes them.
        </p>
      </header>

      {library.status === "loading" ? (
        <p className="text-muted">Opening your notebook…</p>
      ) : library.status === "error" ? null : (
        <>
          <Panel>
            <form id="note-form" className="flex scroll-mt-24 flex-col gap-5" onSubmit={onSubmit}>
              <h2 className="font-serif text-3xl text-ink">{editingId ? "Edit note" : "New note"}</h2>
              <Field label="Title" htmlFor="note-title" error={formError}>
                <TextInput
                  id="note-title"
                  name="title"
                  value={title}
                  maxLength={TITLE_MAX}
                  required
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setFormError(null);
                    setActionError(null);
                    setMessage(null);
                  }}
                />
              </Field>
              <Field
                label="Subject"
                htmlFor="note-subject"
                hint="Optional. Use the name you use in school."
              >
                <TextInput
                  id="note-subject"
                  name="subject"
                  value={subject}
                  maxLength={SUBJECT_MAX}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </Field>
              <Field label="Note" htmlFor="note-body">
                <TextArea
                  id="note-body"
                  name="body"
                  value={body}
                  maxLength={BODY_MAX}
                  onChange={(event) => setBody(event.target.value)}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Save note"}
                </Button>
                {editingId ? (
                  <Button type="button" variant="secondary" onClick={resetForm} disabled={saving}>
                    Cancel
                  </Button>
                ) : null}
              </div>
              {message ? (
                <p role="status" className="text-sm text-primary">
                  {message}
                </p>
              ) : null}
            </form>
          </Panel>

          <Panel>
            <h2 className="font-serif text-3xl text-ink">On this device</h2>
            {actionError ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                {actionError}
              </p>
            ) : null}
            {library.notes.length === 0 ? (
              <p className="mt-3 text-pretty text-muted">No notes yet.</p>
            ) : (
              <ul className="mt-2">
                {library.notes.map((note) => {
                  const confirming = confirmingId === note.id;
                  return (
                    <li key={note.id} id={`note-${note.id}`} className="scroll-mt-24 border-t border-line py-5 first:border-t-0">
                      <article>
                        {note.subject ? <p className="text-sm font-semibold text-primary">{note.subject}</p> : null}
                        <h3 className="font-serif text-2xl break-words text-ink">{note.title}</h3>
                        {note.updatedAt ? (
                          <p className="mt-1 text-sm text-muted tabular-nums">
                            <time dateTime={note.updatedAt}>{formatNoteTime(note.updatedAt)}</time>
                          </p>
                        ) : null}
                        {note.body ? (
                          <p className="mt-3 break-words whitespace-pre-wrap text-ink">{note.body}</p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {confirming ? (
                            <>
                              <Button
                                variant="danger"
                                disabled={deletingId === note.id}
                                onClick={() => void remove(note.id)}
                              >
                                {deletingId === note.id ? "Deleting…" : "Delete note"}
                              </Button>
                              <Button variant="secondary" onClick={() => setConfirmingId(null)}>
                                Keep
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="secondary" onClick={() => editNote(note)}>
                                Edit
                              </Button>
                              <Button variant="ghost" onClick={() => setConfirmingId(note.id)}>
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
