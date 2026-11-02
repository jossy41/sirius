import { i as __toESM } from "../_runtime.mjs";
import { $ as putRevisionSession, D as listLearningQuestions, F as putAnswerEvaluation, I as putAttempt, N as listRevisionSchedules, O as listMasteryAssessments, Q as putRevisionSchedule, Z as putRevisionHistory, b as listDocuments, k as listMisconceptions, p as getRevisionSession, q as putLearningQuestions } from "./cn-Ccejyh36.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { C as useParams, T as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { f as Button, u as loadDocumentDetail } from "./router-03i3X1Nd.mjs";
import { r as Panel } from "./panel-B6qeBfmK.mjs";
import { t as Field } from "./field-CPok0Yeo.mjs";
import { r as evaluateStudentAnswer, t as buildPracticeSession } from "./engine-Dq-QEi7h.mjs";
import { t as completeRevisionSession } from "./session-Bvzbym_h.mjs";
import { r as isOverdue, t as applyReviewOutcome } from "./scheduler-DxfjDz-T.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/session._sessionId-D5SpjBv2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function RevisionSessionPage() {
	const sessionId = useParams({ strict: false }).sessionId;
	const [session, setSession] = (0, import_react.useState)(null);
	const [questions, setQuestions] = (0, import_react.useState)([]);
	const [index, setIndex] = (0, import_react.useState)(0);
	const [answer, setAnswer] = (0, import_react.useState)("");
	const [evaluation, setEvaluation] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [doneMessage, setDoneMessage] = (0, import_react.useState)(null);
	const load = (0, import_react.useCallback)(async () => {
		if (!sessionId) return;
		const s = await getRevisionSession(sessionId);
		setSession(s ?? null);
		if (!s) return;
		if (s.questionIds.length > 0) {
			const all = await listLearningQuestions();
			setQuestions(all.filter((q) => s.questionIds.includes(q.id)));
			return;
		}
		const allQs = await listLearningQuestions();
		const topic = (s.topicLabel || "").toLowerCase();
		const obj = s.objectiveId || "";
		const matched = allQs.filter((q) => {
			if (obj && !obj.startsWith("topic:") && q.objectiveId === obj) return true;
			if (topic && (q.topic || "").toLowerCase().includes(topic)) return true;
			if (obj.startsWith("topic:") && (q.topic || "").toLowerCase().includes(obj.slice(6).toLowerCase())) return true;
			return false;
		}).slice(0, 3);
		if (matched.length > 0) {
			const updated = {
				...s,
				questionIds: matched.map((q) => q.id),
				documentId: matched[0]?.documentId ?? s.documentId
			};
			await putRevisionSession(updated);
			setSession(updated);
			setQuestions(matched);
			return;
		}
		const readyDocs = (await listDocuments()).filter((d) => d.status === "ready");
		let chosen = s.documentId ? readyDocs.find((d) => d.id === s.documentId) : void 0;
		if (!chosen && topic) chosen = readyDocs.find((d) => (d.name || "").toLowerCase().includes(topic) || (d.curriculum?.topicCode || "").toLowerCase().includes(topic) || (d.curriculum?.subjectCode || "").toLowerCase().includes(topic));
		if (!chosen) {
			setError(matched.length === 0 && readyDocs.length === 0 ? "No practice questions or offline documents are available for this objective yet. Complete a practice session on this topic first, or import a relevant document." : "No practice questions match this objective, and no clearly related offline document was found. Open Practice with a document on this topic, or import a relevant PDF with selectable text.");
			return;
		}
		try {
			const detail = await loadDocumentDetail(chosen.id);
			if (!detail?.content) {
				setError("Document content is not available offline.");
				return;
			}
			const built = await buildPracticeSession(detail.meta, detail.content, {
				topic: s.topicLabel || s.objectiveId,
				count: 2
			});
			if (!built.ok) {
				setError(built.message);
				return;
			}
			await putLearningQuestions(built.questions);
			const updated = {
				...s,
				documentId: chosen.id,
				questionIds: built.questions.map((q) => q.id)
			};
			await putRevisionSession(updated);
			setSession(updated);
			setQuestions(built.questions);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not start revision activity.");
		}
	}, [sessionId]);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	async function submit() {
		const q = questions[index];
		if (!q || !session) return;
		setBusy(true);
		setError(null);
		try {
			const ev = await evaluateStudentAnswer(q, answer);
			await putAnswerEvaluation(ev);
			const attemptId = typeof crypto !== "undefined" && crypto.randomUUID ? `at_${crypto.randomUUID()}` : `at_${Date.now()}`;
			await putAttempt({
				id: attemptId,
				sessionId: null,
				questionId: q.id,
				documentId: q.documentId,
				studentAnswer: answer,
				evaluationId: ev.id,
				correctness: ev.correctness,
				topicLabel: q.topic ?? session.topicLabel,
				createdAt: (/* @__PURE__ */ new Date()).toISOString()
			});
			setEvaluation(ev);
			const [schedules, mastery, mcs] = await Promise.all([
				listRevisionSchedules(),
				listMasteryAssessments(),
				listMisconceptions()
			]);
			const existing = schedules.find((s) => s.id === session.scheduleId) ?? null;
			const m = mastery.find((x) => x.objectiveId === session.objectiveId && (x.packId ?? null) === (session.packId ?? null)) ?? null;
			const nextSched = applyReviewOutcome({
				existing,
				objectiveId: session.objectiveId,
				packId: session.packId,
				topicLabel: session.topicLabel,
				conceptId: m?.conceptId ?? null,
				mastery: m,
				misconceptions: mcs,
				correctness: ev.correctness
			});
			await putRevisionSchedule(nextSched);
			await putRevisionHistory({
				id: typeof crypto !== "undefined" && crypto.randomUUID ? `rh_${crypto.randomUUID()}` : `rh_${Date.now()}`,
				scheduleId: nextSched.id,
				objectiveId: session.objectiveId,
				packId: session.packId,
				topicLabel: session.topicLabel,
				activityType: session.activityType,
				reviewedAt: (/* @__PURE__ */ new Date()).toISOString(),
				wasOverdue: existing ? isOverdue(existing) : false,
				previousScheduledAt: existing?.nextReviewAt ?? null,
				nextScheduledAt: nextSched.nextReviewAt,
				outcome: "completed",
				evaluationCorrectness: ev.correctness,
				evaluationId: ev.id,
				attemptId,
				sessionId: session.id,
				note: null
			});
			if (index >= questions.length - 1) {
				const completed = completeRevisionSession(session, {
					evaluationId: ev.id,
					correctness: ev.correctness
				});
				await putRevisionSession(completed);
				setSession(completed);
				setDoneMessage(`Session complete. Next review around ${nextSched.nextReviewAt.slice(0, 10)}. ${nextSched.reason}`);
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "Evaluation failed.");
		} finally {
			setBusy(false);
		}
	}
	if (!session) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted",
			children: "Session not found."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/revision",
			className: "text-primary underline",
			children: "Back to revision"
		})]
	});
	const q = questions[index];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex max-w-2xl flex-col gap-6 pb-24",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
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
						children: "Revision session"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: session.reason
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							session.topicLabel || session.objectiveId,
							" · ",
							session.activityType.replace(/_/g, " ")
						]
					})
				]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				className: "border-rose-500/40 bg-rose-500/5 text-sm",
				children: error
			}),
			doneMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-ink",
					children: doneMessage
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/revision",
					className: "text-primary underline text-sm",
					children: "Return to today's plan"
				})]
			}),
			q && session.status === "active" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							"Question ",
							index + 1,
							" of ",
							questions.length || 1
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-ink",
						children: q.text
					}),
					q.sourceExcerpts?.[0] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							"Source pp. ",
							q.sourceExcerpts[0].pageStart,
							"–",
							q.sourceExcerpts[0].pageEnd
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Your answer",
						htmlFor: "revision-answer",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							id: "revision-answer",
							className: "min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base text-ink placeholder:text-muted disabled:opacity-60",
							rows: 4,
							value: answer,
							onChange: (e) => setAnswer(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "primary",
						disabled: busy || !answer.trim(),
						onClick: () => void submit(),
						children: busy ? "Checking…" : "Submit"
					}),
					evaluation && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md border border-line p-3 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium text-ink",
								children: evaluation.correctness
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-muted",
								children: evaluation.explanation
							}),
							index < questions.length - 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "secondary",
								className: "mt-2",
								onClick: () => {
									setIndex((i) => i + 1);
									setAnswer("");
									setEvaluation(null);
								},
								children: "Next question"
							})
						]
					})
				]
			})
		]
	});
}
var SplitComponent = RevisionSessionPage;
//#endregion
export { SplitComponent as component };
