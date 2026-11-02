/**
 * Personalized study plan — local, offline, evidence-aware.
 * Does not claim a scientifically validated memory model.
 */

export interface StudyPlanPreferences {
  subjectLabels: string[];
  topicLabels: string[];
  minutesPerDay: number;
  targetDate: string | null;
  priorities: Array<"misconceptions" | "prerequisites" | "revision" | "practice" | "exams">;
}

export interface StudyPlanItem {
  id: string;
  title: string;
  kind: "misconception" | "revision" | "practice" | "exam_prep" | "read";
  estimatedMinutes: number;
  reason: string;
  objectiveId: string | null;
  href: string;
}

export interface DailyStudyPlan {
  date: string;
  items: StudyPlanItem[];
  totalMinutes: number;
  generatedAt: string;
}

export function buildStudyPlan(input: {
  date: string;
  preferences: StudyPlanPreferences;
  dueRevisionTitles: Array<{ id: string; title: string; objectiveId: string | null }>;
  misconceptionTitles: Array<{ id: string; title: string; objectiveId: string | null }>;
  practiceHints: Array<{ id: string; title: string; objectiveId: string | null }>;
  examPrep?: Array<{ id: string; title: string }>;
}): DailyStudyPlan {
  const items: StudyPlanItem[] = [];
  let minutes = 0;
  const budget = Math.max(15, Math.min(240, input.preferences.minutesPerDay || 45));
  const order = input.preferences.priorities.length
    ? input.preferences.priorities
    : (["misconceptions", "revision", "practice", "exams"] as const);

  const push = (item: StudyPlanItem) => {
    if (minutes + item.estimatedMinutes > budget && items.length > 0) return;
    items.push(item);
    minutes += item.estimatedMinutes;
  };

  for (const p of order) {
    if (minutes >= budget) break;
    if (p === "misconceptions") {
      for (const m of input.misconceptionTitles.slice(0, 3)) {
        push({
          id: `mc_${m.id}`,
          title: m.title,
          kind: "misconception",
          estimatedMinutes: 15,
          reason: "Address a possible misunderstanding before it hardens.",
          objectiveId: m.objectiveId,
          href: "/misconceptions",
        });
      }
    }
    if (p === "revision") {
      for (const r of input.dueRevisionTitles.slice(0, 4)) {
        push({
          id: `rev_${r.id}`,
          title: r.title,
          kind: "revision",
          estimatedMinutes: 12,
          reason: "Due for review based on your recent schedule.",
          objectiveId: r.objectiveId,
          href: "/revision",
        });
      }
    }
    if (p === "practice") {
      for (const q of input.practiceHints.slice(0, 4)) {
        push({
          id: `pr_${q.id}`,
          title: q.title,
          kind: "practice",
          estimatedMinutes: 10,
          reason: "Practice to strengthen understanding.",
          objectiveId: q.objectiveId,
          href: "/practice",
        });
      }
    }
    if (p === "exams") {
      for (const e of (input.examPrep ?? []).slice(0, 2)) {
        push({
          id: `ex_${e.id}`,
          title: e.title,
          kind: "exam_prep",
          estimatedMinutes: 20,
          reason: "Practice assessment preparation.",
          objectiveId: null,
          href: "/exams",
        });
      }
    }
  }

  return {
    date: input.date,
    items,
    totalMinutes: minutes,
    generatedAt: new Date().toISOString(),
  };
}
