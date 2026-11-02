import { a as number, n as array, o as object, r as boolean, s as string, t as _enum } from "../_libs/zod.mjs";
import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/errors-Dh7sDCPj.js
var AppError = class extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = "AppError";
	}
};
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/profile-GEZ043WQ.js
var GRADES = [
	9,
	10,
	11,
	12
];
var STREAMS = [{
	id: "natural",
	label: "Natural science"
}, {
	id: "social",
	label: "Social science"
}];
var NAME_MAX = 80;
function emptyProfile() {
	return {
		displayName: "",
		grade: null,
		stream: null,
		updatedAt: ""
	};
}
function isGrade(value) {
	return typeof value === "number" && GRADES.includes(value);
}
function isStream(value) {
	return value === "natural" || value === "social";
}
function preparatoryGrade(grade) {
	return grade === 11 || grade === 12;
}
function validateDisplayName(name) {
	if (name.trim().length > NAME_MAX) return "Use 80 characters or fewer.";
	return null;
}
function normalizeProfile(input) {
	const record = input && typeof input === "object" ? input : {};
	const grade = isGrade(record.grade) ? record.grade : null;
	const stream = preparatoryGrade(grade) && isStream(record.stream) ? record.stream : null;
	const displayNameRaw = typeof record.displayName === "string" ? record.displayName.trim() : "";
	const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : "";
	return {
		displayName: displayNameRaw.slice(0, NAME_MAX),
		grade,
		stream,
		updatedAt
	};
}
function stageLabel(grade, stream) {
	if (grade === null) return "Grade not set";
	if (grade === 9 || grade === 10) return `Grade ${grade} · General secondary`;
	if (stream === "natural") return `Grade ${grade} · Natural science`;
	if (stream === "social") return `Grade ${grade} · Social science`;
	return `Grade ${grade} · Preparatory`;
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/model-Cr2XwIX6.js
var BODY_MAX = 8e3;
function validateNoteDraft(input) {
	const title = input.title.trim();
	const subject = input.subject.trim();
	const body = input.body.trim();
	if (!title) return {
		ok: false,
		message: "Add a title so you can find this note."
	};
	if (title.length > 120) return {
		ok: false,
		message: `Title must be 120 characters or fewer.`
	};
	if (subject.length > 60) return {
		ok: false,
		message: `Subject must be 60 characters or fewer.`
	};
	if (body.length > 8e3) return {
		ok: false,
		message: `Note must be ${BODY_MAX} characters or fewer.`
	};
	return {
		ok: true,
		value: {
			title,
			subject,
			body
		}
	};
}
function normalizeNote(input) {
	if (!input || typeof input !== "object") return null;
	const record = input;
	if (typeof record.id !== "string" || record.id.length === 0) return null;
	const draft = validateNoteDraft({
		title: typeof record.title === "string" ? record.title : "",
		subject: typeof record.subject === "string" ? record.subject : "",
		body: typeof record.body === "string" ? record.body : ""
	});
	if (!draft.ok) return null;
	const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : "";
	return {
		id: record.id,
		...draft.value,
		updatedAt
	};
}
function sortNotes(notes) {
	return [...notes].sort((a, b) => {
		if (a.updatedAt === b.updatedAt) return 0;
		return a.updatedAt < b.updatedAt ? 1 : -1;
	});
}
function noteCountLabel(count) {
	if (count === 0) return "Nothing written yet.";
	if (count === 1) return "1 note on this device.";
	return `${count} notes on this device.`;
}
function createNoteId() {
	return crypto.randomUUID();
}
function formatNoteTime(iso, options) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: options?.timeZone
	}).format(date);
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/pack-CLM2wbN4.js
/**
* Stable content hashing for curriculum packs (SHA-256).
* Uses a deterministic JSON stringify so the same logical content yields the same hash.
*/
function isPlainObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** Recursively sort object keys for stable serialization. */
function stableStringify(value) {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
	if (!isPlainObject(value)) return JSON.stringify(value);
	return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}
