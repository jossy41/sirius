import { t as cn } from "./cn-Ccejyh36.mjs";
import { T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/panel-B6qeBfmK.js
var import_jsx_runtime = require_jsx_runtime();
function Panel({ className, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: cn("rounded-lg bg-surface p-6 shadow-panel", className),
		children
	});
}
function ChoiceGroup({ legend, hint, columnsClassName, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
		className: "flex flex-col gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
				className: "text-sm font-semibold text-ink",
				children: legend
			}),
			hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-pretty text-muted",
				children: hint
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("grid grid-cols-2 gap-2", columnsClassName),
				children
			})
		]
	});
}
function ChoiceButton({ pressed, disabled, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-pressed": pressed,
		disabled,
		onClick,
		className: cn("min-h-11 rounded-md border px-3 py-2 text-center text-base leading-tight font-semibold transition-colors duration-200 disabled:opacity-50", pressed ? "border-primary bg-primary text-primary-fg" : "border-line bg-paper text-ink hover:border-primary"),
		children
	});
}
//#endregion
export { ChoiceGroup as n, Panel as r, ChoiceButton as t };
