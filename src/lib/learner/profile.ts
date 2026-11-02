export const GRADES = [9, 10, 11, 12] as const;
export type Grade = (typeof GRADES)[number];

export const STREAMS = [
  { id: "natural", label: "Natural science" },
  { id: "social", label: "Social science" },
] as const;
export type Stream = (typeof STREAMS)[number]["id"];

export interface LearnerProfile {
  displayName: string;
  grade: Grade | null;
  stream: Stream | null;
  updatedAt: string;
}

const NAME_MAX = 80;

export function emptyProfile(): LearnerProfile {
  return { displayName: "", grade: null, stream: null, updatedAt: "" };
}

export function isGrade(value: unknown): value is Grade {
  return typeof value === "number" && (GRADES as readonly number[]).includes(value);
}

export function isStream(value: unknown): value is Stream {
  return value === "natural" || value === "social";
}

export function preparatoryGrade(grade: Grade | null): boolean {
  return grade === 11 || grade === 12;
}

export function validateDisplayName(name: string): string | null {
  if (name.trim().length > NAME_MAX) return "Use 80 characters or fewer.";
  return null;
}

export function normalizeProfile(input: unknown): LearnerProfile {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const grade = isGrade(record.grade) ? record.grade : null;
  const stream = preparatoryGrade(grade) && isStream(record.stream) ? record.stream : null;
  const displayNameRaw = typeof record.displayName === "string" ? record.displayName.trim() : "";
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : "";
  return {
    displayName: displayNameRaw.slice(0, NAME_MAX),
    grade,
    stream,
    updatedAt,
  };
}

export function stageLabel(grade: Grade | null, stream: Stream | null): string {
  if (grade === null) return "Grade not set";
  if (grade === 9 || grade === 10) return `Grade ${grade} · General secondary`;
  if (stream === "natural") return `Grade ${grade} · Natural science`;
  if (stream === "social") return `Grade ${grade} · Social science`;
  return `Grade ${grade} · Preparatory`;
}
