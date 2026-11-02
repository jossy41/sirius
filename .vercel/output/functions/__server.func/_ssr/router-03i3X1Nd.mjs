import { i as __toESM } from "../_runtime.mjs";
import { A as listNotes, B as putDocumentContent, L as putChunkEmbeddings, T as listInstalledPacks, V as putDocumentMeta, b as listDocuments, ct as createNoteId, dt as sortNotes, ft as validateNoteDraft, ht as emptyProfile, i as deleteNote, it as writeProfile, l as getDocumentContent, m as installPack, n as deleteChunkEmbeddingsForDocument, nt as removePack, o as emptyCurriculumLink, r as deleteDocument, rt as saveNote, s as findDocumentByHash, t as cn, tt as readProfile, u as getDocumentMeta, yt as AppError, z as putDocumentBinary } from "./cn-Ccejyh36.mjs";
import { a as number, c as union, i as literal, o as object, s as string } from "../_libs/zod.mjs";
import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { T as require_jsx_runtime, _ as lazyRouteComponent, b as Link, d as Scripts, f as HeadContent, g as Outlet, h as createRouter, v as createFileRoute, w as useRouter, y as createRootRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { n as validateEmbedding, t as cosineSimilarity } from "./embeddings-AyrkCWRj.mjs";
import { a as MessagesSquare, c as GraduationCap, d as ClipboardList, f as CircleUser, i as NotebookPen, l as Files, m as BookOpen, o as Lightbulb, p as ChartNoAxesCombined, r as RotateCcw, s as House, t as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/embed-index-Y-UFjhoF.js
function simpleContentHash(text) {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(16);
}
/**
* Build embeddings in batches of EMBED_BATCH_SIZE.
* Partial success returns records built so far; throws only if zero usable chunks fail hard.
*/
async function buildChunkEmbeddings(chunks, provider, options) {
	const usable = chunks.filter((c) => c.text && c.text.trim().length >= 20);
	if (usable.length === 0) return {
		records: [],
		status: "unavailable",
		error: "no_usable_chunks"
	};
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const out = [];
	let batchFailures = 0;
	for (let offset = 0; offset < usable.length; offset += 16) {
		const batch = usable.slice(offset, offset + 16);
		const texts = batch.map((c) => c.text.slice(0, 4e3));
		try {
			const vectors = await provider.embed(texts);
			if (vectors.length !== batch.length) {
				batchFailures += 1;
				continue;
			}
			for (let i = 0; i < batch.length; i++) {
				const vec = vectors[i];
				if (!validateEmbedding(vec, provider.expectedDimensions)) continue;
				const c = batch[i];
				out.push({
					id: c.id,
					chunkId: c.id,
					documentId: c.documentId,
					modelId: provider.modelId,
					dimensions: vec.length,
					vector: vec,
					contentHash: simpleContentHash(c.text),
					updatedAt: now
				});
			}
		} catch {
			batchFailures += 1;
		}
		options?.onBatchComplete?.(Math.min(offset + 16, usable.length), usable.length);
	}
	if (out.length === 0) return {
		records: [],
		status: "failed",
		error: "all_batches_failed"
	};
	if (batchFailures > 0 || out.length < usable.length) return {
		records: out,
		status: "partial"
	};
	return {
		records: out,
		status: "indexed"
	};
}
async function embeddingHitsForQuery(input) {
	if (input.embeddings.length === 0) return [];
	const modelId = input.provider.modelId;
	const compatible = input.embeddings.filter((e) => e.modelId === modelId);
	if (compatible.length === 0) return [];
	const dim = compatible[0].dimensions;
	if (compatible.some((e) => e.dimensions !== dim)) return [];
	const [qVec] = await input.provider.embed([input.query.slice(0, 4e3)]);
	if (!validateEmbedding(qVec, dim)) return [];
	const byChunk = new Map(input.chunks.map((c) => [c.id, c]));
	const titles = new Map(input.documents.map((d) => [d.id, d.name]));
	const scored = [];
	for (const emb of compatible) {
		if (!validateEmbedding(emb.vector, dim)) continue;
		const score = cosineSimilarity(qVec, emb.vector);
		if (score < (input.minScore ?? .2)) continue;
		const c = byChunk.get(emb.chunkId);
		if (!c) continue;
		scored.push({
			chunkId: emb.chunkId,
			documentId: emb.documentId,
			documentTitle: titles.get(emb.documentId) ?? null,
			text: c.text,
			pageStart: c.pageStart ?? null,
			pageEnd: c.pageEnd ?? null,
			score: score * 4,
			methods: ["embedding"],
			reason: `Semantic similarity via ${emb.modelId}.`
		});
	}
	return scored.sort((a, b) => b.score - a.score).slice(0, input.limit ?? 8);
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/router-03i3X1Nd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";
function errorMessage(error) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return FALLBACK_MESSAGE;
}
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper px-6 text-center text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-danger",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-serif text-3xl leading-tight",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-base break-words text-muted",
				children: errorMessage(error)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "/",
				className: "inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 font-semibold text-primary-fg",
				children: "Back home"
			})
		]
	});
}
/**
* Path-based preview hosts serve the dev server under `/{port_id}/` and strip
* that prefix before forwarding, so SSR sees `/` while the browser URL keeps the
* prefix. TanStack Start resets `basepath` on hydration, so a `rewrite` keeps
* client routing and generated links aligned with the public URL.
*/
var PATH_BASED_PREVIEW_HOSTS = /* @__PURE__ */ new Set([
	"preview.grok.genai.mil",
	"preview.grok.mil",
	"preview.grokgsac.com"
]);
var PORT_ID_PREFIX = /^\/hds-[a-z0-9]+-\d+-[a-z0-9]+(?=\/|$)/i;
function previewPathPrefix(hostname, pathname) {
	if (!PATH_BASED_PREVIEW_HOSTS.has(hostname.toLowerCase())) return void 0;
	return PORT_ID_PREFIX.exec(pathname)?.[0];
}
function prefixRewrite(prefix) {
	return {
		input: ({ url }) => {
			if (url.pathname === prefix) url.pathname = "/";
			else if (url.pathname.startsWith(`${prefix}/`)) url.pathname = url.pathname.slice(prefix.length);
			return url;
		},
		output: ({ url }) => {
			url.pathname = `${prefix}${url.pathname}`;
			return url;
		}
	};
}
function previewPathRewrite() {
	if (typeof window === "undefined") return void 0;
	const prefix = previewPathPrefix(window.location.hostname, window.location.pathname);
	return prefix ? prefixRewrite(prefix) : void 0;
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
var CONNECTOR_TOKEN_READY_EVENT = "grok:connector-token-ready";
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
var ConnectorTokenReadySchema = EnvelopeSchema.extend({ type: literal("connector-token-ready") });
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Origin of the Grok embedder framing this page, or null when the page runs
* top-level (download/export, local `npm run dev`, deployed sites) or under a
* non-Grok parent. Client-only; null during SSR.
*/
function resolveCurrentEmbedderOrigin() {
	if (typeof window === "undefined") return null;
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	return resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	const parentOrigin = resolveCurrentEmbedderOrigin();
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onHello = (data) => {
		if (!HelloSchema.safeParse(data).success) return;
		announce();
	};
	const onNavigate = (data) => {
		const parsed = NavigateSchema.safeParse(data);
		if (!parsed.success) return;
		navigate(parsed.data.path);
		queueMicrotask(reportLocation);
	};
	const onHistory = (data) => {
		const parsed = HistorySchema.safeParse(data);
		if (!parsed.success) return;
		if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
		window.history.go(parsed.data.delta);
	};
	const onConnectorTokenReady = (data) => {
		if (!ConnectorTokenReadySchema.safeParse(data).success) return;
		window.dispatchEvent(new Event(CONNECTOR_TOKEN_READY_EVENT));
	};
	const hostMessageHandlers = /* @__PURE__ */ new Map([
		["hello", onHello],
		["navigate", onNavigate],
		["history", onHistory],
		["connector-token-ready", onConnectorTokenReady]
	]);
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		hostMessageHandlers.get(envelope.data.type)?.(event.data);
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var buttonVariants = cva("inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50", {
	variants: { variant: {
		primary: "bg-primary text-primary-fg hover:bg-primary/90",
		secondary: "border border-line bg-paper text-ink hover:border-primary",
		ghost: "bg-transparent text-ink hover:bg-ink/5",
		danger: "bg-danger text-danger-fg hover:bg-danger/90"
	} },
	defaultVariants: { variant: "primary" }
});
function Button({ className, variant, asChild = false, type = "button", ...props }) {
	const classes = cn(buttonVariants({ variant }), className);
	if (asChild) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
		className: classes,
		...props
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type,
		className: classes,
		...props
	});
}
function SiriusMark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 32 32",
		"aria-hidden": "true",
		className,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			fill: "currentColor",
			d: "M16 2.2 18.7 13.3 29.8 16 18.7 18.7 16 29.8 13.3 18.7 2.2 16 13.3 13.3Z"
		})
	});
}
var LocalLibraryContext = (0, import_react.createContext)(null);
function useLocalLibrary() {
	const library = (0, import_react.useContext)(LocalLibraryContext);
	if (!library) throw new Error("useLocalLibrary must be used within LocalLibraryProvider");
	return library;
}
function SiteHeader() {
	const { profile } = useLocalLibrary();
	const gradeLabel = profile.grade ? `Grade ${profile.grade}` : "Set grade";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
		className: "bg-primary text-primary-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 md:px-8",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/",
				className: "inline-flex min-h-11 items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiriusMark, { className: "size-5 shrink-0" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-serif text-2xl leading-none font-semibold tracking-tight",
						children: "Sirius"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "sr-only",
						children: "JOSCH LABS"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "hidden text-sm font-medium text-primary-fg/80 md:block",
					children: "JOSCH LABS"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/you",
					className: "inline-flex min-h-11 items-center text-sm font-semibold",
					children: gradeLabel
				})]
			})]
		})
	});
}
var items = [
	{
		to: "/",
		label: "Home",
		icon: House,
		exact: true
	},
	{
		to: "/desk",
		label: "Desk",
		icon: NotebookPen,
		exact: true
	},
	{
		to: "/library",
		label: "Library",
		icon: Files,
		exact: false
	},
	{
		to: "/practice",
		label: "Practice",
		icon: GraduationCap,
		exact: true
	},
	{
		to: "/progress",
		label: "Progress",
		icon: ChartNoAxesCombined,
		exact: true
	},
	{
		to: "/revision",
		label: "Revision",
		icon: RotateCcw,
		exact: false
	},
	{
		to: "/exams",
		label: "Exams",
		icon: ClipboardList,
		exact: false
	},
	{
		to: "/tutor",
		label: "Tutor",
		icon: MessagesSquare,
		exact: false
	},
	{
		to: "/curriculum",
		label: "Study",
		icon: BookOpen,
		exact: false
	},
	{
		to: "/misconceptions",
		label: "Support",
		icon: Lightbulb,
		exact: true
	},
	{
		to: "/you",
		label: "You",
		icon: CircleUser,
		exact: true
	}
];
function SiteNav() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		"aria-label": "Primary",
		className: "pb-safe fixed inset-x-0 bottom-0 z-20 flex w-full items-stretch justify-evenly gap-0 border-t border-line bg-surface px-1 pt-1 md:static md:w-56 md:shrink-0 md:flex-col md:items-stretch md:justify-start md:gap-1 md:self-start md:border-t-0 md:bg-transparent md:px-4 md:pt-8 md:pb-0",
		children: items.map(({ to, label, icon: Icon, exact }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to,
			activeOptions: { exact },
			className: "flex min-h-12 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 px-0.5 py-1 text-center text-[10px] leading-tight font-medium sm:text-[11px] md:min-h-11 md:flex-none md:flex-row md:justify-start md:gap-2.5 md:rounded-md md:px-3 md:py-2 md:text-left md:text-base",
			activeProps: { className: "text-primary" },
			inactiveProps: { className: "text-muted" },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
				className: "size-4 shrink-0 sm:size-[1.15rem] md:size-5",
				"aria-hidden": "true",
				strokeWidth: 2
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "max-w-full truncate",
				children: label
			})]
		}, to))
	});
}
var EXTRACTOR_ID = "pdfjs-text-v2";
var MIN_MEANINGFUL_CHARS = 40;
var CHUNK_TARGET_CHARS = 900;
var CHUNK_MAX_CHARS = 1600;
var CHUNK_MIN_CHARS = 80;
function isHeadingLine(line) {
	const t = line.trim();
	if (t.length < 3 || t.length > 140) return false;
	if (/^\d+(\.\d+){0,4}\s+\S/.test(t)) return true;
	if (/^(chapter|unit|section|part|topic|lesson|module)\b/i.test(t)) return true;
	if (t.length <= 80 && /^[A-Z][A-Z0-9\s,;:'"()-]{3,}$/.test(t) && /[A-Z]{3}/.test(t)) return true;
	if (t.length <= 90 && !/[.!?]$/.test(t) && /^[A-Z][a-zA-Z0-9]/.test(t) && t.split(/\s+/).length <= 12 && t.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).length >= Math.ceil(t.split(/\s+/).length * .5)) return true;
	return false;
}
/**
* Reconstruct paragraph-aware text from pdf.js text items using y-position gaps.
*/
function reconstructPageText(items) {
	if (items.length === 0) return "";
	const lines = [];
	let current = null;
	const Y_TOLERANCE = 2.5;
	for (const item of items) {
		const str = item.str ?? "";
		if (!str) continue;
		const y = item.transform && item.transform.length >= 6 ? item.transform[5] : 0;
		if (!current || Math.abs(current.y - y) > Y_TOLERANCE) {
			current = {
				y,
				parts: [str]
			};
			lines.push(current);
		} else {
			const prev = current.parts[current.parts.length - 1] ?? "";
			const needsSpace = prev.length > 0 && !/\s$/.test(prev) && !/^\s/.test(str) && !/[-–—]$/.test(prev);
			current.parts.push(needsSpace ? ` ${str}` : str);
		}
	}
	lines.sort((a, b) => b.y - a.y);
	const gaps = [];
	for (let i = 1; i < lines.length; i++) gaps.push(Math.abs(lines[i - 1].y - lines[i].y));
	const paraBreak = (gaps.length === 0 ? 12 : [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 12) * 1.6;
	const out = [];
	for (let i = 0; i < lines.length; i++) {
		const text = lines[i].parts.join("").replace(/[ \t]+/g, " ").trim();
		if (!text) continue;
		if (i > 0 && Math.abs(lines[i - 1].y - lines[i].y) > paraBreak) out.push("");
		out.push(text);
	}
	return out.join("\n");
}
/**
* Split extracted pages into meaningful chunks while preserving page ranges.
* Flushes on headings and large paragraph breaks so unrelated sections stay separate.
*/
function buildChunks(documentId, pages) {
	const chunks = [];
	let buffer = "";
	let pageStart = 1;
	let pageEnd = 1;
	let title = null;
	let index = 0;
	function flush() {
		const text = buffer.trim();
		if (!text || text.length < CHUNK_MIN_CHARS) {
			if (text.length > 0 && text.length < CHUNK_MIN_CHARS && chunks.length > 0) {
				const last = chunks[chunks.length - 1];
				last.text = `${last.text}\n\n${text}`.trim();
				last.charCount = last.text.length;
				last.pageEnd = pageEnd;
			}
			buffer = "";
			title = null;
			return;
		}
		chunks.push({
			id: `${documentId}-c${index}`,
			documentId,
			index,
			title,
			text,
			pageStart,
			pageEnd,
			charCount: text.length
		});
		index += 1;
		buffer = "";
		title = null;
	}
	for (const page of pages) {
		const paragraphs = page.text.split(/\n\s*\n/);
		for (const para of paragraphs) {
			const lines = para.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
			if (lines.length === 0) {
				if (buffer.length > CHUNK_TARGET_CHARS) flush();
				continue;
			}
			const first = lines[0];
			if (isHeadingLine(first) && buffer.length >= CHUNK_MIN_CHARS) {
				flush();
				title = first;
				pageStart = page.pageNumber;
				pageEnd = page.pageNumber;
				buffer = lines.join("\n");
				if (buffer.length >= CHUNK_MAX_CHARS) flush();
				continue;
			}
			if (!buffer) {
				pageStart = page.pageNumber;
				if (isHeadingLine(first)) title = first;
			}
			pageEnd = page.pageNumber;
			const block = lines.join("\n");
			buffer += (buffer ? "\n\n" : "") + block;
			if (buffer.length >= CHUNK_MAX_CHARS) flush();
			else if (buffer.length >= CHUNK_TARGET_CHARS && lines.length <= 2 && isHeadingLine(first)) flush();
		}
	}
	flush();
	return chunks;
}
function classifyExtraction(pages, pageCount) {
	if (pageCount === 0) return {
		status: "empty",
		statusMessage: "PDF has no pages."
	};
	const totalChars = pages.reduce((n, p) => n + p.charCount, 0);
	const pagesWithText = pages.filter((p) => p.charCount >= 8).length;
	if (totalChars < MIN_MEANINGFUL_CHARS) {
		if (pageCount > 0) return {
			status: "scanned",
			statusMessage: "Little or no selectable text was found. This PDF may be scanned. OCR is not available yet."
		};
		return {
			status: "empty",
			statusMessage: "No readable text found."
		};
	}
	if (pagesWithText === 0) return {
		status: "unreadable",
		statusMessage: "Text could not be extracted from any page."
	};
	return {
		status: "ready",
		statusMessage: null
	};
}
/**
* Extract text from a PDF ArrayBuffer using pdf.js.
* Caller should only invoke this in a browser context.
*/
async function extractPdfText(data, documentId) {
	try {
		const pdfjs = await import("../_libs/pdfjs-dist.mjs").then((n) => n.t);
		if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = "";
		const pdf = await pdfjs.getDocument({
			data: new Uint8Array(data),
			useSystemFonts: true
		}).promise;
		const pageCount = pdf.numPages;
		const pages = [];
		for (let i = 1; i <= pageCount; i++) {
			const textContent = await (await pdf.getPage(i)).getTextContent();
			const items = [];
			for (const item of textContent.items) if (item && typeof item === "object" && "str" in item) items.push({
				str: String(item.str),
				transform: item.transform
			});
			const text = reconstructPageText(items);
			pages.push({
				pageNumber: i,
				text,
				charCount: text.length
			});
		}
		const { status, statusMessage } = classifyExtraction(pages, pageCount);
		return {
			status,
			statusMessage,
			pageCount,
			pages,
			chunks: status === "ready" ? buildChunks(documentId, pages) : [],
			extractor: EXTRACTOR_ID
		};
	} catch (err) {
		return {
			status: "failed",
			statusMessage: `Extraction failed: ${err instanceof Error ? err.message : "Unknown extraction error"}`,
			pageCount: 0,
			pages: [],
			chunks: [],
			extractor: EXTRACTOR_ID
		};
	}
}
function validatePdfFile(file) {
	const name = file.name.toLowerCase();
	const type = (file.type || "").toLowerCase();
	if (!(type === "application/pdf" || type === "application/x-pdf" || name.endsWith(".pdf"))) return {
		ok: false,
		message: "Only PDF files are supported in this version."
	};
	if (file.size <= 0) return {
		ok: false,
		message: "The file is empty."
	};
	if (file.size > 104857600) return {
		ok: false,
		message: `PDF is larger than 100 MB. Choose a smaller file, or split the document.`
	};
	return { ok: true };
}
async function hashArrayBuffer(data) {
	const digest = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function indexDocumentEmbeddings(input) {
	if (!input.provider) return {
		status: "unavailable",
		indexedCount: 0,
		error: "no_provider"
	};
	if (!input.chunks.length) return {
		status: "unavailable",
		indexedCount: 0,
		error: "no_chunks"
	};
	try {
		await deleteChunkEmbeddingsForDocument(input.meta.id);
	} catch {}
	try {
		const result = await buildChunkEmbeddings(input.chunks, input.provider);
		if (result.records.length > 0) await putChunkEmbeddings(result.records);
		return {
			status: result.status,
			indexedCount: result.records.length,
			error: result.error
		};
	} catch (e) {
		return {
			status: "failed",
			indexedCount: 0,
			error: e instanceof Error ? e.message : "index_failed"
		};
	}
}
/**
* Document import orchestration: validate → store binary → extract → persist content.
*/
function createDocumentId() {
	if (typeof crypto !== "undefined" && crypto.randomUUID) return `doc_${crypto.randomUUID()}`;
	return `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
async function importPdfDocument(file, options = {}) {
	const validation = validatePdfFile(file);
	if (!validation.ok) return {
		status: "rejected",
		message: validation.message
	};
	let data;
	try {
		data = await file.arrayBuffer();
	} catch {
		return {
			status: "rejected",
			message: "Could not read the file."
		};
	}
	const contentHash = await hashArrayBuffer(data);
	if (!options.skipDuplicateCheck) {
		const existing = await findDocumentByHash(contentHash);
		if (existing) return {
			status: "duplicate",
			meta: existing
		};
	}
	const id = createDocumentId();
	const now = (/* @__PURE__ */ new Date()).toISOString();
	let meta = {
		id,
		name: file.name.replace(/\.pdf$/i, "") || "Untitled PDF",
		originalName: file.name,
		format: "pdf",
		mimeType: file.type || "application/pdf",
		sizeBytes: file.size,
		pageCount: null,
		status: "processing",
		statusMessage: "Extracting text…",
		curriculum: emptyCurriculumLink(),
		contentHash,
		createdAt: now,
		updatedAt: now,
		binaryStored: false
	};
	try {
		await putDocumentMeta(meta);
	} catch {
		return {
			status: "rejected",
			message: "Could not save document metadata on this device."
		};
	}
	try {
		await putDocumentBinary({
			documentId: id,
			blob: new Blob([data], { type: "application/pdf" }),
			mimeType: "application/pdf",
			sizeBytes: file.size
		});
		meta = {
			...meta,
			binaryStored: true,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		await putDocumentMeta(meta);
	} catch {
		meta = {
			...meta,
			status: "failed",
			statusMessage: "Could not store the PDF on this device. Storage may be full.",
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		await putDocumentMeta(meta).catch(() => void 0);
		return {
			status: "imported",
			meta
		};
	}
	const extraction = await extractPdfText(data, id);
	const content = {
		documentId: id,
		pages: extraction.pages,
		chunks: extraction.chunks,
		extractedAt: (/* @__PURE__ */ new Date()).toISOString(),
		extractor: extraction.extractor
	};
	try {
		if (extraction.status === "ready" || extraction.pages.length > 0) await putDocumentContent(content);
	} catch {}
	meta = {
		...meta,
		pageCount: extraction.pageCount || null,
		status: extraction.status,
		statusMessage: extraction.statusMessage,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	await putDocumentMeta(meta);
	if (options.embeddingProvider && content.chunks.length > 0 && meta.status === "ready") try {
		const idx = await indexDocumentEmbeddings({
			meta,
			chunks: content.chunks,
			provider: options.embeddingProvider
		});
		meta = {
			...meta,
			statusMessage: idx.status === "indexed" ? `Ready · ${idx.indexedCount} passages indexed` : idx.status === "partial" ? `Ready · partial index (${idx.indexedCount})` : meta.statusMessage
		};
		await putDocumentMeta(meta);
	} catch {}
	return {
		status: "imported",
		meta
	};
}
async function updateDocumentCurriculum(documentId, curriculum) {
	const existing = await getDocumentMeta(documentId);
	if (!existing) throw new Error("Document not found.");
	const next = {
		...existing,
		curriculum,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	await putDocumentMeta(next);
	return next;
}
async function renameDocument(documentId, name) {
	const existing = await getDocumentMeta(documentId);
	if (!existing) throw new Error("Document not found.");
	const trimmed = name.trim().slice(0, 200);
	if (!trimmed) throw new Error("Name cannot be empty.");
	const next = {
		...existing,
		name: trimmed,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	await putDocumentMeta(next);
	return next;
}
async function removeDocument(documentId) {
	await deleteDocument(documentId);
}
async function loadDocumentDetail(documentId) {
	const meta = await getDocumentMeta(documentId);
	if (!meta) return null;
	return {
		meta,
		content: await getDocumentContent(documentId) ?? null
	};
}
/**
* Client-side consent preference + server-issued token storage.
* Local preference alone is NOT server authorization.
*/
var PREF_KEY = "sirius.ai.externalConsent.v1";
var TOKEN_KEY = "sirius.ai.consentToken.v1";
function readExternalAiConsent() {
	if (typeof localStorage === "undefined") return {
		granted: false,
		grantedAt: null,
		revokedAt: null
	};
	try {
		const raw = localStorage.getItem(PREF_KEY);
		if (!raw) return {
			granted: false,
			grantedAt: null,
			revokedAt: null
		};
		const parsed = JSON.parse(raw);
		return {
			granted: parsed.granted === true,
			grantedAt: typeof parsed.grantedAt === "string" ? parsed.grantedAt : null,
			revokedAt: typeof parsed.revokedAt === "string" ? parsed.revokedAt : null
		};
	} catch {
		return {
			granted: false,
			grantedAt: null,
			revokedAt: null
		};
	}
}
function hasExternalAiConsent() {
	return readExternalAiConsent().granted === true && Boolean(getStoredConsentToken());
}
function getStoredConsentToken() {
	if (typeof localStorage === "undefined") return null;
	try {
		const raw = localStorage.getItem(TOKEN_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed.token) return null;
		if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
			localStorage.removeItem(TOKEN_KEY);
			return null;
		}
		return parsed.token;
	} catch {
		return null;
	}
}
function storeConsentToken(token, expiresAt) {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(TOKEN_KEY, JSON.stringify({
		token,
		expiresAt
	}));
	localStorage.setItem(PREF_KEY, JSON.stringify({
		granted: true,
		grantedAt: (/* @__PURE__ */ new Date()).toISOString(),
		revokedAt: null
	}));
}
function revokeExternalAiConsent() {
	const next = {
		granted: false,
		grantedAt: readExternalAiConsent().grantedAt,
		revokedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	if (typeof localStorage !== "undefined") {
		localStorage.setItem(PREF_KEY, JSON.stringify(next));
		localStorage.removeItem(TOKEN_KEY);
	}
	return next;
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
/**
* Server-side embedding of texts. Requires credentials + valid consent token.
* Returns empty vectors list when not configured — callers must fall back.
*/
var embedTextsServer = createServerFn({ method: "POST" }).inputValidator((data) => {
	const d = data;
	return {
		texts: Array.isArray(d?.texts) ? d.texts.filter((t) => typeof t === "string").map((t) => t.slice(0, 4e3)).slice(0, 16) : [],
		consentToken: typeof d?.consentToken === "string" ? d.consentToken : null
	};
}).handler(createSsrRpc("db4489d50163876d344583183d88a5058bdebbeebe35ca1f46d04ef0af088294"));
function createServerEmbeddingClient(consentToken) {
	return {
		id: "server_openai_compatible",
		modelId: "server-configured",
		expectedDimensions: null,
		async embed(texts) {
			const out = [];
			for (let i = 0; i < texts.length; i += 16) {
				const batch = texts.slice(i, i + 16);
				const res = await embedTextsServer({ data: {
					texts: batch,
					consentToken
				} });
				if (!res.ok || res.vectors.length !== batch.length) throw new Error(res.reason ?? "embed_batch_failed");
				if (res.modelId) this.modelId = res.modelId;
				out.push(...res.vectors);
			}
			return out;
		}
	};
}
function messageFrom(error, fallback) {
	return error instanceof Error && error.message ? error.message : fallback;
}
function LocalLibraryProvider({ children }) {
	const requestId = (0, import_react.useRef)(0);
	const [status, setStatus] = (0, import_react.useState)("loading");
	const [errorMessage, setErrorMessage] = (0, import_react.useState)(null);
	const [profile, setProfile] = (0, import_react.useState)(emptyProfile);
	const [notes, setNotes] = (0, import_react.useState)([]);
	const [packs, setPacks] = (0, import_react.useState)([]);
	const [documents, setDocuments] = (0, import_react.useState)([]);
	const reload = (0, import_react.useCallback)(async () => {
		const id = ++requestId.current;
		setStatus("loading");
		setErrorMessage(null);
		try {
			const [nextProfile, nextNotes, nextPacks, nextDocs] = await Promise.all([
				readProfile(),
				listNotes(),
				listInstalledPacks(),
				listDocuments()
			]);
			if (id !== requestId.current) return;
			setProfile(nextProfile);
			setNotes(nextNotes);
			setPacks(nextPacks);
			setDocuments(nextDocs);
			setStatus("ready");
		} catch (error) {
			if (id !== requestId.current) return;
			setStatus("error");
			setErrorMessage(messageFrom(error, "Could not open on-device storage."));
		}
	}, []);
	(0, import_react.useEffect)(() => {
		reload();
	}, [reload]);
	const saveProfile = (0, import_react.useCallback)(async (next) => {
		const saved = await writeProfile(next);
		requestId.current += 1;
		setProfile(saved);
		setStatus("ready");
		setErrorMessage(null);
	}, []);
	const saveNoteDraft = (0, import_react.useCallback)(async (draft, id) => {
		const validated = validateNoteDraft(draft);
		if (!validated.ok) throw new AppError(validated.message);
		const note = {
			id: id ?? createNoteId(),
			...validated.value,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		const saved = await saveNote(note);
		requestId.current += 1;
		setNotes((current) => sortNotes([saved, ...current.filter((item) => item.id !== saved.id)]));
		setStatus("ready");
		setErrorMessage(null);
	}, []);
	const removeNote = (0, import_react.useCallback)(async (id) => {
		await deleteNote(id);
		requestId.current += 1;
		setNotes((current) => current.filter((item) => item.id !== id));
		setStatus("ready");
	}, []);
	const installPack$1 = (0, import_react.useCallback)(async (pack) => {
		const result = await installPack(pack);
		if (result.status === "installed" || result.status === "replaced") {
			requestId.current += 1;
			setPacks((current) => {
				return [...current.filter((p) => p.packId !== result.record.packId), result.record].sort((a, b) => a.meta.title.localeCompare(b.meta.title));
			});
			setStatus("ready");
			setErrorMessage(null);
		} else if (result.status === "skipped") setPacks((current) => {
			if (current.some((p) => p.packId === result.record.packId)) return current;
			return [...current, result.record].sort((a, b) => a.meta.title.localeCompare(b.meta.title));
		});
		return result;
	}, []);
	const removePack$1 = (0, import_react.useCallback)(async (packId) => {
		await removePack(packId);
		requestId.current += 1;
		setPacks((current) => current.filter((p) => p.packId !== packId));
		setStatus("ready");
	}, []);
	const getPack = (0, import_react.useCallback)((packId) => packs.find((p) => p.packId === packId), [packs]);
	const importDocument = (0, import_react.useCallback)(async (file) => {
		let embeddingProvider = null;
		try {
			if (hasExternalAiConsent()) {
				const token = getStoredConsentToken();
				if (token) embeddingProvider = createServerEmbeddingClient(token);
			}
		} catch {}
		const result = await importPdfDocument(file, { embeddingProvider });
		if (result.status === "imported" && result.meta.status === "ready" && embeddingProvider) try {
			const content = await getDocumentContent(result.meta.id);
			if (content?.chunks?.length) await indexDocumentEmbeddings({
				meta: result.meta,
				chunks: content.chunks,
				provider: embeddingProvider
			});
		} catch {}
		if (result.status === "imported" || result.status === "duplicate") {
			requestId.current += 1;
			setDocuments((current) => {
				const without = current.filter((d) => d.id !== result.meta.id);
				return [result.meta, ...without].sort((a, b) => a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
			});
			setStatus("ready");
			setErrorMessage(null);
		}
		return result;
	}, []);
	const removeDocument$1 = (0, import_react.useCallback)(async (id) => {
		await removeDocument(id);
		requestId.current += 1;
		setDocuments((current) => current.filter((d) => d.id !== id));
		setStatus("ready");
	}, []);
	const updateDocumentCurriculum$1 = (0, import_react.useCallback)(async (id, curriculum) => {
		const next = await updateDocumentCurriculum(id, curriculum);
		requestId.current += 1;
		setDocuments((current) => current.map((d) => d.id === id ? next : d));
		setStatus("ready");
		return next;
	}, []);
	const renameDocument$1 = (0, import_react.useCallback)(async (id, name) => {
		const next = await renameDocument(id, name);
		requestId.current += 1;
		setDocuments((current) => current.map((d) => d.id === id ? next : d));
		setStatus("ready");
		return next;
	}, []);
	const getDocument = (0, import_react.useCallback)((id) => documents.find((d) => d.id === id), [documents]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocalLibraryContext.Provider, {
		value: {
			status,
			errorMessage,
			profile,
			notes,
			packs,
			documents,
			reload,
			saveProfile,
			saveNote: saveNoteDraft,
			deleteNote: removeNote,
			installPack: installPack$1,
			removePack: removePack$1,
			getPack,
			importDocument,
			removeDocument: removeDocument$1,
			updateDocumentCurriculum: updateDocumentCurriculum$1,
			renameDocument: renameDocument$1,
			getDocument
		},
		children
	});
}
function LibraryBanner() {
	const library = useLocalLibrary();
	if (library.status !== "error" || !library.errorMessage) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		role: "alert",
		className: "mb-6 rounded-lg bg-surface px-4 py-3 text-danger shadow-panel",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: library.errorMessage }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			variant: "danger",
			className: "mt-3",
			onClick: () => void library.reload(),
			children: "Try again"
		})]
	});
}
function ShellFrame({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh overflow-x-clip bg-paper text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "#content",
				className: "sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink",
				children: "Skip to content"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex w-full max-w-5xl md:items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteNav, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
					id: "content",
					tabIndex: -1,
					className: "min-w-0 flex-1 px-4 pt-8 pb-nav outline-none md:px-8 md:pt-10 md:pb-16",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LibraryBanner, {}), children]
				})]
			})
		]
	});
}
function AppShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocalLibraryProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShellFrame, { children }) });
}
function NotFound() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex max-w-xl flex-col items-start gap-4 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-serif text-4xl leading-tight text-ink",
				children: "This page is not in Sirius."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-lg text-pretty text-muted",
				children: "The address does not match a page in this release."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					children: "Back home"
				})
			})
		]
	});
}
var styles_default = "/assets/styles-BKQm0u4S.css";
var APP_NAME = "Sirius";
var Route$17 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "description",
				content: "Sirius is an offline-first study companion for Ethiopian secondary school, grades 9 to 12."
			},
			{
				name: "theme-color",
				content: "#1e4a38"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			}
		]
	}),
	component: RootDocument,
	notFoundComponent: NotFound
});
function RootDocument() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		className: "antialiased",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	});
}
var $$splitComponentImporter$16 = () => import("./routes-BZUcvNka.mjs");
var Route$16 = createFileRoute("/")({
	head: () => ({ meta: [{ title: "Home · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$16, "component")
});
var $$splitComponentImporter$15 = () => import("./curriculum-Vs0NgukZ.mjs");
var Route$15 = createFileRoute("/curriculum")({
	head: () => ({ meta: [{ title: "Curriculum · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$15, "component")
});
var $$splitComponentImporter$14 = () => import("./desk-SMy-6zXv.mjs");
var Route$14 = createFileRoute("/desk")({
	head: () => ({ meta: [{ title: "Desk · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$14, "component")
});
var $$splitComponentImporter$13 = () => import("./exams-BRBIzYR7.mjs");
var Route$13 = createFileRoute("/exams")({
	head: () => ({ meta: [{ title: "Exams · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$13, "component")
});
var $$splitComponentImporter$12 = () => import("./library-CBYpZcKO.mjs");
var Route$12 = createFileRoute("/library")({
	head: () => ({ meta: [{ title: "Library · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
var $$splitComponentImporter$11 = () => import("./misconceptions-B1YB8cgZ.mjs");
var Route$11 = createFileRoute("/misconceptions")({
	head: () => ({ meta: [{ title: "Learning support · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
var $$splitComponentImporter$10 = () => import("./practice-p7bODidh.mjs");
var Route$10 = createFileRoute("/practice")({
	head: () => ({ meta: [{ title: "Practice · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./progress-6sIUWV4x.mjs");
var Route$9 = createFileRoute("/progress")({
	head: () => ({ meta: [{ title: "Knowledge & Progress · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./revision-Dh9x2zuk.mjs");
var Route$8 = createFileRoute("/revision")({
	head: () => ({ meta: [{ title: "Revision · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./tutor-DaYmEV96.mjs");
var Route$7 = createFileRoute("/tutor")({
	head: () => ({ meta: [{ title: "Tutor · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component"),
	validateSearch: (search) => ({
		topic: typeof search.topic === "string" ? search.topic : void 0,
		objectiveId: typeof search.objectiveId === "string" ? search.objectiveId : void 0,
		misconceptionId: typeof search.misconceptionId === "string" ? search.misconceptionId : void 0,
		mode: typeof search.mode === "string" ? search.mode : void 0
	})
});
var $$splitComponentImporter$6 = () => import("./you-BUH9UY2L.mjs");
var Route$6 = createFileRoute("/you")({
	head: () => ({ meta: [{ title: "You · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./curriculum._packId-CTeZTVpn.mjs");
var Route$5 = createFileRoute("/curriculum/$packId")({
	head: () => ({ meta: [{ title: "Pack · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("../_examId-C4y4P_g-.mjs");
var Route$4 = createFileRoute("/exams/$examId")({
	head: () => ({ meta: [{ title: "Assessment · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./library._documentId-CZzGrov8.mjs");
var Route$3 = createFileRoute("/library/$documentId")({
	head: () => ({ meta: [{ title: "Document · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./history-DsFr27qZ.mjs");
var Route$2 = createFileRoute("/revision/history")({
	head: () => ({ meta: [{ title: "Revision history · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("../_examId-DSXvAUBb.mjs");
var Route$1 = createFileRoute("/exams/results/$examId")({
	head: () => ({ meta: [{ title: "Results · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./session._sessionId-D5SpjBv2.mjs");
var Route = createFileRoute("/revision/session/$sessionId")({
	head: () => ({ meta: [{ title: "Revision session · Sirius" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var IndexRoute = Route$16.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$17
});
var CurriculumRoute = Route$15.update({
	id: "/curriculum",
	path: "/curriculum",
	getParentRoute: () => Route$17
});
var DeskRoute = Route$14.update({
	id: "/desk",
	path: "/desk",
	getParentRoute: () => Route$17
});
var ExamsRoute = Route$13.update({
	id: "/exams",
	path: "/exams",
	getParentRoute: () => Route$17
});
var LibraryRoute = Route$12.update({
	id: "/library",
	path: "/library",
	getParentRoute: () => Route$17
});
var MisconceptionsRoute = Route$11.update({
	id: "/misconceptions",
	path: "/misconceptions",
	getParentRoute: () => Route$17
});
var PracticeRoute = Route$10.update({
	id: "/practice",
	path: "/practice",
	getParentRoute: () => Route$17
});
var ProgressRoute = Route$9.update({
	id: "/progress",
	path: "/progress",
	getParentRoute: () => Route$17
});
var RevisionRoute = Route$8.update({
	id: "/revision",
	path: "/revision",
	getParentRoute: () => Route$17
});
var TutorRoute = Route$7.update({
	id: "/tutor",
	path: "/tutor",
	getParentRoute: () => Route$17
});
var YouRoute = Route$6.update({
	id: "/you",
	path: "/you",
	getParentRoute: () => Route$17
});
var CurriculumPackIdRoute = Route$5.update({
	id: "/$packId",
	path: "/$packId",
	getParentRoute: () => CurriculumRoute
});
var ExamsExamIdRoute = Route$4.update({
	id: "/$examId",
	path: "/$examId",
	getParentRoute: () => ExamsRoute
});
var LibraryDocumentIdRoute = Route$3.update({
	id: "/$documentId",
	path: "/$documentId",
	getParentRoute: () => LibraryRoute
});
var RevisionHistoryRoute = Route$2.update({
	id: "/history",
	path: "/history",
	getParentRoute: () => RevisionRoute
});
var ExamsResultsExamIdRoute = Route$1.update({
	id: "/results/$examId",
	path: "/results/$examId",
	getParentRoute: () => ExamsRoute
});
var RevisionSessionSessionIdRoute = Route.update({
	id: "/session/$sessionId",
	path: "/session/$sessionId",
	getParentRoute: () => RevisionRoute
});
var CurriculumRouteChildren = { CurriculumPackIdRoute };
var CurriculumRouteWithChildren = CurriculumRoute._addFileChildren(CurriculumRouteChildren);
var ExamsRouteChildren = {
	ExamsExamIdRoute,
	ExamsResultsExamIdRoute
};
var ExamsRouteWithChildren = ExamsRoute._addFileChildren(ExamsRouteChildren);
var LibraryRouteChildren = { LibraryDocumentIdRoute };
var LibraryRouteWithChildren = LibraryRoute._addFileChildren(LibraryRouteChildren);
var RevisionRouteChildren = {
	RevisionHistoryRoute,
	RevisionSessionSessionIdRoute
};
var rootRouteChildren = {
	IndexRoute,
	CurriculumRoute: CurriculumRouteWithChildren,
	DeskRoute,
	ExamsRoute: ExamsRouteWithChildren,
	LibraryRoute: LibraryRouteWithChildren,
	MisconceptionsRoute,
	PracticeRoute,
	ProgressRoute,
	RevisionRoute: RevisionRoute._addFileChildren(RevisionRouteChildren),
	TutorRoute,
	YouRoute
};
var routeTree = Route$17._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		rewrite: previewPathRewrite(),
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { createSsrRpc as a, revokeExternalAiConsent as c, useLocalLibrary as d, Button as f, createServerEmbeddingClient as i, storeConsentToken as l, Route$3 as n, getStoredConsentToken as o, embeddingHitsForQuery as p, Route$5 as r, hasExternalAiConsent as s, router_exports as t, loadDocumentDetail as u };
