//#region node_modules/.nitro/vite/services/ssr/assets/env-DEnVd4uS.js
var SUPABASE_URL_ENV = "VITE_SUPABASE_URL";
var SUPABASE_ANON_KEY_ENV = "VITE_SUPABASE_ANON_KEY";
var OFFLINE_SUMMARY = "Notes stay on this device. A cloud library is not connected.";
var READY_SUMMARY = "A cloud library is configured for this installation. Sync is not available in this release.";
var MISCONFIGURED_SUMMARY = "The cloud library settings for this installation are incomplete.";
function readSupabasePublicConfig(env = currentEnv()) {
	const url = stringEnv(env[SUPABASE_URL_ENV]);
	const anonKey = stringEnv(env[SUPABASE_ANON_KEY_ENV]);
	if (!url && !anonKey) return null;
	if (!url || !anonKey) throw new Error("Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or leave both empty.");
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error("VITE_SUPABASE_URL is not a valid URL.");
	}
	if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("VITE_SUPABASE_URL must start with https:// or http://.");
	const localHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]" || parsed.hostname === "::1";
	if (parsed.protocol === "http:" && !localHost) throw new Error("VITE_SUPABASE_URL must use https:// except on localhost.");
	if (anonKey.length < 20) throw new Error("VITE_SUPABASE_ANON_KEY is too short to be a Supabase anon key.");
	return {
		url: parsed.origin,
		anonKey,
		host: parsed.host
	};
}
function cloudLibraryStatus(env) {
	try {
		const config = readSupabasePublicConfig(env);
		if (!config) return {
			state: "offline",
			summary: OFFLINE_SUMMARY
		};
		return {
			state: "ready",
			summary: READY_SUMMARY,
			host: config.host
		};
	} catch (error) {
		return {
			state: "misconfigured",
			summary: MISCONFIGURED_SUMMARY,
			detail: error instanceof Error ? error.message : "Cloud library configuration is invalid."
		};
	}
}
function currentEnv() {
	return {
		VITE_SUPABASE_URL: void 0,
		VITE_SUPABASE_ANON_KEY: void 0
	};
}
function stringEnv(value) {
	return typeof value === "string" ? value.trim() : "";
}
//#endregion
export { readSupabasePublicConfig as n, cloudLibraryStatus as t };
