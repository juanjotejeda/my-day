// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { draftDefaults, draftFromParsed, draftProblem } from "./draft.ts";

const FRIDAY_1012 = new Date("2026-11-20T10:12:00+01:00");

test("an appointment opens today, at the next full hour, for an hour", () => {
  const draft = draftDefaults("appt", FRIDAY_1012, "2026-11-20");
  assert.equal(draft.date, "2026-11-20");
  assert.equal(draft.startTime, "11:00", "the next full hour, not 10:12");
  assert.equal(draft.endTime, "12:00");
  assert.equal(draft.allDay, false);
  assert.equal(draft.location, "");
});

test("the next full hour rolls into tomorrow late at night", () => {
  const draft = draftDefaults("appt", new Date("2026-11-20T23:40:00+01:00"), "2026-11-20");
  assert.equal(draft.startTime, "23:45", "the last quarter hour, rather than midnight on the wrong day");
  assert.equal(draft.endTime, "00:45");
});

test("a reminder wants a date and a time, and nothing else", () => {
  const draft = draftDefaults("reminder", FRIDAY_1012, "2026-11-20");
  assert.equal(draft.startTime, "11:00");
  assert.equal(draft.endTime, "", "a reminder has no end");
});

test("a task starts on Automatic, with a duration and no time", () => {
  const draft = draftDefaults("task", FRIDAY_1012, "2026-11-20");
  assert.equal(draft.auto, true);
  assert.equal(draft.dur, 30);
  assert.equal(draft.startTime, "");
});

test("typed input pre-fills the fields it knows", () => {
  const draft = draftFromParsed(
    { type: "appt", title: "Dentist with Thiago", day: "today", date: "2026-11-24", time: "15:30", dur: 60, effort: "meeting", auto: false },
    FRIDAY_1012,
  );
  assert.equal(draft.type, "appt");
  assert.equal(draft.text, "Dentist with Thiago");
  assert.equal(draft.date, "2026-11-24");
  assert.equal(draft.startTime, "15:30");
  assert.equal(draft.endTime, "16:30", "an hour by default, from the stated start");
});

test("a spoken task with a time arrives on Set date and time", () => {
  const draft = draftFromParsed(
    { type: "task", title: "Call the plumber", day: "tomorrow", date: "2026-11-21", time: "09:00", dur: 30, effort: "light", auto: false },
    FRIDAY_1012,
  );
  assert.equal(draft.auto, false);
  assert.equal(draft.startTime, "09:00");
});

test("a spoken task without a time stays on Automatic", () => {
  const draft = draftFromParsed(
    { type: "task", title: "Write the proposal", day: "today", date: "2026-11-20", time: "", dur: 120, effort: "deep", auto: true },
    FRIDAY_1012,
  );
  assert.equal(draft.auto, true);
  assert.equal(draft.startTime, "");
  assert.equal(draft.dur, 120);
});

test("the kind of work carries through, so deep work stays deep", () => {
  const deep = draftFromParsed(
    { type: "task", title: "Write the proposal", day: "today", date: "2026-11-23", time: "", dur: 120, effort: "deep", auto: true },
    FRIDAY_1012,
  );
  assert.equal(deep.effort, "deep");
  assert.equal(draftDefaults("task", FRIDAY_1012, "2026-11-20").effort, "light");
  assert.equal(draftDefaults("appt", FRIDAY_1012, "2026-11-20").effort, "meeting");
});

test("what is missing is said plainly, before anything is saved", () => {
  const base = draftDefaults("appt", FRIDAY_1012, "2026-11-20");
  assert.equal(draftProblem({ ...base, text: "" }), "Type or say what to add first.");
  assert.equal(draftProblem({ ...base, text: "Dentist", startTime: "" }), "An appointment needs a start time.");
  assert.equal(
    draftProblem({ ...base, text: "Dentist", startTime: "11:00", endTime: "10:00" }),
    "The end is before the start.",
  );
  assert.equal(draftProblem({ ...base, text: "Dentist" }), null);
  assert.equal(draftProblem({ ...base, type: "appt", text: "Trip", allDay: true, startTime: "" }), null, "an all-day appointment needs no time");

  const task = draftDefaults("task", FRIDAY_1012, "2026-11-20");
  assert.equal(draftProblem({ ...task, text: "Write" }), null, "Automatic needs no time");
  assert.equal(
    draftProblem({ ...task, text: "Write", auto: false, startTime: "" }),
    "Set a time, or switch back to Automatic.",
  );
});
