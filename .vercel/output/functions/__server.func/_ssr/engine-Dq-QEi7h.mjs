//#region node_modules/.nitro/vite/services/ssr/assets/engine-Dq-QEi7h.js
/** Lightweight synonym / concept groups for common science pairs (offline). */
var CONCEPT_GROUPS = [
	[
		"mass",
		"weight",
		"inertia"
	],
	[
		"force",
		"net force",
		"resultant"
	],
	[
		"velocity",
		"speed",
		"acceleration"
	],
	[
		"energy",
		"work",
		"power"
	],
	[
		"photosynthesis",
		"chlorophyll",
		"glucose"
	],
	[
		"atom",
		"molecule",
		"element",
		"compound"
	],
	[
		"cell",
		"nucleus",
		"membrane",
		"organelle"
	],
	[
		"acid",
		"base",
		"ph",
		"neutralization"
	],
	[
		"current",
		"voltage",
		"resistance",
		"ohm"
	],
	[
		"mitosis",
		"meiosis",
		"cell division"
	]
];
function normalizeText(text) {
	return text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim();
}
/**
* Language-aware tokenization interface.
* Current implementation is Latin-script oriented; non-space-separated scripts
* (e.g. future Amharic/Oromo handling) should supply a custom tokenizer.
*/
function tokenize(text, language = "en") {
	const norm = normalizeText(text);
	if (!norm) return [];
	if (language !== "en" && language !== "latn") return norm.split(/\s+/).filter((t) => t.length > 1);
	return norm.split(/\s+/).filter((t) => t.length > 2 || /^[a-z]{2}$/.test(t));
}
function extractPhrases(text, max = 6) {
	const tokens = tokenize(text);
	const phrases = [];
	for (let i = 0; i < tokens.length - 1 && phrases.length < max; i++) phrases.push(`${tokens[i]} ${tokens[i + 1]}`);
	return phrases;
}
function conceptBoost(queryTokens, hay) {
	let boost = 0;
	const hayTokens = new Set(tokenize(hay));
	for (const group of CONCEPT_GROUPS) {
		const qHit = group.some((g) => queryTokens.includes(g) || queryTokens.some((t) => g.includes(t)));
		const hHit = group.some((g) => hayTokens.has(g) || hay.includes(g));
		if (qHit && hHit) boost += .08;
	}
	return Math.min(boost, .24);
}
/**
* Hybrid lexical score. Deterministic, offline, no network.
* Scale is roughly 0–1.5 before clamping in ranking.
*/
function scoreChunkDetailed(queryText, chunk, options = {}) {
	const queryTokens = tokenize(queryText);
	const phrases = extractPhrases(queryText);
	const hay = normalizeText(`${chunk.title ?? ""} ${chunk.text}`);
	const titleNorm = normalizeText(chunk.title ?? "");
	let keywordHits = 0;
	const seen = /* @__PURE__ */ new Set();
	for (const t of queryTokens) {
		if (seen.has(t)) continue;
		seen.add(t);
		if (hay.includes(t)) keywordHits += 1;
	}
	const keyword = queryTokens.length === 0 ? .05 : keywordHits / queryTokens.length;
	let phraseHits = 0;
	for (const p of phrases) if (hay.includes(p)) phraseHits += 1;
	const phrase = phrases.length === 0 ? 0 : phraseHits / phrases.length;
	let exactTerm = 0;
	const longer = queryTokens.filter((t) => t.length >= 5);
	for (const t of longer) if (hay.includes(t)) exactTerm += .05;
	exactTerm = Math.min(exactTerm, .25);
	const qNorm = normalizeText(queryText);
	const normalized = qNorm.length > 8 && hay.includes(qNorm.slice(0, Math.min(40, qNorm.length))) ? .15 : 0;
	const title = titleNorm && queryTokens.some((t) => titleNorm.includes(t)) ? .18 : titleNorm && phrases.some((p) => titleNorm.includes(p)) ? .12 : 0;
	let pageProximity = 0;
	if (options.pageHint != null) {
		if (chunk.pageStart <= options.pageHint && chunk.pageEnd >= options.pageHint) pageProximity = .22;
		else if (Math.min(Math.abs(chunk.pageStart - options.pageHint), Math.abs(chunk.pageEnd - options.pageHint)) <= 2) pageProximity = .1;
	}
	const length = chunk.charCount < 40 ? -.25 : chunk.charCount > 2500 ? -.05 : chunk.charCount < 80 ? -.1 : 0;
	const concept = conceptBoost(queryTokens, hay);
	let topicBoost = 0;
	if (options.topicHint) {
		const th = normalizeText(options.topicHint);
		if (th && (hay.includes(th) || titleNorm.includes(th))) topicBoost = .12;
	}
	const score = keyword * .45 + phrase * .25 + exactTerm + normalized + title + pageProximity + length + concept + topicBoost;
	return {
		score: Math.max(0, score),
		signals: {
			keyword,
			phrase,
			exactTerm,
			normalized,
			title,
			pageProximity,
			length,
			concept
		}
	};
}
function retrieveFromContent(content, query) {
	const limit = query.limit ?? 5;
	const minScore = query.minScore ?? .08;
	const scored = [];
	for (const chunk of content.chunks) {
		if (query.documentId && chunk.documentId !== query.documentId) continue;
		const { score, signals } = scoreChunkDetailed(query.text, chunk, {
			pageHint: query.pageHint,
			topicHint: query.topicHint ?? query.objectiveHint
		});
		if (score < minScore) continue;
		scored.push({
			chunk,
			score,
			signals,
			excerpt: {
				documentId: chunk.documentId,
				chunkId: chunk.id,
				pageStart: chunk.pageStart,
				pageEnd: chunk.pageEnd,
				text: chunk.text.slice(0, 700)
			}
		});
	}
	scored.sort((a, b) => b.score - a.score);
	return scored.slice(0, limit);
}
function hasSufficientEvidence(results, minScore = .2) {
	return results.length > 0 && results[0].score >= minScore;
}
function id$1(prefix) {
	if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function firstSentences(text, n) {
	return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 20).slice(0, n);
}
function pickKeyPhrase(text) {
	const sentences = firstSentences(text, 3);
	if (sentences.length === 0) return null;
	const s = sentences[0];
	if (s.length > 180) return s.slice(0, 160).replace(/\s+\S*$/, "") + "…";
	return s;
}
function distractorsFrom(chunk, others, answer) {
	const pool = [];
	for (const o of others) {
		const phrase = pickKeyPhrase(o.text);
		if (phrase && phrase !== answer && phrase.length > 15) pool.push(phrase);
	}
	while (pool.length < 3) pool.push(`A related idea not stated on pages ${chunk.pageStart}–${chunk.pageEnd} of this text`);
	return pool.slice(0, 3);
}
function shuffle(arr) {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}
/**
* Build questions strictly from retrieved chunks. Returns empty if evidence is weak.
*/
function generateQuestionsFromChunks(retrieved, options) {
	if (retrieved.length === 0) return [];
	const count = options.count ?? 4;
	const types = options.types ?? [
		"multiple_choice",
		"short_answer",
		"conceptual",
		"explain_own_words"
	];
	const allChunks = retrieved.map((r) => r.chunk);
	const questions = [];
	const now = (/* @__PURE__ */ new Date()).toISOString();
	let ti = 0;
	for (let i = 0; i < count && i < retrieved.length * 2; i++) {
		const r = retrieved[i % retrieved.length];
		const chunk = r.chunk;
		const type = types[ti % types.length];
		ti += 1;
		const excerpt = r.excerpt;
		const topicLabel = options.topic ?? chunk.title ?? `Pages ${chunk.pageStart}–${chunk.pageEnd}`;
		const key = pickKeyPhrase(chunk.text);
		if (!key) continue;
		const base = {
			id: id$1("q"),
			difficulty: i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard",
			cognitiveLevel: mapTypeToCognitive(type),
			subject: options.subject ?? null,
			topic: topicLabel,
			objectiveId: null,
			documentId: options.documentId,
			sourceExcerpts: [excerpt],
			evidenceLevel: "direct",
			generatedBy: "heuristic",
			createdAt: now
		};
		if (type === "multiple_choice") {
			const correct = key;
			const choices = shuffle([correct, ...distractorsFrom(chunk, allChunks.filter((c) => c.id !== chunk.id), correct)]);
			const correctChoiceIndex = choices.indexOf(correct);
			questions.push({
				...base,
				type: "multiple_choice",
				text: `According to the text (pages ${chunk.pageStart}–${chunk.pageEnd}), which statement is supported?`,
				choices,
				correctChoiceIndex,
				expectedAnswer: correct,
				markingGuidance: "Select the option that matches the source excerpt.",
				explanation: `The source states: “${key}” (pages ${chunk.pageStart}–${chunk.pageEnd}).`
			});
		} else if (type === "short_answer") questions.push({
			...base,
			type: "short_answer",
			text: `In your own words, what does the text say about this idea on pages ${chunk.pageStart}–${chunk.pageEnd}? Use the passage as your guide.`,
			choices: null,
			correctChoiceIndex: null,
			expectedAnswer: key,
			markingGuidance: "Accept equivalent wording if the same idea is present in the source.",
			explanation: `Key idea from the text: “${key}”`
		});
		else if (type === "conceptual" || type === "explain_own_words") questions.push({
			...base,
			type,
			text: type === "explain_own_words" ? `Explain the main idea of “${chunk.title ?? topicLabel}” in your own words (see pages ${chunk.pageStart}–${chunk.pageEnd}).` : `What concept is the passage on pages ${chunk.pageStart}–${chunk.pageEnd} developing? Summarise it briefly.`,
			choices: null,
			correctChoiceIndex: null,
			expectedAnswer: key,
			markingGuidance: "Look for the core claim of the excerpt, not identical wording.",
			explanation: `The passage centres on: “${key}”`
		});
		else if (type === "application") questions.push({
			...base,
			type: "application",
			text: `How could you apply the idea described on pages ${chunk.pageStart}–${chunk.pageEnd} to a new example? Start from what the text actually says.`,
			choices: null,
			correctChoiceIndex: null,
			expectedAnswer: key,
			markingGuidance: "Student must ground the application in the source idea.",
			explanation: `Source idea to apply: “${key}”`
		});
		else questions.push({
			...base,
			type: "analysis",
			text: `What relationship or distinction does the text emphasise on pages ${chunk.pageStart}–${chunk.pageEnd}?`,
			choices: null,
			correctChoiceIndex: null,
			expectedAnswer: key,
			markingGuidance: "Credit answers that identify the relationship stated in the excerpt.",
			explanation: `From the text: “${key}”`
		});
	}
	return questions;
}
function mapTypeToCognitive(type) {
	switch (type) {
		case "multiple_choice":
		case "short_answer": return "recall";
		case "conceptual":
		case "explain_own_words": return "understand";
		case "application": return "apply";
		case "analysis": return "analyze";
	}
}
function normalize$1(s) {
	return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function tokenSet$1(s) {
	return new Set(normalize$1(s).split(" ").filter((t) => t.length > 2));
}
function overlapRatio$1(a, b) {
	const A = tokenSet$1(a);
	const B = tokenSet$1(b);
	if (A.size === 0 || B.size === 0) return 0;
	let inter = 0;
	for (const t of A) if (B.has(t)) inter += 1;
	return inter / Math.min(A.size, B.size);
}
/**
* Evaluate an answer against source-backed expected content.
* Does not claim official exam grading.
*/
function evaluateAnswerHeuristic(question, studentAnswer) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const raw = studentAnswer.trim();
	if (!raw) return {
		id: id$1("ev"),
		questionId: question.id,
		studentAnswer: raw,
		correctness: "incorrect",
		explanation: "No answer was provided.",
		understood: [],
		missingOrIncorrect: ["An answer is required."],
		suggestedImprovement: "Re-read the cited pages and write a short response in your own words.",
		sourceExcerpts: question.sourceExcerpts,
		confidence: "high",
		evidenceLevel: question.evidenceLevel,
		evaluatedBy: "heuristic",
		createdAt: now
	};
	if (question.type === "multiple_choice" && question.choices && question.correctChoiceIndex != null) {
		const idx = question.choices.findIndex((c) => c === raw || normalize$1(c) === normalize$1(raw));
		const asNum = Number.parseInt(raw, 10);
		const correct = (idx >= 0 ? idx : Number.isFinite(asNum) && asNum >= 0 && asNum < question.choices.length ? asNum : -1) === question.correctChoiceIndex;
		return {
			id: id$1("ev"),
			questionId: question.id,
			studentAnswer: raw,
			correctness: correct ? "correct" : "incorrect",
			explanation: correct ? question.explanation : `The source-supported option is: “${question.choices[question.correctChoiceIndex]}”. ${question.explanation}`,
			understood: correct ? ["You selected the option supported by the text."] : [],
			missingOrIncorrect: correct ? [] : ["The selected option does not match the cited excerpt."],
			suggestedImprovement: correct ? "Try explaining why the other options do not match the text." : "Return to the cited pages and compare each option to the wording there.",
			sourceExcerpts: question.sourceExcerpts,
			confidence: "high",
			evidenceLevel: "direct",
			evaluatedBy: "heuristic",
			createdAt: now
		};
	}
	const ratio = overlapRatio$1(raw, question.expectedAnswer ?? question.sourceExcerpts[0]?.text ?? "");
	let correctness = "incorrect";
	if (ratio >= .45) correctness = "correct";
	else if (ratio >= .22) correctness = "partial";
	const understood = [];
	const missing = [];
	if (correctness === "correct") understood.push("Your answer covers key terms from the source excerpt.");
	else if (correctness === "partial") {
		understood.push("Some ideas from the source appear in your answer.");
		missing.push("Important parts of the source idea are still missing or unclear.");
	} else missing.push("The answer does not clearly reflect the cited source idea.");
	return {
		id: id$1("ev"),
		questionId: question.id,
		studentAnswer: raw,
		correctness,
		explanation: `Compared with the source excerpt (pages ${question.sourceExcerpts[0]?.pageStart ?? "?"}–${question.sourceExcerpts[0]?.pageEnd ?? "?"}): ${question.explanation}`,
		understood,
		missingOrIncorrect: missing,
		suggestedImprovement: correctness === "correct" ? "Strengthen your answer by naming one concrete detail from the page." : "Re-read the excerpt, list two key points, then rewrite your answer without copying full sentences.",
		sourceExcerpts: question.sourceExcerpts,
		confidence: ratio >= .45 ? "medium" : "low",
		evidenceLevel: question.evidenceLevel,
		evaluatedBy: "heuristic",
		createdAt: now
	};
}
function evaluateFeynmanHeuristic(documentId, topicLabel, studentExplanation, retrieved) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const excerpts = retrieved.map((r) => r.excerpt);
	const combined = retrieved.map((r) => r.chunk.text).join("\n");
	const key = pickKeyPhrase(combined) ?? topicLabel;
	const ratio = overlapRatio$1(studentExplanation, combined);
	const correct = [];
	const missing = [];
	const confused = [];
	const unsupported = [];
	if (ratio >= .3) correct.push("Your explanation touches ideas present in the source text.");
	if (ratio < .45) missing.push("Some core points from the cited pages are not yet explained.");
	if (studentExplanation.trim().length < 40) missing.push("The explanation is very short; add more of the source’s main claims.");
	const srcTokens = tokenSet$1(combined);
	for (const t of tokenSet$1(studentExplanation)) if (t.length > 8 && !srcTokens.has(t) && unsupported.length < 3) {}
	if (ratio < .15 && studentExplanation.trim().length > 60) unsupported.push("Several statements do not clearly match the available textbook excerpts. Prefer ideas you can point to on the cited pages.");
	if (ratio >= .15 && ratio < .35) confused.push("Some ideas may be mixed together; separate the main claim from examples.");
	return {
		id: id$1("fy"),
		documentId,
		topicLabel,
		studentExplanation,
		feedback: ratio >= .45 ? "Strong start. You are explaining ideas that appear in the source. Add one precise detail from the pages to lock it in." : "You are building an explanation, but key source ideas are still thin. Use the cited pages as your checklist.",
		correctUnderstanding: correct,
		missingConcepts: missing,
		confusedIdeas: confused,
		unsupportedStatements: unsupported,
		simplerExplanation: `In simple terms, the text focuses on: ${key}`,
		followUpQuestion: `What is one example or consequence of “${key.slice(0, 80)}” according to the text?`,
		sourceExcerpts: excerpts.slice(0, 3),
		evidenceLevel: retrieved.length ? "direct" : "insufficient",
		evaluatedBy: "heuristic",
		createdAt: now
	};
}
/**
* Always-available offline provider. Grounded in retrieved chunks only.
*/
function createHeuristicProvider() {
	return {
		info: {
			kind: "heuristic",
			label: "On-device practice engine (not a language model)",
			requiresNetwork: false,
			isRealModel: false
		},
		async generateQuestions(req) {
			return generateQuestionsFromChunks(req.retrieved, {
				documentId: req.documentId,
				subject: req.subject,
				topic: req.topic,
				types: req.types,
				count: req.count
			});
		},
		async evaluateAnswer(req) {
			return evaluateAnswerHeuristic(req.question, req.studentAnswer);
		},
		async evaluateFeynman(req) {
			return evaluateFeynmanHeuristic(req.documentId, req.topicLabel, req.studentExplanation, req.retrieved);
		}
	};
}
/**
* Resolve the browser-side provider.
* Real API keys must live only on the server; this client never reads them.
*/
function resolveClientProvider() {
	return createHeuristicProvider();
}
function id(prefix) {
	if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function normalize(s) {
	return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function tokenSet(s) {
	return new Set(normalize(s).split(" ").filter((t) => t.length > 2));
}
function overlapRatio(a, b) {
	const A = tokenSet(a);
	const B = tokenSet(b);
	if (A.size === 0 || B.size === 0) return 0;
	let inter = 0;
	for (const t of A) if (B.has(t)) inter += 1;
	return inter / Math.min(A.size, B.size);
}
/** Known concept confusion pairs used offline for pattern hints */
var CONFUSION_PAIRS = [
	{
		a: "mass",
		b: "weight",
		title: "Mass vs weight",
		description: "Mass is the amount of matter (kg); weight is the gravitational force on that mass (N). They are related but not the same quantity."
	},
	{
		a: "speed",
		b: "velocity",
		title: "Speed vs velocity",
		description: "Speed is scalar (how fast); velocity is vector (speed with direction)."
	},
	{
		a: "energy",
		b: "power",
		title: "Energy vs power",
		description: "Energy is the capacity to do work; power is the rate of energy transfer."
	},
	{
		a: "mitosis",
		b: "meiosis",
		title: "Mitosis vs meiosis",
		description: "Mitosis produces two identical diploid cells; meiosis produces four genetically varied haploid cells."
	},
	{
		a: "atom",
		b: "molecule",
		title: "Atom vs molecule",
		description: "An atom is the basic unit of an element; a molecule is two or more atoms bonded."
	}
];
/**
* Classify a single evaluation into an error kind.
* Does not create a misconception by itself.
*/
function classifyErrorKind(evaluation, question) {
	if (evaluation.correctness === "unevaluable") return "unevaluable";
	if (evaluation.correctness === "correct") return "careless_mistake";
	if (evaluation.confidence === "low" || evaluation.evidenceLevel === "insufficient") return "unevaluable";
	const answer = normalize(evaluation.studentAnswer);
	const expected = normalize(question.expectedAnswer ?? question.sourceExcerpts[0]?.text ?? "");
	if (question.type === "multiple_choice" && evaluation.correctness === "incorrect") return "careless_mistake";
	if (!answer || answer.length < 8) return "incomplete_answer";
	const ratio = overlapRatio(answer, expected);
	if (ratio >= .15 && ratio < .35) return "incomplete_answer";
	for (const pair of CONFUSION_PAIRS) {
		const hasA = answer.includes(pair.a);
		const hasB = answer.includes(pair.b);
		if ((normalize(question.topic ?? "").includes(pair.a) || normalize(question.topic ?? "").includes(pair.b) || expected.includes(pair.a) || expected.includes(pair.b)) && (hasA || hasB)) return "conceptual_misunderstanding";
	}
	if (evaluation.missingOrIncorrect.length >= 2 && ratio < .2) return "conceptual_misunderstanding";
	if (ratio < .12) return "conceptual_misunderstanding";
	return "incomplete_answer";
}
/**
* Evidence sufficiency rules for promoting a suspected misconception.
* Policy: never confirm from one ambiguous answer.
*/
function isEvidenceSufficient(observations, errorKinds) {
	const conceptual = errorKinds.filter((k) => k === "conceptual_misunderstanding").length;
	const total = observations.length;
	if (total < 2) return {
		sufficient: false,
		confidence: "low"
	};
	if (conceptual >= 2 && total >= 2) return {
		sufficient: true,
		confidence: conceptual >= 3 ? "high" : "medium"
	};
	if (total >= 3 && conceptual >= 1) return {
		sufficient: true,
		confidence: "medium"
	};
	return {
		sufficient: false,
		confidence: "low"
	};
}
function detectConfusionPair(studentAnswer, topic, expected) {
	const answer = normalize(studentAnswer);
	const ctx = normalize(`${topic ?? ""} ${expected}`);
	for (const pair of CONFUSION_PAIRS) {
		const inCtx = ctx.includes(pair.a) || ctx.includes(pair.b);
		const mentionsPair = answer.includes(pair.a) || answer.includes(pair.b);
		const usesWrong = answer.includes(pair.a) && ctx.includes(pair.b) && !answer.includes(pair.b) || answer.includes(pair.b) && ctx.includes(pair.a) && !answer.includes(pair.a);
		if (inCtx && (usesWrong || mentionsPair)) return pair;
	}
	return null;
}
/**
* Analyse one evaluation in the context of prior attempts on the same topic.
* Returns a diagnostic result; may request another question instead of diagnosing.
*/
function analyseAnswerForMisconception(input) {
	const { evaluation, question } = input;
	const priorAttempts = input.priorAttempts.filter((a) => a.evaluationId !== evaluation.id && a.id !== evaluation.id);
	const priorEvaluations = input.priorEvaluations.filter((e) => e.id !== evaluation.id);
	const errorKind = classifyErrorKind(evaluation, question);
	if (errorKind === "unevaluable") return {
		errorKind,
		possibleMisconception: null,
		needsMoreEvidence: true,
		diagnosticQuestionPrompt: null,
		explanation: "This response cannot be evaluated confidently with the available source material. No misconception is recorded.",
		confidence: "low"
	};
	if (evaluation.correctness === "correct") return {
		errorKind: "careless_mistake",
		possibleMisconception: null,
		needsMoreEvidence: false,
		diagnosticQuestionPrompt: null,
		explanation: "The answer matches the source-supported idea. No misconception signal.",
		confidence: "high"
	};
	if (errorKind === "careless_mistake" || errorKind === "incomplete_answer") {
		if (priorAttempts.filter((a) => a.topicLabel === question.topic && (a.correctness === "incorrect" || a.correctness === "partial")).length < 1 && errorKind === "careless_mistake") return {
			errorKind,
			possibleMisconception: null,
			needsMoreEvidence: false,
			diagnosticQuestionPrompt: null,
			explanation: "This looks like an isolated mistake or incomplete answer, not a stable misconception. Review the cited pages and try a similar question.",
			confidence: "medium"
		};
	}
	const pair = detectConfusionPair(evaluation.studentAnswer, question.topic, question.expectedAnswer ?? "");
	const category = pair ? "confused_related_concepts" : errorKind === "conceptual_misunderstanding" ? "repeated_conceptual_error" : "definition_confusion";
	const title = pair?.title ?? `Difficulty with ${question.topic ?? "this topic"}`;
	const description = pair?.description ?? (evaluation.missingOrIncorrect.join(" ") || "Student response diverges from the source-supported idea in a way that may indicate a conceptual gap.");
	const relatedWrong = priorAttempts.filter((a) => (a.topicLabel === question.topic || a.documentId === question.documentId) && a.correctness !== "correct");
	const observations = [{
		id: id("obs"),
		attemptId: null,
		evaluationId: evaluation.id,
		questionId: question.id,
		studentAnswer: evaluation.studentAnswer,
		note: evaluation.explanation.slice(0, 240),
		observedAt: evaluation.createdAt
	}, ...relatedWrong.slice(0, 4).map((a) => ({
		id: id("obs"),
		attemptId: a.id,
		evaluationId: a.evaluationId,
		questionId: a.questionId,
		studentAnswer: a.studentAnswer,
		note: `Prior ${a.correctness} attempt`,
		observedAt: a.createdAt
	}))];
	const { sufficient, confidence } = isEvidenceSufficient(observations, [errorKind, ...priorEvaluations.filter((e) => e.correctness === "incorrect" || e.correctness === "partial").map((e) => classifyErrorKind(e, question))]);
	if (!sufficient) return {
		errorKind,
		possibleMisconception: {
			concept: pair?.a ?? question.topic ?? "topic",
			topicLabel: question.topic,
			documentId: question.documentId,
			category,
			description,
			title,
			observations,
			supportingExcerpts: evaluation.sourceExcerpts,
			confidence: "low",
			status: "suspected"
		},
		needsMoreEvidence: true,
		diagnosticQuestionPrompt: pair ? `Explain the difference between ${pair.a} and ${pair.b} using an everyday example. Which one is measured in kilograms?` : `In your own words, what is the key idea on pages ${question.sourceExcerpts[0]?.pageStart ?? "?"}–${question.sourceExcerpts[0]?.pageEnd ?? "?"}? Give one concrete example.`,
		explanation: "There is a possible misunderstanding, but evidence is not yet strong enough to confirm a misconception. A short diagnostic question will help clarify.",
		confidence: "low"
	};
	const now = (/* @__PURE__ */ new Date()).toISOString();
	return {
		errorKind: "conceptual_misunderstanding",
		possibleMisconception: {
			id: id("mc"),
			concept: pair?.a ?? question.topic ?? "topic",
			topicLabel: question.topic,
			documentId: question.documentId,
			category,
			description,
			title,
			observations,
			supportingExcerpts: evaluation.sourceExcerpts,
			confidence,
			status: "confirmed",
			firstObservedAt: observations[observations.length - 1]?.observedAt ?? now,
			lastObservedAt: now,
			observationCount: observations.length,
			remediationSessionIds: [],
			diagnosticQuestionIds: [],
			createdAt: now,
			updatedAt: now
		},
		needsMoreEvidence: false,
		diagnosticQuestionPrompt: null,
		explanation: `Evidence from ${observations.length} related responses supports a ${category.replace(/_/g, " ")} pattern: ${title}.`,
		confidence
	};
}
/**
* Merge new diagnostic evidence into an existing misconception record.
* Deduplicates observations, recalculates confidence & status, preserves timestamps.
*/
function mergeMisconceptionEvidence(existing, incoming) {
	const byKey = /* @__PURE__ */ new Map();
	for (const o of existing.observations ?? []) byKey.set(o.evaluationId ?? o.attemptId ?? o.id, o);
	for (const o of incoming.observations ?? []) {
		const key = o.evaluationId ?? o.attemptId ?? o.id;
		if (!byKey.has(key)) byKey.set(key, o);
	}
	const observations = [...byKey.values()].sort((a, b) => a.observedAt < b.observedAt ? -1 : a.observedAt > b.observedAt ? 1 : 0);
	const conceptualCount = observations.filter((o) => /conceptual|confused|diverges/i.test(o.note) || (o.studentAnswer?.trim().length ?? 0) >= 8).length;
	const { sufficient, confidence } = isEvidenceSufficient(observations, observations.map((_, i) => i < conceptualCount ? "conceptual_misunderstanding" : "incomplete_answer"));
	let status = existing.status;
	if (sufficient && (status === "suspected" || !status)) status = "confirmed";
	const excerptMap = /* @__PURE__ */ new Map();
	for (const e of existing.supportingExcerpts ?? []) excerptMap.set(`${e.documentId}:${e.pageStart}:${e.text.slice(0, 40)}`, e);
	for (const e of incoming.supportingExcerpts ?? []) excerptMap.set(`${e.documentId}:${e.pageStart}:${e.text.slice(0, 40)}`, e);
	const firstObservedAt = observations[0]?.observedAt ?? existing.firstObservedAt ?? existing.createdAt;
	const lastObservedAt = observations[observations.length - 1]?.observedAt ?? existing.lastObservedAt ?? (/* @__PURE__ */ new Date()).toISOString();
	return {
		...existing,
		concept: incoming.concept ?? existing.concept,
		topicLabel: incoming.topicLabel ?? existing.topicLabel,
		documentId: incoming.documentId ?? existing.documentId,
		category: incoming.category ?? existing.category,
		description: incoming.description ?? existing.description,
		title: incoming.title ?? existing.title,
		observations,
		supportingExcerpts: [...excerptMap.values()],
		confidence,
		status,
		firstObservedAt,
		lastObservedAt,
		observationCount: observations.length,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
function findMatchingMisconception(existing, candidate) {
	return existing.find((m) => candidate.title && m.title === candidate.title || candidate.concept && m.concept === candidate.concept && (m.documentId ?? null) === (candidate.documentId ?? null) || candidate.topicLabel && m.topicLabel === candidate.topicLabel && (m.documentId ?? null) === (candidate.documentId ?? null));
}
async function buildPracticeSession(meta, content, options = {}) {
	const provider = options.provider ?? resolveClientProvider();
	const topic = options.topic?.trim() || meta.curriculum.topicCode || meta.name || "Selected section";
	const retrieved = retrieveFromContent(content, {
		text: `${topic} ${options.subject ?? ""} ${meta.name}`,
		documentId: meta.id,
		limit: 8
	});
	if (!hasSufficientEvidence(retrieved)) return {
		ok: false,
		message: "Not enough extractable text to build a grounded practice session. Import a PDF with a selectable text layer, or pick a different section.",
		provider: provider.info
	};
	const questions = await provider.generateQuestions({
		documentId: meta.id,
		documentName: meta.name,
		subject: options.subject ?? meta.curriculum.subjectCode,
		topic,
		types: options.types,
		count: options.count ?? 4,
		retrieved
	});
	if (questions.length === 0) return {
		ok: false,
		message: "Could not form source-grounded questions from the available excerpts.",
		provider: provider.info
	};
	return {
		ok: true,
		session: {
			id: typeof crypto !== "undefined" && crypto.randomUUID ? `ps_${crypto.randomUUID()}` : `ps_${Date.now()}`,
			documentId: meta.id,
			documentName: meta.name,
			title: `Practice · ${topic}`,
			topicLabel: topic,
			questionIds: questions.map((q) => q.id),
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			offlineCapable: !provider.info.requiresNetwork,
			providerLabel: provider.info.label
		},
		questions,
		provider: provider.info,
		retrievedCount: retrieved.length
	};
}
async function evaluateStudentAnswer(question, studentAnswer, provider) {
	return (provider ?? resolveClientProvider()).evaluateAnswer({
		question,
		studentAnswer
	});
}
async function runFeynman(meta, content, topicLabel, studentExplanation, provider) {
	const p = provider ?? resolveClientProvider();
	const retrieved = retrieveFromContent(content, {
		text: topicLabel,
		documentId: meta.id,
		limit: 5
	});
	return p.evaluateFeynman({
		documentId: meta.id,
		topicLabel,
		studentExplanation,
		retrieved
	});
}
async function diagnoseAnswer(input) {
	let retrieved = [];
	if (input.content) retrieved = retrieveFromContent(input.content, {
		text: input.question.topic ?? input.question.text,
		documentId: input.question.documentId,
		limit: 4
	});
	return analyseAnswerForMisconception({
		evaluation: input.evaluation,
		question: input.question,
		priorAttempts: input.priorAttempts,
		priorEvaluations: input.priorEvaluations,
		retrieved
	});
}
//#endregion
export { mergeMisconceptionEvidence as a, findMatchingMisconception as i, diagnoseAnswer as n, runFeynman as o, evaluateStudentAnswer as r, buildPracticeSession as t };
