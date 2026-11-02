import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readSupabasePublicConfig } from "../config/env.ts";
import { createSupabaseClient, getSupabaseClient } from "./client.ts";

const ANON = "test-anon-key-not-a-secret";

describe("getSupabaseClient", () => {
  it("does not create a client when the installation is offline or misconfigured", async () => {
    assert.equal(await getSupabaseClient({}), null);
    assert.equal(
      await getSupabaseClient({ VITE_SUPABASE_URL: "https://example.supabase.co" }),
      null,
    );
  });
});

describe("createSupabaseClient", () => {
  it("builds a client from public config without sending a request", async () => {
    const config = readSupabasePublicConfig({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: ANON,
    });
    assert.ok(config);
    const client = await createSupabaseClient(config, { persistSession: false });
    assert.equal(typeof client.from, "function");
  });
});
