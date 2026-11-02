/**
 * Client-side consent preference + server-issued token storage.
 * Local preference alone is NOT server authorization.
 */
const PREF_KEY = "sirius.ai.externalConsent.v1";
const TOKEN_KEY = "sirius.ai.consentToken.v1";

export interface ExternalAiConsent {
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
}

export function readExternalAiConsent(): ExternalAiConsent {
  if (typeof localStorage === "undefined") return { granted: false, grantedAt: null, revokedAt: null };
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { granted: false, grantedAt: null, revokedAt: null };
    const parsed = JSON.parse(raw) as Partial<ExternalAiConsent>;
    return {
      granted: parsed.granted === true,
      grantedAt: typeof parsed.grantedAt === "string" ? parsed.grantedAt : null,
      revokedAt: typeof parsed.revokedAt === "string" ? parsed.revokedAt : null,
    };
  } catch {
    return { granted: false, grantedAt: null, revokedAt: null };
  }
}

export function hasExternalAiConsent(): boolean {
  return readExternalAiConsent().granted === true && Boolean(getStoredConsentToken());
}

export function getStoredConsentToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string; expiresAt?: string };
    if (!parsed.token) return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return parsed.token;
  } catch {
    return null;
  }
}

export function storeConsentToken(token: string, expiresAt: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt }));
  localStorage.setItem(
    PREF_KEY,
    JSON.stringify({ granted: true, grantedAt: new Date().toISOString(), revokedAt: null }),
  );
}

export function revokeExternalAiConsent(): ExternalAiConsent {
  const prev = readExternalAiConsent();
  const next: ExternalAiConsent = {
    granted: false,
    grantedAt: prev.grantedAt,
    revokedAt: new Date().toISOString(),
  };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
    localStorage.removeItem(TOKEN_KEY);
  }
  return next;
}

/** Mark preference only (used when server token issue fails). */
export function markConsentPreferenceDenied(): void {
  revokeExternalAiConsent();
}
