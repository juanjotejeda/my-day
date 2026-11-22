// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { duplicateIds, keyOf } from "./dedupe.ts";

const at = (iso: string) => new Date(iso);

test("the same meeting from two calendars is one meeting", () => {
  const rows = [
    { id: "a", title: "Body X", start: at("2026-11-23T09:00:00Z"), end: at("2026-11-23T10:00:00Z"), createdAt: at("2026-11-01T00:00:00Z") },
    { id: "b", title: "Body X", start: at("2026-11-23T09:00:00Z"), end: at("2026-11-23T10:00:00Z"), createdAt: at("2026-11-02T00:00:00Z") },
  ];
  assert.deepEqual(duplicateIds(rows), ["b"], "the copy that arrived later goes");
});

test("same name at another time is another meeting", () => {
  const rows = [
    { id: "a", title: "Standup", start: at("2026-11-23T09:00:00Z"), end: at("2026-11-23T09:15:00Z"), createdAt: at("2026-11-01T00:00:00Z") },
    { id: "b", title: "Standup", start: at("2026-11-24T09:00:00Z"), end: at("2026-11-24T09:15:00Z"), createdAt: at("2026-11-01T00:00:00Z") },
  ];
  assert.deepEqual(duplicateIds(rows), []);
});

test("spacing and capitals do not make a second meeting", () => {
  assert.equal(
    keyOf({ title: " Family dinner ", start: at("2026-11-23T18:00:00Z"), end: null }),
    keyOf({ title: "family dinner", start: at("2026-11-23T18:00:00Z"), end: null }),
  );
});

test("three copies leave one", () => {
  const rows = ["a", "b", "c"].map((id, index) => ({
    id,
    title: "Kinderzirkus",
    start: at("2026-11-23T13:30:00Z"),
    end: at("2026-11-23T14:30:00Z"),
    createdAt: at(`2026-11-0${index + 1}T00:00:00Z`),
  }));
  assert.deepEqual(duplicateIds(rows), ["b", "c"]);
});
