// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { deleteDecision } from "./deletable.ts";

test("a typed, spoken or emailed item is deleted in My Day only", () => {
  for (const sourceKind of ["manual", "voice", "gmail"] as const) {
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

test("an item found in an email never touches the email", () => {
  const decision = deleteDecision({ sourceKind: "gmail", createdHere: true });
  assert.deepEqual(decision, { kind: "delete", inGoogle: false }, "Gmail stays read-only");
});
