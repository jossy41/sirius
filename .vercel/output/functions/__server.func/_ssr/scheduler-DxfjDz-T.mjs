import { n as __exportAll } from "../_runtime.mjs";
import { t as __exportAll$1 } from "./rolldown-runtime-D7D4PA-g.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/scheduler-DxfjDz-T.js
var scheduler_DxfjDz_T_exports = /* @__PURE__ */ __exportAll({
	a: () => scheduler_exports,
	i: () => postponeSchedule,
	n: () => isDue,
	o: () => seedScheduleFromMastery,
	r: () => isOverdue,
	t: () => applyReviewOutcome
});
var scheduler_exports = /* @__PURE__ */ __exportAll$1({
	addDaysISO: () => addDaysISO,
	applyReviewOutcome: () => applyReviewOutcome,
	daysBetween: () => daysBetween,
	isDue: () => isDue,
	isOverdue: () => isOverdue,
	postponeSchedule: () => postponeSchedule,
	scheduleId: () => scheduleId,
	seedScheduleFromMastery: () => seedScheduleFromMastery
});
var MIN_INTERVAL = 1;
var MAX_INTERVAL = 60;
function scheduleId(objectiveId, packId) {
	return `rs_${packId ?? "local"}__${objectiveId}`;
}
function startOfDayISO(d = /* @__PURE__ */ new Date()) {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x.toISOString();
}
function addDaysISO(iso, days) {
	const d = new Date(iso);
	d.setDate(d.getDate() + days);
	d.setHours(0, 0, 0, 0);
	return d.toISOString();
}
function daysBetween(a, b) {
	const ms = new Date(b).getTime() - new Date(a).getTime();
	return Math.floor(ms / 864e5);
}
function activityForState(state, hasMc, missingPrereq) {
	if (hasMc) return "misconception_remediation";
	if (missingPrereq) return "prerequisite_repair";
	if (!state || state === "not_started") return "initial_review";
	if (state === "needs_review" || state === "practising") return "practice";
	if (state === "introduced" || state === "developing") return "reassessment";
	return "maintenance";
}
function baseIntervalDays(state, consecutiveSuccesses, hasMc) {
	if (hasMc) return 1;
	if (!state || state === "not_started" || state === "needs_review") return 1;
	if (state === "introduced" || state === "practising") return Math.min(2 + consecutiveSuccesses, 4);
	if (state === "developing") return Math.min(3 + consecutiveSuccesses * 2, 10);
	return Math.min(7 + consecutiveSuccesses * 3, MAX_INTERVAL);
}
/**
* Create or update a schedule after a review outcome.
*/
function applyReviewOutcome(input) {
	const now = input.now ?? (/* @__PURE__ */ new Date()).toISOString();
	const today = startOfDayISO(new Date(now));
	const openMc = input.misconceptions.some((m) => {
		if (m.status !== "confirmed" && m.status !== "needs_reassessment" && m.status !== "improving") return false;
		if (input.topicLabel && m.topicLabel === input.topicLabel) return true;
		if (input.conceptId && m.concept === input.conceptId) return true;
		return !input.topicLabel && !input.conceptId;
	});
	const prev = input.existing;
	let consecutiveSuccesses = prev?.consecutiveSuccesses ?? 0;
	let consecutiveFailures = prev?.consecutiveFailures ?? 0;
	const reviewCount = (prev?.reviewCount ?? 0) + (input.correctness ? 1 : 0);
	if (input.correctness === "correct") {
		consecutiveSuccesses += 1;
		consecutiveFailures = 0;
	} else if (input.correctness === "incorrect" || input.correctness === "partial") {
		consecutiveFailures += 1;
		consecutiveSuccesses = 0;
	}
	const state = input.mastery?.state ?? prev?.masteryStateAtSchedule ?? null;
	const missingPrereq = (input.mastery?.missingPrerequisiteIds.length ?? 0) > 0;
	const activityType = activityForState(state, openMc, missingPrereq);
	let interval = baseIntervalDays(state, consecutiveSuccesses, openMc);
	if (openMc) interval = MIN_INTERVAL;
	else if (input.correctness === "incorrect") interval = MIN_INTERVAL;
	else if (input.correctness === "partial") interval = Math.max(MIN_INTERVAL, Math.floor(interval / 2));
	else if (input.correctness === "correct" && consecutiveSuccesses >= 2) interval = Math.min(MAX_INTERVAL, interval + consecutiveSuccesses);
	else if (input.correctness === "unevaluable" || input.correctness === null) interval = prev?.intervalDays ?? baseIntervalDays(state, consecutiveSuccesses, false);
	if (prev?.lastReviewedAt) {
		if (daysBetween(prev.lastReviewedAt, now) > (prev.intervalDays || 7) * 2 && state === "proficient") interval = Math.min(interval, 3);
	}
	const nextReviewAt = addDaysISO(today, interval);
	let reason;
	if (openMc) reason = "Review today because a confirmed misconception is still open on this idea.";
	else if (input.correctness === "incorrect") reason = "Review again soon because the latest response showed difficulty.";
	else if (input.correctness === "correct" && consecutiveSuccesses >= 2) reason = `Review is scheduled further out because recent assessments show consistent understanding (${consecutiveSuccesses} successful reviews in a row).`;
	else if (!prev || reviewCount <= 1) reason = "First or early review for this objective — short interval until evidence builds.";
	else if (missingPrereq) reason = "Schedule prioritises foundation work because required prerequisites are not yet secure.";
	else reason = `Next review in about ${interval} day${interval === 1 ? "" : "s"} based on mastery state (${state ?? "unknown"}) and recent outcomes.`;
	return {
		id: prev?.id ?? scheduleId(input.objectiveId, input.packId),
		objectiveId: input.objectiveId,
		packId: input.packId,
		topicLabel: input.topicLabel,
		conceptId: input.conceptId,
		activityType,
		nextReviewAt,
		lastReviewedAt: input.correctness ? now : prev?.lastReviewedAt ?? null,
		lastOutcome: input.correctness ?? prev?.lastOutcome ?? null,
		consecutiveSuccesses,
		consecutiveFailures,
		reviewCount,
		intervalDays: interval,
		masteryStateAtSchedule: state,
		hasOpenMisconception: openMc,
		reason,
		postponedUntil: null,
		createdAt: prev?.createdAt ?? now,
		updatedAt: now
	};
}
/** Seed schedules for objectives that have mastery but no schedule yet. */
function seedScheduleFromMastery(input) {
	return applyReviewOutcome({
		existing: null,
		objectiveId: input.mastery.objectiveId,
		packId: input.mastery.packId,
		topicLabel: input.topicLabel,
		conceptId: input.mastery.conceptId,
		mastery: input.mastery,
		misconceptions: input.misconceptions,
		correctness: null,
		now: input.now
	});
}
function isDue(schedule, now = /* @__PURE__ */ new Date()) {
	if (schedule.postponedUntil && new Date(schedule.postponedUntil) > now) return false;
	return new Date(schedule.nextReviewAt) <= now;
}
function isOverdue(schedule, now = /* @__PURE__ */ new Date()) {
	if (schedule.postponedUntil && new Date(schedule.postponedUntil) > now) return false;
	const due = new Date(schedule.nextReviewAt);
	return now.getTime() - due.getTime() > 864e5;
}
function postponeSchedule(schedule, days = 1, now = /* @__PURE__ */ new Date()) {
	const until = addDaysISO(startOfDayISO(now), days);
	return {
		...schedule,
		postponedUntil: until,
		nextReviewAt: until,
		reason: `Postponed by the learner; next check around ${until.slice(0, 10)}.`,
		updatedAt: now.toISOString()
	};
}
//#endregion
export { scheduler_DxfjDz_T_exports as a, postponeSchedule as i, isDue as n, seedScheduleFromMastery as o, isOverdue as r, applyReviewOutcome as t };
