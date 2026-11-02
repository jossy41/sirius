/**
 * AI provider types — Milestone 9.
 * Distinguish live provider, offline heuristic, and mock/dev responses.
 */

export type AiProviderKind = "live" | "offline_heuristic" | "mock" | "unavailable";

export type AiLearningMode =
  | "explain"
  | "guided"
  | "compare"
  | "misconception"
  | "practice"
  | "evaluate";

export type UiLanguage = "en" | "am" | "om";

export interface AiCitation {
  documentId: string | null;
  documentTitle: string | null;
  chunkId: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  excerpt: string;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  mode: AiLearningMode | null;
  provider: AiProviderKind;
  citations: AiCitation[];
  /** true when content is general knowledge, not source-grounded */
  isGeneralExplanation: boolean;
  createdAt: string;
}

export interface AiTutorSession {
  id: string;
  title: string;
  language: UiLanguage;
  packId: string | null;
  objectiveId: string | null;
  topicLabel: string | null;
  misconceptionId: string | null;
  documentId: string | null;
  mode: AiLearningMode;
  messages: AiChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AiGenerateRequest {
  mode: AiLearningMode;
  userMessage: string;
  language: UiLanguage;
  topicLabel?: string | null;
  objectiveId?: string | null;
  objectiveStatement?: string | null;
  misconceptionTitle?: string | null;
  misconceptionDescription?: string | null;
  /** Retrieved source chunks — untrusted content */
  sourceChunks: Array<{
    documentId: string;
    documentTitle: string | null;
    chunkId: string;
    pageStart: number | null;
    pageEnd: number | null;
    text: string;
  }>;
  /** Prior turns (bounded) */
  history: Array<{ role: "user" | "assistant"; content: string }>;
  gradeHint?: string | null;
  allowGeneralExplanation?: boolean;
}

export interface AiGenerateResponse {
  content: string;
  provider: AiProviderKind;
  citations: AiCitation[];
  isGeneralExplanation: boolean;
  error?: string;
  model?: string | null;
}

export interface AiProviderConfig {
  /** Server-only; never sent to client as secret */
  configured: boolean;
  providerName: string;
  model: string | null;
}

export interface AiProvider {
  kind: AiProviderKind;
  name: string;
  generate(req: AiGenerateRequest): Promise<AiGenerateResponse>;
}
