// The scheduler's contract, written before the scheduler. Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_RHYTHM } from "../plan/curve.ts";
import { plan, type SchedulerItem, type SchedulerSettings } from "./plan.ts";

const SETTINGS: SchedulerSettings = {
  rhythm: DEFAULT_RHYTHM,
  work: { days: ["mo", "tu", "we", "th", "fr"], start: "08:30", end: "18:00", hardStop: true, lunchStart: "12:00", lunchLength: 60 },
  focus: { blockLength: 120, breakLength: 15, maxFocusHours: 4, bufferMin: 10, meetingWarn: 4 },
  priorities: { clashOrder: ["family", "clients", "team", "admin"], vipPeople: ["lena"] },
  protectedTime: { exercise: true, familyDinner: true, noWorkWeekends: true },
};

function task(id: string, minutes: number, extra: Partial<SchedulerItem> = {}): SchedulerItem {
  return {
    id,
    title: id,
    fixed: false,
    durationMin: minutes,
    rank: "should",
    category: "work",
    effort: "light",
    ...extra,
  };
}

function fixedItem(id: string, start: number, end: number, extra: Partial<SchedulerItem> = {}): SchedulerItem {
  return {
    id,
    title: id,
    fixed: true,
    start,
    end,
    durationMin: end - start,
    rank: "must",
    category: "work",
    effort: "meeting",
    ...extra,
  };
}

const MONDAY = "2026-11-23";

test("fixed items keep their times and are never moved", () => {
  const meeting = fixedItem("standup", 9 * 60, 9 * 60 + 30);
  const result = plan({ day: MONDAY, items: [meeting], settings: SETTINGS });
  const placed = result.placements.find((p) => p.id === "standup");
  assert.equal(placed?.start, 9 * 60);
  assert.equal(placed?.end, 9 * 60 + 30);
  assert.match(placed?.reason ?? "", /calendar|fixed/i);
});

test("deep work lands in the peak window", () => {
  const result = plan({
    day: MONDAY,
    items: [task("proposal", 120, { effort: "deep", rank: "must" })],
    settings: SETTINGS,
  });
  const placed = result.placements.find((p) => p.id === "proposal");
  assert.ok(placed, "deep work must be placed");
  assert.ok(placed.start >= 9 * 60 && placed.start < 12 * 60, `expected the peak window, got ${placed.start}`);
  assert.match(placed.reason, /peak/i);
});

test("light tasks go to a dip, not the peak", () => {
  const result = plan({
    day: MONDAY,
    items: [task("invoice", 20, { effort: "light" }), task("proposal", 120, { effort: "deep", rank: "must" })],
    settings: SETTINGS,
  });
  const light = result.placements.find((p) => p.id === "invoice");
  const deep = result.placements.find((p) => p.id === "proposal");
  assert.ok(light && deep);
  assert.ok(light.start >= deep.end || light.end <= deep.start, "a light task may not overlap deep work");
  assert.ok(light.start >= 12 * 60, "a light task belongs after the morning peak");
});

test("nothing is placed before waking, in lunch, or after the hard stop", () => {
  const result = plan({
    day: MONDAY,
    items: Array.from({ length: 6 }, (_, index) => task(`t${index}`, 45)),
    settings: SETTINGS,
  });
  for (const placed of result.placements) {
    assert.ok(placed.start >= 8 * 60 + 30, `${placed.id} starts before work`);
    assert.ok(placed.end <= 18 * 60, `${placed.id} runs past the hard stop`);
    const inLunch = placed.start < 13 * 60 && placed.end > 12 * 60;
    assert.equal(inLunch, false, `${placed.id} eats lunch`);
  }
});

test("buffers keep a task off the edge of a meeting", () => {
  const result = plan({
    day: MONDAY,
    items: [fixedItem("call", 11 * 60, 11 * 60 + 30), task("notes", 30)],
    settings: SETTINGS,
  });
  const notes = result.placements.find((p) => p.id === "notes");
  assert.ok(notes);
  const clear = notes.end <= 11 * 60 - 10 || notes.start >= 11 * 60 + 40;
  assert.ok(clear, `expected a 10 minute buffer around the call, got ${notes.start} to ${notes.end}`);
});

