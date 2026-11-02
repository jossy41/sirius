import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { T as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as useLocalLibrary, f as Button, r as Route$5 } from "./router-03i3X1Nd.mjs";
import { r as Panel } from "./panel-B6qeBfmK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/curriculum._packId-CTeZTVpn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function topicsForSubject(topics, subjectId) {
	return topics.filter((t) => t.subjectId === subjectId).sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}
function rootTopics(topics) {
	return topics.filter((t) => t.parentId === null);
}
function childrenOf(topics, parentId) {
	return topics.filter((t) => t.parentId === parentId);
}
function objectivesForTopic(objectives, topicId) {
	return objectives.filter((o) => o.topicId === topicId);
}
function TopicTree({ topics, objectives, parentId, depth = 0 }) {
	const nodes = parentId === null ? rootTopics(topics) : childrenOf(topics, parentId);
	if (nodes.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: depth === 0 ? "flex flex-col gap-4" : "mt-2 flex flex-col gap-3 border-l border-line pl-4",
		children: nodes.map((topic) => {
			const objs = objectivesForTopic(objectives, topic.id);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
					className: "font-semibold text-ink",
					children: topic.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted",
					children: ["code ", topic.code]
				})] }),
				objs.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 flex flex-col gap-2",
					children: objs.map((obj) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-md border border-line bg-surface/60 px-3 py-2 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-ink",
							children: obj.statement
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs text-muted",
							children: [
								obj.cognitiveLevel,
								" · ",
								obj.code
							]
						})]
					}, obj.id))
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TopicTree, {
					topics,
					objectives,
					parentId: topic.id,
					depth: depth + 1
				})
			] }, topic.id);
		})
	});
}
function PackBrowsePage({ packId }) {
	const library = useLocalLibrary();
	const record = library.getPack(packId);
	const [selectedSubjectId, setSelectedSubjectId] = (0, import_react.useState)(null);
	const subjects = (0, import_react.useMemo)(() => {
		if (!record) return [];
		return [...record.content.subjects].sort((a, b) => a.name.localeCompare(b.name));
	}, [record]);
	const activeSubjectId = selectedSubjectId ?? subjects[0]?.id ?? null;
	const activeSubject = subjects.find((s) => s.id === activeSubjectId) ?? null;
	const subjectTopics = activeSubject ? topicsForSubject(record.content.topics, activeSubject.id) : [];
	if (library.status === "loading") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-muted",
		children: "Loading pack…"
	});
	if (!record) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex max-w-2xl flex-col gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted",
			children: "This pack is not installed on this device."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			variant: "primary",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/curriculum",
				children: "Back to packs"
			})
		})]
	});
	const meta = record.meta;
	const content = record.content;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex max-w-2xl flex-col gap-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm font-semibold text-primary",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/curriculum",
							className: "hover:underline",
							children: "Curriculum"
						}),
						" · ",
						"Grade ",
						meta.gradeCode,
						meta.streamCode ? ` · ${meta.streamCode}` : ""
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-serif text-4xl leading-tight text-ink md:text-5xl",
					children: meta.title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-muted",
					children: [
						content.system.name,
						" · ",
						content.version.label
					]
				}),
				meta.isDevelopmentFixture ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900",
					children: "Development fixture only. Not official Ministry of Education curriculum content."
				}) : null
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-serif text-2xl text-ink",
					children: "Subjects"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-2",
					children: subjects.map((subject) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: subject.id === activeSubjectId ? "primary" : "ghost",
						onClick: () => setSelectedSubjectId(subject.id),
						children: subject.name
					}, subject.id))
				})]
			}),
			activeSubject ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-serif text-xl text-ink",
					children: activeSubject.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [
						"code ",
						activeSubject.code,
						" · language ",
						activeSubject.language,
						activeSubject.streamCodes.length > 0 ? ` · streams ${activeSubject.streamCodes.join(", ")}` : " · all streams"
					]
				})] }), subjectTopics.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: "No topics in this subject."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TopicTree, {
					topics: subjectTopics,
					objectives: content.objectives,
					parentId: null
				})]
			}) }) : null,
			content.sourceRefs.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-serif text-xl text-ink",
					children: "Source references"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-col gap-2 text-sm text-muted",
					children: content.sourceRefs.map((ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "border-t border-line pt-2 first:border-t-0 first:pt-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-ink",
								children: ref.citation
							}),
							ref.locator ? ` · ${ref.locator}` : "",
							ref.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [" · ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: ref.url,
								className: "text-primary underline",
								target: "_blank",
								rel: "noreferrer",
								children: "link"
							})] }) : null
						]
					}, ref.id))
				})]
			}) : null
		]
	});
}
var SplitComponent = function PackRoute() {
	const { packId } = Route$5.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackBrowsePage, { packId });
};
//#endregion
export { SplitComponent as component };
