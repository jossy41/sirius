import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Field, controlClassName } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { useLocalLibrary } from "@/lib/offline/use-local-library";
import { getDocumentBinary, loadDocumentDetail } from "@/lib/documents/import";
import type { DocumentContent, DocumentCurriculumLink, DocumentMeta } from "@/lib/documents/types";
import { emptyCurriculumLink } from "@/lib/documents/types";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentDetailPage({ documentId }: { documentId: string }) {
  const library = useLocalLibrary();
  const [meta, setMeta] = useState<DocumentMeta | null>(null);
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [nameEdit, setNameEdit] = useState("");
  const [curriculum, setCurriculum] = useState<DocumentCurriculumLink>(emptyCurriculumLink());
  const [savingLink, setSavingLink] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadDocumentDetail(documentId).then((detail) => {
      if (cancelled) return;
      if (!detail) {
        setError("Document not found.");
        setMeta(null);
        setContent(null);
      } else {
        setMeta(detail.meta);
        setContent(detail.content);
        setNameEdit(detail.meta.name);
        setCurriculum(detail.meta.curriculum);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const packOptions = library.packs;
  const subjects = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string; packId: string }>();
    for (const pack of packOptions) {
      for (const s of pack.content.subjects) {
        if (!map.has(s.id)) map.set(s.id, { id: s.id, code: s.code, name: s.name, packId: pack.packId });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [packOptions]);

  const topics = useMemo(() => {
    if (!curriculum.subjectId) return [];
    const list: { id: string; code: string; title: string }[] = [];
    for (const pack of packOptions) {
      for (const t of pack.content.topics) {
        if (t.subjectId === curriculum.subjectId) list.push({ id: t.id, code: t.code, title: t.title });
      }
    }
    return list.sort((a, b) => a.title.localeCompare(b.title));
  }, [packOptions, curriculum.subjectId]);

  async function saveName() {
    if (!meta) return;
    try {
      const next = await library.renameDocument(meta.id, nameEdit);
      setMeta(next);
      setMessage("Name updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rename.");
    }
  }

  async function saveCurriculum() {
    if (!meta) return;
    setSavingLink(true);
    setError(null);
    try {
      const next = await library.updateDocumentCurriculum(meta.id, curriculum);
      setMeta(next);
      setMessage("Curriculum link saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save link.");
    } finally {
      setSavingLink(false);
    }
  }

  async function openOfflinePdf() {
    if (!meta) return;
    try {
      const binary = await getDocumentBinary(meta.id);
      if (!binary?.blob) {
        setError("PDF binary is not available offline.");
        return;
      }
      const url = URL.createObjectURL(binary.blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError("Could not open the stored PDF.");
    }
  }

  if (loading) return <p className="text-muted">Loading document…</p>;
  if (!meta) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-danger">{error ?? "Document not found."}</p>
        <Button asChild variant="secondary">
          <Link to="/library">Back to library</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-muted uppercase">
          <Link to="/library" className="hover:text-primary">Library</Link>
          {" · Document"}
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{meta.name}</h1>
        <p className="text-muted">
          {formatBytes(meta.sizeBytes)}
          {meta.pageCount != null ? ` · ${meta.pageCount} pages` : ""}
          {` · ${meta.status}`}
          {meta.binaryStored ? " · available offline" : ""}
        </p>
        {meta.statusMessage ? <p className="text-sm text-muted">{meta.statusMessage}</p> : null}
      </header>

      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}

      <Panel className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">Details</h2>
        <Field label="Display name" htmlFor="doc-name">
          <input id="doc-name" className={controlClassName} value={nameEdit} onChange={(e) => setNameEdit(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void saveName()}>Save name</Button>
          {meta.binaryStored ? (
            <Button type="button" variant="secondary" onClick={() => void openOfflinePdf()}>Open PDF</Button>
          ) : null}
        </div>
        <p className="text-sm text-muted">Original file: {meta.originalName}</p>
      </Panel>

      <Panel className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">Curriculum link</h2>
        <p className="text-sm text-muted">Optional. Documents remain usable without an installed pack.</p>
        <Field label="Installed pack" htmlFor="doc-pack">
          <select
            id="doc-pack"
            className={controlClassName}
            value={curriculum.packId ?? ""}
            onChange={(e) => {
              const packId = e.target.value || null;
              const pack = packId ? library.getPack(packId) : undefined;
              setCurriculum({
                ...emptyCurriculumLink(),
                packId,
                systemId: pack?.meta.systemId ?? null,
                versionId: pack?.meta.versionId ?? null,
                gradeCode: pack?.meta.gradeCode ?? null,
              });
            }}
          >
            <option value="">None</option>
            {packOptions.map((p) => (
              <option key={p.packId} value={p.packId}>{p.meta.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Grade code" htmlFor="doc-grade">
          <input
            id="doc-grade"
            className={controlClassName}
            value={curriculum.gradeCode ?? ""}
            onChange={(e) => setCurriculum((c) => ({ ...c, gradeCode: e.target.value || null }))}
            placeholder="e.g. 11"
          />
        </Field>
        <Field label="Subject" htmlFor="doc-subject">
          <select
            id="doc-subject"
            className={controlClassName}
            value={curriculum.subjectId ?? ""}
            onChange={(e) => {
              const subjectId = e.target.value || null;
              const sub = subjects.find((s) => s.id === subjectId);
              setCurriculum((c) => ({
                ...c,
                subjectId,
                subjectCode: sub?.code ?? null,
                topicId: null,
                topicCode: null,
                packId: c.packId ?? sub?.packId ?? null,
              }));
            }}
          >
            <option value="">None</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </Field>
        <Field label="Topic" htmlFor="doc-topic">
          <select
            id="doc-topic"
            className={controlClassName}
            value={curriculum.topicId ?? ""}
            disabled={!curriculum.subjectId}
            onChange={(e) => {
              const topicId = e.target.value || null;
              const topic = topics.find((t) => t.id === topicId);
              setCurriculum((c) => ({ ...c, topicId, topicCode: topic?.code ?? null }));
            }}
          >
            <option value="">None</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </Field>
        <Button type="button" disabled={savingLink} onClick={() => void saveCurriculum()}>
          {savingLink ? "Saving…" : "Save curriculum link"}
        </Button>
      </Panel>

      <Panel className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">Extracted content</h2>
        {!content || content.chunks.length === 0 ? (
          <p className="text-muted">
            {meta.status === "scanned"
              ? "No selectable text layer. This looks like a scanned PDF. OCR is not implemented in this milestone."
              : "No extracted text available."}
          </p>
        ) : (
          <ul className="space-y-4">
            {content.chunks.map((chunk) => (
              <li key={chunk.id} className="rounded-md border border-line bg-paper p-4">
                <p className="mb-2 text-sm font-medium text-muted">
                  {chunk.title ? `${chunk.title} · ` : ""}
                  Pages {chunk.pageStart}
                  {chunk.pageEnd !== chunk.pageStart ? `–${chunk.pageEnd}` : ""}
                  {` · ${chunk.charCount} characters`}
                </p>
                <p className="whitespace-pre-wrap text-ink">{chunk.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
