import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyProfile,
  normalizeProfile,
  stageLabel,
  validateDisplayName,
} from "./profile.ts";

describe("normalizeProfile", () => {
  it("returns an empty profile for missing data", () => {
    assert.deepEqual(normalizeProfile(undefined), emptyProfile());
    assert.deepEqual(normalizeProfile(null), emptyProfile());
  });

  it("keeps a preparatory stream only for grades 11 and 12", () => {
    assert.equal(normalizeProfile({ grade: 11, stream: "natural" }).stream, "natural");
    assert.equal(normalizeProfile({ grade: 10, stream: "social" }).stream, null);
    assert.equal(normalizeProfile({ grade: 9, stream: "natural" }).stream, null);
    assert.equal(normalizeProfile({ grade: "11", stream: "natural" }).grade, null);
  });

  it("trims the name and limits it to 80 characters", () => {
    const longName = `  ${"A".repeat(90)}  `;
    const profile = normalizeProfile({ displayName: longName, grade: 12, stream: "social" });
    assert.equal(profile.displayName.length, 80);
    assert.equal(profile.stream, "social");
  });
});

describe("stageLabel", () => {
  it("names the Ethiopian secondary stages without inventing a subject list", () => {
    assert.equal(stageLabel(null, null), "Grade not set");
    assert.equal(stageLabel(10, null), "Grade 10 · General secondary");
    assert.equal(stageLabel(11, null), "Grade 11 · Preparatory");
    assert.equal(stageLabel(12, "natural"), "Grade 12 · Natural science");
    assert.equal(stageLabel(11, "social"), "Grade 11 · Social science");
  });
});

describe("validateDisplayName", () => {
  it("allows a blank name and rejects a name past the limit", () => {
    assert.equal(validateDisplayName("  Hana  "), null);
    assert.equal(validateDisplayName(""), null);
    assert.equal(validateDisplayName("A".repeat(81)), "Use 80 characters or fewer.");
  });
});
