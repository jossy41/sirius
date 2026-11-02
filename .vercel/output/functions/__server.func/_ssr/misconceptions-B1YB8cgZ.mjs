import { i as __toESM } from "../_runtime.mjs";
import { k as listMisconceptions } from "./cn-Ccejyh36.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { T as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { f as Button } from "./router-03i3X1Nd.mjs";
import { r as Panel } from "./panel-B6qeBfmK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/misconceptions-B1YB8cgZ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Misconception history and remediation entry points.
* Student-facing language; no AI jargon.
*/
var statusLabel = {
	suspected: "Looking into this",
	confirmed: "Needs attention",
	improving: "Improving",
	resolved: "Resolved",
	needs_reassessment: "Check again"
};
function MisconceptionsPage() {
	const [items, setItems] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		listMisconceptions().then((rows) => {
			if (!cancelled) setItems(rows);
		}).catch(() => {
			if (!cancelled) setError("Could not load your learning notes on this device.");
		}).finally(() => {
			if (!cancelled) setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium text-muted",
						children: "Learning support"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-2xl font-semibold tracking-tight text-foreground",
						children: "What you are working on"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Sirius looks for patterns across your practice answers. A single slip is never treated as a fixed misunderstanding. When enough evidence appears, you will see a clear explanation and a short practice path grounded in your textbook."
					})
				]
			}),
			loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Loading…"
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				className: "border-destructive/40 bg-destructive/5 text-sm",
				children: error
			}),
			!loading && !error && items.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-foreground",
					children: "No patterns recorded yet. Keep practising from your library documents. When the same idea trips you up more than once, it will show up here with the pages to re-read."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					variant: "secondary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/practice",
						children: "Go to Practice"
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "flex flex-col gap-3",
				children: items.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap items-start justify-between gap-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-medium text-foreground",
								children: m.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted",
								children: [
									statusLabel[m.status],
									" · ",
									m.observationCount,
									" observation",
									m.observationCount === 1 ? "" : "s",
									" · confidence ",
									m.confidence
								]
							})] })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-foreground/90",
							children: m.description
						}),
						m.supportingExcerpts[0] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "rounded-md bg-muted/40 px-3 py-2 text-xs text-muted",
							children: [
								"Textbook pages ",
								m.supportingExcerpts[0].pageStart,
								"–",
								m.supportingExcerpts[0].pageEnd,
								m.documentId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									" ",
									"·",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										className: "underline underline-offset-2",
										to: "/library/$documentId",
										params: { documentId: m.documentId },
										children: "Open document"
									})
								] }) : null
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted",
							children: [
								"First noticed ",
								new Date(m.firstObservedAt).toLocaleDateString(),
								" · Last",
								" ",
								new Date(m.lastObservedAt).toLocaleDateString()
							]
						})
					]
				}) }, m.id))
			})
		]
	});
}
var SplitComponent = MisconceptionsPage;
//#endregion
export { SplitComponent as component };
