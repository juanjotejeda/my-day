// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { mergeParsed } from "./merge.ts";

const fallback = {
  type: "task" as const,
  title: "Review the deck",
  day: "today" as const,
  date: "2026-11-23",
  time: "16:00",
  dur: 60,
  effort: "deep" as const,
  auto: false,
};

test("the model decides the kind: the composer is where it gets corrected", () => {
  const merged = mergeParsed({ type: "reminder", title: "Review the deck", day: "today", time: "16:00", duration_min: 60, effort: "light" }, fallback);
  assert.equal(merged.type, "reminder", "its reading stands, and Juan can change it");
  assert.equal(merged.effort, "light");
});

test("what the model leaves out comes from the parser", () => {
  const merged = mergeParsed({ title: "Review the deck" }, fallback);
  assert.equal(merged.type, "task");
  assert.equal(merged.time, "16:00");
  assert.equal(merged.dur, 60);
  assert.equal(merged.effort, "deep");
});

test("nonsense from the model is refused field by field", () => {
  const merged = mergeParsed(
    { type: "party" as never, time: "25:99", duration_min: 9999, effort: "vibes" as never, day: "whenever" as never },
    fallback,
  );
  assert.equal(merged.type, "task");
  assert.equal(merged.time, "16:00");
  assert.equal(merged.dur, 60);
  assert.equal(merged.effort, "deep");
  assert.equal(merged.day, "today");
});

test("a timed kind with no time becomes a task: it could not be placed otherwise", () => {
  const merged = mergeParsed({ type: "appt", time: "" }, { ...fallback, time: "", type: "task", auto: true });
  assert.equal(merged.type, "task");
  assert.equal(merged.auto, true);
});

test("a time the model reads switches a task to the time Juan chose", () => {
  const merged = mergeParsed({ type: "task", time: "09:30" }, { ...fallback, time: "", auto: true });
  assert.equal(merged.time, "09:30");
  assert.equal(merged.auto, false, "a task with a time is one he placed");
});

test("the title is the model's when it has one", () => {
  assert.equal(mergeParsed({ title: "  Send the Northwind proposal " }, fallback).title, "Send the Northwind proposal");
  assert.equal(mergeParsed({ title: "" }, fallback).title, "Review the deck");
});

test("a date is taken only when it is a real one", () => {
  assert.equal(mergeParsed({ due: "2026-12-01" }, fallback).date, "2026-12-01");
  assert.equal(mergeParsed({ due: "next week" }, fallback).date, "2026-11-23");
  assert.equal(mergeParsed({ start: "2026-12-24T10:00:00+01:00" }, fallback).date, "2026-12-24");
});
