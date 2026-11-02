import { createServerFn } from "@tanstack/react-start";

/**
 * Server-side embedding of texts. Requires credentials + valid consent token.
 * Returns empty vectors list when not configured — callers must fall back.
 */
export const embedTextsServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = data as { texts?: unknown; consentToken?: unknown };
    const texts = Array.isArray(d?.texts)
      ? d.texts.filter((t): t is string => typeof t === "string").map((t) => t.slice(0, 4000)).slice(0, 16)
      : [];
    const consentToken = typeof d?.consentToken === "string" ? d.consentToken : null;
    return { texts, consentToken };
  })
  .handler(async ({ data }) => {
    const { verifyConsentToken } = await import("../ai/consent-token.server.ts");
    const auth = verifyConsentToken(data.consentToken);
    if (!auth.ok) {
      return { ok: false as const, reason: "unauthorized", modelId: null as string | null, vectors: [] as number[][] };
    }
    const { createOpenAICompatibleEmbeddingProvider, embeddingProviderConfigured } = await import(
      "./embedding-provider.server.ts"
    );
    if (!embeddingProviderConfigured()) {
      return { ok: false as const, reason: "not_configured", modelId: null, vectors: [] };
    }
    const provider = createOpenAICompatibleEmbeddingProvider();
    if (!provider) {
      return { ok: false as const, reason: "not_configured", modelId: null, vectors: [] };
    }
    try {
      const vectors = await provider.embed(data.texts);
      return { ok: true as const, reason: null, modelId: provider.modelId, vectors };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof Error ? e.message : "embed_failed",
        modelId: provider.modelId,
        vectors: [],
      };
    }
  });
