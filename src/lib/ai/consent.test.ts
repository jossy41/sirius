import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { hasExternalAiConsent, revokeExternalAiConsent, storeConsentToken, getStoredConsentToken } from "./consent.ts";
import { validateTutorRequest, LIMITS } from "./request-schema.ts";
import { runClientTutorTurn } from "./client-orchestrate.ts";
import { issueConsentToken, verifyConsentToken, revokeConsentToken } from "./consent-token.server.ts";
import { runServerTutorTurn } from "./server-orchestrate.server.ts";

const mem = new Map<string, string>();
(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => { mem.set(k, v); },
  removeItem: (k) => { mem.delete(k); },
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;

beforeEach(() => {
  mem.clear();
  process.env.SIRIUS_CONSENT_SECRET = "test-secret-at-least-16";
});

describe("consent token authorization", () => {
  it("client claim alone is not enough without token", () => {
    assert.equal(hasExternalAiConsent(), false);
  });

  it("forged client boolean does not authorize live on server", async () => {
    const validated = validateTutorRequest({
      userMessage: "Explain gravity",
      prefer: "live",
      externalConsent: true,
      consentToken: null,
    });
    assert.equal(validated.ok, true);
    if (!validated.ok) return;
    const res = await runServerTutorTurn(validated.value);
    assert.notEqual(res.provider, "live");
  });

  it("valid signed token verifies; tampered fails", () => {
    const issued = issueConsentToken();
    assert.equal(issued.ok, true);
    if (!issued.ok) return;
    assert.equal(verifyConsentToken(issued.token).ok, true);
    assert.equal(verifyConsentToken(issued.token + "x").ok, false);
  });

  it("revoked token is rejected by server", () => {
    const issued = issueConsentToken();
    assert.equal(issued.ok, true);
    if (!issued.ok) return;
    assert.equal(revokeConsentToken(issued.token).ok, true);
    const v = verifyConsentToken(issued.token);
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, "revoked");
  });

  it("revoking clears stored local token", () => {
    storeConsentToken("dummy.token", new Date(Date.now() + 3600000).toISOString());
    assert.ok(getStoredConsentToken());
    revokeExternalAiConsent();
    assert.equal(getStoredConsentToken(), null);
  });
});

describe("validation and offline", () => {
  it("rejects oversized message", () => {
    assert.equal(validateTutorRequest({ userMessage: "x".repeat(LIMITS.maxMessageLen + 1) }).ok, false);
  });
  it("client offline path", async () => {
    const res = await runClientTutorTurn({
      mode: "explain", userMessage: "What is force?", prefer: "offline", chunks: [], documents: [],
    });
    assert.equal(res.provider, "offline_heuristic");
  });
});
