/**
 * Prerequisite DAG validation. Cycles are rejected within a single curriculum version.
 */

import type { Prerequisite } from "./types.ts";

export interface CycleDetectionResult {
  ok: true;
}

export interface CycleDetectionFailure {
  ok: false;
  message: string;
  cyclePath?: string[];
}

/**
 * Detect directed cycles in the prerequisite graph.
 * Nodes are objective IDs; edges are requiresObjectiveId → objectiveId
 * (i.e. "must know A before B").
 */
export function detectPrerequisiteCycles(
  prerequisites: Prerequisite[],
): CycleDetectionResult | CycleDetectionFailure {
  const adjacency = new Map<string, string[]>();
  for (const edge of prerequisites) {
    const from = edge.requiresObjectiveId;
    const to = edge.objectiveId;
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push(to);
    if (!adjacency.has(to)) adjacency.set(to, []);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): CycleDetectionFailure | null {
    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const next of adjacency.get(node) ?? []) {
      if (!visited.has(next)) {
        const result = dfs(next);
        if (result) return result;
      } else if (inStack.has(next)) {
        const cycleStart = path.indexOf(next);
        const cyclePath = [...path.slice(cycleStart), next];
        return {
          ok: false,
          message: `Prerequisite cycle detected: ${cyclePath.join(" → ")}`,
          cyclePath,
        };
      }
    }

    inStack.delete(node);
    path.pop();
    return null;
  }

  for (const node of adjacency.keys()) {
    if (!visited.has(node)) {
      const result = dfs(node);
      if (result) return result;
    }
  }

  return { ok: true };
}
