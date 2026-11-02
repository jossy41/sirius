import { i as __toESM } from "../_runtime.mjs";
import { _t as stageLabel, ut as noteCountLabel } from "./cn-Ccejyh36.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { T as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as useLocalLibrary, f as Button } from "./router-03i3X1Nd.mjs";
import { r as Panel } from "./panel-B6qeBfmK.mjs";
import { t as cloudLibraryStatus } from "./env-DEnVd4uS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BZUcvNka.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Stable fallback used before the browser clock is available. */
var GREETING_FALLBACK = "Hello";
function greetingForHour(hour) {
	if (!Number.isInteger(hour) || hour < 0 || hour > 23) return GREETING_FALLBACK;
	if (hour < 12) return "Good morning";
	if (hour < 17) return "Good afternoon";
	return "Good evening";
}
function greeting(date = /* @__PURE__ */ new Date()) {
	return greetingForHour(date.getHours());
}
function HomePage() {
	const library = useLocalLibrary();
	const cloud = cloudLibraryStatus();
	const [hello, setHello] = (0, import_react.useState)(GREETING_FALLBACK);
	(0, import_react.useEffect)(() => {
		setHello(greeting());
	}, []);
	const name = library.profile.displayName;
	const heading = name ? `${hello}, ${name}.` : `${hello}.`;
	const notes = library.notes;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex max-w-2xl flex-col gap-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-primary",
					children: "Grades 9–12"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-serif text-4xl leading-tight text-ink md:text-5xl",
					children: heading
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-lg text-pretty text-muted",
					children: "Understand more, memorize less. Curriculum packs, local documents, practice, and revision stay on this device — adaptable beyond a single education system."
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-serif text-2xl text-ink",
						children: "Learning path"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
						className: "list-decimal space-y-1 pl-5 text-sm text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Install a curriculum pack" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Import study PDFs into Library" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Practice and get feedback" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Address misconceptions" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Revise on a schedule" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Check progress and try practice assessments" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2 pt-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								variant: "secondary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/library",
									children: "Library"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								variant: "secondary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/practice",
									children: "Practice"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								variant: "secondary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/progress",
									children: "Progress"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								variant: "secondary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/revision",
									children: "Revision"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								variant: "secondary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/tutor",
									search: {
										topic: void 0,
										objectiveId: void 0,
										misconceptionId: void 0,
										mode: void 0
									},
									children: "Tutor"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: "External AI and semantic embeddings need consent and server configuration. Offline study stays available without them."
					})
				]
			}),
			library.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted",
				children: "Opening your notebook…"
			}) : library.status === "error" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-serif text-3xl text-ink",
							children: "Desk"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-muted tabular-nums",
							children: noteCountLabel(notes.length)
						})] }),
						notes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "flex flex-col",
							children: notes.slice(0, 3).map((note) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "border-t border-line first:border-t-0",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/desk",
									hash: `note-${note.id}`,
									className: "block rounded-md py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block font-semibold break-words text-ink",
										children: note.title
									}), note.subject ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-0.5 block text-sm text-muted",
										children: note.subject
									}) : null]
								})
							}, note.id))
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/desk",
								children: notes.length > 0 ? "Open desk" : "Write a note"
							})
						}) })
					]
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-serif text-3xl text-ink",
						children: "Study"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-pretty text-muted",
						children: "Browse installed curriculum packs offline — subjects, topics, and learning objectives."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						variant: "secondary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/curriculum",
							children: "Open curriculum"
						})
					}) })]
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-serif text-3xl text-ink",
							children: "Learner"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-pretty text-muted",
							children: stageLabel(library.profile.grade, library.profile.stream)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: "Stored on this device. This is not an account."
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						variant: "secondary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/you",
							children: library.profile.grade ? "Update" : "Set grade"
						})
					}) })]
				}) })
			] }),
			cloud.state === "offline" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-pretty text-muted",
				children: cloud.summary
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Sirius · JOSCH LABS"
			})
		]
	});
}
var SplitComponent = HomePage;
//#endregion
export { SplitComponent as component };
