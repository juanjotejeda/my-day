// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  focusSchema,
  notificationsSchema,
  prioritiesSchema,
  privacySchema,
  rhythmSchema,
  workSchema,
} from "./settings-schemas.ts";

test("every section fills itself in when nothing is saved yet", () => {
  assert.equal(rhythmSchema.parse({}).wake, "06:45");
  assert.equal(rhythmSchema.parse({}).peakStart, 9);
  assert.equal(workSchema.parse({}).end, "18:00");
  assert.deepEqual(workSchema.parse({}).days, ["mo", "tu", "we", "th", "fr"]);
  assert.equal(focusSchema.parse({}).blockLength, 120);
  assert.equal(notificationsSchema.parse({}).morningAt, "07:30");
  assert.equal(privacySchema.parse({}).retentionDays, 30, "the spec settled on 30 days");
});

test("a saved value survives the parse", () => {
  assert.equal(rhythmSchema.parse({ wake: "05:30" }).wake, "05:30");
  assert.equal(workSchema.parse({ days: ["mo"] }).days.length, 1);
  assert.equal(privacySchema.parse({ retentionDays: 7 }).retentionDays, 7);
});

test("nonsense is refused, so one bad write cannot break a screen", () => {
  assert.equal(rhythmSchema.safeParse({ chronotype: "owlish" }).success, false);
  assert.equal(privacySchema.safeParse({ retentionDays: 365 }).success, false);
  assert.equal(notificationsSchema.safeParse({ foundItems: "whenever" }).success, false);
  assert.equal(prioritiesSchema.safeParse({ vipPeople: "lena" }).success, false);
});
