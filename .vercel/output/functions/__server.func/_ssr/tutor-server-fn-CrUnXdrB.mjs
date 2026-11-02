import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { t as validateTutorRequest } from "./request-schema-sxsZm9wF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tutor-server-fn-CrUnXdrB.js
var tutorServerTurn_createServerFn_handler = createServerRpc({
	id: "02240bb0265b42353f1540644e9b2dee32e8fca3c5aa4b9d5a0510f50c184de4",
	name: "tutorServerTurn",
	filename: "src/lib/ai/tutor-server-fn.ts"
}, (opts) => tutorServerTurn.__executeServer(opts));
var tutorServerTurn = createServerFn({ method: "POST" }).inputValidator((data) => {
	const v = validateTutorRequest(data);
	if (!v.ok) throw new Error(`${v.code}: ${v.error}`);
	return v.value;
}).handler(tutorServerTurn_createServerFn_handler, async ({ data }) => {
	const { runServerTutorTurn } = await import("./server-orchestrate.server-B4e84HsZ.mjs");
	const result = await runServerTutorTurn(data);
	return {
		content: result.content,
		provider: result.provider,
		citations: result.citations,
		isGeneralExplanation: result.isGeneralExplanation,
		model: result.provider === "live" ? result.model ?? null : null,
		error: result.error ?? null
	};
});
var issueExternalAiConsent_createServerFn_handler = createServerRpc({
	id: "d5db014dcad2e55d6e2d5055b8398ef93210dc6c8b6205bb9ab3ddc005c960f5",
	name: "issueExternalAiConsent",
	filename: "src/lib/ai/tutor-server-fn.ts"
}, (opts) => issueExternalAiConsent.__executeServer(opts));
var issueExternalAiConsent = createServerFn({ method: "POST" }).handler(issueExternalAiConsent_createServerFn_handler, async () => {
	const { issueConsentToken, consentSecretConfigured } = await import("./consent-token.server-CZT_fY3l.mjs");
	if (!consentSecretConfigured()) return {
		ok: false,
		error: "Consent signing is not configured on the server. Offline help remains available.",
		token: null,
		expiresAt: null
	};
	const issued = issueConsentToken();
	if (!issued.ok) return {
		ok: false,
		error: issued.error,
		token: null,
		expiresAt: null
	};
	return {
		ok: true,
		error: null,
		token: issued.token,
		expiresAt: issued.expiresAt
	};
});
var revokeExternalAiConsentServer_createServerFn_handler = createServerRpc({
	id: "7194f9a6157c03294071e082afb2733242c64aa0de8c80a2d7086fd28b1bbde5",
	name: "revokeExternalAiConsentServer",
	filename: "src/lib/ai/tutor-server-fn.ts"
}, (opts) => revokeExternalAiConsentServer.__executeServer(opts));
var revokeExternalAiConsentServer = createServerFn({ method: "POST" }).inputValidator((data) => {
	return { token: data && typeof data === "object" && typeof data.token === "string" ? data.token : null };
}).handler(revokeExternalAiConsentServer_createServerFn_handler, async ({ data }) => {
	const { revokeConsentToken } = await import("./consent-token.server-CZT_fY3l.mjs");
	if (!data.token) return { ok: true };
	return revokeConsentToken(data.token);
});
//#endregion
export { issueExternalAiConsent_createServerFn_handler, revokeExternalAiConsentServer_createServerFn_handler, tutorServerTurn_createServerFn_handler };
