// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { weekMeasures, weekRange, type WeekInput } from "./week.ts";

const MONDAY = "2026-11-16";
const FRIDAY = new Date("2026-11-20T18:00:00Z");

function input(partial: Partial<WeekInput> = {}): WeekInput {
  return {
    today: "2026-11-20",
    items: [],
    corrections: [],
    candidates: [],
    reviews: [],
    planRuns: [],
    ...partial,
  };
}

test("the week starts on Monday and holds the days so far", () => {
  const range = weekRange(FRIDAY);
  assert.equal(range.start, MONDAY);
  assert.equal(range.days.length, 5, "Monday to Friday");
  assert.deepEqual(range.days.slice(0, 2), ["2026-11-16", "2026-11-17"]);
});

test("plan accepted is what was not corrected", () => {
  const measures = weekMeasures(
    input({
      items: Array.from({ length: 10 }, (_, index) => ({
        day: "2026-11-18",
        status: index < 6 ? "done" : "planned",
        effort: "light",
        plannedMin: 30,
        doneMin: index < 6 ? 30 : 0,
        corrected: index < 2,
        followed: index < 6,
      })),
    }),
  );
  assert.equal(measures.planAccepted, 80, "two of ten were moved or stretched");
});

test("corrections per day divides by the days of the week so far", () => {
  const measures = weekMeasures(
    input({
      corrections: [
        { day: "2026-11-16", kind: "more_time" },
        { day: "2026-11-16", kind: "tomorrow" },
        { day: "2026-11-18", kind: "important" },
        { day: "2026-11-20", kind: "category" },
      ],
    }),
  );
  assert.equal(measures.correctionsPerDay, 0.8, "four over five days");
});

test("email items correct counts the ones kept against all decided", () => {
  const measures = weekMeasures(
    input({
      candidates: [
        ...Array.from({ length: 19 }, () => ({ day: "2026-11-18", state: "accepted" as const })),
        ...Array.from({ length: 4 }, () => ({ day: "2026-11-18", state: "dismissed" as const })),
        { day: "2026-11-18", state: "open" as const },
      ],
    }),
  );
  assert.deepEqual(measures.emailCorrect, { kept: 19, decided: 23 });
});

test("focus is the deep minutes done against the deep minutes planned", () => {
  const measures = weekMeasures(
    input({
      items: [
        { day: "2026-11-17", status: "done", effort: "deep", plannedMin: 120, doneMin: 120, corrected: false, followed: true },
        { day: "2026-11-18", status: "planned", effort: "deep", plannedMin: 90, doneMin: 0, corrected: false, followed: false },
        { day: "2026-11-18", status: "done", effort: "light", plannedMin: 30, doneMin: 30, corrected: false, followed: true },
      ],
    }),
  );
  assert.deepEqual(measures.focus, { doneMin: 120, plannedMin: 210 });
});

test("a fixed event that has passed counts as followed, without a tick", () => {
  const measures = weekMeasures(
    input({
      items: [
        { day: "2026-11-17", status: "planned", effort: "meeting", plannedMin: 30, doneMin: 0, corrected: false, followed: true },
      ],
    }),
  );
  assert.equal(measures.byDay.find((day) => day.date === "2026-11-17")?.percent, 100);
});

test("the bars show what share of each day was done", () => {
  const measures = weekMeasures(
    input({
      items: [
        { day: "2026-11-16", status: "done", effort: "light", plannedMin: 30, doneMin: 30, corrected: false, followed: true },
        { day: "2026-11-16", status: "planned", effort: "light", plannedMin: 30, doneMin: 0, corrected: false, followed: false },
        { day: "2026-11-17", status: "done", effort: "light", plannedMin: 30, doneMin: 30, corrected: false, followed: true },
      ],
    }),
  );
  const monday = measures.byDay.find((day) => day.date === "2026-11-16");
  const tuesday = measures.byDay.find((day) => day.date === "2026-11-17");
  const wednesday = measures.byDay.find((day) => day.date === "2026-11-18");
  assert.equal(monday?.percent, 50);
  assert.equal(tuesday?.percent, 100);
  assert.equal(wednesday?.percent, 0, "a day with nothing planned reads as zero, not missing");
  assert.equal(measures.byDay.length, 5);
});

test("an empty week answers with zeroes, never NaN", () => {
  const measures = weekMeasures(input());
  assert.equal(measures.planAccepted, 0);
  assert.equal(measures.correctionsPerDay, 0);
  assert.deepEqual(measures.emailCorrect, { kept: 0, decided: 0 });
  assert.deepEqual(measures.focus, { doneMin: 0, plannedMin: 0 });
  assert.ok(measures.byDay.every((day) => day.percent === 0));
});

test("the day review answers come through for the test questions", () => {
  const measures = weekMeasures(
    input({
      reviews: [
        { day: "2026-11-18", feeling: "busy", planRight: "part", trust: 4 },
        { day: "2026-11-19", feeling: "calm", planRight: "yes", trust: 5 },
      ],
    }),
  );
  assert.equal(measures.feeling, "calm", "the newest answer stands");
  assert.equal(measures.planRight, "yes");
  assert.equal(measures.trust, 5);
  assert.equal(measures.daysReviewed, 2);
});

test("patterns are only claimed when there is something behind them", () => {
  const quiet = weekMeasures(input());
  assert.deepEqual(quiet.patterns, []);

  const busy = weekMeasures(
    input({
      corrections: [
        { day: "2026-11-16", kind: "more_time" },
        { day: "2026-11-17", kind: "more_time" },
        { day: "2026-11-18", kind: "more_time" },
      ],
    }),
  );
  assert.equal(busy.patterns.length, 1);
  assert.match(busy.patterns[0], /longer than planned/i);
});
