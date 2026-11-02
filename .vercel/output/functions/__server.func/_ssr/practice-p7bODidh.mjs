import { i as __toESM } from "../_runtime.mjs";
import { F as putAnswerEvaluation, G as putFeynmanSession, I as putAttempt, X as putPracticeSession, Y as putMisconception, g as listAttempts, h as listAnswerEvaluations, j as listPracticeSessions, k as listMisconceptions, q as putLearningQuestions, w as listFeynmanSessions } from "./cn-Ccejyh36.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { T as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as useLocalLibrary, f as Button, u as loadDocumentDetail } from "./router-03i3X1Nd.mjs";
import { r as Panel } from "./panel-B6qeBfmK.mjs";
import { i as controlClassName, t as Field } from "./field-CPok0Yeo.mjs";
import { a as mergeMisconceptionEvidence, i as findMatchingMisconception, n as diagnoseAnswer, o as runFeynman, r as evaluateStudentAnswer, t as buildPracticeSession } from "./engine-Dq-QEi7h.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/practice-p7bODidh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function PracticePage() {
	const library = useLocalLibrary();
	const readyDocs = (0, import_react.useMemo)(() => library.documents.filter((d) => d.status === "ready"), [library.documents]);
	const [documentId, setDocumentId] = (0, import_react.useState)("");
	const [topic, setTopic] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [providerLabel, setProviderLabel] = (0, import_react.useState)(null);
	const [session, setSession] = (0, import_react.useState)(null);
	const [questions, setQuestions] = (0, import_react.useState)([]);
	const [index, setIndex] = (0, import_react.useState)(0);
	const [answer, setAnswer] = (0, import_react.useState)("");
	const [evaluation, setEvaluation] = (0, import_react.useState)(null);
	const [feynmanTopic, setFeynmanTopic] = (0, import_react.useState)("");
	const [feynmanText, setFeynmanText] = (0, import_react.useState)("");
	const [feynmanResult, setFeynmanResult] = (0, import_react.useState)(null);
	const [historySessions, setHistorySessions] = (0, import_react.useState)([]);
	const [attemptCount, setAttemptCount] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		Promise.all([
			listPracticeSessions(),
			listAttempts(),
			listFeynmanSessions()
		]).then(([sessions, attempts]) => {
			setHistorySessions(sessions);
			setAttemptCount(attempts.length);
		});
	}, [
		session,
		evaluation,
		feynmanResult
	]);
	async function startSession() {
		setBusy(true);
		setError(null);
		setEvaluation(null);
		setSession(null);
		setQuestions([]);
		setIndex(0);
		setAnswer("");
		try {
			if (!documentId) {
				setError("Choose a document with extracted text.");
				return;
			}
			const detail = await loadDocumentDetail(documentId);
			if (!detail?.content) {
				setError("Document content is not available offline.");
				return;
			}
			const result = await buildPracticeSession(detail.meta, detail.content, {
				topic: topic || null,
				subject: detail.meta.curriculum.subjectCode,
				count: 4
			});
			setProviderLabel(result.provider.label);
			if (!result.ok) {
				setError(result.message);
				return;
			}
			await putLearningQuestions(result.questions);
			await putPracticeSession(result.session);
			setSession(result.session);
			setQuestions(result.questions);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not start practice.");
		} finally {
			setBusy(false);
		}
	}
	async function submitAnswer() {
		const q = questions[index];
		if (!q) return;
		setBusy(true);
		setError(null);
		try {
			const ev = await evaluateStudentAnswer(q, answer);
			const [allAttempts, allEvaluations, existingMisconceptions] = await Promise.all([
				listAttempts(),
				listAnswerEvaluations(),
				listMisconceptions()
			]);
			const relatedAttempts = allAttempts.filter((a) => a.evaluationId !== ev.id && (a.topicLabel === q.topic || a.documentId === q.documentId));
			const relatedEvaluations = allEvaluations.filter((e) => e.id !== ev.id && relatedAttempts.some((a) => a.evaluationId === e.id || a.questionId === e.questionId));
			await putAnswerEvaluation(ev);
			await putAttempt({
				id: typeof crypto !== "undefined" && crypto.randomUUID ? `at_${crypto.randomUUID()}` : `at_${Date.now()}`,
				sessionId: session?.id ?? null,
				questionId: q.id,
				documentId: q.documentId,
				studentAnswer: answer,
				evaluationId: ev.id,
				correctness: ev.correctness,
				topicLabel: q.topic,
				createdAt: (/* @__PURE__ */ new Date()).toISOString()
			});
			try {
				const diag = await diagnoseAnswer({
					evaluation: ev,
					question: q,
					priorAttempts: relatedAttempts,
					priorEvaluations: relatedEvaluations
				});
				if (diag.possibleMisconception) {
					const match = findMatchingMisconception(existingMisconceptions, diag.possibleMisconception);
					if (match) await putMisconception(mergeMisconceptionEvidence(match, diag.possibleMisconception));
					else if (!diag.needsMoreEvidence && diag.possibleMisconception.id && diag.possibleMisconception.status === "confirmed") await putMisconception(diag.possibleMisconception);
					else if (diag.possibleMisconception.title) {
						const now = (/* @__PURE__ */ new Date()).toISOString();
						await putMisconception({
							id: typeof crypto !== "undefined" && crypto.randomUUID ? `mc_${crypto.randomUUID()}` : `mc_${Date.now()}`,
							concept: diag.possibleMisconception.concept ?? q.topic ?? "topic",
							topicLabel: diag.possibleMisconception.topicLabel ?? q.topic,
							documentId: diag.possibleMisconception.documentId ?? q.documentId,
							category: diag.possibleMisconception.category ?? "other",
							description: diag.possibleMisconception.description ?? "",
							title: diag.possibleMisconception.title,
							observations: diag.possibleMisconception.observations ?? [],
							supportingExcerpts: diag.possibleMisconception.supportingExcerpts ?? [],
							confidence: "low",
							status: "suspected",
							firstObservedAt: now,
							lastObservedAt: now,
							observationCount: diag.possibleMisconception.observations?.length ?? 1,
							remediationSessionIds: [],
							diagnosticQuestionIds: [],
							createdAt: now,
							updatedAt: now
						});
					}
				}
			} catch {}
			setEvaluation(ev);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Evaluation failed.");
		} finally {
			setBusy(false);
		}
	}
	async function submitFeynman() {
		setBusy(true);
		setError(null);
		setFeynmanResult(null);
		try {
			if (!documentId) {
				setError("Choose a document first.");
				return;
			}
			const detail = await loadDocumentDetail(documentId);
			if (!detail?.content) {
				setError("Document content is not available offline.");
				return;
			}
			const fy = await runFeynman(detail.meta, detail.content, feynmanTopic.trim() || detail.meta.name, feynmanText);
			await putFeynmanSession(fy);
			setFeynmanResult(fy);
			setProviderLabel(fy.evaluatedBy === "heuristic" ? "On-device practice engine (not a language model)" : fy.evaluatedBy);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not evaluate explanation.");
		} finally {
			setBusy(false);
		}
	}
	const current = questions[index] ?? null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium tracking-wide text-muted uppercase",
						children: "Practice"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-serif text-3xl font-semibold tracking-tight",
						children: "Active learning"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-2xl text-muted",
						children: "Practice from your imported textbooks. Questions and feedback are grounded in extracted excerpts with page references. Cloud language models are not required for this on-device engine."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: ["Offline practice works with previously generated sessions and the on-device engine.", providerLabel ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						" ",
						"Active engine: ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium text-ink",
							children: providerLabel
						}),
						"."
					] }) : null]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [
						"Local history: ",
						historySessions.length,
						" session",
						historySessions.length === 1 ? "" : "s",
						",",
						" ",
						attemptCount,
						" attempt",
						attemptCount === 1 ? "" : "s",
						"."
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-serif text-xl font-semibold",
						children: "Start a practice session"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Document",
						htmlFor: "pr-doc",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "pr-doc",
							className: controlClassName,
							value: documentId,
							onChange: (e) => setDocumentId(e.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "Select a ready document"
							}), readyDocs.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: d.id,
								children: d.name
							}, d.id))]
						})
					}),
					readyDocs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							"No ready documents yet.",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/library",
								className: "text-primary hover:underline",
								children: "Import a PDF with selectable text"
							}),
							"."
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Topic or focus (optional)",
						htmlFor: "pr-topic",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "pr-topic",
							className: controlClassName,
							value: topic,
							onChange: (e) => setTopic(e.target.value),
							placeholder: "e.g. Newton’s laws, photosynthesis"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						disabled: busy || !documentId,
						onClick: () => void startSession(),
						children: busy ? "Building…" : "Generate practice"
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						role: "alert",
						className: "text-sm text-danger",
						children: error
					}) : null
				]
			}),
			session && current ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-baseline justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-serif text-xl font-semibold",
							children: session.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: [
								"Question ",
								index + 1,
								" of ",
								questions.length
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							current.type.replace(/_/g, " "),
							" · ",
							current.difficulty,
							" · cognitive:",
							" ",
							current.cognitiveLevel,
							" · ",
							current.generatedBy
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-lg text-ink",
						children: current.text
					}),
					current.sourceExcerpts[0] ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							"Source: pages ",
							current.sourceExcerpts[0].pageStart,
							"–",
							current.sourceExcerpts[0].pageEnd
						]
					}) : null,
					current.type === "multiple_choice" && current.choices ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
							className: "sr-only",
							children: "Choices"
						}), current.choices.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex min-h-11 cursor-pointer items-start gap-2 rounded-md border border-line bg-paper px-3 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "radio",
								name: `q-${current.id}`,
								className: "mt-1",
								checked: answer === c,
								onChange: () => setAnswer(c)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: c })]
						}, c))]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Your answer",
						htmlFor: "pr-answer",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							id: "pr-answer",
							className: `${controlClassName} min-h-28 py-2`,
							value: answer,
							onChange: (e) => setAnswer(e.target.value),
							placeholder: "Write in your own words…"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								disabled: busy || !answer.trim(),
								onClick: () => void submitAnswer(),
								children: "Check answer"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "secondary",
								disabled: index >= questions.length - 1,
								onClick: () => {
									setIndex((i) => Math.min(i + 1, questions.length - 1));
									setAnswer("");
									setEvaluation(null);
								},
								children: "Next"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "secondary",
								disabled: index <= 0,
								onClick: () => {
									setIndex((i) => Math.max(i - 1, 0));
									setAnswer("");
									setEvaluation(null);
								},
								children: "Previous"
							})
						]
					}),
					evaluation ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2 rounded-md border border-line bg-paper p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-semibold capitalize text-ink",
								children: evaluation.correctness
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: [
									"Confidence: ",
									evaluation.confidence,
									" · Evidence: ",
									evaluation.evidenceLevel,
									" ·",
									" ",
									evaluation.evaluatedBy
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: evaluation.explanation }),
							evaluation.understood.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-semibold",
								children: "Understood"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "list-disc pl-5 text-sm",
								children: evaluation.understood.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: u }, u))
							})] }) : null,
							evaluation.missingOrIncorrect.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-semibold",
								children: "Missing or incorrect"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "list-disc pl-5 text-sm",
								children: evaluation.missingOrIncorrect.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: u }, u))
							})] }) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold",
									children: "Suggestion: "
								}), evaluation.suggestedImprovement]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: "This is practice feedback, not an official examination result."
							})
						]
					}) : null
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-serif text-xl font-semibold",
						children: "Explain it yourself"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Describe a topic in your own words. Sirius checks your explanation against the textbook excerpts on this device and suggests how to deepen it."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Topic",
						htmlFor: "fy-topic",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "fy-topic",
							className: controlClassName,
							value: feynmanTopic,
							onChange: (e) => setFeynmanTopic(e.target.value),
							placeholder: "Topic to explain"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Your explanation",
						htmlFor: "fy-text",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							id: "fy-text",
							className: `${controlClassName} min-h-32 py-2`,
							value: feynmanText,
							onChange: (e) => setFeynmanText(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						disabled: busy || !documentId || !feynmanText.trim(),
						onClick: () => void submitFeynman(),
						children: "Get feedback"
					}),
					feynmanResult ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2 rounded-md border border-line bg-paper p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: feynmanResult.feedback }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-semibold",
								children: "Simpler take"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm",
								children: feynmanResult.simplerExplanation
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-semibold",
								children: "Follow-up"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm",
								children: feynmanResult.followUpQuestion
							}),
							feynmanResult.sourceExcerpts[0] ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted",
								children: [
									"Grounded in pages ",
									feynmanResult.sourceExcerpts[0].pageStart,
									"–",
									feynmanResult.sourceExcerpts[0].pageEnd
								]
							}) : null
						]
					}) : null
				]
			}),
			historySessions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-serif text-xl font-semibold",
					children: "Saved sessions"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-2 text-sm",
					children: historySessions.slice(0, 8).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-md border border-line bg-paper px-3 py-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium",
							children: s.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted",
							children: [
								" ",
								"· ",
								s.documentName,
								" · ",
								new Date(s.createdAt).toLocaleString(),
								" ·",
								" ",
								s.offlineCapable ? "offline-capable" : "needs network"
							]
						})]
					}, s.id))
				})]
			}) : null
		]
	});
}
var SplitComponent = PracticePage;
//#endregion
export { SplitComponent as component };
