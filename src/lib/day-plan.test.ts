// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { splitDay } from "./day-plan.ts";

type TestItem = Parameters<typeof splitDay>[0][number];

function item(id: string, start: string | null, end: string | null, allDay = false): TestItem {
  return {
    id,
    title: id,
    start: start ? new Date(start) : null,
    end: end ? new Date(end) : null,
    allDay,
  } as TestItem;
}

const NOW = new Date("2026-11-20T19:30:00+01:00");

test("a day whose events have all passed still lists them under earlier", () => {
  const plan = splitDay(
    [
      item("morning", "2026-11-20T08:00:00+01:00", "2026-11-20T09:00:00+01:00"),
      item("afternoon", "2026-11-20T13:00:00+01:00", "2026-11-20T14:00:00+01:00"),
    ],
    NOW,
  );
  assert.equal(plan.current, null);
  assert.deepEqual(plan.next, []);
  assert.deepEqual(
    plan.earlier.map((i) => i.id),
    ["morning", "afternoon"],
  );
  assert.equal(plan.total, 2);
});

test("an event in progress becomes current and is not repeated in earlier", () => {
  const plan = splitDay(
    [
      item("past", "2026-11-20T08:00:00+01:00", "2026-11-20T09:00:00+01:00"),
      item("live", "2026-11-20T19:00:00+01:00", "2026-11-20T20:00:00+01:00"),
      item("soon", "2026-11-20T21:00:00+01:00", "2026-11-20T21:30:00+01:00"),
    ],
    NOW,
  );
  assert.equal(plan.current?.id, "live");
  assert.deepEqual(plan.next.map((i) => i.id), ["soon"]);
  assert.deepEqual(plan.earlier.map((i) => i.id), ["past"]);
});

test("only three items sit in next, the remainder goes to later", () => {
  const plan = splitDay(
    ["20:00", "20:30", "21:00", "21:30"].map((hm, index) =>
      item(`u${index}`, `2026-11-20T${hm}:00+01:00`, null),
    ),
    NOW,
  );
  assert.deepEqual(plan.next.map((i) => i.id), ["u0", "u1", "u2"]);
  assert.deepEqual(plan.later.map((i) => i.id), ["u3"]);
});

test("all-day events are banners, never blocks", () => {
  const plan = splitDay([item("trip", null, null, true)], NOW);
  assert.deepEqual(plan.banners.map((i) => i.id), ["trip"]);
  assert.deepEqual(plan.blocks, []);
  assert.equal(plan.current, null);
});

test("an event without an end still counts as current for its default length", () => {
  const plan = splitDay([item("standup", "2026-11-20T19:20:00+01:00", null)], NOW);
  assert.equal(plan.current?.id, "standup");
});
