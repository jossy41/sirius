import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/embed-server-fn-AMBom2y2.js
/**
* Server-side embedding of texts. Requires credentials + valid consent token.
* Returns empty vectors list when not configured — callers must fall back.
*/
var embedTextsServer_createServerFn_handler = createServerRpc({
	id: "db4489d50163876d344583183d88a5058bdebbeebe35ca1f46d04ef0af088294",
	name: "embedTextsServer",
	filename: "src/lib/retrieval/embed-server-fn.ts"
}, (opts) => embedTextsServer.__executeServer(opts));
var embedTextsServer = createServerFn({ method: "POST" }).inputValidator((data) => {
	const d = data;
	return {
		texts: Array.isArray(d?.texts) ? d.texts.filter((t) => typeof t === "string").map((t) => t.slice(0, 4e3)).slice(0, 16) : [],
		consentToken: typeof d?.consentToken === "string" ? d.consentToken : null
	};
}).handler(embedTextsServer_createServerFn_handler, async ({ data }) => {
	const { verifyConsentToken } = await import("./consent-token.server-CZT_fY3l.mjs");
	if (!verifyConsentToken(data.consentToken).ok) return {
		ok: false,
		reason: "unauthorized",
		modelId: null,
		vectors: []
	};
	const { createOpenAICompatibleEmbeddingProvider, embeddingProviderConfigured } = await import("./embedding-provider.server-g5LsO5or.mjs");
	if (!embeddingProviderConfigured()) return {
		ok: false,
		reason: "not_configured",
		modelId: null,
		vectors: []
	};
	const provider = createOpenAICompatibleEmbeddingProvider();
	if (!provider) return {
		ok: false,
		reason: "not_configured",
		modelId: null,
		vectors: []
	};
	try {
		const vectors = await provider.embed(data.texts);
		return {
			ok: true,
			reason: null,
			modelId: provider.modelId,
			vectors
		};
	} catch (e) {
		return {
			ok: false,
			reason: e instanceof Error ? e.message : "embed_failed",
			modelId: provider.modelId,
			vectors: []
		};
	}
});
//#endregion
export { embedTextsServer_createServerFn_handler };
