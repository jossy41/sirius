/**
 * Development-only mock provider — clearly labeled, not a real LLM.
 */

import type { AiGenerateRequest, AiGenerateResponse, AiProvider } from "./types.ts";

export const mockProvider: AiProvider = {
  kind: "mock",
  name: "Mock development provider",
  async generate(req: AiGenerateRequest): Promise<AiGenerateResponse> {
    const citations = req.sourceChunks.slice(0, 2).map((c) => ({
      documentId: c.documentId,
      documentTitle: c.documentTitle,
      chunkId: c.chunkId,
      pageStart: c.pageStart,
      pageEnd: c.pageEnd,
      excerpt: c.text.slice(0, 160),
    }));
    return {
      content: `[MOCK AI — not a real model]\nMode: ${req.mode}\nYou asked: ${req.userMessage.slice(0, 200)}\n\nThis response is a development stub. Configure SIRIUS_AI_API_KEY and related server env vars for a live provider.\n\nSources attached: ${req.sourceChunks.length}.`,
      provider: "mock",
      citations,
      isGeneralExplanation: req.sourceChunks.length === 0,
      model: "mock-dev",
    };
  },
};
