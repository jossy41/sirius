/**
 * Development fixtures for the Ethiopian secondary structure.
 *
 * IMPORTANT: These are labeled development fixtures only.
 * They are NOT official Ministry of Education curriculum content.
 * Do not present them as verified syllabus, textbook, or examination material.
 * Real packs must cite traceable sources; these illustrate the data model.
 */

import { buildPack } from "./pack.ts";
import type { CurriculumPack, CurriculumPackContent } from "./types.ts";

const SYSTEM = {
  id: "ET-MOE",
  countryCode: "ET",
  name: "Ethiopia — Ministry of Education (development fixture)",
  languages: ["en", "am"],
  defaultLocale: "en",
} as const;

const VERSION = {
  id: "ET-MOE-DEV-2024",
  systemId: "ET-MOE",
  label: "Ethiopian General Secondary / Preparatory (development fixture)",
  status: "draft" as const,
  effectiveFrom: "2024-01-01",
  effectiveTo: null,
};

function makeGrade9Content(): CurriculumPackContent {
  const grade = {
    id: "ET-G9",
    versionId: VERSION.id,
    code: "9",
    label: "Grade 9",
    sortOrder: 9,
    stage: "general",
  };

  const subjects = [
    {
      id: "ET-G9-MATH",
      versionId: VERSION.id,
      code: "MATH",
      name: "Mathematics",
      language: "en",
      gradeCodes: ["9"],
      streamCodes: [],
    },
    {
      id: "ET-G9-ENG",
      versionId: VERSION.id,
      code: "ENG",
      name: "English",
      language: "en",
      gradeCodes: ["9"],
      streamCodes: [],
    },
  ];

  const topics = [
    {
      id: "ET-G9-MATH-ALG",
      subjectId: "ET-G9-MATH",
      parentId: null,
      code: "ALG",
      title: "Algebra (fixture topic)",
      sortOrder: 1,
    },
    {
      id: "ET-G9-MATH-ALG-LIN",
      subjectId: "ET-G9-MATH",
      parentId: "ET-G9-MATH-ALG",
      code: "LIN",
      title: "Linear equations (fixture subtopic)",
      sortOrder: 1,
    },
    {
      id: "ET-G9-ENG-READ",
      subjectId: "ET-G9-ENG",
      parentId: null,
      code: "READ",
      title: "Reading comprehension (fixture topic)",
      sortOrder: 1,
    },
  ];

  const objectives = [
    {
      id: "ET-G9-MATH-ALG-LIN-O1",
      topicId: "ET-G9-MATH-ALG-LIN",
      code: "O1",
      statement: "Solve a linear equation in one variable (development fixture objective).",
      cognitiveLevel: "apply" as const,
    },
    {
      id: "ET-G9-MATH-ALG-LIN-O2",
      topicId: "ET-G9-MATH-ALG-LIN",
      code: "O2",
      statement: "Identify the slope and intercept of a linear function (development fixture).",
      cognitiveLevel: "understand" as const,
    },
    {
      id: "ET-G9-ENG-READ-O1",
      topicId: "ET-G9-ENG-READ",
      code: "O1",
      statement: "Identify the main idea of a short passage (development fixture).",
      cognitiveLevel: "understand" as const,
    },
  ];

  const prerequisites = [
    {
      objectiveId: "ET-G9-MATH-ALG-LIN-O2",
      requiresObjectiveId: "ET-G9-MATH-ALG-LIN-O1",
      kind: "helpful" as const,
    },
  ];

  const sourceRefs = [
    {
      id: "SRC-FIXTURE-1",
      targetId: "ET-G9-MATH-ALG-LIN-O1",
      targetType: "objective" as const,
      kind: "other" as const,
      citation: "Development fixture — not an official textbook or syllabus citation.",
      locator: null,
      url: null,
      license: "fixture-only",
    },
  ];

  return {
    system: { ...SYSTEM, languages: [...SYSTEM.languages] },
    version: { ...VERSION },
    grade,
    streams: [],
    subjects,
    topics,
    objectives,
    prerequisites,
    sourceRefs,
    blueprints: [],
    blueprintWeights: [],
  };
}

