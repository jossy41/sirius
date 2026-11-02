import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { greeting, greetingForHour } from "./greeting.ts";

describe("greetingForHour", () => {
  it("splits the day into morning, afternoon, and evening", () => {
    assert.equal(greetingForHour(0), "Good morning");
    assert.equal(greetingForHour(11), "Good morning");
    assert.equal(greetingForHour(12), "Good afternoon");
    assert.equal(greetingForHour(16), "Good afternoon");
    assert.equal(greetingForHour(17), "Good evening");
    assert.equal(greetingForHour(23), "Good evening");
  });

  it("rejects hours that are not a real clock time", () => {
    assert.equal(greetingForHour(-1), "Hello");
    assert.equal(greetingForHour(24), "Hello");
    assert.equal(greetingForHour(1.5), "Hello");
  });
});

describe("greeting", () => {
  it("reads the hour from the provided date", () => {
    assert.equal(greeting(new Date("2026-11-01T08:15:00")), "Good morning");
  });
});
