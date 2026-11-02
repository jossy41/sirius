import { createServerFn } from "@tanstack/react-start";
import { validateTutorRequest } from "./request-schema.ts";

export const tutorServerTurn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const v = validateTutorRequest(data);
    if (!v.ok) throw new Error(`${v.code}: ${v.error}`);
    return v.value;
  })
  .handler(async ({ data }) => {
    const { runServerTutorTurn } = await import("./server-orchestrate.server.ts");
    const result = await runServerTutorTurn(data);
    return {
      content: result.content,
      provider: result.provider,
      citations: result.citations,
      isGeneralExplanation: result.isGeneralExplanation,
      model: result.provider === "live" ? result.model ?? null : null,
      error: result.error ?? null,
    };
  });

export const issueExternalAiConsent = createServerFn({ method: "POST" }).handler(async () => {
  const { issueConsentToken, consentSecretConfigured } = await import("./consent-token.server.ts");
  if (!consentSecretConfigured()) {
    return {
      ok: false as const,
      error: "Consent signing is not configured on the server. Offline help remains available.",
      token: null,
      expiresAt: null,
    };
  }
  const issued = issueConsentToken();
  if (!issued.ok) {
    return { ok: false as const, error: issued.error, token: null, expiresAt: null };
  }
  return { ok: true as const, error: null, token: issued.token, expiresAt: issued.expiresAt };
});

/** Server-side revoke: denylists token jti on this process + client should drop local token. */
export const revokeExternalAiConsentServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const token =
      data && typeof data === "object" && typeof (data as { token?: string }).token === "string"
        ? (data as { token: string }).token
        : null;
    return { token };
  })
  .handler(async ({ data }) => {
    const { revokeConsentToken } = await import("./consent-token.server.ts");
    if (!data.token) return { ok: true as const };
    return revokeConsentToken(data.token);
  });
