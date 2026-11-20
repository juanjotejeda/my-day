// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { mapEvent, sourceRefFor } from "./map-event.ts";

const CAL = "juan@example.com";

test("a timed event keeps its times and lands on its Berlin day", () => {
  const item = mapEvent(
    {
      id: "abc",
      status: "confirmed",
      summary: "Client call",
      start: { dateTime: "2026-11-20T10:30:00+01:00" },
      end: { dateTime: "2026-11-20T11:00:00+01:00" },
      htmlLink: "https://calendar.google.com/event?eid=abc",
    },
    CAL,
    "Europe/Berlin",
  );
  assert.ok(item);
  assert.equal(item.title, "Client call");
  assert.equal(item.allDay, false);
  assert.equal(item.start?.toISOString(), "2026-11-20T09:30:00.000Z");
  assert.equal(item.day.toISOString(), "2026-11-20T00:00:00.000Z");
  assert.equal(item.sourceRef, sourceRefFor(CAL, "abc"));
});

test("a late evening event stays on the Berlin day, not the UTC one", () => {
  const item = mapEvent(
    {
      id: "late",
      summary: "Call with Sydney",
      start: { dateTime: "2026-11-20T23:30:00+01:00" },
      end: { dateTime: "2026-11-21T00:15:00+01:00" },
    },
    CAL,
    "Europe/Berlin",
  );
  assert.equal(item?.day.toISOString(), "2026-11-20T00:00:00.000Z");
});

test("an all-day event becomes a banner: a day, no times", () => {
  const item = mapEvent(
    { id: "hol", summary: "Berlin trip", start: { date: "2026-11-21" }, end: { date: "2026-11-22" } },
    CAL,
  );
  assert.equal(item?.allDay, true);
  assert.equal(item?.start, null);
  assert.equal(item?.day.toISOString(), "2026-11-21T00:00:00.000Z");
});

test("cancelled, declined, id-less and start-less events are left out", () => {
  assert.equal(mapEvent({ id: "x", status: "cancelled" }, CAL), null);
  assert.equal(
    mapEvent(
      {
        id: "y",
        start: { dateTime: "2026-11-20T10:00:00+01:00" },
        attendees: [{ self: true, responseStatus: "declined" }],
      },
      CAL,
    ),
    null,
  );
  assert.equal(mapEvent({ summary: "no id", start: { date: "2026-11-20" } }, CAL), null);
  assert.equal(mapEvent({ id: "z", summary: "no start" }, CAL), null);
});

test("an event without a title still reads as something", () => {
  const item = mapEvent({ id: "t", summary: "   ", start: { date: "2026-11-20" } }, CAL);
  assert.equal(item?.title, "Untitled event");
});
