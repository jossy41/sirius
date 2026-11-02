import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveLifecycleState,
  estimateMisconceptionConfidence,
  applyNewEvidence,
  aggregateLifecycleFromObservations,
  toStoredStatus,
  shouldRecommendRemediation,
  LIFECYCLE_THRESHOLDS,
} from "./misconception-lifecycle.ts";

describe("misconception lifecycle transitions", () => {
  it("isolated incorrect is only suspected with low confidence", () => {
    assert.equal(
      deriveLifecycleState({ occurrenceCount: 1, correctAfterCount: 0, lastSeenAt: "" }),
      "suspected",
    );
    assert.equal(
      estimateMisconceptionConfidence({ occurrenceCount: 1, correctAfterCount: 0, lastSeenAt: "" }),
      "low",
    );
  });

  it("suspected → active with repeated incorrect", () => {
    assert.equal(
      deriveLifecycleState({
        occurrenceCount: LIFECYCLE_THRESHOLDS.activeAtIncorrect,
        correctAfterCount: 0,
        lastSeenAt: "",
      }),
      "active",
    );
    assert.equal(toStoredStatus("active"), "confirmed");
  });

  it("active → improving with correct evidence", () => {
    assert.equal(
      deriveLifecycleState({
        occurrenceCount: 2,
        correctAfterCount: LIFECYCLE_THRESHOLDS.improvingAtCorrect,
        lastSeenAt: "",
      }),
      "improving",
    );
  });

  it("improving → resolved with sufficient correct margin", () => {
    assert.equal(
      deriveLifecycleState({
        occurrenceCount: 1,
        correctAfterCount: 4,
        lastSeenAt: "",
      }),
      "resolved",
    );
  });

  it("resolved → active/reopened on new incorrect", () => {
    const r = applyNewEvidence(
      {
        occurrenceCount: 0,
        correctAfterCount: 4,
        lastSeenAt: "",
        resolvedAt: new Date().toISOString(),
      },
      "incorrect",
    );
    assert.equal(r.next.resolvedAt, null);
    assert.ok(["suspected", "active", "reopened", "improving"].includes(r.state));
  });

  it("repeated correct answers drive resolution via applyNewEvidence", () => {
    let cur = { occurrenceCount: 2, correctAfterCount: 0, lastSeenAt: "" };
    let state = deriveLifecycleState(cur);
    assert.equal(state, "active");
    for (let i = 0; i < 5; i++) {
      const r = applyNewEvidence(cur, "correct");
      cur = r.next;
      state = r.state;
    }
    assert.equal(state, "resolved");
  });

  it("dedupes observations by attempt/evaluation id", () => {
    const agg = aggregateLifecycleFromObservations([
      { attemptId: "a1", kind: "incorrect" },
      { attemptId: "a1", kind: "incorrect" },
      { evaluationId: "e1", kind: "correct" },
      { evaluationId: "e1", kind: "correct" },
    ]);
    assert.equal(agg.occurrenceCount, 1);
    assert.equal(agg.correctAfterCount, 1);
  });

  it("insufficient evidence does not recommend resolved remediation skip", () => {
    assert.equal(shouldRecommendRemediation("resolved"), false);
    assert.equal(shouldRecommendRemediation("suspected"), true);
  });
});
