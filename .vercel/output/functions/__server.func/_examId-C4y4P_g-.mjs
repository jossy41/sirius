import { i as __toESM } from "./_runtime.mjs";
import { F as putAnswerEvaluation, I as putAttempt, U as putExamResult, W as putExamSession, d as getExamDefinition, f as getExamSession } from "./_ssr/cn-Ccejyh36.mjs";
import { n as require_react } from "./_libs/@radix-ui/react-compose-refs+[...].mjs";
import { C as useParams, T as require_jsx_runtime, b as Link, x as useNavigate } from "./_libs/@tanstack/react-router+[...].mjs";
import { f as Button } from "./_ssr/router-03i3X1Nd.mjs";
import { r as Panel } from "./_ssr/panel-B6qeBfmK.mjs";
import { t as Field } from "./_ssr/field-CPok0Yeo.mjs";
import { c as submitExamSession, i as saveAnswer, r as remainingSeconds, s as startExamSession } from "./_ssr/engine-CqH-M_Kz.mjs";
import { r as evaluateStudentAnswer } from "./_ssr/engine-Dq-QEi7h.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_examId-C4y4P_g-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function rid(prefix) {
	if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function snapshotToQuestion(s) {
	return {
		id: s.questionId,
		type: s.type,
		text: s.text,
		difficulty: s.difficulty,
		cognitiveLevel: s.cognitiveLevel,
		subject: s.subject,
		topic: s.topicLabel,
		objectiveId: s.objectiveId,
		documentId: s.documentId ?? "exam",
		sourceExcerpts: s.sourceExcerpts,
		choices: s.choices,
		correctChoiceIndex: s.correctChoiceIndex,
		expectedAnswer: s.expectedAnswer,
		markingGuidance: null,
		explanation: "",
		evidenceLevel: s.evidenceLevel,
		generatedBy: "heuristic",
		createdAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
function marksFromCorrectness(correctness, available, confidence) {
	if (correctness === "unevaluable" || confidence === "low") return {
		awarded: 0,
		manual: true
	};
	if (correctness === "correct") return {
		awarded: available,
		manual: false
	};
	if (correctness === "partial") return {
		awarded: Math.max(.5, available * .5),
		manual: false
	};
	return {
		awarded: 0,
		manual: false
	};
}
async function evaluateExamSession(input) {
	const evaluations = [];
	const questionResults = [];
	for (const snap of input.session.questionSnapshots) {
		const raw = input.session.answers[snap.id] ?? "";
		const q = snapshotToQuestion(snap);
		let ev;
		if (!raw.trim()) ev = {
			id: rid("ev"),
			questionId: q.id,
			studentAnswer: "",
			correctness: "incorrect",
			explanation: "No answer was submitted for this question.",
			understood: [],
			missingOrIncorrect: ["Unanswered"],
			suggestedImprovement: "Attempt every question when time allows.",
			sourceExcerpts: snap.sourceExcerpts,
			confidence: "high",
			evidenceLevel: snap.evidenceLevel,
			evaluatedBy: "heuristic",
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		else ev = await evaluateStudentAnswer(q, raw);
		evaluations.push(ev);
		const { awarded, manual } = marksFromCorrectness(ev.correctness, snap.marks, ev.confidence);
		questionResults.push({
			snapshotId: snap.id,
			questionId: snap.questionId,
			correctness: ev.correctness,
			marksAwarded: awarded,
			marksAvailable: snap.marks,
			explanation: ev.explanation,
			confidence: ev.confidence,
			requiresManualReview: manual || ev.correctness === "unevaluable",
			evaluationId: ev.id,
			objectiveId: snap.objectiveId,
			topicLabel: snap.topicLabel,
			sourceExcerpts: snap.sourceExcerpts
		});
	}
	const topicMap = /* @__PURE__ */ new Map();
	const objMap = /* @__PURE__ */ new Map();
	for (const r of questionResults) {
		const topic = r.topicLabel || "General";
		const t = topicMap.get(topic) ?? {
			earned: 0,
			available: 0
		};
		t.earned += r.marksAwarded;
		t.available += r.marksAvailable;
		topicMap.set(topic, t);
		if (r.objectiveId) {
			const o = objMap.get(r.objectiveId) ?? {
				earned: 0,
				available: 0
			};
			o.earned += r.marksAwarded;
			o.available += r.marksAvailable;
			objMap.set(r.objectiveId, o);
		}
	}
	let timeTaken = null;
	if (input.session.startedAt && input.session.submittedAt) timeTaken = Math.max(0, Math.floor((new Date(input.session.submittedAt).getTime() - new Date(input.session.startedAt).getTime()) / 1e3));
	const marksEarned = questionResults.reduce((s, r) => s + r.marksAwarded, 0);
	const totalMarks = questionResults.reduce((s, r) => s + r.marksAvailable, 0);
	return {
		result: {
			id: rid("exr"),
			examId: input.definition.id,
			sessionId: input.session.id,
			kind: input.definition.kind,
			title: input.definition.title,
			packId: input.definition.packId,
			submittedAt: input.session.submittedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
			timeTakenSeconds: timeTaken,
			totalMarks,
			marksEarned,
			questionResults,
			topicBreakdown: [...topicMap.entries()].map(([topic, v]) => ({
				topic,
				...v
			})),
			objectiveBreakdown: [...objMap.entries()].map(([objectiveId, v]) => ({
				objectiveId,
				...v
			})),
			misconceptionIds: [],
			manualReviewCount: questionResults.filter((r) => r.requiresManualReview).length,
			assessmentLabel: input.definition.assessmentLabel,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		},
		evaluations
	};
}
/** Build attempt records for exam answers without double-counting on re-eval. */
function examEvidenceProvenanceKey(sessionId, snapshotId) {
	return `exam:${sessionId}:${snapshotId}`;
}
function ExamSessionPage() {
	const examId = useParams({ strict: false }).examId;
	const navigate = useNavigate();
	const [session, setSession] = (0, import_react.useState)(null);
	const [left, setLeft] = (0, import_react.useState)(0);
	const [answer, setAnswer] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const persist = (0, import_react.useCallback)(async (s) => {
		await putExamSession(s);
		setSession(s);
	}, []);
	const load = (0, import_react.useCallback)(async () => {
		if (!examId) return;
		let s = await getExamSession(examId);
		if (!s) return;
		if (s.status === "ready") {
			s = startExamSession(s);
			await putExamSession(s);
		}
		setSession(s);
		const snap = s.questionSnapshots[s.currentIndex];
		setAnswer(snap ? s.answers[snap.id] ?? "" : "");
		setLeft(remainingSeconds(s));
	}, [examId]);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	(0, import_react.useEffect)(() => {
		if (!session || session.status !== "in_progress") return;
		const t = setInterval(() => {
			const rem = remainingSeconds(session);
			setLeft(rem);
			if (rem <= 0) autoSubmit();
		}, 1e3);
		return () => clearInterval(t);
	}, [
		session?.id,
		session?.endsAt,
		session?.status
	]);
	async function autoSubmit() {
		if (!session || session.status === "submitted" || session.status === "evaluated") return;
		await finish(session);
	}
	async function saveCurrent() {
		if (!session) return;
		const snap = session.questionSnapshots[session.currentIndex];
		if (!snap) return;
		const next = saveAnswer(session, snap.id, answer);
		await persist(next);
	}
	async function goTo(i) {
		if (!session) return;
		const snap = session.questionSnapshots[session.currentIndex];
		let s = session;
		if (snap) s = saveAnswer(session, snap.id, answer);
		s = {
			...s,
			currentIndex: i,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		await persist(s);
		const n = s.questionSnapshots[i];
		setAnswer(n ? s.answers[n.id] ?? "" : "");
	}
	async function finish(s) {
		setBusy(true);
		setError(null);
		try {
			const snap = s.questionSnapshots[s.currentIndex];
			let cur = snap ? saveAnswer(s, snap.id, answer) : s;
			cur = submitExamSession(cur);
			await putExamSession(cur);
			const def = await getExamDefinition(cur.examId);
			if (!def) {
				setError("Exam definition missing.");
				return;
			}
			const { result, evaluations } = await evaluateExamSession({
				session: cur,
				definition: def
			});
			for (const ev of evaluations) await putAnswerEvaluation(ev);
			for (const qr of result.questionResults) {
				const snapQ = cur.questionSnapshots.find((x) => x.id === qr.snapshotId);
				await putAttempt({
					id: examEvidenceProvenanceKey(cur.id, qr.snapshotId),
					sessionId: cur.id,
					questionId: qr.questionId,
					documentId: snapQ?.documentId ?? "exam",
					studentAnswer: cur.answers[qr.snapshotId] ?? "",
					evaluationId: qr.evaluationId ?? "",
					correctness: qr.correctness,
					topicLabel: qr.topicLabel,
					createdAt: result.submittedAt
				});
			}
			await putExamResult(result);
			cur = {
				...cur,
				status: "evaluated",
				updatedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			await putExamSession(cur);
			setSession(cur);
			navigate({
				to: "/exams/results/$examId",
				params: { examId: cur.id }
			});
		} catch (e) {
			setError(e instanceof Error ? e.message : "Submit failed.");
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
			to: "/exams",
			className: "underline text-primary",
			children: "Exams"
		})]
	});
	const snap = session.questionSnapshots[session.currentIndex];
	const mm = String(Math.floor(left / 60)).padStart(2, "0");
	const ss = String(left % 60).padStart(2, "0");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex max-w-2xl flex-col gap-4 pb-24",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/exams",
						className: "underline",
						children: "Exams"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-serif text-2xl text-ink",
					children: "Assessment"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md border border-line px-3 py-1 font-mono text-lg tabular-nums",
					children: [
						mm,
						":",
						ss
					]
				})]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				className: "text-sm text-rose-700",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-1",
				children: session.questionSnapshots.map((q, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `size-8 rounded text-xs ${i === session.currentIndex ? "bg-primary text-white" : session.answerStatus[q.id] === "answered" ? "bg-emerald-500/20" : "border border-line"}`,
					onClick: () => void goTo(i),
					children: i + 1
				}, q.id))
			}),
			snap && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							snap.marks,
							" mark",
							snap.marks === 1 ? "" : "s",
							" · ",
							snap.type.replace(/_/g, " "),
							" ·",
							" ",
							snap.difficulty
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-ink",
						children: snap.text
					}),
					snap.sourceExcerpts[0] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							"Source pp. ",
							snap.sourceExcerpts[0].pageStart,
							"–",
							snap.sourceExcerpts[0].pageEnd
						]
					}),
					snap.choices ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-2",
						children: snap.choices.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "radio",
								name: "choice",
								checked: answer === String(i),
								onChange: () => setAnswer(String(i))
							}), c]
						}, i))
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Answer",
						htmlFor: "exam-ans",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							id: "exam-ans",
							className: "min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base text-ink placeholder:text-muted disabled:opacity-60",
							rows: 4,
							value: answer,
							onChange: (e) => setAnswer(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "secondary",
								onClick: () => void saveCurrent(),
								children: "Save"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "secondary",
								disabled: session.currentIndex <= 0,
								onClick: () => void goTo(session.currentIndex - 1),
								children: "Previous"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "secondary",
								disabled: session.currentIndex >= session.questionSnapshots.length - 1,
								onClick: () => void goTo(session.currentIndex + 1),
								children: "Next"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "primary",
								disabled: busy,
								onClick: () => void finish(session),
								children: busy ? "Submitting…" : "Submit"
							})
						]
					})
				]
			})
		]
	});
}
var SplitComponent = ExamSessionPage;
//#endregion
export { SplitComponent as component };
