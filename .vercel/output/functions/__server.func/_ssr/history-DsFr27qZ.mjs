import { i as __toESM } from "../_runtime.mjs";
import { M as listRevisionHistory } from "./cn-Ccejyh36.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { T as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as Panel } from "./panel-B6qeBfmK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/history-DsFr27qZ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function RevisionHistoryPage() {
	const [rows, setRows] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		listRevisionHistory().then(setRows);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex max-w-2xl flex-col gap-6 pb-24",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "space-y-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/revision",
						className: "underline",
						children: "Revision"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-serif text-3xl text-ink",
					children: "Revision history"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted text-sm",
					children: "Completed, postponed, and skipped reviews on this device."
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			className: "space-y-2",
			children: rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "No revision history yet."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-3",
				children: rows.slice(0, 40).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "border-b border-line pb-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-medium text-ink",
						children: [
							r.topicLabel || r.objectiveId,
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-normal text-muted",
								children: ["· ", r.outcome]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							r.reviewedAt.slice(0, 16).replace("T", " "),
							r.evaluationCorrectness ? ` · ${r.evaluationCorrectness}` : "",
							r.wasOverdue ? " · was overdue" : "",
							r.nextScheduledAt ? ` · next ${r.nextScheduledAt.slice(0, 10)}` : ""
						]
					})]
				}, r.id))
			})
		})]
	});
}
var SplitComponent = RevisionHistoryPage;
//#endregion
export { SplitComponent as component };
