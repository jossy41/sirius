import { i as __toESM } from "../_runtime.mjs";
import { P as listTutorSessions, _ as listChunkEmbeddings, a as deleteTutorSession, b as listDocuments, et as putTutorSession, k as listMisconceptions, y as listDocumentChunks } from "./cn-Ccejyh36.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { S as useSearch, T as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as createServerFn } from "./ssr.mjs";
import { a as createSsrRpc, c as revokeExternalAiConsent, f as Button, i as createServerEmbeddingClient, l as storeConsentToken, o as getStoredConsentToken, p as embeddingHitsForQuery, s as hasExternalAiConsent } from "./router-03i3X1Nd.mjs";
import { r as Panel } from "./panel-B6qeBfmK.mjs";
import { i as controlClassName, t as Field } from "./field-CPok0Yeo.mjs";
import { a as retrieveRelevantChunks, i as offlineHeuristicProvider, n as hybridRetrieve, r as mockProvider, t as boundHistory } from "./context-Do1gh7_p.mjs";
import { t as validateTutorRequest } from "./request-schema-sxsZm9wF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tutor-DaYmEV96.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
async function runHybridRetrieval(input) {
	let embeddingHits = void 0;
	if (input.embeddingProvider && input.embeddings && input.embeddings.length > 0) try {
		embeddingHits = await embeddingHitsForQuery({
			query: input.query,
			chunks: input.chunks,
			embeddings: input.embeddings,
			provider: input.embeddingProvider,
			documents: input.documents.map((d) => ({
				id: d.id,
				name: d.name
			})),
			limit: input.limit
		});
	} catch {
		embeddingHits = void 0;
	}
	return hybridRetrieve({
		query: input.query,
		chunks: input.chunks,
		documents: input.documents,
		graph: input.graph ?? null,
		language: input.language,
		limit: input.limit,
		embeddingHits
	});
}
async function runClientTutorTurn(input) {
	const query = [
		input.userMessage,
		input.topicLabel,
		input.objectiveStatement,
		input.misconceptionTitle
	].filter(Boolean).join(" ");
	let sourceChunks = retrieveRelevantChunks({
		query,
		chunks: input.chunks,
		documents: input.documents,
		documentId: input.documentId
	});
	if (input.embeddingProvider && input.embeddings && input.embeddings.length > 0) try {
		let pool = input.chunks;
		if (input.documentId) pool = pool.filter((c) => c.documentId === input.documentId);
		const result = await runHybridRetrieval({
			query,
			chunks: pool,
			documents: input.documents,
			embeddings: input.embeddings,
			embeddingProvider: input.embeddingProvider,
			limit: 6
		});
		if (result.hits.length > 0) sourceChunks = result.hits.map((h) => ({
			documentId: h.documentId,
			documentTitle: h.documentTitle,
			chunkId: h.chunkId,
			pageStart: h.pageStart,
			pageEnd: h.pageEnd,
			text: h.text.slice(0, 900)
		}));
	} catch {}
	const req = {
		mode: input.mode,
		userMessage: input.userMessage.slice(0, 4e3),
		language: input.language ?? "en",
		topicLabel: input.topicLabel,
		objectiveId: input.objectiveId,
		objectiveStatement: input.objectiveStatement,
		misconceptionTitle: input.misconceptionTitle,
		misconceptionDescription: input.misconceptionDescription,
		sourceChunks,
		history: boundHistory(input.history ?? []),
		allowGeneralExplanation: input.allowGeneralExplanation ?? true
	};
	if (input.prefer === "mock") return mockProvider.generate(req);
	return offlineHeuristicProvider.generate(req);
}
var tutorServerTurn = createServerFn({ method: "POST" }).inputValidator((data) => {
	const v = validateTutorRequest(data);
	if (!v.ok) throw new Error(`${v.code}: ${v.error}`);
	return v.value;
}).handler(createSsrRpc("02240bb0265b42353f1540644e9b2dee32e8fca3c5aa4b9d5a0510f50c184de4"));
var issueExternalAiConsent = createServerFn({ method: "POST" }).handler(createSsrRpc("d5db014dcad2e55d6e2d5055b8398ef93210dc6c8b6205bb9ab3ddc005c960f5"));
/** Server-side revoke: denylists token jti on this process + client should drop local token. */
var revokeExternalAiConsentServer = createServerFn({ method: "POST" }).inputValidator((data) => {
	return { token: data && typeof data === "object" && typeof data.token === "string" ? data.token : null };
}).handler(createSsrRpc("7194f9a6157c03294071e082afb2733242c64aa0de8c80a2d7086fd28b1bbde5"));
function rid(prefix) {
	if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
	return `${prefix}_${Date.now().toString(36)}`;
}
var MODES = [
	{
		id: "explain",
		label: "Explain"
	},
	{
		id: "guided",
		label: "Guided"
	},
	{
		id: "compare",
		label: "Compare"
	},
	{
		id: "misconception",
		label: "Misconception"
	},
	{
		id: "practice",
		label: "Practice idea"
	}
];
var PROVIDER_LABEL = {
	live: "Live AI",
	offline_heuristic: "Offline help",
	mock: "Mock (dev)",
	unavailable: "Unavailable"
};
function TutorPage() {
	const search = useSearch({ strict: false });
	const [session, setSession] = (0, import_react.useState)(null);
	const [input, setInput] = (0, import_react.useState)("");
	const [mode, setMode] = (0, import_react.useState)(search.mode ?? "explain");
	const [language, setLanguage] = (0, import_react.useState)("en");
	const [prefer, setPrefer] = (0, import_react.useState)("offline");
	const [consent, setConsent] = (0, import_react.useState)(false);
	const [showConsent, setShowConsent] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [docs, setDocs] = (0, import_react.useState)([]);
	const [chunks, setChunks] = (0, import_react.useState)([]);
	const [documentId, setDocumentId] = (0, import_react.useState)("");
	const [topic, setTopic] = (0, import_react.useState)(search.topic ?? "");
	const [statusHint, setStatusHint] = (0, import_react.useState)("Offline help (default)");
	(0, import_react.useEffect)(() => {
		setConsent(hasExternalAiConsent());
	}, []);
	const bootstrap = (0, import_react.useCallback)(async () => {
		const [d, c, sessions, mcs] = await Promise.all([
			listDocuments(),
			listDocumentChunks(),
			listTutorSessions(),
			listMisconceptions()
		]);
		setDocs(d.filter((x) => x.status === "ready"));
		setChunks(c);
		let s = sessions[0] ?? null;
		if (!s) {
			const mc = search.misconceptionId ? mcs.find((m) => m.id === search.misconceptionId) : void 0;
			s = {
				id: rid("tut"),
				title: topic || mc?.title || "Tutor session",
				language: "en",
				packId: null,
				objectiveId: search.objectiveId ?? null,
				topicLabel: topic || mc?.topicLabel || null,
				misconceptionId: search.misconceptionId ?? null,
				documentId: null,
				mode,
				messages: [],
				createdAt: (/* @__PURE__ */ new Date()).toISOString(),
				updatedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			await putTutorSession(s);
		}
		setSession(s);
	}, [
		mode,
		search.misconceptionId,
		search.objectiveId,
		topic
	]);
	(0, import_react.useEffect)(() => {
		bootstrap();
	}, [bootstrap]);
	function onPreferChange(next) {
		if (next === "live" && !hasExternalAiConsent()) {
			setShowConsent(true);
			setPrefer("offline");
			return;
		}
		setPrefer(next);
	}
	async function acceptConsent() {
		try {
			const issued = await issueExternalAiConsent();
			if (!issued.ok || !issued.token || !issued.expiresAt) {
				setError(issued.error ?? "Could not enable external AI on the server.");
				setPrefer("offline");
				setShowConsent(false);
				return;
			}
			storeConsentToken(issued.token, issued.expiresAt);
			setConsent(true);
			setShowConsent(false);
			setPrefer("live");
			setStatusHint("External AI allowed (server-verified token; revoke anytime)");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not enable external AI.");
			setPrefer("offline");
			setShowConsent(false);
		}
	}
	async function doRevoke() {
		const token = getStoredConsentToken();
		try {
			if (token) await revokeExternalAiConsentServer({ data: { token } });
		} catch {}
		revokeExternalAiConsent();
		setConsent(false);
		setPrefer("offline");
		setStatusHint("Offline help (consent revoked)");
	}
	async function send() {
		if (!session || !input.trim()) return;
		setBusy(true);
		setError(null);
		const userMsg = {
			id: rid("msg"),
			role: "user",
			content: input.trim(),
			mode,
			provider: "offline_heuristic",
			citations: [],
			isGeneralExplanation: false,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		const scopedChunks = chunks.filter((c) => documentId ? c.documentId === documentId : true).slice(0, 12);
		const history = session.messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({
			role: m.role,
			content: m.content
		}));
		try {
			let result;
			if (prefer === "live" && hasExternalAiConsent()) try {
				result = await tutorServerTurn({ data: {
					mode,
					userMessage: input.trim(),
					language,
					topicLabel: topic || session.topicLabel,
					objectiveId: session.objectiveId,
					documentId: documentId || session.documentId,
					prefer: "live",
					externalConsentClaim: true,
					consentToken: getStoredConsentToken(),
					history: history.slice(-8),
					sourceChunks: scopedChunks.map((c) => ({
						documentId: c.documentId,
						documentTitle: docs.find((d) => d.id === c.documentId)?.name ?? null,
						chunkId: c.id,
						pageStart: c.pageStart,
						pageEnd: c.pageEnd,
						text: c.text.slice(0, 900)
					}))
				} });
			} catch (e) {
				result = await runClientTutorTurn({
					mode,
					userMessage: input.trim(),
					language,
					topicLabel: topic || session.topicLabel,
					objectiveId: session.objectiveId,
					documentId: documentId || session.documentId,
					prefer: "offline",
					chunks: scopedChunks,
					documents: docs,
					history
				});
				const msg = e instanceof Error ? e.message : "unavailable";
				result = {
					...result,
					content: `Could not reach live AI (${msg}). Offline help:\n\n${result.content}`,
					provider: "offline_heuristic"
				};
			}
			else {
				const emb = await listChunkEmbeddings(documentId || void 0).catch(() => []);
				let embProvider = null;
				try {
					const tok = getStoredConsentToken();
					if (tok && hasExternalAiConsent() && emb.length > 0) embProvider = createServerEmbeddingClient(tok);
				} catch {}
				result = await runClientTutorTurn({
					mode,
					userMessage: input.trim(),
					language,
					topicLabel: topic || session.topicLabel,
					objectiveId: session.objectiveId,
					documentId: documentId || session.documentId,
					prefer: prefer === "mock" ? "mock" : "offline",
					chunks: scopedChunks,
					documents: docs,
					history,
					embeddings: emb,
					embeddingProvider: embProvider
				});
			}
			const assistant = {
				id: rid("msg"),
				role: "assistant",
				content: result.content,
				mode,
				provider: result.provider,
				citations: result.citations ?? [],
				isGeneralExplanation: Boolean(result.isGeneralExplanation),
				createdAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			setStatusHint(PROVIDER_LABEL[result.provider] ?? String(result.provider));
			const next = {
				...session,
				mode,
				language,
				topicLabel: topic || session.topicLabel,
				documentId: documentId || session.documentId,
				messages: [
					...session.messages,
					userMsg,
					assistant
				],
				updatedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			await putTutorSession(next);
			setSession(next);
			setInput("");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Tutor request failed");
		} finally {
			setBusy(false);
		}
	}
	async function newSession() {
		const s = {
			id: rid("tut"),
			title: topic || "New tutor session",
			language,
			packId: null,
			objectiveId: null,
			topicLabel: topic || null,
			misconceptionId: null,
			documentId: documentId || null,
			mode,
			messages: [],
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		await putTutorSession(s);
		setSession(s);
	}
	async function clearSession() {
		if (!session) return;
		await deleteTutorSession(session.id);
		setSession(null);
		await newSession();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex max-w-2xl flex-col gap-4 pb-28",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-serif text-3xl text-ink",
						children: "Tutor"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Offline help is the default. External AI is only used if you allow it and the server is configured."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: ["Status: ", statusHint]
					})
				]
			}),
			showConsent && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-3 border-amber-500/40 bg-amber-500/5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-serif text-lg text-ink",
						children: "Allow external AI?"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "If you continue, this request may send your message, recent chat turns, and short excerpts from your study materials to an external AI service. Personal profile details are not sent on purpose. You can turn this off anytime."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "primary",
							onClick: () => void acceptConsent(),
							children: "I understand — allow external AI"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "secondary",
							onClick: () => {
								setShowConsent(false);
								setPrefer("offline");
							},
							children: "Stay offline"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "grid gap-3 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Mode",
						htmlFor: "tutor-mode",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							id: "tutor-mode",
							className: controlClassName,
							value: mode,
							onChange: (e) => setMode(e.target.value),
							children: MODES.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: m.id,
								children: m.label
							}, m.id))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Help source",
						htmlFor: "tutor-pref",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "tutor-pref",
							className: controlClassName,
							value: prefer,
							onChange: (e) => onPreferChange(e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "offline",
									children: "Offline help (default)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "live",
									children: "External AI (requires permission)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "mock",
									children: "Mock (development only)"
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Topic",
						htmlFor: "tutor-topic",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "tutor-topic",
							className: controlClassName,
							value: topic,
							onChange: (e) => setTopic(e.target.value),
							placeholder: "e.g. mass and weight"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Language",
						htmlFor: "tutor-lang",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "tutor-lang",
							className: controlClassName,
							value: language,
							onChange: (e) => setLanguage(e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "en",
									children: "English"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "am",
									children: "Amharic (best-effort via live AI)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "om",
									children: "Afaan Oromo (best-effort via live AI)"
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Document scope",
						htmlFor: "tutor-doc",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "tutor-doc",
							className: controlClassName,
							value: documentId,
							onChange: (e) => setDocumentId(e.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "All ready documents"
							}), docs.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: d.id,
								children: d.name
							}, d.id))]
						})
					})
				]
			}),
			consent && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted",
				children: ["External AI permission is on. ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "underline",
					onClick: () => void doRevoke(),
					children: "Revoke permission"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "min-h-[240px] space-y-3",
				children: [(session?.messages ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Ask a question about a topic in your materials. Conversations stay on this device."
				}), (session?.messages ?? []).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `rounded-lg p-3 text-sm ${m.role === "user" ? "bg-primary/10 text-ink" : "border border-line bg-surface/60"}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "whitespace-pre-wrap",
							children: m.content
						}),
						m.role === "assistant" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-xs text-muted",
							children: [PROVIDER_LABEL[m.provider], m.isGeneralExplanation ? " · general explanation" : " · source-aware"]
						}),
						m.citations?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-2 space-y-1 text-xs text-muted",
							children: m.citations.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [c.documentTitle || c.documentId, c.pageStart != null ? ` · pp. ${c.pageStart}${c.pageEnd != null && c.pageEnd !== c.pageStart ? `–${c.pageEnd}` : ""}` : ""] }, i))
						})
					]
				}, m.id))]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-rose-700",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Your message",
					htmlFor: "tutor-input",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						id: "tutor-input",
						className: controlClassName,
						rows: 3,
						value: input,
						onChange: (e) => setInput(e.target.value),
						placeholder: "What should we work on?"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "primary",
							disabled: busy || !input.trim(),
							onClick: () => void send(),
							children: busy ? "Thinking…" : "Send"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "secondary",
							onClick: () => void newSession(),
							children: "New session"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							onClick: () => void clearSession(),
							children: "Delete session"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/progress",
							className: "inline-flex h-9 items-center text-sm underline",
							children: "Progress"
						})
					]
				})]
			})
		]
	});
}
var SplitComponent = TutorPage;
//#endregion
export { SplitComponent as component };
