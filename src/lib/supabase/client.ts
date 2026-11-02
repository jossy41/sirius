import type { SupabaseClient } from "@supabase/supabase-js";
import { readSupabasePublicConfig, type EnvMap, type SupabasePublicConfig } from "../config/env.ts";

let cached: SupabaseClient | null = null;
let cachedUrl = "";

export async function createSupabaseClient(
  config: SupabasePublicConfig,
  options?: { persistSession?: boolean },
): Promise<SupabaseClient> {
  const persistSession = options?.persistSession ?? true;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession,
      autoRefreshToken: persistSession,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Returns the shared browser client when both public Supabase variables are
 * set. Returns null when this installation is offline-only or misconfigured.
 * Does not query tables and does not imply that sync is available.
 */
export async function getSupabaseClient(env?: EnvMap): Promise<SupabaseClient | null> {
  let config: SupabasePublicConfig | null;
  try {
    config = readSupabasePublicConfig(env);
  } catch {
    return null;
  }
  if (!config) return null;
  if (env) return createSupabaseClient(config, { persistSession: false });
  if (!cached || cachedUrl !== config.url) {
    cached = await createSupabaseClient(config);
    cachedUrl = config.url;
  }
  return cached;
}
