export const SUPABASE_URL_ENV = "VITE_SUPABASE_URL";
export const SUPABASE_ANON_KEY_ENV = "VITE_SUPABASE_ANON_KEY";

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
  host: string;
}

export type CloudLibraryStatus =
  | { state: "offline"; summary: string }
  | { state: "ready"; summary: string; host: string }
  | { state: "misconfigured"; summary: string; detail: string };

export type EnvMap = Record<string, string | boolean | undefined>;

const OFFLINE_SUMMARY = "Notes stay on this device. A cloud library is not connected.";
const READY_SUMMARY =
  "A cloud library is configured for this installation. Sync is not available in this release.";
const MISCONFIGURED_SUMMARY = "The cloud library settings for this installation are incomplete.";

export function readSupabasePublicConfig(env: EnvMap = currentEnv()): SupabasePublicConfig | null {
  const url = stringEnv(env[SUPABASE_URL_ENV]);
  const anonKey = stringEnv(env[SUPABASE_ANON_KEY_ENV]);
  if (!url && !anonKey) return null;
  if (!url || !anonKey) {
    throw new Error("Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or leave both empty.");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("VITE_SUPABASE_URL is not a valid URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("VITE_SUPABASE_URL must start with https:// or http://.");
  }
  const localHost =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "[::1]" ||
    parsed.hostname === "::1";
  if (parsed.protocol === "http:" && !localHost) {
    throw new Error("VITE_SUPABASE_URL must use https:// except on localhost.");
  }
  if (anonKey.length < 20) {
    throw new Error("VITE_SUPABASE_ANON_KEY is too short to be a Supabase anon key.");
  }

  return { url: parsed.origin, anonKey, host: parsed.host };
}

export function cloudLibraryStatus(env?: EnvMap): CloudLibraryStatus {
  try {
    const config = readSupabasePublicConfig(env);
    if (!config) return { state: "offline", summary: OFFLINE_SUMMARY };
    return { state: "ready", summary: READY_SUMMARY, host: config.host };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Cloud library configuration is invalid.";
    return { state: "misconfigured", summary: MISCONFIGURED_SUMMARY, detail };
  }
}

function currentEnv(): EnvMap {
  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

function stringEnv(value: string | boolean | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}
