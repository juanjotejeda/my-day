// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { carryForward, weekendWaiting, type CarryItem } from "./carry.ts";

const TODAY = "2026-11-21";

function item(partial: Partial<CarryItem> & { id: string }): CarryItem {
  return {
    day: "2026-11-20",
    status: "planned",
    allDay: false,
    sourceKind: "gmail",
    category: "work",
    start: null,
    ...partial,
  };
}

test("an unfinished item from a past day comes forward", () => {
  const move = carryForward([item({ id: "a" })], TODAY);
  assert.deepEqual(move, ["a"]);
});

test("what happened stays where it happened", () => {
  const move = carryForward(
    [
      item({ id: "done", status: "done" }),
      item({ id: "dropped", status: "dropped" }),
      item({ id: "open" }),
    ],
    TODAY,
  );
  assert.deepEqual(move, ["open"]);
});

test("a calendar event never moves: it belongs to its date in Google", () => {
  const move = carryForward([item({ id: "meeting", sourceKind: "calendar" })], TODAY);
  assert.deepEqual(move, []);
});

test("all-day events are banners, not work to carry", () => {
  assert.deepEqual(carryForward([item({ id: "trip", allDay: true })], TODAY), []);
});

test("today and the future are left alone", () => {
  const move = carryForward(
    [item({ id: "today", day: TODAY }), item({ id: "future", day: "2026-12-01" })],
    TODAY,
  );
  assert.deepEqual(move, []);
});

test("an item with no day is in Later, and stays there", () => {
  assert.deepEqual(carryForward([item({ id: "later", day: null })], TODAY), []);
});

test("an item already carried once can carry again the next day", () => {
  const move = carryForward([item({ id: "again", status: "moved" })], TODAY);
  assert.deepEqual(move, ["again"]);
});

test("work waiting for Monday is counted, so Today can say so", () => {
  const items = [
    { category: "work", start: null, allDay: false },
    { category: "work", start: null, allDay: false },
    { category: "personal", start: null, allDay: false },
    { category: "work", start: 540, allDay: false },
  ];
  assert.equal(weekendWaiting(items, { isWorkday: false, noWorkWeekends: true }), 2);
});

test("on a working day nothing waits for Monday", () => {
  const items = [{ category: "work", start: null, allDay: false }];
  assert.equal(weekendWaiting(items, { isWorkday: true, noWorkWeekends: true }), 0);
  assert.equal(weekendWaiting(items, { isWorkday: false, noWorkWeekends: false }), 0);
});
