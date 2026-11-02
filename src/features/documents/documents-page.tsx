import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useLocalLibrary } from "@/lib/offline/use-local-library";
import type { DocumentMeta, DocumentProcessingStatus } from "@/lib/documents/types";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function statusLabel(status: DocumentProcessingStatus): string {
  const map: Record<DocumentProcessingStatus, string> = {
    pending: "Pending",
    processing: "Processing",
    ready: "Ready",
    failed: "Failed",
    unreadable: "Unreadable",
    empty: "Empty",
    scanned: "Scanned (no text)",
  };
  return map[status] ?? status;
}

function statusClass(status: DocumentProcessingStatus): string {
  if (status === "ready") return "text-primary";
  if (status === "failed" || status === "unreadable" || status === "empty") return "text-danger";
  return "text-muted";
}

export function DocumentsPage() {
  const library = useLocalLibrary();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const result = await library.importDocument(file);
        if (result.status === "rejected") setError(result.message);
        else if (result.status === "duplicate") setMessage(`“${result.meta.name}” is already in your library.`);
        else setMessage(`Imported “${result.meta.name}”.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function confirmDelete(doc: DocumentMeta) {
    setDeletingId(doc.id);
    try {
      await library.removeDocument(doc.id);
      setMessage(`Removed “${doc.name}”.`);
      setConfirmingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove document.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-wide text-muted uppercase">Library</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Documents</h1>
        <p className="max-w-2xl text-muted">
          Import PDF textbooks and learning materials. Text is extracted on this device and stays available offline.
          Scanned PDFs without a text layer are marked clearly — OCR is not available yet.
        </p>
      </header>

      <Panel className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={busy || library.status !== "ready"} onClick={() => inputRef.current?.click()}>
            <FileUp className="size-4" aria-hidden />
            {busy ? "Importing…" : "Import PDF"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            multiple
            onChange={(e) => void onFilesSelected(e.target.files)}
          />
          <p className="text-sm text-muted">PDF only · stored on this device · max 100 MB</p>
        </div>
        {message ? <p className="text-sm text-primary">{message}</p> : null}
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      </Panel>

      {library.status === "loading" ? (
        <p className="text-muted">Loading library…</p>
      ) : library.documents.length === 0 ? (
        <Panel>
          <p className="text-muted">No documents yet. Import a PDF textbook to get started.</p>
        </Panel>
      ) : (
        <ul className="space-y-3">
          {library.documents.map((doc) => (
            <li key={doc.id}>
              <Panel className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <Link to="/library/$documentId" params={{ documentId: doc.id }} className="font-medium text-ink hover:text-primary">
                    {doc.name}
                  </Link>
                  <p className="text-sm text-muted">
                    {formatBytes(doc.sizeBytes)}
                    {doc.pageCount != null ? ` · ${doc.pageCount} pages` : ""}
                    {` · ${formatDate(doc.createdAt)}`}
                    {doc.binaryStored ? " · offline" : ""}
                  </p>
                  <p className={`text-sm font-medium ${statusClass(doc.status)}`}>
                    {statusLabel(doc.status)}
                    {doc.statusMessage ? ` — ${doc.statusMessage}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild variant="secondary">
                    <Link to="/library/$documentId" params={{ documentId: doc.id }}>
                      Open
                    </Link>
                  </Button>
                  {confirmingId === doc.id ? (
                    <>
                      <Button variant="danger" disabled={deletingId === doc.id} onClick={() => void confirmDelete(doc)}>
                        {deletingId === doc.id ? "Removing…" : "Confirm"}
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirmingId(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button variant="secondary" aria-label={`Remove ${doc.name}`} onClick={() => setConfirmingId(doc.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
