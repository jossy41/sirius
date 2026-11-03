import { useCallback, useEffect, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Field, controlClassName } from "@/components/ui/field";
import { listDocuments, listDocumentChunks, listMisconceptions, listTutorSessions, putTutorSession, deleteTutorSession, listChunkEmbeddings } from "@/lib/offline/database";
import { runClientTutorTurn } from "@/lib/ai/client-orchestrate";
import { createServerEmbeddingClient } from "@/lib/retrieval/server-embedding-client";
import { tutorServerTurn } from "@/lib/ai/tutor-server-fn";
import { hasExternalAiConsent, revokeExternalAiConsent, storeConsentToken, getStoredConsentToken } from "@/lib/ai/consent";
import { issueExternalAiConsent, revokeExternalAiConsentServer } from "@/lib/ai/tutor-server-fn";
import type { AiTutorSession, AiChatMessage, AiLearningMode, UiLanguage, AiProviderKind } from "@/lib/ai/types";
import type { DocumentMeta, DocumentChunk } from "@/lib/documents/types";

function rid(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}`;
}
const MODES: { id: AiLearningMode; label: string }[] = [
  { id: "explain", label: "Explain" }, { id: "guided", label: "Guided" }, { id: "compare", label: "Compare" },
  { id: "misconception", label: "Misconception" }, { id: "practice", label: "Practice idea" },
];
const PROVIDER_LABEL: Record<AiProviderKind, string> = {
  live: "Live AI", offline_heuristic: "Offline help", mock: "Mock (dev)", unavailable: "Unavailable",
};

export function TutorPage() {
  const search = useSearch({ strict: false }) as { topic?: string; objectiveId?: string; misconceptionId?: string; mode?: AiLearningMode };
  const [session, setSession] = useState<AiTutorSession | null>(null);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AiLearningMode>(search.mode ?? "explain");
  const [language, setLanguage] = useState<UiLanguage>("en");
  const [prefer, setPrefer] = useState<"offline" | "live" | "mock">("offline");
  const [consent, setConsent] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [topic, setTopic] = useState(search.topic ?? "");
  const [statusHint, setStatusHint] = useState("Offline help (default)");

  useEffect(() => { setConsent(hasExternalAiConsent()); }, []);

  const bootstrap = useCallback(async () => {
    const [d, c, sessions, mcs] = await Promise.all([listDocuments(), listDocumentChunks(), listTutorSessions(), listMisconceptions()]);
    setDocs(d.filter((x) => x.status === "ready")); setChunks(c);
    let s = sessions[0] ?? null;
    if (!s) {
      const mc = search.misconceptionId ? mcs.find((m) => m.id === search.misconceptionId) : undefined;
      s = { id: rid("tut"), title: topic || mc?.title || "Tutor session", language: "en", packId: null,
        objectiveId: search.objectiveId ?? null, topicLabel: topic || mc?.topicLabel || null,
        misconceptionId: search.misconceptionId ?? null, documentId: null, mode, messages: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await putTutorSession(s);
    }
    setSession(s);
  }, [mode, search.misconceptionId, search.objectiveId, topic]);
  useEffect(() => { void bootstrap(); }, [bootstrap]);

  function onPreferChange(next: "offline" | "live" | "mock") {
    if (next === "live" && !hasExternalAiConsent()) { setShowConsent(true); setPrefer("offline"); return; }
    setPrefer(next);
  }
  async function acceptConsent() {
    try {
      const issued = await issueExternalAiConsent();
      if (!issued.ok || !issued.token || !issued.expiresAt) {
        setError(issued.error ?? "Could not enable external AI on the server.");
        setPrefer("offline");
        setShowConsent(false);
        return;
      }
      storeConsentToken(issued.token, issued.expiresAt);
      setConsent(true);
      setShowConsent(false);
      setPrefer("live");
      setStatusHint("External AI allowed (server-verified token; revoke anytime)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable external AI.");
      setPrefer("offline");
      setShowConsent(false);
    }
  }
  async function doRevoke() {
    const token = getStoredConsentToken();
    try {
      if (token) await revokeExternalAiConsentServer({ data: { token } });
    } catch { /* offline revoke still clears local */ }
    revokeExternalAiConsent();
    setConsent(false);
    setPrefer("offline");
    setStatusHint("Offline help (consent revoked)");
  }

  async function send() {
    if (!session || !input.trim()) return;
    setBusy(true); setError(null);
    const userMsg: AiChatMessage = { id: rid("msg"), role: "user", content: input.trim(), mode, provider: "offline_heuristic", citations: [], isGeneralExplanation: false, createdAt: new Date().toISOString() };
    const scopedChunks = chunks.filter((c) => (documentId ? c.documentId === documentId : true)).slice(0, 12);
    const history = session.messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    try {
      let result;
      if (prefer === "live" && hasExternalAiConsent()) {
        try {
          result = await tutorServerTurn({
            data: {
              mode, userMessage: input.trim(), language, topicLabel: topic || session.topicLabel,
              objectiveId: session.objectiveId, documentId: documentId || session.documentId,
              prefer: "live", externalConsentClaim: true, consentToken: getStoredConsentToken(), history: history.slice(-8),
              sourceChunks: scopedChunks.map((c) => ({
                documentId: c.documentId, documentTitle: docs.find((d) => d.id === c.documentId)?.name ?? null,
                chunkId: c.id, pageStart: c.pageStart, pageEnd: c.pageEnd, text: c.text.slice(0, 900),
              })),
            },
          });
        } catch (e) {
          result = await runClientTutorTurn({ mode, userMessage: input.trim(), language, topicLabel: topic || session.topicLabel, objectiveId: session.objectiveId, documentId: documentId || session.documentId, prefer: "offline", chunks: scopedChunks, documents: docs, history });
          const msg = e instanceof Error ? e.message : "unavailable";
          result = { ...result, content: `Could not reach live AI (${msg}). Offline help:\n\n${result.content}`, provider: "offline_heuristic" };
        }
      } else {
        const emb = await listChunkEmbeddings(documentId || undefined).catch(() => []);
        let embProvider = null;
        try {
          const tok = getStoredConsentToken();
          if (tok && hasExternalAiConsent() && emb.length > 0) {
            embProvider = createServerEmbeddingClient(tok);
          }
        } catch { /* offline lexical only */ }
        result = await runClientTutorTurn({ mode, userMessage: input.trim(), language, topicLabel: topic || session.topicLabel, objectiveId: session.objectiveId, documentId: documentId || session.documentId, prefer: prefer === "mock" ? "mock" : "offline", chunks: scopedChunks, documents: docs, history, embeddings: emb, embeddingProvider: embProvider });
      }
      const assistant: AiChatMessage = { id: rid("msg"), role: "assistant", content: result.content, mode, provider: result.provider as AiProviderKind, citations: result.citations ?? [], isGeneralExplanation: Boolean(result.isGeneralExplanation), createdAt: new Date().toISOString() };
      setStatusHint(PROVIDER_LABEL[result.provider as AiProviderKind] ?? String(result.provider));
      const next: AiTutorSession = { ...session, mode, language, topicLabel: topic || session.topicLabel, documentId: documentId || session.documentId, messages: [...session.messages, userMsg, assistant], updatedAt: new Date().toISOString() };
      await putTutorSession(next); setSession(next); setInput("");
    } catch (e) { setError(e instanceof Error ? e.message : "Tutor request failed"); }
    finally { setBusy(false); }
  }

  async function newSession() {
    const s: AiTutorSession = { id: rid("tut"), title: topic || "New tutor session", language, packId: null, objectiveId: null, topicLabel: topic || null, misconceptionId: null, documentId: documentId || null, mode, messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await putTutorSession(s); setSession(s);
  }
  async function clearSession() { if (!session) return; await deleteTutorSession(session.id); setSession(null); await newSession(); }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-28">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl text-ink">Tutor</h1>
        <p className="text-sm text-muted">Offline help is the default. External AI is only used if you allow it and the server is configured.</p>
        <p className="text-xs text-muted">Status: {statusHint}</p>
      </header>
      {showConsent && (
        <Panel className="space-y-3 border-amber-500/40 bg-amber-500/5">
          <h2 className="font-serif text-lg text-ink">Allow external AI?</h2>
          <p className="text-sm text-muted">If you continue, this request may send your message, recent chat turns, and short excerpts from your study materials to an external AI service. Personal profile details are not sent on purpose. You can turn this off anytime.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={() => void acceptConsent()}>I understand — allow external AI</Button>
            <Button type="button" variant="secondary" onClick={() => { setShowConsent(false); setPrefer("offline"); }}>Stay offline</Button>
          </div>
        </Panel>
      )}
      <Panel className="grid gap-3 sm:grid-cols-2">
        <Field label="Mode" htmlFor="tutor-mode"><select id="tutor-mode" className={controlClassName} value={mode} onChange={(e) => setMode(e.target.value as AiLearningMode)}>{MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></Field>
        <Field label="Help source" htmlFor="tutor-pref"><select id="tutor-pref" className={controlClassName} value={prefer} onChange={(e) => onPreferChange(e.target.value as "offline"|"live"|"mock")}><option value="offline">Offline help (default)</option><option value="live">External AI (requires permission)</option><option value="mock">Mock (development only)</option></select></Field>
        <Field label="Topic" htmlFor="tutor-topic"><input id="tutor-topic" className={controlClassName} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. mass and weight" /></Field>
        <Field label="Language" htmlFor="tutor-lang"><select id="tutor-lang" className={controlClassName} value={language} onChange={(e) => setLanguage(e.target.value as UiLanguage)}><option value="en">English</option><option value="am">Amharic (best-effort via live AI)</option><option value="om">Afaan Oromo (best-effort via live AI)</option></select></Field>
        <Field label="Document scope" htmlFor="tutor-doc"><select id="tutor-doc" className={controlClassName} value={documentId} onChange={(e) => setDocumentId(e.target.value)}><option value="">All ready documents</option>{docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
      </Panel>
      {consent && <p className="text-xs text-muted">External AI permission is on. <button type="button" className="underline" onClick={() => void doRevoke()}>Revoke permission</button></p>}
      <Panel className="min-h-[240px] space-y-3">
        {(session?.messages ?? []).length === 0 && <p className="text-sm text-muted">Ask a question about a topic in your materials. Conversations stay on this device.</p>}
        {(session?.messages ?? []).map((m) => (
          <div key={m.id} className={`rounded-lg p-3 text-sm ${m.role === "user" ? "bg-primary/10 text-ink" : "border border-line bg-surface/60"}`}>
         <div className="whitespace-pre-wrap break-words leading-7">
  {m.role === "assistant"
    ? m.content.split("\n").map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        const parts = trimmed.split(/(\*\*.*?\*\*|`.*?`)/g);

        return (
          <p key={i} className="mb-1">
            {trimmed.startsWith("#") ? (
              <strong className="text-base font-bold text-ink">
                {trimmed.replace(/^#+\s*/, "")}
              </strong>
            ) : trimmed.startsWith("- ") || trimmed.startsWith("* ") ? (
              <>• {parts.map((part, j) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={j}>{part.slice(2, -2)}</strong>
                ) : part.startsWith("`") && part.endsWith("`") ? (
                  <code key={j} className="rounded bg-primary/10 px-1">{part.slice(1, -1)}</code>
                ) : part
              )}</>
            ) : (
              parts.map((part, j) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={j}>{part.slice(2, -2)}</strong>
                ) : part.startsWith("`") && part.endsWith("`") ? (
                  <code key={j} className="rounded bg-primary/10 px-1">{part.slice(1, -1)}</code>
                ) : part
              )
            )}
          </p>
        );
      })
    : m.content}
</div>


            {m.role === "assistant" && <p className="mt-2 text-xs text-muted">{PROVIDER_LABEL[m.provider]}{m.isGeneralExplanation ? " · general explanation" : " · source-aware"}</p>}
            {m.citations?.length > 0 && <ul className="mt-2 space-y-1 text-xs text-muted">{m.citations.map((c, i) => <li key={i}>{c.documentTitle || c.documentId}{c.pageStart != null ? ` · pp. ${c.pageStart}${c.pageEnd != null && c.pageEnd !== c.pageStart ? `–${c.pageEnd}` : ""}` : ""}</li>)}</ul>}
          </div>
        ))}
      </Panel>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <div className="space-y-2">
        <Field label="Your message" htmlFor="tutor-input"><textarea id="tutor-input" className={controlClassName} rows={3} value={input} onChange={(e) => setInput(e.target.value)} placeholder="What should we work on?" /></Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="primary" disabled={busy || !input.trim()} onClick={() => void send()}>{busy ? "Thinking…" : "Send"}</Button>
          <Button type="button" variant="secondary" onClick={() => void newSession()}>New session</Button>
          <Button type="button" variant="ghost" onClick={() => void clearSession()}>Delete session</Button>
          <Link to="/progress" className="inline-flex h-9 items-center text-sm underline">Progress</Link>
        </div>
      </div>
    </div>
  );
}
