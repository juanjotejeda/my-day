// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { SUGGEST_AFTER, suggestRules, type CorrectionRecord } from "./suggest.ts";

function correction(kind: CorrectionRecord["kind"], context: CorrectionRecord["context"]): CorrectionRecord {
  return { kind, context, createdAt: new Date("2026-11-20T10:00:00Z") };
}

const deepWork = { effort: "deep", sourceKind: "gmail", category: "work", sender: "lena@northwind.com" };

test("nothing is suggested before the third of a kind", () => {
  const two = [correction("more_time", deepWork), correction("more_time", deepWork)];
  assert.deepEqual(suggestRules(two), []);
  assert.equal(SUGGEST_AFTER, 3, "the spec says three");
});

test("three more-time corrections on the same effort suggest extra minutes", () => {
  const three = Array.from({ length: 3 }, () => correction("more_time", deepWork));
  const [rule] = suggestRules(three);
  assert.equal(rule.kind, "extra_minutes");
  assert.equal(rule.params.effort, "deep");
  assert.equal(rule.params.minutes, 30);
  assert.equal(rule.evidenceCount, 3);
  assert.match(rule.text, /deep/i);
  assert.match(rule.text, /30/);
});

test("three category corrections suggest the category that was chosen", () => {
  const three = Array.from({ length: 3 }, () =>
    correction("category", { ...deepWork, effort: "errand", after: "personal" }),
  );
  const [rule] = suggestRules(three);
  assert.equal(rule.kind, "category");
  assert.equal(rule.params.category, "personal");
  assert.equal(rule.params.effort, "errand");
});

test("three dismissals of the same sender suggest ignoring them", () => {
  const three = Array.from({ length: 3 }, () =>
    correction("dismissed", { sourceKind: "gmail", sender: "noreply@tool.com" }),
  );
  const [rule] = suggestRules(three);
  assert.equal(rule.kind, "ignore_sender");
  assert.equal(rule.params.sender, "noreply@tool.com");
  assert.match(rule.text, /noreply@tool.com/);
});

test("three moves to tomorrow suggest a lower rank, not a silent drop", () => {
  const three = Array.from({ length: 3 }, () => correction("tomorrow", { ...deepWork, effort: "light" }));
  const [rule] = suggestRules(three);
  assert.equal(rule.kind, "rank");
  assert.equal(rule.params.rank, "could");
  assert.match(rule.text, /light/i);
});

test("three times important on one sender suggests they always count", () => {
  const three = Array.from({ length: 3 }, () =>
    correction("important", { sourceKind: "gmail", sender: "lena@northwind.com", effort: "light" }),
  );
  const [rule] = suggestRules(three);
  assert.equal(rule.kind, "vip_person");
  assert.equal(rule.params.person, "lena@northwind.com");
});

test("corrections on different things do not add up", () => {
  const mixed = [
    correction("more_time", { ...deepWork, effort: "deep" }),
    correction("more_time", { ...deepWork, effort: "light" }),
    correction("more_time", { ...deepWork, effort: "meeting" }),
  ];
  assert.deepEqual(suggestRules(mixed), [], "three different efforts are not a pattern");
});

test("a rule already known is not suggested again", () => {
  const three = Array.from({ length: 3 }, () => correction("more_time", deepWork));
  const existing = [{ kind: "extra_minutes", params: { effort: "deep", minutes: 30 } }];
  assert.deepEqual(suggestRules(three, existing), []);
});

test("more evidence raises the count on the suggestion", () => {
  const five = Array.from({ length: 5 }, () => correction("more_time", deepWork));
  const [rule] = suggestRules(five);
  assert.equal(rule.evidenceCount, 5);
});

test("corrections older than the window are left out", () => {
  const old = Array.from({ length: 3 }, () => ({
    ...correction("more_time", deepWork),
    createdAt: new Date("2026-08-01T10:00:00Z"),
  }));
  assert.deepEqual(suggestRules(old, [], new Date("2026-11-20T10:00:00Z")), []);
});
