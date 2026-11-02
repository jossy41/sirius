import { i as __toESM } from "../_runtime.mjs";
import { ft as validateNoteDraft, lt as formatNoteTime, st as BODY_MAX, yt as AppError } from "./cn-Ccejyh36.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { T as require_jsx_runtime, p as useRouterState } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as useLocalLibrary, f as Button } from "./router-03i3X1Nd.mjs";
import { r as Panel } from "./panel-B6qeBfmK.mjs";
import { n as TextArea, r as TextInput, t as Field } from "./field-CPok0Yeo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/desk-SMy-6zXv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function DeskPage() {
	const library = useLocalLibrary();
	const [editingId, setEditingId] = (0, import_react.useState)(null);
	const [title, setTitle] = (0, import_react.useState)("");
	const [subject, setSubject] = (0, import_react.useState)("");
	const [body, setBody] = (0, import_react.useState)("");
	const [formError, setFormError] = (0, import_react.useState)(null);
	const [actionError, setActionError] = (0, import_react.useState)(null);
	const [message, setMessage] = (0, import_react.useState)(null);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [confirmingId, setConfirmingId] = (0, import_react.useState)(null);
	const [deletingId, setDeletingId] = (0, import_react.useState)(null);
	const hash = useRouterState({ select: (state) => state.location.hash });
	(0, import_react.useEffect)(() => {
		if (library.status !== "ready" || !hash) return;
		const id = decodeURIComponent(hash.replace(/^#/, ""));
		const target = document.getElementById(id);
		if (!target) return;
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		target.scrollIntoView({
			behavior: reduce ? "auto" : "smooth",
			block: "start"
		});
	}, [
		hash,
		library.status,
		library.notes
	]);
	function resetForm() {
		setEditingId(null);
		setTitle("");
		setSubject("");
		setBody("");
		setFormError(null);
		setActionError(null);
	}
	function editNote(note) {
		setEditingId(note.id);
		setTitle(note.title);
		setSubject(note.subject);
		setBody(note.body);
		setFormError(null);
		setActionError(null);
		setMessage(null);
		setConfirmingId(null);
		const form = document.getElementById("note-form");
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		form?.scrollIntoView({
			behavior: reduce ? "auto" : "smooth",
			block: "start"
		});
		document.getElementById("note-title")?.focus();
	}
	async function onSubmit(event) {
		event.preventDefault();
		const validated = validateNoteDraft({
			title,
			subject,
			body
		});
		if (!validated.ok) {
			setFormError(validated.message);
			setActionError(null);
			setMessage(null);
			return;
		}
		setSaving(true);
		setFormError(null);
		setActionError(null);
		try {
			await library.saveNote(validated.value, editingId ?? void 0);
			resetForm();
			setMessage("Saved on this device.");
		} catch (error) {
			setMessage(null);
			setActionError(null);
			setFormError(error instanceof Error ? error.message : "Could not save on this device.");
		} finally {
			setSaving(false);
		}
	}
	async function remove(id) {
		setDeletingId(id);
		setFormError(null);
		setActionError(null);
		try {
			await library.deleteNote(id);
			if (editingId === id) resetForm();
			setConfirmingId(null);
			setMessage("Deleted from this device.");
		} catch (error) {
			setMessage(null);
			setActionError(error instanceof AppError ? error.message : "Could not delete this note.");
		} finally {
			setDeletingId(null);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex max-w-2xl flex-col gap-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-serif text-4xl leading-tight text-ink",
			children: "Desk"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-lg text-pretty text-muted",
			children: "Notes saved in this browser. Clearing site data for Sirius deletes them."
		})] }), library.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted",
			children: "Opening your notebook…"
		}) : library.status === "error" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			id: "note-form",
			className: "flex scroll-mt-24 flex-col gap-5",
			onSubmit,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-serif text-3xl text-ink",
					children: editingId ? "Edit note" : "New note"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Title",
					htmlFor: "note-title",
					error: formError,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
						id: "note-title",
						name: "title",
						value: title,
						maxLength: 120,
						required: true,
						onChange: (event) => {
							setTitle(event.target.value);
							setFormError(null);
							setActionError(null);
							setMessage(null);
						}
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Subject",
					htmlFor: "note-subject",
					hint: "Optional. Use the name you use in school.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
						id: "note-subject",
						name: "subject",
						value: subject,
						maxLength: 60,
						onChange: (event) => setSubject(event.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Note",
					htmlFor: "note-body",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextArea, {
						id: "note-body",
						name: "body",
						value: body,
						maxLength: BODY_MAX,
						onChange: (event) => setBody(event.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: saving,
						children: saving ? "Saving…" : editingId ? "Save changes" : "Save note"
					}), editingId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "secondary",
						onClick: resetForm,
						disabled: saving,
						children: "Cancel"
					}) : null]
				}),
				message ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					role: "status",
					className: "text-sm text-primary",
					children: message
				}) : null
			]
		}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-serif text-3xl text-ink",
				children: "On this device"
			}),
			actionError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				role: "alert",
				className: "mt-3 text-sm text-danger",
				children: actionError
			}) : null,
			library.notes.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-pretty text-muted",
				children: "No notes yet."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2",
				children: library.notes.map((note) => {
					const confirming = confirmingId === note.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						id: `note-${note.id}`,
						className: "scroll-mt-24 border-t border-line py-5 first:border-t-0",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
							note.subject ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-semibold text-primary",
								children: note.subject
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "font-serif text-2xl break-words text-ink",
								children: note.title
							}),
							note.updatedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted tabular-nums",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", {
									dateTime: note.updatedAt,
									children: formatNoteTime(note.updatedAt)
								})
							}) : null,
							note.body ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 break-words whitespace-pre-wrap text-ink",
								children: note.body
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-4 flex flex-wrap gap-2",
								children: confirming ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "danger",
									disabled: deletingId === note.id,
									onClick: () => void remove(note.id),
									children: deletingId === note.id ? "Deleting…" : "Delete note"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "secondary",
									onClick: () => setConfirmingId(null),
									children: "Keep"
								})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "secondary",
									onClick: () => editNote(note),
									children: "Edit"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									onClick: () => setConfirmingId(note.id),
									children: "Delete"
								})] })
							})
						] })
					}, note.id);
				})
			})
		] })] })]
	});
}
var SplitComponent = DeskPage;
//#endregion
export { SplitComponent as component };
