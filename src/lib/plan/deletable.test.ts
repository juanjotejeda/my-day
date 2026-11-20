// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { CALENDAR_REFUSAL, deleteDecision } from "./deletable.ts";

test("a typed or spoken item is deleted in My Day only", () => {
  for (const sourceKind of ["manual", "voice"] as const) {
    const decision = deleteDecision({ sourceKind, createdHere: true });
    assert.deepEqual(decision, { kind: "delete", inGoogle: false });
  }
});

test("an event My Day created goes from Google too", () => {
  const decision = deleteDecision({ sourceKind: "calendar", createdHere: true });
  assert.deepEqual(decision, { kind: "delete", inGoogle: true });
});

test("an event from anywhere else is asked about, never assumed", () => {
  const decision = deleteDecision({ sourceKind: "calendar", createdHere: false });
  assert.equal(decision.kind, "ask-google", "Google decides, by its own marker");
});

test("the refusal names where to delete it", () => {
  assert.match(CALENDAR_REFUSAL, /Delete this in Google Calendar/);
  const email = deleteDecision({ sourceKind: "gmail", createdHere: false });
  assert.equal(email.kind, "refuse");
  assert.match(email.kind === "refuse" ? email.message : "", /Review/);
});

test("a stray createdHere on an email item does not open a delete", () => {
  const decision = deleteDecision({ sourceKind: "gmail", createdHere: true });
  assert.equal(decision.kind, "refuse", "only calendar, manual and voice items may be deleted");
});
