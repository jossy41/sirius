import { i as __toESM } from "../_runtime.mjs";
import { C as listExamSessions, D as listLearningQuestions, H as putExamDefinition, S as listExamResults, T as listInstalledPacks, W as putExamSession, x as listExamDefinitions } from "./cn-Ccejyh36.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { T as require_jsx_runtime, b as Link, x as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { f as Button } from "./router-03i3X1Nd.mjs";
import { r as Panel } from "./panel-B6qeBfmK.mjs";
import { i as controlClassName, t as Field } from "./field-CPok0Yeo.mjs";
import { a as selectExamQuestions, n as createExamSession, o as snapshotQuestions, t as buildExamDefinition } from "./engine-CqH-M_Kz.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/exams-BRBIzYR7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ExamsPage() {
	const navigate = useNavigate();
	const [defs, setDefs] = (0, import_react.useState)([]);
	const [sessions, setSessions] = (0, import_react.useState)([]);
	const [results, setResults] = (0, import_react.useState)([]);
	const [packs, setPacks] = (0, import_react.useState)([]);
	const [packId, setPackId] = (0, import_react.useState)("");
	const [topic, setTopic] = (0, import_react.useState)("");
	const [count, setCount] = (0, import_react.useState)(5);
	const [minutes, setMinutes] = (0, import_react.useState)(20);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [info, setInfo] = (0, import_react.useState)(null);
	const refresh = (0, import_react.useCallback)(async () => {
		const [d, s, r, p] = await Promise.all([
			listExamDefinitions(),
			listExamSessions(),
			listExamResults(),
			listInstalledPacks()
		]);
		setDefs(d);
		setSessions(s);
		setResults(r);
		setPacks(p);
	}, []);
	(0, import_react.useEffect)(() => {
		refresh();
	}, [refresh]);
	async function createAssessment() {
		setBusy(true);
		setError(null);
		setInfo(null);
		try {
			const questions = await listLearningQuestions();
			const selected = selectExamQuestions({
				packId: packId || null,
				topicLabels: topic.trim() ? [topic.trim()] : [],
				questionCount: count,
				durationMinutes: minutes,
				availableQuestions: questions
			});
			if (!selected.ok) {
				setError(selected.message ?? "Could not build assessment.");
				return;
			}
			if (selected.message) setInfo(selected.message);
			const def = buildExamDefinition({
				packId: packId || null,
				topicLabels: topic.trim() ? [topic.trim()] : [],
				questionCount: count,
				durationMinutes: minutes,
				availableQuestions: questions
			}, selected.questions);
			const snaps = snapshotQuestions(selected.questions);
			const session = createExamSession(def, snaps);
			await putExamDefinition(def);
			await putExamSession(session);
			await refresh();
			navigate({
				to: "/exams/$examId",
				params: { examId: session.id }
			});
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to create assessment.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex max-w-2xl flex-col gap-6 pb-24",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-serif text-3xl text-ink",
					children: "Exams"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Practice assessments built from your offline questions. These are not official past papers unless a curriculum blueprint is configured and clearly labelled."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-serif text-xl text-ink",
						children: "New practice assessment"
					}),
					packs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Curriculum pack",
						htmlFor: "exam-pack",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "exam-pack",
							className: "min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base text-ink placeholder:text-muted disabled:opacity-60",
							value: packId,
							onChange: (e) => setPackId(e.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "Any / none"
							}), packs.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: p.packId,
								children: p.meta?.title ?? p.packId
							}, p.packId))]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Topic filter (optional)",
						htmlFor: "exam-topic",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "exam-topic",
							className: controlClassName,
							value: topic,
							onChange: (e) => setTopic(e.target.value),
							placeholder: "e.g. mass and weight"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Questions",
							htmlFor: "exam-count",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "exam-count",
								type: "number",
								min: 1,
								max: 30,
								className: controlClassName,
								value: count,
								onChange: (e) => setCount(Number(e.target.value) || 5)
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Minutes",
							htmlFor: "exam-mins",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "exam-mins",
								type: "number",
								min: 5,
								max: 180,
								className: controlClassName,
								value: minutes,
								onChange: (e) => setMinutes(Number(e.target.value) || 20)
							})
						})]
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-rose-700 dark:text-rose-300",
						children: error
					}),
					info && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: info
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "primary",
						disabled: busy,
						onClick: () => void createAssessment(),
						children: busy ? "Preparing…" : "Start practice assessment"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-serif text-xl text-ink",
					children: "In progress"
				}), sessions.filter((s) => s.status === "in_progress" || s.status === "ready").length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "No active sessions."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-2",
					children: sessions.filter((s) => s.status === "in_progress" || s.status === "ready").map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/exams/$examId",
						params: { examId: s.id },
						className: "text-primary underline text-sm",
						children: [
							"Session ",
							s.status,
							" · ",
							s.questionSnapshots.length,
							" questions"
						]
					}) }, s.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-serif text-xl text-ink",
					children: "History"
				}), results.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "No completed assessments yet."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-2 text-sm",
					children: results.slice(0, 12).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/exams/results/$examId",
						params: { examId: r.sessionId },
						className: "text-primary underline",
						children: r.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted",
						children: [
							" ",
							"· ",
							r.marksEarned,
							"/",
							r.totalMarks,
							" · ",
							r.submittedAt.slice(0, 10)
						]
					})] }, r.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-1 text-sm text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Heuristic marking is not a teacher grade. Low-confidence answers may need manual review." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Source-grounded questions keep page references when available." })]
			})
		]
	});
}
var SplitComponent = ExamsPage;
//#endregion
export { SplitComponent as component };
