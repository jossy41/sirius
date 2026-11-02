import { i as __toESM } from "../_runtime.mjs";
import { at as buildPack } from "./cn-Ccejyh36.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { T as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as useLocalLibrary, f as Button } from "./router-03i3X1Nd.mjs";
import { r as Panel } from "./panel-B6qeBfmK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/curriculum-Vs0NgukZ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Development fixtures for the Ethiopian secondary structure.
*
* IMPORTANT: These are labeled development fixtures only.
* They are NOT official Ministry of Education curriculum content.
* Do not present them as verified syllabus, textbook, or examination material.
* Real packs must cite traceable sources; these illustrate the data model.
*/
var SYSTEM = {
	id: "ET-MOE",
	countryCode: "ET",
	name: "Ethiopia — Ministry of Education (development fixture)",
	languages: ["en", "am"],
	defaultLocale: "en"
};
var VERSION = {
	id: "ET-MOE-DEV-2024",
	systemId: "ET-MOE",
	label: "Ethiopian General Secondary / Preparatory (development fixture)",
	status: "draft",
	effectiveFrom: "2024-01-01",
	effectiveTo: null
};
function makeGrade9Content() {
	const grade = {
		id: "ET-G9",
		versionId: VERSION.id,
		code: "9",
		label: "Grade 9",
		sortOrder: 9,
		stage: "general"
	};
	const subjects = [{
		id: "ET-G9-MATH",
		versionId: VERSION.id,
		code: "MATH",
		name: "Mathematics",
		language: "en",
		gradeCodes: ["9"],
		streamCodes: []
	}, {
		id: "ET-G9-ENG",
		versionId: VERSION.id,
		code: "ENG",
		name: "English",
		language: "en",
		gradeCodes: ["9"],
		streamCodes: []
	}];
	const topics = [
		{
			id: "ET-G9-MATH-ALG",
			subjectId: "ET-G9-MATH",
			parentId: null,
			code: "ALG",
			title: "Algebra (fixture topic)",
			sortOrder: 1
		},
		{
			id: "ET-G9-MATH-ALG-LIN",
			subjectId: "ET-G9-MATH",
			parentId: "ET-G9-MATH-ALG",
			code: "LIN",
			title: "Linear equations (fixture subtopic)",
			sortOrder: 1
		},
		{
			id: "ET-G9-ENG-READ",
			subjectId: "ET-G9-ENG",
			parentId: null,
			code: "READ",
			title: "Reading comprehension (fixture topic)",
			sortOrder: 1
		}
	];
	const objectives = [
		{
			id: "ET-G9-MATH-ALG-LIN-O1",
			topicId: "ET-G9-MATH-ALG-LIN",
			code: "O1",
			statement: "Solve a linear equation in one variable (development fixture objective).",
			cognitiveLevel: "apply"
		},
		{
			id: "ET-G9-MATH-ALG-LIN-O2",
			topicId: "ET-G9-MATH-ALG-LIN",
			code: "O2",
			statement: "Identify the slope and intercept of a linear function (development fixture).",
			cognitiveLevel: "understand"
		},
		{
			id: "ET-G9-ENG-READ-O1",
			topicId: "ET-G9-ENG-READ",
			code: "O1",
			statement: "Identify the main idea of a short passage (development fixture).",
			cognitiveLevel: "understand"
		}
	];
	const prerequisites = [{
		objectiveId: "ET-G9-MATH-ALG-LIN-O2",
		requiresObjectiveId: "ET-G9-MATH-ALG-LIN-O1",
		kind: "helpful"
	}];
	const sourceRefs = [{
		id: "SRC-FIXTURE-1",
		targetId: "ET-G9-MATH-ALG-LIN-O1",
		targetType: "objective",
		kind: "other",
		citation: "Development fixture — not an official textbook or syllabus citation.",
		locator: null,
		url: null,
		license: "fixture-only"
	}];
	return {
		system: {
			...SYSTEM,
			languages: [...SYSTEM.languages]
		},
		version: { ...VERSION },
		grade,
		streams: [],
		subjects,
		topics,
		objectives,
		prerequisites,
		sourceRefs,
		blueprints: [],
		blueprintWeights: []
	};
}
function makeGrade11NaturalContent() {
	const grade = {
		id: "ET-G11",
		versionId: VERSION.id,
		code: "11",
		label: "Grade 11",
		sortOrder: 11,
		stage: "preparatory"
	};
	const streams = [{
		id: "ET-NAT",
		versionId: VERSION.id,
		code: "natural",
		label: "Natural Sciences",
		gradeCodes: ["11", "12"]
	}, {
		id: "ET-SOC",
		versionId: VERSION.id,
		code: "social",
		label: "Social Sciences",
		gradeCodes: ["11", "12"]
	}];
	const subjects = [{
		id: "ET-G11-PHY",
		versionId: VERSION.id,
		code: "PHY",
		name: "Physics",
		language: "en",
		gradeCodes: ["11"],
		streamCodes: ["natural"]
	}, {
		id: "ET-G11-MATH",
		versionId: VERSION.id,
		code: "MATH",
		name: "Mathematics",
		language: "en",
		gradeCodes: ["11"],
		streamCodes: ["natural", "social"]
	}];
	const topics = [{
		id: "ET-G11-PHY-MECH",
		subjectId: "ET-G11-PHY",
		parentId: null,
		code: "MECH",
		title: "Mechanics (fixture topic)",
		sortOrder: 1
	}, {
		id: "ET-G11-MATH-CALC",
		subjectId: "ET-G11-MATH",
		parentId: null,
		code: "CALC",
		title: "Introductory calculus ideas (fixture topic)",
		sortOrder: 1
	}];
	const objectives = [{
		id: "ET-G11-PHY-MECH-O1",
		topicId: "ET-G11-PHY-MECH",
		code: "O1",
		statement: "State Newton’s second law in the form F = ma (development fixture).",
		cognitiveLevel: "recall"
	}, {
		id: "ET-G11-MATH-CALC-O1",
		topicId: "ET-G11-MATH-CALC",
		code: "O1",
		statement: "Interpret the derivative as a rate of change (development fixture).",
		cognitiveLevel: "understand"
	}];
	return {
		system: {
			...SYSTEM,
			languages: [...SYSTEM.languages]
		},
		version: { ...VERSION },
		grade,
		streams,
		subjects,
		topics,
		objectives,
		prerequisites: [],
		sourceRefs: [{
			id: "SRC-FIXTURE-G11-1",
			targetId: "ET-G11-PHY-MECH-O1",
			targetType: "objective",
			kind: "other",
			citation: "Development fixture — not an official textbook or syllabus citation.",
			locator: null,
			url: null,
			license: "fixture-only"
		}],
		blueprints: [{
			id: "ET-G11-PHY-BP",
			versionId: VERSION.id,
			name: "Physics sample weight distribution (fixture)",
			gradeCode: "11",
			streamCode: "natural",
			subjectId: "ET-G11-PHY"
		}],
		blueprintWeights: [{
			blueprintId: "ET-G11-PHY-BP",
			topicId: "ET-G11-PHY-MECH",
			weight: 1,
			itemCountHint: 10
		}]
	};
}
var cachedFixtures = null;
/** Build and cache the labeled development fixture packs. */
async function getDevelopmentFixturePacks() {
	if (cachedFixtures) return cachedFixtures;
	cachedFixtures = [await buildPack(makeGrade9Content(), {
		packId: "fixture-et-g9-common",
		title: "Grade 9 — Common (development fixture)",
		description: "Illustrative Grade 9 pack for development and UI testing. Not official MoE content.",
		streamCode: null,
		isDevelopmentFixture: true
	}), await buildPack(makeGrade11NaturalContent(), {
		packId: "fixture-et-g11-natural",
		title: "Grade 11 — Natural Sciences (development fixture)",
		description: "Illustrative Grade 11 natural-stream pack for development and UI testing. Not official MoE content.",
		streamCode: "natural",
		isDevelopmentFixture: true
	})];
	return cachedFixtures;
}
function CurriculumPage() {
	const library = useLocalLibrary();
	const [available, setAvailable] = (0, import_react.useState)([]);
	const [busyId, setBusyId] = (0, import_react.useState)(null);
	const [message, setMessage] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		getDevelopmentFixturePacks().then(setAvailable);
	}, []);
	const installedIds = new Set(library.packs.map((p) => p.packId));
	const handleInstall = (0, import_react.useCallback)(async (pack) => {
		setBusyId(pack.meta.packId);
		setMessage(null);
		try {
			const result = await library.installPack(pack);
			if (result.status === "installed") setMessage(`Installed “${pack.meta.title}”.`);
			else if (result.status === "replaced") setMessage(`Updated “${pack.meta.title}”.`);
			else if (result.status === "skipped") setMessage(`“${pack.meta.title}” is already installed.`);
			else setMessage(result.message + (result.issues?.length ? ` (${result.issues[0]})` : ""));
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Install failed.");
		} finally {
			setBusyId(null);
		}
	}, [library]);
	const handleRemove = (0, import_react.useCallback)(async (packId, title) => {
		setBusyId(packId);
		setMessage(null);
		try {
			await library.removePack(packId);
			setMessage(`Removed “${title}”.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Remove failed.");
		} finally {
			setBusyId(null);
		}
	}, [library]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex max-w-2xl flex-col gap-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-primary",
					children: "Curriculum"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-serif text-4xl leading-tight text-ink md:text-5xl",
					children: "Study packs"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-lg text-pretty text-muted",
					children: "Install a curriculum pack on this device, then browse subjects, topics, and learning objectives offline. Packs are versioned and validated before install."
				})
			] }),
			message ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink",
				role: "status",
				children: message
			}) : null,
			library.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted",
				children: "Opening on-device storage…"
			}) : library.status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted",
				children: library.errorMessage
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-serif text-2xl text-ink",
					children: "Installed"
				}), library.packs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: "No packs installed yet. Install a development fixture below."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-col gap-3",
					children: library.packs.map((record) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "font-semibold text-ink",
								children: record.meta.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-sm text-muted",
								children: [
									record.content.system.name,
									" · Grade ",
									record.meta.gradeCode,
									record.meta.streamCode ? ` · ${record.meta.streamCode}` : " · common",
									" ·",
									" ",
									record.content.version.label
								]
							}),
							record.meta.isDevelopmentFixture ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs font-medium text-amber-800",
								children: "Development fixture — not official MoE content"
							}) : null
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								variant: "primary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/curriculum/$packId",
									params: { packId: record.packId },
									children: "Open"
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								disabled: busyId === record.packId,
								onClick: () => void handleRemove(record.packId, record.meta.title),
								children: "Remove"
							})]
						})]
					}) }) }, record.packId))
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-serif text-2xl text-ink",
						children: "Available to install"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "The packs below are labeled development fixtures. They illustrate the data model and offline install flow. They are not verified Ethiopian curriculum content."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "flex flex-col gap-3",
						children: available.map((pack) => {
							const installed = installedIds.has(pack.meta.packId);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-semibold text-ink",
										children: pack.meta.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-sm text-muted",
										children: pack.meta.description
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-xs text-muted",
										children: [
											"System ",
											pack.meta.systemId,
											" · version ",
											pack.meta.versionId,
											" · hash",
											" ",
											pack.meta.contentHash.slice(0, 12),
											"…"
										]
									})
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: installed ? "ghost" : "primary",
									disabled: busyId === pack.meta.packId,
									onClick: () => void handleInstall(pack),
									children: busyId === pack.meta.packId ? "Working…" : installed ? "Reinstall / update" : "Install"
								}) })]
							}) }) }, pack.meta.packId);
						})
					})
				]
			})] })
		]
	});
}
var SplitComponent = CurriculumPage;
//#endregion
export { SplitComponent as component };
