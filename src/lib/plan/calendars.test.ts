// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { calendarOf, fromAnotherCalendar } from "./calendars.ts";

const me = "juan.tejeda@gmail.com";

test("your own calendar is yours, by either name Google uses", () => {
  assert.equal(fromAnotherCalendar("primary:abc", me), false);
  assert.equal(fromAnotherCalendar("juan.tejeda@gmail.com:abc", me), false);
  assert.equal(fromAnotherCalendar("JUAN.TEJEDA@gmail.com:abc", me), false, "case is not a different calendar");
});

test("a shared calendar is somebody else's", () => {
  assert.equal(fromAnotherCalendar("family04150067324591769631@group.calendar.google.com:abc", me), true);
  assert.equal(fromAnotherCalendar("robin.mueller.design@gmail.com:abc", me), true);
});

test("what you typed or an email found is not a calendar at all", () => {
  assert.equal(fromAnotherCalendar(null, me), false);
  assert.equal(fromAnotherCalendar("199abcd", me), false, "a Gmail message id has no calendar in it");
  assert.equal(calendarOf("primary:x_20261123T151500Z"), "primary");
});
