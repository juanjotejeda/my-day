// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { readWhen } from "./when.ts";

// Friday 20 November 2026 is the reference for every case.
const FRIDAY = "2026-11-20";

test("today and tomorrow still work", () => {
  assert.equal(readWhen("Call the plumber today", FRIDAY)?.date, "2026-11-20");
  assert.equal(readWhen("Call the plumber tomorrow", FRIDAY)?.date, "2026-11-21");
  assert.equal(readWhen("tonight at 8", FRIDAY)?.date, "2026-11-20");
});

test("a weekday means its next turn, never today", () => {
  assert.equal(readWhen("on Monday", FRIDAY)?.date, "2026-11-23");
  assert.equal(readWhen("on Saturday", FRIDAY)?.date, "2026-11-21");
  assert.equal(readWhen("on Friday", FRIDAY)?.date, "2026-11-27", "the same weekday means next week");
  assert.equal(readWhen("Thursday", FRIDAY)?.date, "2026-11-26");
});

test("next plus a weekday means that day in the following week", () => {
  // Friday 20 November sits in the week of Monday 16th, so the following week
  // runs 23 to 29 November. That is how a calendar reads.
  assert.equal(readWhen("next Friday", FRIDAY)?.date, "2026-11-27");
  assert.equal(readWhen("next Monday", FRIDAY)?.date, "2026-11-23");
  assert.equal(readWhen("next Sunday", FRIDAY)?.date, "2026-11-29");
});

test("a day and a month, in either order", () => {
  assert.equal(readWhen("on 3 December", FRIDAY)?.date, "2026-12-03");
  assert.equal(readWhen("3 Dec", FRIDAY)?.date, "2026-12-03");
  assert.equal(readWhen("December 3", FRIDAY)?.date, "2026-12-03");
  assert.equal(readWhen("on 24 December", FRIDAY)?.date, "2026-12-24");
});

test("a date already gone rolls into next year", () => {
  assert.equal(readWhen("on 3 January", FRIDAY)?.date, "2027-01-03");
  assert.equal(readWhen("on 1 November", FRIDAY)?.date, "2027-11-01");
});

test("an ISO date is taken as it is", () => {
  assert.equal(readWhen("on 2027-03-15", FRIDAY)?.date, "2027-03-15");
});

test("the words that said when are handed back, so the title loses them", () => {
  const monday = readWhen("Write the proposal on Monday", FRIDAY);
  assert.equal(monday?.date, "2026-11-23");
  assert.equal(monday?.matched.toLowerCase().includes("monday"), true);

  const december = readWhen("Book flights on 3 December", FRIDAY);
  assert.equal(december?.matched.toLowerCase().includes("december"), true);
});

test("a line with no when says so", () => {
  assert.equal(readWhen("Write the proposal", FRIDAY), null);
  assert.equal(readWhen("", FRIDAY), null);
});

test("a weekday inside another word is not a date", () => {
  assert.equal(readWhen("Sunday roast recipe research", FRIDAY)?.date, "2026-11-22");
  assert.equal(readWhen("Mondays are busy", FRIDAY), null, "a plural is not a date");
});