/** Hex-encoded SHA-256 of the stable serialization of the given value. */
async function contentHash(value) {
	const payload = stableStringify(value);
	const data = new TextEncoder().encode(payload);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
/**
* Detect directed cycles in the prerequisite graph.
* Nodes are objective IDs; edges are requiresObjectiveId → objectiveId
* (i.e. "must know A before B").
*/
function detectPrerequisiteCycles(prerequisites) {
	const adjacency = /* @__PURE__ */ new Map();
	for (const edge of prerequisites) {
		const from = edge.requiresObjectiveId;
		const to = edge.objectiveId;
		if (!adjacency.has(from)) adjacency.set(from, []);
		adjacency.get(from).push(to);
		if (!adjacency.has(to)) adjacency.set(to, []);
	}
	const visited = /* @__PURE__ */ new Set();
	const inStack = /* @__PURE__ */ new Set();
	const path = [];
	function dfs(node) {
		visited.add(node);
		inStack.add(node);
		path.push(node);
		for (const next of adjacency.get(node) ?? []) if (!visited.has(next)) {
			const result = dfs(next);
			if (result) return result;
		} else if (inStack.has(next)) {
			const cycleStart = path.indexOf(next);
			const cyclePath = [...path.slice(cycleStart), next];
			return {
				ok: false,
				message: `Prerequisite cycle detected: ${cyclePath.join(" → ")}`,
				cyclePath
			};
		}
		inStack.delete(node);
		path.pop();
		return null;
	}
	for (const node of adjacency.keys()) if (!visited.has(node)) {
		const result = dfs(node);
		if (result) return result;
	}
	return { ok: true };
}
/**
* Zod schemas and referential integrity validation for curriculum packs.
*/
var cognitiveLevelSchema = _enum([
	"recall",
	"understand",
	"apply",
	"analyze"
]);
var versionStatusSchema = _enum([
	"draft",
	"active",
	"retired"
]);
var prerequisiteKindSchema = _enum(["required", "helpful"]);
var sourceKindSchema = _enum([
	"textbook",
	"syllabus",
	"exam",
	"other"
]);
var educationSystemSchema = object({
	id: string().min(1),
	countryCode: string().length(2),
	name: string().min(1),
	languages: array(string().min(1)).min(1),
	defaultLocale: string().min(1)
});
var curriculumVersionSchema = object({
	id: string().min(1),
	systemId: string().min(1),
	label: string().min(1),
	status: versionStatusSchema,
	effectiveFrom: string().min(1),
	effectiveTo: string().nullable()
});
var gradeLevelSchema = object({
	id: string().min(1),
	versionId: string().min(1),
	code: string().min(1),
	label: string().min(1),
	sortOrder: number().int(),
	stage: string().min(1)
});
var streamSchema = object({
	id: string().min(1),
	versionId: string().min(1),
	code: string().min(1),
	label: string().min(1),
	gradeCodes: array(string())
});
var subjectSchema = object({
	id: string().min(1),
	versionId: string().min(1),
	code: string().min(1),
	name: string().min(1),
	language: string().min(1),
	gradeCodes: array(string()).min(1),
	streamCodes: array(string())
});
var topicSchema = object({
	id: string().min(1),
	subjectId: string().min(1),
	parentId: string().nullable(),
	code: string().min(1),
	title: string().min(1),
	sortOrder: number().int()
});
var objectiveSchema = object({
	id: string().min(1),
	topicId: string().min(1),
	code: string().min(1),
	statement: string().min(1),
	cognitiveLevel: cognitiveLevelSchema
});
var prerequisiteSchema = object({
	objectiveId: string().min(1),
	requiresObjectiveId: string().min(1),
	kind: prerequisiteKindSchema
});
var sourceRefSchema = object({
	id: string().min(1),
	targetId: string().min(1),
	targetType: _enum(["objective", "topic"]),
	kind: sourceKindSchema,
	citation: string().min(1),
	locator: string().nullable(),
	url: string().nullable(),
	license: string().nullable()
});
var examBlueprintSchema = object({
	id: string().min(1),
	versionId: string().min(1),
	name: string().min(1),
	gradeCode: string().min(1),
	streamCode: string().nullable(),
	subjectId: string().min(1)
});
var blueprintWeightSchema = object({
	blueprintId: string().min(1),
	topicId: string().min(1),
	weight: number().min(0).max(1),
	itemCountHint: number().int().nonnegative().nullable()
});
var curriculumPackMetaSchema = object({
	packId: string().min(1),
	systemId: string().min(1),
	versionId: string().min(1),
	gradeCode: string().min(1),
	streamCode: string().nullable(),
	title: string().min(1),
	description: string(),
	contentHash: string().min(1),
	createdAt: string().min(1),
	isDevelopmentFixture: boolean()
});
var curriculumPackContentSchema = object({
	system: educationSystemSchema,
	version: curriculumVersionSchema,
	grade: gradeLevelSchema,
	streams: array(streamSchema),
	subjects: array(subjectSchema),
	topics: array(topicSchema),
	objectives: array(objectiveSchema),
	prerequisites: array(prerequisiteSchema),
	sourceRefs: array(sourceRefSchema),
	blueprints: array(examBlueprintSchema),
	blueprintWeights: array(blueprintWeightSchema)
});
var curriculumPackSchema = object({
	meta: curriculumPackMetaSchema,
	content: curriculumPackContentSchema
});
function uniqueIds(ids, label) {
	const seen = /* @__PURE__ */ new Set();
	for (const id of ids) {
		if (seen.has(id)) return `Duplicate ${label} id: ${id}`;
		seen.add(id);
	}
	return null;
}
/**
* Full structural + referential validation of a curriculum pack.
* Does not recompute the content hash (callers may verify separately).
*/
function validateCurriculumPack(raw) {
	const parsed = curriculumPackSchema.safeParse(raw);
	if (!parsed.success) return {
		ok: false,
		message: "Pack failed schema validation.",
		issues: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
	};
	const pack = parsed.data;
	const content = pack.content;
	const issues = [];
	if (pack.meta.systemId !== content.system.id) issues.push("meta.systemId does not match content.system.id");
	if (pack.meta.versionId !== content.version.id) issues.push("meta.versionId does not match content.version.id");
	if (pack.meta.gradeCode !== content.grade.code) issues.push("meta.gradeCode does not match content.grade.code");
	if (content.version.systemId !== content.system.id) issues.push("version.systemId does not match system.id");
	if (content.grade.versionId !== content.version.id) issues.push("grade.versionId does not match version.id");
	const idChecks = [
		uniqueIds([content.system.id], "system"),
		uniqueIds([content.version.id], "version"),
		uniqueIds([content.grade.id], "grade"),
		uniqueIds(content.streams.map((s) => s.id), "stream"),
		uniqueIds(content.subjects.map((s) => s.id), "subject"),
		uniqueIds(content.topics.map((t) => t.id), "topic"),
		uniqueIds(content.objectives.map((o) => o.id), "objective"),
		uniqueIds(content.sourceRefs.map((s) => s.id), "sourceRef"),
		uniqueIds(content.blueprints.map((b) => b.id), "blueprint")
	];
	for (const err of idChecks) if (err) issues.push(err);
	const subjectIds = new Set(content.subjects.map((s) => s.id));
	const topicIds = new Set(content.topics.map((t) => t.id));
	const objectiveIds = new Set(content.objectives.map((o) => o.id));
	const blueprintIds = new Set(content.blueprints.map((b) => b.id));
	const streamCodes = new Set(content.streams.map((s) => s.code));
	const gradeCode = content.grade.code;
	for (const stream of content.streams) if (stream.versionId !== content.version.id) issues.push(`Stream ${stream.id} has wrong versionId`);
	if (pack.meta.streamCode !== null) {
		const metaStream = content.streams.find((s) => s.code === pack.meta.streamCode);
		if (!metaStream) issues.push(`meta.streamCode ${pack.meta.streamCode} not found in content.streams`);
		else if (metaStream.gradeCodes.length > 0 && !metaStream.gradeCodes.includes(gradeCode)) issues.push(`Stream ${pack.meta.streamCode} does not apply to pack grade ${gradeCode}`);
	}
	for (const subject of content.subjects) {
		if (subject.versionId !== content.version.id) issues.push(`Subject ${subject.id} has wrong versionId`);
		if (!subject.gradeCodes.includes(gradeCode)) issues.push(`Subject ${subject.id} does not list pack grade ${gradeCode}`);
		for (const sc of subject.streamCodes) if (!streamCodes.has(sc)) issues.push(`Subject ${subject.id} references unknown stream code ${sc}`);
		else {
			const stream = content.streams.find((s) => s.code === sc);
			if (stream && stream.gradeCodes.length > 0 && !stream.gradeCodes.includes(gradeCode)) issues.push(`Subject ${subject.id} stream ${sc} does not apply to pack grade ${gradeCode}`);
		}
	}
	for (const topic of content.topics) {
		if (!subjectIds.has(topic.subjectId)) issues.push(`Topic ${topic.id} references missing subject ${topic.subjectId}`);
		if (topic.parentId !== null && !topicIds.has(topic.parentId)) issues.push(`Topic ${topic.id} references missing parent ${topic.parentId}`);
	}
	{
		const parentMap = new Map(content.topics.map((t) => [t.id, t.parentId]));
		for (const topic of content.topics) {
			const seen = /* @__PURE__ */ new Set();
			let current = topic.id;
			while (current) {
				if (seen.has(current)) {
					issues.push(`Topic parent cycle involving ${topic.id}`);
					break;
				}
				seen.add(current);
				current = parentMap.get(current) ?? null;
			}
		}
	}
	for (const objective of content.objectives) if (!topicIds.has(objective.topicId)) issues.push(`Objective ${objective.id} references missing topic ${objective.topicId}`);
	for (const prereq of content.prerequisites) {
		if (!objectiveIds.has(prereq.objectiveId)) issues.push(`Prerequisite references missing objective ${prereq.objectiveId}`);
		if (!objectiveIds.has(prereq.requiresObjectiveId)) issues.push(`Prerequisite references missing required objective ${prereq.requiresObjectiveId}`);
		if (prereq.objectiveId === prereq.requiresObjectiveId) issues.push(`Prerequisite self-reference on ${prereq.objectiveId}`);
	}
	const cycleResult = detectPrerequisiteCycles(content.prerequisites);
	if (!cycleResult.ok) issues.push(cycleResult.message);
	for (const ref of content.sourceRefs) {
		if (ref.targetType === "objective" && !objectiveIds.has(ref.targetId)) issues.push(`SourceRef ${ref.id} targets missing objective ${ref.targetId}`);
		if (ref.targetType === "topic" && !topicIds.has(ref.targetId)) issues.push(`SourceRef ${ref.id} targets missing topic ${ref.targetId}`);
	}
	for (const bp of content.blueprints) {
		if (bp.versionId !== content.version.id) issues.push(`Blueprint ${bp.id} has wrong versionId`);
		if (!subjectIds.has(bp.subjectId)) issues.push(`Blueprint ${bp.id} references missing subject ${bp.subjectId}`);
		if (bp.gradeCode !== gradeCode) issues.push(`Blueprint ${bp.id} gradeCode does not match pack grade`);
		if (bp.streamCode !== null) {
			if (!streamCodes.has(bp.streamCode)) issues.push(`Blueprint ${bp.id} references unknown stream code ${bp.streamCode}`);
			else {
				const stream = content.streams.find((s) => s.code === bp.streamCode);
				if (stream && stream.gradeCodes.length > 0 && !stream.gradeCodes.includes(gradeCode)) issues.push(`Blueprint ${bp.id} stream ${bp.streamCode} does not apply to pack grade ${gradeCode}`);
			}
		}
	}
	for (const w of content.blueprintWeights) {
		if (!blueprintIds.has(w.blueprintId)) issues.push(`BlueprintWeight references missing blueprint ${w.blueprintId}`);
		if (!topicIds.has(w.topicId)) issues.push(`BlueprintWeight references missing topic ${w.topicId}`);
	}
	const weightsByBlueprint = /* @__PURE__ */ new Map();
	for (const w of content.blueprintWeights) weightsByBlueprint.set(w.blueprintId, (weightsByBlueprint.get(w.blueprintId) ?? 0) + w.weight);
	for (const bp of content.blueprints) {
		if (!weightsByBlueprint.has(bp.id)) {
			issues.push(`Blueprint ${bp.id} has no weights`);
			continue;
		}
		const sum = weightsByBlueprint.get(bp.id);
		if (Math.abs(sum - 1) > 1e-6) issues.push(`Blueprint ${bp.id} weights sum to ${sum}, expected 1`);
	}
	if (issues.length > 0) return {
		ok: false,
		message: "Pack failed referential validation.",
		issues
	};
	return {
		ok: true,
		pack
	};
}
/**
* Curriculum pack import/export helpers and install decision logic.
*/
/**
* Build a pack from validated content + metadata fields.
* Computes the content hash from the content only (meta.contentHash is set).
*/
async function buildPack(content, options) {
	const hash = await contentHash(content);
	return {
		meta: {
			packId: options.packId,
			systemId: content.system.id,
			versionId: content.version.id,
			gradeCode: content.grade.code,
			streamCode: options.streamCode,
			title: options.title,
			description: options.description,
			contentHash: hash,
			createdAt: options.createdAt ?? (/* @__PURE__ */ new Date()).toISOString(),
			isDevelopmentFixture: options.isDevelopmentFixture
		},
		content
	};
}
/**
* Validate an unknown payload and optionally verify the declared content hash.
*/
async function importPack(raw, options = {}) {
	const result = validateCurriculumPack(raw);
	if (!result.ok) return result;
	if (options.verifyHash !== false) {
		const computed = await contentHash(result.pack.content);
		if (computed !== result.pack.meta.contentHash) return {
			ok: false,
			message: "Content hash mismatch. Pack may be corrupted or altered.",
			issues: [`expected ${result.pack.meta.contentHash}, got ${computed}`]
		};
	}
	return result;
}
/**
* Decide how to handle installing a validated pack given what is already installed.
* Same packId + same contentHash → skip.
* Same packId + different hash → replace (new version of the pack).
* Different packId → install.
*/
function decideInstall(pack, existing) {
	if (!existing) return {
		action: "install",
		reason: "New pack."
	};
	if (existing.meta.contentHash === pack.meta.contentHash) return {
		action: "skip",
		reason: "Identical content already installed.",
		existing
	};
	const existingStatus = existing.content.version.status;
	if (existing.meta.versionId === pack.meta.versionId && (existingStatus === "active" || existingStatus === "retired")) return {
		action: "reject",
		reason: `Curriculum version is ${existingStatus} and immutable. Ship a new version id for corrections.`
	};
	return {
		action: "replace",
		reason: "Same pack id with different content hash; treating as updated version.",
		existing
	};
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/database-DQ0ShGF7.js
function emptyCurriculumLink() {
	return {
		systemId: null,
		versionId: null,
		gradeCode: null,
		subjectId: null,
		subjectCode: null,
		topicId: null,
		topicCode: null,
		packId: null
	};
}
var SIRIUS_DB_NAME = "sirius";
var PROFILE_STORE = "profile";
var NOTES_STORE = "notes";
var PACKS_STORE = "packs";
var DOCUMENTS_STORE = "documents";
var DOCUMENT_CONTENT_STORE = "documentContent";
var DOCUMENT_BINARY_STORE = "documentBinary";
var QUESTIONS_STORE = "learningQuestions";
var SESSIONS_STORE = "practiceSessions";
var EVALUATIONS_STORE = "answerEvaluations";
var ATTEMPTS_STORE = "learningAttempts";
var FEYNMAN_STORE = "feynmanSessions";
var MISCONCEPTIONS_STORE = "misconceptions";
var KNOWLEDGE_GRAPH_STORE = "knowledgeGraphs";
var MASTERY_STORE = "masteryAssessments";
var OBJECTIVE_EVIDENCE_STORE = "objectiveEvidence";
var RECOMMENDATION_HISTORY_STORE = "recommendationHistory";
var REVISION_SCHEDULE_STORE = "revisionSchedules";
var REVISION_SESSION_STORE = "revisionSessions";
var REVISION_HISTORY_STORE = "revisionHistory";
var DAILY_REVISION_PLAN_STORE = "dailyRevisionPlans";
var EXAM_DEFINITION_STORE = "examDefinitions";
var EXAM_SESSION_STORE = "examSessions";
var EXAM_RESULT_STORE = "examResults";
var TUTOR_SESSION_STORE = "tutorSessions";
var CHUNK_EMBEDDING_STORE = "chunkEmbeddings";
var PROFILE_KEY = "learner";
var databasePromise = null;
function openDatabase() {
	if (typeof indexedDB === "undefined") return Promise.reject(new AppError("This browser does not provide on-device storage."));
	if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(SIRIUS_DB_NAME, 10);
		request.onupgradeneeded = (event) => {
			const db = request.result;
			const oldVersion = event.oldVersion;
			if (oldVersion < 1) {
				if (!db.objectStoreNames.contains(PROFILE_STORE)) db.createObjectStore(PROFILE_STORE);
				if (!db.objectStoreNames.contains(NOTES_STORE)) db.createObjectStore(NOTES_STORE, { keyPath: "id" });
			}
			if (oldVersion < 2) {
				if (!db.objectStoreNames.contains(PACKS_STORE)) db.createObjectStore(PACKS_STORE, { keyPath: "packId" });
			}
			if (oldVersion < 3) {
				if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) db.createObjectStore(DOCUMENTS_STORE, { keyPath: "id" });
				if (!db.objectStoreNames.contains(DOCUMENT_CONTENT_STORE)) db.createObjectStore(DOCUMENT_CONTENT_STORE, { keyPath: "documentId" });
				if (!db.objectStoreNames.contains(DOCUMENT_BINARY_STORE)) db.createObjectStore(DOCUMENT_BINARY_STORE, { keyPath: "documentId" });
			}
			if (oldVersion < 4) {
				if (!db.objectStoreNames.contains(QUESTIONS_STORE)) db.createObjectStore(QUESTIONS_STORE, { keyPath: "id" });
				if (!db.objectStoreNames.contains(SESSIONS_STORE)) db.createObjectStore(SESSIONS_STORE, { keyPath: "id" });
				if (!db.objectStoreNames.contains(EVALUATIONS_STORE)) db.createObjectStore(EVALUATIONS_STORE, { keyPath: "id" });
				if (!db.objectStoreNames.contains(ATTEMPTS_STORE)) db.createObjectStore(ATTEMPTS_STORE, { keyPath: "id" });
				if (!db.objectStoreNames.contains(FEYNMAN_STORE)) db.createObjectStore(FEYNMAN_STORE, { keyPath: "id" });
			}
			if (oldVersion < 5) {
				if (!db.objectStoreNames.contains(MISCONCEPTIONS_STORE)) db.createObjectStore(MISCONCEPTIONS_STORE, { keyPath: "id" });
			}
			if (oldVersion < 6) {
				if (!db.objectStoreNames.contains(KNOWLEDGE_GRAPH_STORE)) db.createObjectStore(KNOWLEDGE_GRAPH_STORE, { keyPath: "id" });
				if (!db.objectStoreNames.contains(MASTERY_STORE)) db.createObjectStore(MASTERY_STORE, { keyPath: "id" });
				if (!db.objectStoreNames.contains(OBJECTIVE_EVIDENCE_STORE)) db.createObjectStore(OBJECTIVE_EVIDENCE_STORE, { keyPath: "id" });
				if (!db.objectStoreNames.contains(RECOMMENDATION_HISTORY_STORE)) db.createObjectStore(RECOMMENDATION_HISTORY_STORE, { keyPath: "id" });
			}
			if (oldVersion < 7) {
				if (!db.objectStoreNames.contains(REVISION_SCHEDULE_STORE)) db.createObjectStore(REVISION_SCHEDULE_STORE, { keyPath: "id" });
				if (!db.objectStoreNames.contains(REVISION_SESSION_STORE)) db.createObjectStore(REVISION_SESSION_STORE, { keyPath: "id" });
				if (!db.objectStoreNames.contains(REVISION_HISTORY_STORE)) db.createObjectStore(REVISION_HISTORY_STORE, { keyPath: "id" });
				if (!db.objectStoreNames.contains(DAILY_REVISION_PLAN_STORE)) db.createObjectStore(DAILY_REVISION_PLAN_STORE, { keyPath: "id" });
			}
			if (oldVersion < 8) {
				if (!db.objectStoreNames.contains(EXAM_DEFINITION_STORE)) db.createObjectStore(EXAM_DEFINITION_STORE, { keyPath: "id" });
				if (!db.objectStoreNames.contains(EXAM_SESSION_STORE)) db.createObjectStore(EXAM_SESSION_STORE, { keyPath: "id" });
				if (!db.objectStoreNames.contains(EXAM_RESULT_STORE)) db.createObjectStore(EXAM_RESULT_STORE, { keyPath: "id" });
			}
			if (oldVersion < 9) {
				if (!db.objectStoreNames.contains(TUTOR_SESSION_STORE)) db.createObjectStore(TUTOR_SESSION_STORE, { keyPath: "id" });
			}
			if (oldVersion < 10) {
				if (!db.objectStoreNames.contains(CHUNK_EMBEDDING_STORE)) db.createObjectStore(CHUNK_EMBEDDING_STORE, { keyPath: "id" }).createIndex("by_document", "documentId", { unique: false });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => {
			databasePromise = null;
			reject(new AppError("Could not open on-device storage."));
		};
		request.onblocked = () => {
			databasePromise = null;
			reject(new AppError("On-device storage is open in another tab. Close the other Sirius tab and try again."));
		};
	});
	return databasePromise;
}
function runTransaction(storeName, mode, run) {
	return openDatabase().then((db) => new Promise((resolve, reject) => {
		const tx = db.transaction(storeName, mode);
		const request = run(tx.objectStore(storeName));
		let succeeded = false;
		request.onsuccess = () => {
			succeeded = true;
		};
		tx.oncomplete = () => {
			if (!succeeded) {
				reject(new AppError("Could not read on-device storage."));
				return;
			}
			resolve(request.result);
		};
		tx.onerror = () => {
			reject(new AppError(mode === "readonly" ? "Could not read on-device storage." : "Could not save on this device."));
		};
		tx.onabort = () => {
			reject(new AppError("Saving was interrupted."));
		};
	}));
}
async function readProfile() {
	const value = await runTransaction(PROFILE_STORE, "readonly", (store) => store.get(PROFILE_KEY));
	if (!value) return emptyProfile();
	return normalizeProfile(value);
}
async function writeProfile(profile) {
	const normalized = normalizeProfile({
		...profile,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	});
	await runTransaction(PROFILE_STORE, "readwrite", (store) => store.put(normalized, PROFILE_KEY));
	return normalized;
}
async function listNotes() {
	return sortNotes((await runTransaction(NOTES_STORE, "readonly", (store) => store.getAll())).map((item) => normalizeNote(item)).filter((item) => item !== null));
}
async function saveNote(note) {
	const normalized = normalizeNote(note);
	if (!normalized) throw new AppError("This note is missing a title.");
	await runTransaction(NOTES_STORE, "readwrite", (store) => store.put(normalized));
	return normalized;
}
async function deleteNote(id) {
	await runTransaction(NOTES_STORE, "readwrite", (store) => store.delete(id));
}
async function listInstalledPacks() {
	return (await runTransaction(PACKS_STORE, "readonly", (store) => store.getAll()) ?? []).filter((item) => {
		return typeof item === "object" && item !== null && "packId" in item && "meta" in item && "content" in item;
	}).sort((a, b) => a.meta.title.localeCompare(b.meta.title));
}
async function getInstalledPack(packId) {
	const value = await runTransaction(PACKS_STORE, "readonly", (store) => store.get(packId));
	if (!value || typeof value !== "object" || !("packId" in value)) return void 0;
	return value;
}
/**
* Validate and install a curriculum pack. Does not touch profile or notes stores.
*/
async function installPack(raw) {
	const imported = await importPack(raw, { verifyHash: true });
	if (!imported.ok) return {
		status: "rejected",
		message: imported.message,
		issues: imported.issues
	};
	const pack = imported.pack;
	const decision = decideInstall(pack, await getInstalledPack(pack.meta.packId));
	if (decision.action === "skip") return {
		status: "skipped",
		record: decision.existing
	};
	if (decision.action === "reject") return {
		status: "rejected",
		message: decision.reason
	};
	const record = {
		packId: pack.meta.packId,
		meta: pack.meta,
		content: pack.content,
		installedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	await runTransaction(PACKS_STORE, "readwrite", (store) => store.put(record));
	return {
		status: decision.action === "replace" ? "replaced" : "installed",
		record
	};
}
async function removePack(packId) {
	await runTransaction(PACKS_STORE, "readwrite", (store) => store.delete(packId));
}
function normalizeDocumentMeta(raw) {
	if (!raw || typeof raw !== "object") return null;
	const r = raw;
	if (typeof r.id !== "string" || !r.id) return null;
	const curriculum = r.curriculum && typeof r.curriculum === "object" ? {
		systemId: typeof r.curriculum.systemId === "string" ? r.curriculum.systemId : null,
		versionId: typeof r.curriculum.versionId === "string" ? r.curriculum.versionId : null,
		gradeCode: typeof r.curriculum.gradeCode === "string" ? r.curriculum.gradeCode : null,
		subjectId: typeof r.curriculum.subjectId === "string" ? r.curriculum.subjectId : null,
		subjectCode: typeof r.curriculum.subjectCode === "string" ? r.curriculum.subjectCode : null,
		topicId: typeof r.curriculum.topicId === "string" ? r.curriculum.topicId : null,
		topicCode: typeof r.curriculum.topicCode === "string" ? r.curriculum.topicCode : null,
		packId: typeof r.curriculum.packId === "string" ? r.curriculum.packId : null
	} : emptyCurriculumLink();
	return {
		id: r.id,
		name: typeof r.name === "string" ? r.name : "Untitled",
		originalName: typeof r.originalName === "string" ? r.originalName : "document.pdf",
		format: "pdf",
		mimeType: typeof r.mimeType === "string" ? r.mimeType : "application/pdf",
		sizeBytes: typeof r.sizeBytes === "number" ? r.sizeBytes : 0,
		pageCount: typeof r.pageCount === "number" ? r.pageCount : null,
		status: typeof r.status === "string" ? r.status : "pending",
		statusMessage: typeof r.statusMessage === "string" ? r.statusMessage : null,
		curriculum,
		contentHash: typeof r.contentHash === "string" ? r.contentHash : null,
		createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
		updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
		binaryStored: Boolean(r.binaryStored)
	};
}
async function listDocuments() {
	return (await runTransaction(DOCUMENTS_STORE, "readonly", (store) => store.getAll()) ?? []).map(normalizeDocumentMeta).filter((d) => d !== null).sort((a, b) => a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
}
async function getDocumentMeta(id) {
	return normalizeDocumentMeta(await runTransaction(DOCUMENTS_STORE, "readonly", (store) => store.get(id))) ?? void 0;
}
async function putDocumentMeta(meta) {
	await runTransaction(DOCUMENTS_STORE, "readwrite", (store) => store.put(meta));
	return meta;
}
async function getDocumentContent(documentId) {
	const value = await runTransaction(DOCUMENT_CONTENT_STORE, "readonly", (store) => store.get(documentId));
	if (!value || typeof value !== "object") return void 0;
	return value;
}
async function putDocumentContent(content) {
	await runTransaction(DOCUMENT_CONTENT_STORE, "readwrite", (store) => store.put(content));
}
async function getDocumentBinary(documentId) {
	const value = await runTransaction(DOCUMENT_BINARY_STORE, "readonly", (store) => store.get(documentId));
	if (!value || typeof value !== "object") return void 0;
	const r = value;
	if (!r.blob) return void 0;
	return r;
}
async function putDocumentBinary(binary) {
	await runTransaction(DOCUMENT_BINARY_STORE, "readwrite", (store) => store.put(binary));
}
async function deleteDocument(documentId) {
	try {
		await deleteChunkEmbeddingsForDocument(documentId);
	} catch {}
	const db = await openDatabase();
	await new Promise((resolve, reject) => {
		const tx = db.transaction([
			DOCUMENTS_STORE,
			DOCUMENT_CONTENT_STORE,
			DOCUMENT_BINARY_STORE
		], "readwrite");
		tx.objectStore(DOCUMENTS_STORE).delete(documentId);
		tx.objectStore(DOCUMENT_CONTENT_STORE).delete(documentId);
		tx.objectStore(DOCUMENT_BINARY_STORE).delete(documentId);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(new AppError("Could not remove document from this device."));
		tx.onabort = () => reject(new AppError("Removing the document was interrupted."));
	});
}
async function findDocumentByHash(contentHash) {
	return (await listDocuments()).find((d) => d.contentHash === contentHash);
}
async function putLearningQuestion(q) {
	await runTransaction(QUESTIONS_STORE, "readwrite", (store) => store.put(q));
}
async function putLearningQuestions(qs) {
	for (const q of qs) await putLearningQuestion(q);
}
async function listLearningQuestions() {
	return (await runTransaction(QUESTIONS_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
}
async function putPracticeSession(session) {
	await runTransaction(SESSIONS_STORE, "readwrite", (store) => store.put(session));
}
async function listPracticeSessions() {
	return (await runTransaction(SESSIONS_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
}
async function putAnswerEvaluation(ev) {
	await runTransaction(EVALUATIONS_STORE, "readwrite", (store) => store.put(ev));
}
async function listAnswerEvaluations() {
	return (await runTransaction(EVALUATIONS_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
}
async function putAttempt(attempt) {
	await runTransaction(ATTEMPTS_STORE, "readwrite", (store) => store.put(attempt));
}
async function listAttempts() {
	return (await runTransaction(ATTEMPTS_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
}
async function putFeynmanSession(session) {
	await runTransaction(FEYNMAN_STORE, "readwrite", (store) => store.put(session));
}
async function listFeynmanSessions() {
	return (await runTransaction(FEYNMAN_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
}
async function putMisconception(record) {
	await runTransaction(MISCONCEPTIONS_STORE, "readwrite", (store) => store.put(record));
}
async function listMisconceptions() {
	return (await runTransaction(MISCONCEPTIONS_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.lastObservedAt < b.lastObservedAt ? 1 : a.lastObservedAt > b.lastObservedAt ? -1 : 0);
}
async function putKnowledgeGraph(snapshot) {
	await runTransaction(KNOWLEDGE_GRAPH_STORE, "readwrite", (store) => store.put(snapshot));
}
async function listKnowledgeGraphs() {
	return await runTransaction(KNOWLEDGE_GRAPH_STORE, "readonly", (store) => store.getAll()) ?? [];
}
async function putMasteryAssessment(assessment) {
	await runTransaction(MASTERY_STORE, "readwrite", (store) => store.put(assessment));
}
async function listMasteryAssessments() {
	return (await runTransaction(MASTERY_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0);
}
async function putRevisionSchedule(s) {
	await runTransaction(REVISION_SCHEDULE_STORE, "readwrite", (store) => store.put(s));
}
async function listRevisionSchedules() {
	return (await runTransaction(REVISION_SCHEDULE_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.nextReviewAt < b.nextReviewAt ? -1 : a.nextReviewAt > b.nextReviewAt ? 1 : 0);
}
async function putRevisionSession(s) {
	await runTransaction(REVISION_SESSION_STORE, "readwrite", (store) => store.put(s));
}
async function getRevisionSession(id) {
	const value = await runTransaction(REVISION_SESSION_STORE, "readonly", (store) => store.get(id));
	return value && typeof value === "object" ? value : void 0;
}
async function putRevisionHistory(e) {
	await runTransaction(REVISION_HISTORY_STORE, "readwrite", (store) => store.put(e));
}
async function listRevisionHistory() {
	return (await runTransaction(REVISION_HISTORY_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.reviewedAt < b.reviewedAt ? 1 : a.reviewedAt > b.reviewedAt ? -1 : 0);
}
async function putDailyRevisionPlan(plan) {
	await runTransaction(DAILY_REVISION_PLAN_STORE, "readwrite", (store) => store.put(plan));
}
async function listDailyRevisionPlans() {
	return (await runTransaction(DAILY_REVISION_PLAN_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.planDate < b.planDate ? 1 : a.planDate > b.planDate ? -1 : 0);
}
async function putExamDefinition(d) {
	await runTransaction(EXAM_DEFINITION_STORE, "readwrite", (store) => store.put(d));
}
async function listExamDefinitions() {
	return (await runTransaction(EXAM_DEFINITION_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
}
async function getExamDefinition(id) {
	const value = await runTransaction(EXAM_DEFINITION_STORE, "readonly", (store) => store.get(id));
	return value && typeof value === "object" ? value : void 0;
}
async function putExamSession(s) {
	await runTransaction(EXAM_SESSION_STORE, "readwrite", (store) => store.put(s));
}
async function getExamSession(id) {
	const value = await runTransaction(EXAM_SESSION_STORE, "readonly", (store) => store.get(id));
	return value && typeof value === "object" ? value : void 0;
}
async function listExamSessions() {
	return (await runTransaction(EXAM_SESSION_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0);
}
async function putExamResult(r) {
	await runTransaction(EXAM_RESULT_STORE, "readwrite", (store) => store.put(r));
}
async function listExamResults() {
	return (await runTransaction(EXAM_RESULT_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.submittedAt < b.submittedAt ? 1 : a.submittedAt > b.submittedAt ? -1 : 0);
}
async function putTutorSession(s) {
	await runTransaction(TUTOR_SESSION_STORE, "readwrite", (store) => store.put(s));
}
async function listTutorSessions() {
	return (await runTransaction(TUTOR_SESSION_STORE, "readonly", (store) => store.getAll()) ?? []).sort((a, b) => a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0);
}
async function deleteTutorSession(id) {
	await runTransaction(TUTOR_SESSION_STORE, "readwrite", (store) => store.delete(id));
}
async function listDocumentChunks() {
	const docs = await listDocuments();
	const all = [];
	for (const d of docs) {
		const content = await getDocumentContent(d.id);
		if (content?.chunks?.length) all.push(...content.chunks);
	}
	return all;
}
async function putChunkEmbeddings(records) {
	if (records.length === 0) return;
	for (const r of records) await runTransaction(CHUNK_EMBEDDING_STORE, "readwrite", (store) => store.put(r));
}
async function listChunkEmbeddings(documentId) {
	const all = await runTransaction(CHUNK_EMBEDDING_STORE, "readonly", (store) => store.getAll());
	const list = Array.isArray(all) ? all : [];
	if (!documentId) return list;
	return list.filter((r) => r.documentId === documentId);
}
async function deleteChunkEmbeddingsForDocument(documentId) {
	const all = await listChunkEmbeddings(documentId);
	for (const r of all) await runTransaction(CHUNK_EMBEDDING_STORE, "readwrite", (store) => store.delete(r.id));
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/cn-Ccejyh36.js
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
//#endregion
export { putRevisionSession as $, listNotes as A, putDocumentContent as B, listExamSessions as C, listLearningQuestions as D, listKnowledgeGraphs as E, putAnswerEvaluation as F, putFeynmanSession as G, putExamDefinition as H, putAttempt as I, putMasteryAssessment as J, putKnowledgeGraph as K, putChunkEmbeddings as L, listRevisionHistory as M, listRevisionSchedules as N, listMasteryAssessments as O, listTutorSessions as P, putRevisionSchedule as Q, putDailyRevisionPlan as R, listExamResults as S, listInstalledPacks as T, putExamResult as U, putDocumentMeta as V, putExamSession as W, putPracticeSession as X, putMisconception as Y, putRevisionHistory as Z, listChunkEmbeddings as _, stageLabel as _t, deleteTutorSession as a, buildPack as at, listDocuments as b, getDocumentBinary as c, createNoteId as ct, getExamDefinition as d, sortNotes as dt, putTutorSession as et, getExamSession as f, validateNoteDraft as ft, listAttempts as g, preparatoryGrade as gt, listAnswerEvaluations as h, emptyProfile as ht, deleteNote as i, writeProfile as it, listPracticeSessions as j, listMisconceptions as k, getDocumentContent as l, formatNoteTime as lt, installPack as m, STREAMS as mt, deleteChunkEmbeddingsForDocument as n, removePack as nt, emptyCurriculumLink as o, detectPrerequisiteCycles as ot, getRevisionSession as p, GRADES as pt, putLearningQuestions as q, deleteDocument as r, saveNote as rt, findDocumentByHash as s, BODY_MAX as st, cn as t, readProfile as tt, getDocumentMeta as u, noteCountLabel as ut, listDailyRevisionPlans as v, validateDisplayName as vt, listFeynmanSessions as w, listExamDefinitions as x, listDocumentChunks as y, AppError as yt, putDocumentBinary as z };
