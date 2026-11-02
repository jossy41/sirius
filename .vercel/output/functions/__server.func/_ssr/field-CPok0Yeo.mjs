import { i as __toESM } from "../_runtime.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/field-CPok0Yeo.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var controlClassName = "min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base text-ink placeholder:text-muted disabled:opacity-60";
function Field({ label, htmlFor, hint, error, children }) {
	const hintId = hint ? `${htmlFor}-hint` : void 0;
	const errorId = error ? `${htmlFor}-error` : void 0;
	const describedBy = [hintId, errorId].filter(Boolean).join(" ") || void 0;
	const described = (0, import_react.isValidElement)(children) ? (0, import_react.cloneElement)(children, {
		...describedBy ? { "aria-describedby": describedBy } : {},
		...error ? { "aria-invalid": true } : {}
	}) : children;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor,
				className: "text-sm font-semibold text-ink",
				children: label
			}),
			described,
			hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				id: hintId,
				className: "text-sm text-pretty text-muted",
				children: hint
			}) : null,
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				id: errorId,
				role: "alert",
				className: "text-sm text-danger",
				children: error
			}) : null
		]
	});
}
function TextInput({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn(controlClassName, className),
		...props
	});
}
function TextArea({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn(controlClassName, "min-h-36 py-3", className),
		...props
	});
}
//#endregion
export { controlClassName as i, TextArea as n, TextInput as r, Field as t };
