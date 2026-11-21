// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  focusSchema,
  notificationsSchema,
  prioritiesSchema,
  privacySchema,
  rhythmSchema,
  suppliedFields,
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

test("saving one field leaves the others alone", () => {
  // The bug this guards: tapping the eye saved the view and reset the theme,
  // so night mode turned into day on the next render.
  assert.deepEqual(suppliedFields("appearance", { view: "simple" }), { view: "simple" });
  assert.deepEqual(suppliedFields("appearance", { theme: "night" }), { theme: "night" });
  assert.deepEqual(suppliedFields("work", { end: "17:00" }), { end: "17:00" });
});

test("a saved field is still validated, and nonsense is still refused", () => {
  assert.deepEqual(suppliedFields("privacy", { retentionDays: 7 }), { retentionDays: 7 });
  assert.throws(() => suppliedFields("appearance", { theme: "sepia" }));
});
