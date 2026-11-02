/**
 * Curriculum pack structural validation — system-agnostic.
 */

export interface PackValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface MinimalPackForValidation {
  id?: string;
  educationSystem?: { id?: string; name?: string };
  grades?: Array<{ id?: string; code?: string }>;
  subjects?: Array<{ id?: string; code?: string; gradeId?: string }>;
  topics?: Array<{ id?: string; code?: string; subjectId?: string; parentTopicId?: string | null }>;
  objectives?: Array<{ id?: string; code?: string; topicId?: string; prerequisiteObjectiveIds?: string[] }>;
  examinationBlueprints?: Array<{
    id?: string;
    weights?: Array<{ objectiveId?: string; weight?: number }>;
  }>;
}

export function validateCurriculumPackStructure(pack: MinimalPackForValidation): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];
  const topicIds = new Set((pack.topics ?? []).map((t) => t.id).filter(Boolean) as string[]);
  const objectiveIds = new Set((pack.objectives ?? []).map((o) => o.id).filter(Boolean) as string[]);
  const subjectIds = new Set((pack.subjects ?? []).map((s) => s.id).filter(Boolean) as string[]);

  const codes = new Map<string, string>();
  for (const o of pack.objectives ?? []) {
    if (o.code) {
      const key = `obj:${o.code}`;
      if (codes.has(key)) {
        issues.push({
          code: "duplicate_objective_code",
          message: `Duplicate objective code: ${o.code}`,
          severity: "error",
        });
      }
      codes.set(key, o.id ?? o.code);
    }
    if (o.topicId && !topicIds.has(o.topicId)) {
      issues.push({
        code: "broken_topic_ref",
        message: `Objective ${o.code ?? o.id} references missing topic ${o.topicId}`,
        severity: "error",
      });
    }
    for (const pre of o.prerequisiteObjectiveIds ?? []) {
      if (!objectiveIds.has(pre)) {
        issues.push({
          code: "broken_prerequisite",
          message: `Objective ${o.code ?? o.id} has missing prerequisite ${pre}`,
          severity: "error",
        });
      }
    }
  }

  // Cycle detection on objective prerequisites (limited DFS)
  const adj = new Map<string, string[]>();
  for (const o of pack.objectives ?? []) {
    if (o.id) adj.set(o.id, o.prerequisiteObjectiveIds ?? []);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function dfs(id: string, stack: string[]): void {
    if (visiting.has(id)) {
      issues.push({
        code: "circular_prerequisite",
        message: `Circular prerequisite involving ${stack.concat(id).join(" → ")}`,
        severity: "error",
      });
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const n of adj.get(id) ?? []) dfs(n, stack.concat(id));
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of adj.keys()) dfs(id, []);

  // Topic parent cycles
  const topicAdj = new Map<string, string[]>();
  for (const top of pack.topics ?? []) {
    if (top.id && top.parentTopicId) topicAdj.set(top.id, [top.parentTopicId]);
  }
  const tVisiting = new Set<string>();
  const tVisited = new Set<string>();
  function tdfs(id: string, stack: string[]): void {
    if (tVisiting.has(id)) {
      issues.push({
        code: "circular_topic",
        message: `Circular topic hierarchy involving ${stack.concat(id).join(" → ")}`,
        severity: "error",
      });
      return;
    }
    if (tVisited.has(id)) return;
    tVisiting.add(id);
    for (const n of topicAdj.get(id) ?? []) tdfs(n, stack.concat(id));
    tVisiting.delete(id);
    tVisited.add(id);
  }
  for (const id of topicAdj.keys()) tdfs(id, []);

  for (const t of pack.topics ?? []) {
    if (t.subjectId && !subjectIds.has(t.subjectId)) {
      issues.push({
        code: "broken_subject_ref",
        message: `Topic ${t.code ?? t.id} references missing subject`,
        severity: "error",
      });
    }
    if (t.parentTopicId && !topicIds.has(t.parentTopicId)) {
      issues.push({
        code: "broken_parent_topic",
        message: `Topic ${t.code ?? t.id} has missing parent`,
        severity: "warning",
      });
    }
  }

  for (const bp of pack.examinationBlueprints ?? []) {
    let sum = 0;
    for (const w of bp.weights ?? []) {
      if (w.objectiveId && !objectiveIds.has(w.objectiveId)) {
        issues.push({
          code: "blueprint_bad_objective",
          message: `Blueprint ${bp.id} references missing objective`,
          severity: "error",
        });
      }
      sum += w.weight ?? 0;
    }
    if ((bp.weights?.length ?? 0) > 0 && Math.abs(sum - 1) > 0.05 && Math.abs(sum - 100) > 5) {
      issues.push({
        code: "blueprint_weight_sum",
        message: `Blueprint ${bp.id} weights sum to ${sum} (expected ~1 or ~100)`,
        severity: "warning",
      });
    }
  }

  return issues;
}
