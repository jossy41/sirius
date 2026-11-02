import { i as __toESM } from "./_runtime.mjs";
import { S as listExamResults, f as getExamSession } from "./_ssr/cn-Ccejyh36.mjs";
import { n as require_react } from "./_libs/@radix-ui/react-compose-refs+[...].mjs";
import { C as useParams, T as require_jsx_runtime, b as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { r as Panel } from "./_ssr/panel-B6qeBfmK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_examId-DSXvAUBb.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ExamResultsPage() {
	const params = useParams({ strict: false });
	const [result, setResult] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		(async () => {
			const all = await listExamResults();
			const r = all.find((x) => x.sessionId === params.examId) ?? all.find((x) => x.id === params.examId) ?? null;
			setResult(r);
			if (!r && params.examId) await getExamSession(params.examId);
		})();
	}, [params.examId]);
	if (!result) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted",
			children: "Result not found."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/exams",
			className: "underline text-primary",
			children: "Exams"
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex max-w-2xl flex-col gap-6 pb-24",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/exams",
							className: "underline",
							children: "Exams"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-serif text-3xl text-ink",
						children: result.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: result.assessmentLabel
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-3xl font-semibold tabular-nums text-ink",
						children: [
							result.marksEarned,
							" / ",
							result.totalMarks
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							"Submitted ",
							result.submittedAt.slice(0, 16).replace("T", " "),
							result.timeTakenSeconds != null ? ` · ${Math.floor(result.timeTakenSeconds / 60)}m ${result.timeTakenSeconds % 60}s` : ""
						]
					}),
					result.manualReviewCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-amber-800 dark:text-amber-200",
						children: [result.manualReviewCount, " answer(s) need human judgment (low confidence or unevaluable)."]
					})
				]
			}),
			result.topicBreakdown.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-serif text-xl text-ink",
					children: "By topic"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "text-sm space-y-1",
					children: result.topicBreakdown.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						t.topic,
						": ",
						t.earned,
						"/",
						t.available
					] }, t.topic))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-serif text-xl text-ink",
					children: "Questions"
				}), result.questionResults.map((q, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-b border-line pb-2 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-medium text-ink",
							children: [
								"Q",
								i + 1,
								": ",
								q.correctness,
								" · ",
								q.marksAwarded,
								"/",
								q.marksAvailable,
								q.requiresManualReview ? " · review" : ""
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-muted",
							children: q.explanation
						}),
						q.sourceExcerpts[0] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted",
							children: [
								"Source pp. ",
								q.sourceExcerpts[0].pageStart,
								"–",
								q.sourceExcerpts[0].pageEnd
							]
						})
					]
				}, q.snapshotId))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "text-sm text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Marks are heuristic, not an official grade. Use Progress and Revision for next steps based on this evidence." }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/revision",
							className: "underline text-primary",
							children: "Open revision"
						}),
						" · ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/progress",
							className: "underline text-primary",
							children: "Progress"
						})
					]
				})]
			})
		]
	});
}
var SplitComponent = ExamResultsPage;
//#endregion
export { SplitComponent as component };