function makeGrade11NaturalContent(): CurriculumPackContent {
  const grade = {
    id: "ET-G11",
    versionId: VERSION.id,
    code: "11",
    label: "Grade 11",
    sortOrder: 11,
    stage: "preparatory",
  };

  const streams = [
    {
      id: "ET-NAT",
      versionId: VERSION.id,
      code: "natural",
      label: "Natural Sciences",
      gradeCodes: ["11", "12"],
    },
    {
      id: "ET-SOC",
      versionId: VERSION.id,
      code: "social",
      label: "Social Sciences",
      gradeCodes: ["11", "12"],
    },
  ];

  const subjects = [
    {
      id: "ET-G11-PHY",
      versionId: VERSION.id,
      code: "PHY",
      name: "Physics",
      language: "en",
      gradeCodes: ["11"],
      streamCodes: ["natural"],
    },
    {
      id: "ET-G11-MATH",
      versionId: VERSION.id,
      code: "MATH",
      name: "Mathematics",
      language: "en",
      gradeCodes: ["11"],
      streamCodes: ["natural", "social"],
    },
  ];

  const topics = [
    {
      id: "ET-G11-PHY-MECH",
      subjectId: "ET-G11-PHY",
      parentId: null,
      code: "MECH",
      title: "Mechanics (fixture topic)",
      sortOrder: 1,
    },
    {
      id: "ET-G11-MATH-CALC",
      subjectId: "ET-G11-MATH",
      parentId: null,
      code: "CALC",
      title: "Introductory calculus ideas (fixture topic)",
      sortOrder: 1,
    },
  ];

  const objectives = [
    {
      id: "ET-G11-PHY-MECH-O1",
      topicId: "ET-G11-PHY-MECH",
      code: "O1",
      statement: "State Newton’s second law in the form F = ma (development fixture).",
      cognitiveLevel: "recall" as const,
    },
    {
      id: "ET-G11-MATH-CALC-O1",
      topicId: "ET-G11-MATH-CALC",
      code: "O1",
      statement: "Interpret the derivative as a rate of change (development fixture).",
      cognitiveLevel: "understand" as const,
    },
  ];

  return {
    system: { ...SYSTEM, languages: [...SYSTEM.languages] },
    version: { ...VERSION },
    grade,
    streams,
    subjects,
    topics,
    objectives,
    prerequisites: [],
    sourceRefs: [
      {
        id: "SRC-FIXTURE-G11-1",
        targetId: "ET-G11-PHY-MECH-O1",
        targetType: "objective",
        kind: "other",
        citation: "Development fixture — not an official textbook or syllabus citation.",
        locator: null,
        url: null,
        license: "fixture-only",
      },
    ],
    blueprints: [
      {
        id: "ET-G11-PHY-BP",
        versionId: VERSION.id,
        name: "Physics sample weight distribution (fixture)",
        gradeCode: "11",
        streamCode: "natural",
        subjectId: "ET-G11-PHY",
      },
    ],
    blueprintWeights: [
      {
        blueprintId: "ET-G11-PHY-BP",
        topicId: "ET-G11-PHY-MECH",
        weight: 1,
        itemCountHint: 10,
      },
    ],
  };
}

let cachedFixtures: CurriculumPack[] | null = null;

/** Build and cache the labeled development fixture packs. */
export async function getDevelopmentFixturePacks(): Promise<CurriculumPack[]> {
  if (cachedFixtures) return cachedFixtures;

  const g9 = await buildPack(makeGrade9Content(), {
    packId: "fixture-et-g9-common",
    title: "Grade 9 — Common (development fixture)",
    description:
      "Illustrative Grade 9 pack for development and UI testing. Not official MoE content.",
    streamCode: null,
    isDevelopmentFixture: true,
  });

  const g11 = await buildPack(makeGrade11NaturalContent(), {
    packId: "fixture-et-g11-natural",
    title: "Grade 11 — Natural Sciences (development fixture)",
    description:
      "Illustrative Grade 11 natural-stream pack for development and UI testing. Not official MoE content.",
    streamCode: "natural",
    isDevelopmentFixture: true,
  });

  cachedFixtures = [g9, g11];
  return cachedFixtures;
}

export function clearFixtureCache(): void {
  cachedFixtures = null;
}