test("must comes before should, and important before the rest of its rank", () => {
  const result = plan({
    day: MONDAY,
    items: [
      task("could", 30, { rank: "could" }),
      task("should", 30, { rank: "should" }),
      task("must", 30, { rank: "must" }),
      task("importantShould", 30, { rank: "should", important: true }),
    ],
    settings: SETTINGS,
  });
  const order = result.placements
    .filter((p) => !p.fixed)
    .sort((a, b) => a.start - b.start)
    .map((p) => p.id);
  assert.deepEqual(order, ["must", "importantShould", "should", "could"]);
});

test("a task longer than the focus block is split, with a break between", () => {
  const result = plan({
    day: MONDAY,
    items: [task("longread", 180, { effort: "deep", rank: "must" })],
    settings: SETTINGS,
  });
  const parts = result.placements.filter((p) => p.id.startsWith("longread"));
  assert.equal(parts.length, 2, "180 minutes should become two blocks");
  assert.equal(parts[0].end - parts[0].start, 120);
  assert.equal(parts[1].end - parts[1].start, 60);
  assert.ok(parts[1].start >= parts[0].end + 15, "a break belongs between the blocks");
});

test("what does not fit moves to later, and the day is flagged", () => {
  const result = plan({
    day: MONDAY,
    items: Array.from({ length: 20 }, (_, index) => task(`fill${index}`, 60)),
    settings: SETTINGS,
  });
  assert.ok(result.later.length > 0, "an impossible day must leave items over");
  assert.equal(result.overloaded, true);
  assert.match(result.later[0].reason, /no free slot today/i);
});

test("protected time blocks the day, even for a must", () => {
  const result = plan({
    day: MONDAY,
    items: [
      fixedItem("dinner", 18 * 60 + 30, 19 * 60 + 30, { rank: "protected", category: "personal" }),
      task("urgent", 60, { rank: "must", category: "personal" }),
    ],
    settings: { ...SETTINGS, work: { ...SETTINGS.work, hardStop: false } },
  });
  const urgent = result.placements.find((p) => p.id === "urgent");
  assert.ok(urgent);
  const clash = urgent.start < 19 * 60 + 30 && urgent.end > 18 * 60 + 30;
  assert.equal(clash, false, "nothing may sit on protected time");
});

test("a weekend keeps work out but allows personal items", () => {
  const saturday = "2026-11-21";
  const result = plan({
    day: saturday,
    items: [task("workthing", 30, { category: "work" }), task("gift", 30, { category: "personal" })],
    settings: SETTINGS,
  });
  assert.ok(result.later.some((item) => item.id === "workthing"), "work waits for Monday");
  assert.ok(result.placements.some((p) => p.id === "gift"), "personal items still fit");
});

test("rules add minutes and can move a category", () => {
  const result = plan({
    day: MONDAY,
    items: [task("afternoonAdmin", 30, { effort: "light" })],
    settings: SETTINGS,
    rules: [
      { id: "r1", kind: "extra_minutes", active: true, params: { effort: "light", minutes: 15 } },
      { id: "r2", kind: "category", active: true, params: { match: "afternoonAdmin", category: "personal" } },
    ],
  });
  const placed = result.placements.find((p) => p.id === "afternoonAdmin");
  assert.ok(placed);
  assert.equal(placed.end - placed.start, 45, "the rule adds 15 minutes");
  assert.equal(placed.category, "personal");
});

test("every placement explains itself in one line", () => {
  const result = plan({
    day: MONDAY,
    items: [
      fixedItem("call", 11 * 60, 11 * 60 + 30),
      task("proposal", 120, { effort: "deep", rank: "must" }),
      task("invoice", 20),
    ],
    settings: SETTINGS,
  });
  for (const placed of result.placements) {
    assert.ok(placed.reason.length > 10, `${placed.id} needs a reason`);
    assert.ok(!placed.reason.includes("\n"), "a reason is one line");
  }
});

test("the same input gives the same plan", () => {
  const items = [task("a", 60, { effort: "deep" }), task("b", 30), task("c", 45, { rank: "must" })];
  const first = plan({ day: MONDAY, items, settings: SETTINGS });
  const second = plan({ day: MONDAY, items, settings: SETTINGS });
  assert.deepEqual(first.placements, second.placements);
});
