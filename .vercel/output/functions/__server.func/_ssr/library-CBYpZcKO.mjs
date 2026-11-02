import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { T as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Trash2, u as FileUp } from "../_libs/lucide-react.mjs";
import { d as useLocalLibrary, f as Button } from "./router-03i3X1Nd.mjs";
import { r as Panel } from "./panel-B6qeBfmK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/library-CBYpZcKO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function formatBytes(n) {
	if (n < 1024) return `${n} B`;
	if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / 1048576).toFixed(1)} MB`;
}
function formatDate(iso) {
	if (!iso) return "—";
	try {
		return new Date(iso).toLocaleDateString(void 0, {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	} catch {
		return iso;
	}
}
function statusLabel(status) {
	return {
		pending: "Pending",
		processing: "Processing",
		ready: "Ready",
		failed: "Failed",
		unreadable: "Unreadable",
		empty: "Empty",
		scanned: "Scanned (no text)"
	}[status] ?? status;
}
function statusClass(status) {
	if (status === "ready") return "text-primary";
	if (status === "failed" || status === "unreadable" || status === "empty") return "text-danger";
	return "text-muted";
}
function DocumentsPage() {
	const library = useLocalLibrary();
	const inputRef = (0, import_react.useRef)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [message, setMessage] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [confirmingId, setConfirmingId] = (0, import_react.useState)(null);
	const [deletingId, setDeletingId] = (0, import_react.useState)(null);
	async function onFilesSelected(files) {
		if (!files || files.length === 0) return;
		setBusy(true);
		setMessage(null);
		setError(null);
		try {
			for (const file of Array.from(files)) {
				const result = await library.importDocument(file);
				if (result.status === "rejected") setError(result.message);
				else if (result.status === "duplicate") setMessage(`“${result.meta.name}” is already in your library.`);
				else setMessage(`Imported “${result.meta.name}”.`);
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "Import failed.");
		} finally {
			setBusy(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	}
	async function confirmDelete(doc) {
		setDeletingId(doc.id);
		try {
			await library.removeDocument(doc.id);
			setMessage(`Removed “${doc.name}”.`);
			setConfirmingId(null);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not remove document.");
		} finally {
			setDeletingId(null);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium tracking-wide text-muted uppercase",
						children: "Library"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-serif text-3xl font-semibold tracking-tight",
						children: "Documents"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-2xl text-muted",
						children: "Import PDF textbooks and learning materials. Text is extracted on this device and stays available offline. Scanned PDFs without a text layer are marked clearly — OCR is not available yet."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								type: "button",
								disabled: busy || library.status !== "ready",
								onClick: () => inputRef.current?.click(),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileUp, {
									className: "size-4",
									"aria-hidden": true
								}), busy ? "Importing…" : "Import PDF"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: inputRef,
								type: "file",
								accept: "application/pdf,.pdf",
								className: "sr-only",
								multiple: true,
								onChange: (e) => void onFilesSelected(e.target.files)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "PDF only · stored on this device · max 100 MB"
							})
						]
					}),
					message ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-primary",
						children: message
					}) : null,
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						role: "alert",
						className: "text-sm text-danger",
						children: error
					}) : null
				]
			}),
			library.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted",
				children: "Loading library…"
			}) : library.documents.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted",
				children: "No documents yet. Import a PDF textbook to get started."
			}) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-3",
				children: library.documents.map((doc) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 space-y-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/library/$documentId",
								params: { documentId: doc.id },
								className: "font-medium text-ink hover:text-primary",
								children: doc.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: [
									formatBytes(doc.sizeBytes),
									doc.pageCount != null ? ` · ${doc.pageCount} pages` : "",
									` · ${formatDate(doc.createdAt)}`,
									doc.binaryStored ? " · offline" : ""
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: `text-sm font-medium ${statusClass(doc.status)}`,
								children: [statusLabel(doc.status), doc.statusMessage ? ` — ${doc.statusMessage}` : ""]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex shrink-0 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							variant: "secondary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/library/$documentId",
								params: { documentId: doc.id },
								children: "Open"
							})
						}), confirmingId === doc.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "danger",
							disabled: deletingId === doc.id,
							onClick: () => void confirmDelete(doc),
							children: deletingId === doc.id ? "Removing…" : "Confirm"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							onClick: () => setConfirmingId(null),
							children: "Cancel"
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							"aria-label": `Remove ${doc.name}`,
							onClick: () => setConfirmingId(doc.id),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
						})]
					})]
				}) }, doc.id))
			})
		]
	});
}
var SplitComponent = DocumentsPage;
//#endregion
export { SplitComponent as component };
