import { i as __toESM } from "../_runtime.mjs";
import { c as getDocumentBinary, o as emptyCurriculumLink } from "./cn-Ccejyh36.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { T as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as useLocalLibrary, f as Button, n as Route$3, u as loadDocumentDetail } from "./router-03i3X1Nd.mjs";
import { r as Panel } from "./panel-B6qeBfmK.mjs";
import { i as controlClassName, t as Field } from "./field-CPok0Yeo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/library._documentId-CZzGrov8.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function formatBytes(n) {
	if (n < 1024) return `${n} B`;
	if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / 1048576).toFixed(1)} MB`;
}
function DocumentDetailPage({ documentId }) {
	const library = useLocalLibrary();
	const [meta, setMeta] = (0, import_react.useState)(null);
	const [content, setContent] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	const [message, setMessage] = (0, import_react.useState)(null);
	const [nameEdit, setNameEdit] = (0, import_react.useState)("");
	const [curriculum, setCurriculum] = (0, import_react.useState)(emptyCurriculumLink());
	const [savingLink, setSavingLink] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		loadDocumentDetail(documentId).then((detail) => {
			if (cancelled) return;
			if (!detail) {
				setError("Document not found.");
				setMeta(null);
				setContent(null);
			} else {
				setMeta(detail.meta);
				setContent(detail.content);
				setNameEdit(detail.meta.name);
				setCurriculum(detail.meta.curriculum);
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [documentId]);
	const packOptions = library.packs;
	const subjects = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const pack of packOptions) for (const s of pack.content.subjects) if (!map.has(s.id)) map.set(s.id, {
			id: s.id,
			code: s.code,
			name: s.name,
			packId: pack.packId
		});
		return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
	}, [packOptions]);
	const topics = (0, import_react.useMemo)(() => {
		if (!curriculum.subjectId) return [];
		const list = [];
		for (const pack of packOptions) for (const t of pack.content.topics) if (t.subjectId === curriculum.subjectId) list.push({
			id: t.id,
			code: t.code,
			title: t.title
		});
		return list.sort((a, b) => a.title.localeCompare(b.title));
	}, [packOptions, curriculum.subjectId]);
	async function saveName() {
		if (!meta) return;
		try {
			const next = await library.renameDocument(meta.id, nameEdit);
			setMeta(next);
			setMessage("Name updated.");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not rename.");
		}
	}
	async function saveCurriculum() {
		if (!meta) return;
		setSavingLink(true);
		setError(null);
		try {
			const next = await library.updateDocumentCurriculum(meta.id, curriculum);
			setMeta(next);
			setMessage("Curriculum link saved.");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not save link.");
		} finally {
			setSavingLink(false);
		}
	}
	async function openOfflinePdf() {
		if (!meta) return;
		try {
			const binary = await getDocumentBinary(meta.id);
			if (!binary?.blob) {
				setError("PDF binary is not available offline.");
				return;
			}
			const url = URL.createObjectURL(binary.blob);
			window.open(url, "_blank", "noopener,noreferrer");
			setTimeout(() => URL.revokeObjectURL(url), 6e4);
		} catch {
			setError("Could not open the stored PDF.");
		}
	}
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-muted",
		children: "Loading document…"
	});
	if (!meta) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			role: "alert",
			className: "text-danger",
			children: error ?? "Document not found."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			variant: "secondary",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/library",
				children: "Back to library"
			})
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm font-medium tracking-wide text-muted uppercase",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/library",
							className: "hover:text-primary",
							children: "Library"
						}), " · Document"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-serif text-3xl font-semibold tracking-tight",
						children: meta.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-muted",
						children: [
							formatBytes(meta.sizeBytes),
							meta.pageCount != null ? ` · ${meta.pageCount} pages` : "",
							` · ${meta.status}`,
							meta.binaryStored ? " · available offline" : ""
						]
					}),
					meta.statusMessage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: meta.statusMessage
					}) : null
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
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-serif text-xl font-semibold",
						children: "Details"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Display name",
						htmlFor: "doc-name",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "doc-name",
							className: controlClassName,
							value: nameEdit,
							onChange: (e) => setNameEdit(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							onClick: () => void saveName(),
							children: "Save name"
						}), meta.binaryStored ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "secondary",
							onClick: () => void openOfflinePdf(),
							children: "Open PDF"
						}) : null]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: ["Original file: ", meta.originalName]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-serif text-xl font-semibold",
						children: "Curriculum link"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Optional. Documents remain usable without an installed pack."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Installed pack",
						htmlFor: "doc-pack",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "doc-pack",
							className: controlClassName,
							value: curriculum.packId ?? "",
							onChange: (e) => {
								const packId = e.target.value || null;
								const pack = packId ? library.getPack(packId) : void 0;
								setCurriculum({
									...emptyCurriculumLink(),
									packId,
									systemId: pack?.meta.systemId ?? null,
									versionId: pack?.meta.versionId ?? null,
									gradeCode: pack?.meta.gradeCode ?? null
								});
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "None"
							}), packOptions.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: p.packId,
								children: p.meta.title
							}, p.packId))]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Grade code",
						htmlFor: "doc-grade",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "doc-grade",
							className: controlClassName,
							value: curriculum.gradeCode ?? "",
							onChange: (e) => setCurriculum((c) => ({
								...c,
								gradeCode: e.target.value || null
							})),
							placeholder: "e.g. 11"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Subject",
						htmlFor: "doc-subject",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "doc-subject",
							className: controlClassName,
							value: curriculum.subjectId ?? "",
							onChange: (e) => {
								const subjectId = e.target.value || null;
								const sub = subjects.find((s) => s.id === subjectId);
								setCurriculum((c) => ({
									...c,
									subjectId,
									subjectCode: sub?.code ?? null,
									topicId: null,
									topicCode: null,
									packId: c.packId ?? sub?.packId ?? null
								}));
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "None"
							}), subjects.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: s.id,
								children: [
									s.name,
									" (",
									s.code,
									")"
								]
							}, s.id))]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Topic",
						htmlFor: "doc-topic",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "doc-topic",
							className: controlClassName,
							value: curriculum.topicId ?? "",
							disabled: !curriculum.subjectId,
							onChange: (e) => {
								const topicId = e.target.value || null;
								const topic = topics.find((t) => t.id === topicId);
								setCurriculum((c) => ({
									...c,
									topicId,
									topicCode: topic?.code ?? null
								}));
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "None"
							}), topics.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: t.id,
								children: t.title
							}, t.id))]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						disabled: savingLink,
						onClick: () => void saveCurriculum(),
						children: savingLink ? "Saving…" : "Save curriculum link"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-serif text-xl font-semibold",
					children: "Extracted content"
				}), !content || content.chunks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: meta.status === "scanned" ? "No selectable text layer. This looks like a scanned PDF. OCR is not implemented in this milestone." : "No extracted text available."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-4",
					children: content.chunks.map((chunk) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-md border border-line bg-paper p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mb-2 text-sm font-medium text-muted",
							children: [
								chunk.title ? `${chunk.title} · ` : "",
								"Pages ",
								chunk.pageStart,
								chunk.pageEnd !== chunk.pageStart ? `–${chunk.pageEnd}` : "",
								` · ${chunk.charCount} characters`
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "whitespace-pre-wrap text-ink",
							children: chunk.text
						})]
					}, chunk.id))
				})]
			})
		]
	});
}
var SplitComponent = function DocumentRoute() {
	const { documentId } = Route$3.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DocumentDetailPage, { documentId });
};
//#endregion
export { SplitComponent as component };
