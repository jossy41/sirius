import type { AiLearningMode, UiLanguage } from "./types.ts";
const MODES = new Set<AiLearningMode>(["explain","guided","compare","misconception","practice","evaluate"]);
const LANGS = new Set<UiLanguage>(["en","am","om"]);
const PREFERS = new Set(["auto","offline","live","mock"]);
export const LIMITS = { maxMessageLen: 4000, maxHistoryTurns: 8, maxHistoryContentLen: 1500, maxChunks: 12, maxChunkChars: 900, maxTotalContextChars: 8000, maxIdLen: 128 } as const;
export interface ValidatedTutorBody {
  mode: AiLearningMode; userMessage: string; language: UiLanguage;
  prefer: "auto" | "offline" | "live" | "mock";
  /** Client claim only — NOT authorization. Server verifies consentToken. */
  externalConsentClaim: boolean;
  /** HMAC consent token issued by server after explicit grant */
  consentToken: string | null;
  topicLabel: string | null; objectiveId: string | null; objectiveStatement: string | null;
  misconceptionTitle: string | null; misconceptionDescription: string | null; documentId: string | null;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  sourceChunks: Array<{ documentId: string; documentTitle: string | null; chunkId: string; pageStart: number | null; pageEnd: number | null; text: string }>;
}
export type ValidationResult = { ok: true; value: ValidatedTutorBody } | { ok: false; error: string; code: string };
function isNonEmptyString(v: unknown, max: number): v is string { return typeof v === "string" && v.length > 0 && v.length <= max; }
function optionalString(v: unknown, max: number): string | null {
  if (v == null || v === "") return null; if (typeof v !== "string") return null; return v.slice(0, max);
}
function validPage(n: unknown): number | null {
  if (n == null) return null; if (typeof n !== "number" || !Number.isFinite(n) || n < 1 || n > 10000) return null; return Math.floor(n);
}
export function validateTutorRequest(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Request body must be a JSON object.", code: "invalid_body" };
  const body = raw as Record<string, unknown>;
  if (typeof body.userMessage !== "string" || !body.userMessage.trim()) return { ok: false, error: "A message is required.", code: "missing_message" };
  if (body.userMessage.length > LIMITS.maxMessageLen) return { ok: false, error: `Message is too long (max ${LIMITS.maxMessageLen} characters).`, code: "message_too_long" };
  const mode = (body.mode ?? "explain") as string;
  if (!MODES.has(mode as AiLearningMode)) return { ok: false, error: "Invalid learning mode.", code: "invalid_mode" };
  const language = (body.language ?? "en") as string;
  if (!LANGS.has(language as UiLanguage)) return { ok: false, error: "Unsupported language code.", code: "invalid_language" };
  const prefer = (body.prefer ?? "offline") as string;
  if (!PREFERS.has(prefer)) return { ok: false, error: "Invalid provider preference.", code: "invalid_prefer" };
  const externalConsentClaim = body.externalConsent === true || body.externalConsentClaim === true;
  const consentToken = typeof body.consentToken === "string" && body.consentToken.length > 0 && body.consentToken.length < 2048
    ? body.consentToken
    : null;
  const history: ValidatedTutorBody["history"] = [];
  if (body.history != null) {
    if (!Array.isArray(body.history)) return { ok: false, error: "history must be an array.", code: "invalid_history" };
    if (body.history.length > LIMITS.maxHistoryTurns) return { ok: false, error: `Too many history turns (max ${LIMITS.maxHistoryTurns}).`, code: "history_too_long" };
    for (const h of body.history) {
      if (!h || typeof h !== "object") return { ok: false, error: "Invalid history entry.", code: "invalid_history" };
      const role = (h as { role?: string }).role; const content = (h as { content?: string }).content;
      if (role !== "user" && role !== "assistant") return { ok: false, error: "Invalid history role.", code: "invalid_history" };
      if (typeof content !== "string") return { ok: false, error: "Invalid history content.", code: "invalid_history" };
      history.push({ role, content: content.slice(0, LIMITS.maxHistoryContentLen) });
    }
  }
  const sourceChunks: ValidatedTutorBody["sourceChunks"] = []; let totalChars = 0;
  if (body.sourceChunks != null) {
    if (!Array.isArray(body.sourceChunks)) return { ok: false, error: "sourceChunks must be an array.", code: "invalid_chunks" };
    if (body.sourceChunks.length > LIMITS.maxChunks) return { ok: false, error: `Too many document chunks (max ${LIMITS.maxChunks}).`, code: "too_many_chunks" };
    for (const c of body.sourceChunks) {
      if (!c || typeof c !== "object") return { ok: false, error: "Invalid chunk.", code: "invalid_chunks" };
      const rec = c as Record<string, unknown>;
      if (!isNonEmptyString(rec.documentId, LIMITS.maxIdLen)) return { ok: false, error: "Chunk missing documentId.", code: "invalid_chunks" };
      if (!isNonEmptyString(rec.chunkId, LIMITS.maxIdLen)) return { ok: false, error: "Chunk missing chunkId.", code: "invalid_chunks" };
      if (typeof rec.text !== "string" || !rec.text.trim()) return { ok: false, error: "Chunk text required.", code: "invalid_chunks" };
      const pageStart = validPage(rec.pageStart); const pageEnd = validPage(rec.pageEnd);
      if (pageStart != null && pageEnd != null && pageEnd < pageStart) return { ok: false, error: "Invalid page range.", code: "invalid_pages" };
      const text = rec.text.slice(0, LIMITS.maxChunkChars); totalChars += text.length;
      if (totalChars > LIMITS.maxTotalContextChars) return { ok: false, error: "Total source context is too large.", code: "context_too_large" };
      sourceChunks.push({ documentId: rec.documentId, documentTitle: optionalString(rec.documentTitle, 200), chunkId: rec.chunkId, pageStart, pageEnd, text });
    }
  }
  return { ok: true, value: {
    mode: mode as AiLearningMode, userMessage: body.userMessage.trim().slice(0, LIMITS.maxMessageLen),
    language: language as UiLanguage, prefer: prefer as ValidatedTutorBody["prefer"], externalConsentClaim, consentToken,
    topicLabel: optionalString(body.topicLabel, 200), objectiveId: optionalString(body.objectiveId, LIMITS.maxIdLen),
    objectiveStatement: optionalString(body.objectiveStatement, 500), misconceptionTitle: optionalString(body.misconceptionTitle, 200),
    misconceptionDescription: optionalString(body.misconceptionDescription, 500), documentId: optionalString(body.documentId, LIMITS.maxIdLen),
    history, sourceChunks,
  }};
}
