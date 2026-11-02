/**
 * Honest offline capability inventory for UI and docs.
 */

export type OfflineLevel = "full" | "partial" | "requires_network";

export interface CapabilityInfo {
  id: string;
  label: string;
  level: OfflineLevel;
  note: string;
}

export const OFFLINE_CAPABILITIES: CapabilityInfo[] = [
  {
    id: "library",
    label: "Document library",
    level: "full",
    note: "Imported PDFs and extracted text stay on this device.",
  },
  {
    id: "practice",
    label: "Practice & evaluation",
    level: "full",
    note: "Local questions and heuristic evaluation work offline.",
  },
  {
    id: "mastery",
    label: "Mastery & progress",
    level: "full",
    note: "Evidence and mastery states are stored in IndexedDB.",
  },
  {
    id: "revision",
    label: "Revision planner",
    level: "full",
    note: "Schedules and sessions are local.",
  },
  {
    id: "exams",
    label: "Practice assessments",
    level: "full",
    note: "Generated from local question pools; not official exams.",
  },
  {
    id: "tutor_offline",
    label: "Tutor (offline help)",
    level: "full",
    note: "Heuristic, source-grounded help without a network.",
  },
  {
    id: "tutor_live",
    label: "Tutor (external AI)",
    level: "requires_network",
    note: "Needs consent, server configuration, and connectivity.",
  },
  {
    id: "embeddings",
    label: "Semantic embeddings",
    level: "partial",
    note: "Vectors can be stored offline; generating them needs authorized server access.",
  },
  {
    id: "lexical_retrieval",
    label: "Lexical & concept retrieval",
    level: "full",
    note: "Works offline without embeddings.",
  },
];

export async function estimateStorageUsage(): Promise<{
  usage: number | null;
  quota: number | null;
  ratio: number | null;
}> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      const usage = est.usage ?? null;
      const quota = est.quota ?? null;
      const ratio = usage != null && quota ? usage / quota : null;
      return { usage, quota, ratio };
    }
  } catch {
    /* ignore */
  }
  return { usage: null, quota: null, ratio: null };
}
