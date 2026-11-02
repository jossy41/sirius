import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cloudLibraryStatus, readSupabasePublicConfig } from "./env.ts";

const ANON = "test-anon-key-not-a-secret";

describe("readSupabasePublicConfig", () => {
  it("stays unconfigured when both public values are empty", () => {
    assert.equal(readSupabasePublicConfig({}), null);
    assert.equal(
      readSupabasePublicConfig({ VITE_SUPABASE_URL: "  ", VITE_SUPABASE_ANON_KEY: "" }),
      null,
    );
  });

  it("rejects a partial configuration", () => {
    assert.throws(
      () => readSupabasePublicConfig({ VITE_SUPABASE_URL: "https://example.supabase.co" }),
      /both/i,
    );
  });

  it("rejects an invalid URL and a short anon key", () => {
    assert.throws(
      () => readSupabasePublicConfig({ VITE_SUPABASE_URL: "not a url", VITE_SUPABASE_ANON_KEY: ANON }),
      /valid URL/,
    );
    assert.throws(
      () =>
        readSupabasePublicConfig({
          VITE_SUPABASE_URL: "https://example.supabase.co",
          VITE_SUPABASE_ANON_KEY: "too-short",
        }),
      /too short/,
    );
  });

  it("rejects cleartext URLs that are not local", () => {
    assert.throws(
      () =>
        readSupabasePublicConfig({
          VITE_SUPABASE_URL: "http://example.supabase.co",
          VITE_SUPABASE_ANON_KEY: ANON,
        }),
      /https:\/\//,
    );
  });

  it("accepts the public project URL and ignores secrets that are not public config", () => {
    const config = readSupabasePublicConfig({
      VITE_SUPABASE_URL: "https://example.supabase.co/rest/v1",
      VITE_SUPABASE_ANON_KEY: ANON,
      SUPABASE_SERVICE_ROLE_KEY: "super-secret-value",
    });
    assert.deepEqual(config, {
      url: "https://example.supabase.co",
      anonKey: ANON,
      host: "example.supabase.co",
    });
    assert.equal(JSON.stringify(config).includes("super-secret"), false);
  });
});

describe("cloudLibraryStatus", () => {
  it("describes offline, ready, and misconfigured installations without echoing secrets", () => {
    assert.equal(cloudLibraryStatus({}).state, "offline");
    const ready = cloudLibraryStatus({
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_ANON_KEY: ANON,
    });
    assert.equal(ready.state, "ready");
    if (ready.state === "ready") assert.equal(ready.host, "127.0.0.1:54321");
    const broken = cloudLibraryStatus({ VITE_SUPABASE_ANON_KEY: "super-secret-value" });
    assert.equal(broken.state, "misconfigured");
    if (broken.state === "misconfigured") {
      assert.equal(broken.detail.includes("super-secret-value"), false);
    }
  });
});
