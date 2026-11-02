import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BODY_MAX,
  formatNoteTime,
  normalizeNote,
  noteCountLabel,
  sortNotes,
  validateNoteDraft,
  type StudyNote,
} from "./model.ts";

describe("validateNoteDraft", () => {
  it("trims fields and requires a title", () => {
    assert.deepEqual(validateNoteDraft({ title: "  Cells  ", subject: " Biology ", body: "  " }), {
      ok: true,
      value: { title: "Cells", subject: "Biology", body: "" },
    });
    const missing = validateNoteDraft({ title: "   ", subject: "", body: "notes" });
    assert.equal(missing.ok, false);
  });

  it("rejects a note past the body limit", () => {
    const result = validateNoteDraft({
      title: "Long",
      subject: "",
      body: "a".repeat(BODY_MAX + 1),
    });
    assert.equal(result.ok, false);
  });
});

describe("normalizeNote", () => {
  it("drops records that cannot be shown", () => {
    assert.equal(normalizeNote({ id: "", title: "Hi" }), null);
    assert.equal(normalizeNote({ id: "1", title: "  " }), null);
    assert.deepEqual(normalizeNote({ id: "1", title: "Hi", subject: "Maths", updatedAt: "t" }), {
      id: "1",
      title: "Hi",
      subject: "Maths",
      body: "",
      updatedAt: "t",
    });
  });
});

describe("sortNotes", () => {
  it("orders newest first", () => {
    const older = note("a", "2026-01-01T00:00:00.000Z");
    const newer = note("b", "2026-02-01T00:00:00.000Z");
    assert.deepEqual(
      sortNotes([older, newer]).map((item) => item.id),
      ["b", "a"],
    );
  });
});

describe("noteCountLabel", () => {
  it("uses a plain count", () => {
    assert.equal(noteCountLabel(0), "Nothing written yet.");
    assert.equal(noteCountLabel(1), "1 note on this device.");
    assert.equal(noteCountLabel(2), "2 notes on this device.");
  });
});

describe("formatNoteTime", () => {
  it("formats a timestamp in the requested zone", () => {
    assert.equal(formatNoteTime("not-a-date"), "");
    assert.equal(formatNoteTime("2026-03-04T09:05:00.000Z", { timeZone: "UTC" }), "4 Mar 2026, 09:05");
  });
});

function note(id: string, updatedAt: string): StudyNote {
  return { id, title: id, subject: "", body: "", updatedAt };
}
