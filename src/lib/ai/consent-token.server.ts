/**
 * Server-only consent tokens with optional revocation registry.
 * Client cannot forge tokens without SIRIUS_CONSENT_SECRET.
 * body.externalConsent is never treated as authorization.
 *
 * Revocation: tokens carry a jti; revokeConsentToken(jti) denylists it in-process.
 * Limitation: denylist is process memory — not shared across multi-instance deploys
 * without external store. TTL is short (2h) to limit replay after revoke on other instances.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours — short-lived
const VERSION = 2;

/** In-process denylist: jti -> expiresAt ms */
const revokedJti = new Map<string, number>();

function getSecret(): string | null {
  if (typeof process === "undefined") return null;
  const s = process.env.SIRIUS_CONSENT_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

export function consentSecretConfigured(): boolean {
  return getSecret() != null;
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function pruneRevoked(now = Date.now()): void {
  for (const [jti, exp] of revokedJti) {
    if (exp < now) revokedJti.delete(jti);
  }
}

export function issueConsentToken(
  now = Date.now(),
): { ok: true; token: string; expiresAt: string; jti: string } | { ok: false; error: string } {
  const secret = getSecret();
  if (!secret) {
    return {
      ok: false,
      error: "Server consent signing is not configured (SIRIUS_CONSENT_SECRET). Live AI remains unavailable.",
    };
  }
  const jti = randomBytes(16).toString("base64url");
  const payload = { v: VERSION, iat: now, exp: now + TOKEN_TTL_MS, jti };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = sign(payloadB64, secret);
  return {
    ok: true,
    token: `${payloadB64}.${sig}`,
    expiresAt: new Date(payload.exp).toISOString(),
    jti,
  };
}

export function verifyConsentToken(
  token: unknown,
  now = Date.now(),
): { ok: true; jti: string } | { ok: false; reason: string } {
  pruneRevoked(now);
  const secret = getSecret();
  if (!secret) return { ok: false, reason: "consent_secret_missing" };
  if (typeof token !== "string" || !token.includes(".")) {
    return { ok: false, reason: "invalid_token" };
  }
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return { ok: false, reason: "invalid_token" };
  const expected = sign(payloadB64, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "bad_signature" };
    }
  } catch {
    return { ok: false, reason: "bad_signature" };
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      v?: number;
      exp?: number;
      iat?: number;
      jti?: string;
    };
    if (payload.v !== VERSION && payload.v !== 1) return { ok: false, reason: "bad_version" };
    if (typeof payload.exp !== "number" || payload.exp < now) {
      return { ok: false, reason: "expired" };
    }
    const jti = typeof payload.jti === "string" ? payload.jti : "";
    if (jti && revokedJti.has(jti)) return { ok: false, reason: "revoked" };
    return { ok: true, jti };
  } catch {
    return { ok: false, reason: "invalid_payload" };
  }
}

/** Revoke a token by jti (from verified token). Immediate on this process. */
export function revokeConsentTokenByJti(jti: string, expMs?: number): void {
  if (!jti) return;
  revokedJti.set(jti, expMs ?? Date.now() + TOKEN_TTL_MS);
}

export function revokeConsentToken(token: string): { ok: boolean; reason?: string } {
  const v = verifyConsentToken(token);
  // Even if expired, try parse jti to denylist
  if (v.ok) {
    revokeConsentTokenByJti(v.jti);
    return { ok: true };
  }
  // Attempt to extract jti from invalid-but-signed payloads is skipped if verify failed
  if (v.reason === "expired" || v.reason === "revoked") {
    try {
      const payloadB64 = token.split(".")[0];
      if (payloadB64) {
        const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
          jti?: string;
          exp?: number;
        };
        if (payload.jti) revokeConsentTokenByJti(payload.jti, payload.exp);
      }
    } catch {
      /* ignore */
    }
    return { ok: true };
  }
  return { ok: false, reason: v.reason };
}
