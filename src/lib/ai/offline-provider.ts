/**
 * Deterministic offline tutor — not an LLM.
 * Uses retrieved chunks and simple templates; never invents citations.
 */

import type { AiGenerateRequest, AiGenerateResponse, AiProvider } from "./types.ts";

function citationsFrom(req: AiGenerateRequest) {
  return req.sourceChunks.slice(0, 4).map((c) => ({
    documentId: c.documentId,
    documentTitle: c.documentTitle,
    chunkId: c.chunkId,
    pageStart: c.pageStart,
    pageEnd: c.pageEnd,
    excerpt: c.text.slice(0, 220),
  }));
}

function groundedBody(req: AiGenerateRequest): string {
  const parts = req.sourceChunks.slice(0, 3).map((c, i) => {
    const pages =
      c.pageStart != null
        ? ` (pp. ${c.pageStart}${c.pageEnd != null && c.pageEnd !== c.pageStart ? `–${c.pageEnd}` : ""})`
        : "";
    return `(${i + 1}) ${c.text.slice(0, 400)}${c.text.length > 400 ? "…" : ""}${pages}`;
  });
  return parts.join("\n\n");
}

export const offlineHeuristicProvider: AiProvider = {
  kind: "offline_heuristic",
  name: "Offline heuristic",
  async generate(req: AiGenerateRequest): Promise<AiGenerateResponse> {
    const citations = citationsFrom(req);
    const hasSources = req.sourceChunks.length > 0;
    const langNote =
      req.language !== "en"
        ? "\n\n(Note: offline mode responds in English. Live AI can be configured for other languages when a provider is available.)"
        : "";

    if (req.mode === "misconception" && req.misconceptionTitle) {
      const body = hasSources
        ? `About “${req.misconceptionTitle}”:\n\nA common difficulty is treating related ideas as the same. From your materials:\n\n${groundedBody(req)}\n\nFocus on the distinction described above. This offline response is a heuristic summary, not a live AI model.`
        : `About “${req.misconceptionTitle}”: ${req.misconceptionDescription || "Review the related definitions carefully."}\n\nNo matching textbook excerpt was found offline. Import a relevant document or use live AI when configured.`;
      return {
        content: body + langNote,
        provider: "offline_heuristic",
        citations,
        isGeneralExplanation: !hasSources,
      };
    }

    if (req.mode === "compare") {
      const body = hasSources
        ? `Comparison using your sources:\n\n${groundedBody(req)}\n\nList similarities and differences from the passages above. Offline mode does not invent extra textbook claims.`
        : "No source passages were available to compare. Import documents that cover both ideas, or enable a live AI provider.";
      return {
        content: body + langNote,
        provider: "offline_heuristic",
        citations,
        isGeneralExplanation: !hasSources,
      };
    }

    if (req.mode === "guided") {
      const body = hasSources
        ? `Guided prompt (offline):\n\nBased on this material:\n${groundedBody(req)}\n\n1) What is the main idea in your own words?\n2) Which term is still unclear?\n3) Can you give one example?\n\nReply with your thoughts; offline mode will not solve everything for you at once.`
        : "Guided mode needs source material or a live provider. Try importing a document on this topic first.";
      return {
        content: body + langNote,
        provider: "offline_heuristic",
        citations,
        isGeneralExplanation: !hasSources,
      };
    }

    if (req.mode === "practice") {
      const body = hasSources
        ? `Practice prompt (offline, not an official exam question):\n\nUsing this passage:\n${groundedBody(req)}\n\nWrite 2–3 sentences explaining the key idea, then state one example from everyday life if possible.`
        : "No sources available to ground a practice prompt offline.";
      return {
        content: body + langNote,
        provider: "offline_heuristic",
        citations,
        isGeneralExplanation: !hasSources,
      };
    }

    // explain / default
    if (hasSources) {
      return {
        content: `Explanation from your offline materials${req.topicLabel ? ` (${req.topicLabel})` : ""}:\n\n${groundedBody(req)}\n\nThis is a deterministic offline summary of retrieved passages, not a live AI model.${langNote}`,
        provider: "offline_heuristic",
        citations,
        isGeneralExplanation: false,
      };
    }

    if (req.allowGeneralExplanation) {
      return {
        content: `No matching textbook excerpts were found for “${req.userMessage.slice(0, 80)}”. Offline mode cannot invent page citations. Import a relevant document, or configure a live AI provider for a general explanation.${langNote}`,
        provider: "offline_heuristic",
        citations: [],
        isGeneralExplanation: true,
      };
    }

    return {
      content: "No relevant sources were found. Import a document with selectable text, or enable a live AI provider.",
      provider: "offline_heuristic",
      citations: [],
      isGeneralExplanation: true,
    };
  },
};
