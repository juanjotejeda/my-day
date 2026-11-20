// What the parser must understand, written before it. Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { parseInput } from "./input.ts";

test("a reminder with a time", () => {
  const draft = parseInput("Remind me to call the plumber tomorrow at 9");
  assert.equal(draft.type, "reminder");
  assert.equal(draft.title, "Call the plumber");
  assert.equal(draft.day, "tomorrow");
  assert.equal(draft.time, "09:00");
});

test("an appointment reads as an appointment", () => {
  const dentist = parseInput("Dentist with Thiago at 3.30pm");
  assert.equal(dentist.type, "appt");
  assert.equal(dentist.time, "15:30");
  assert.equal(dentist.title, "Dentist with Thiago");

  const coffee = parseInput("Coffee with Lena tomorrow at 10:15");
  assert.equal(coffee.type, "appt");
  assert.equal(coffee.day, "tomorrow");
  assert.equal(coffee.time, "10:15");
});

test("plain work is a task, with no time", () => {
  const draft = parseInput("Write the Northwind proposal");
  assert.equal(draft.type, "task");
  assert.equal(draft.time, "");
  assert.equal(draft.day, "today");
  assert.equal(draft.title, "Write the Northwind proposal");
});

test("a duration in words becomes minutes", () => {
  assert.equal(parseInput("Review the slides for 45 minutes").dur, 45);
  assert.equal(parseInput("Draft the invoice, 30 min").dur, 30);
  assert.equal(parseInput("Deep work on the deck for 2 hours").dur, 120);
  assert.equal(parseInput("Quick reply to Marco").dur, 15, "quick means short");
  assert.equal(parseInput("Write the report").dur, 30, "the default stays 30 minutes");
});

test("the duration never ends up in the title", () => {
  const draft = parseInput("Review the slides for 45 minutes");
  assert.equal(draft.title, "Review the slides");
  assert.equal(parseInput("Draft the invoice, 30 min").title, "Draft the invoice");
});

test("times in the 24-hour clock and bare hours both work", () => {
  assert.equal(parseInput("Standup at 08:30").time, "08:30");
  assert.equal(parseInput("Call at 14").time, "14:00");
  assert.equal(parseInput("Call at 7").time, "19:00", "a bare early hour means the evening");
  assert.equal(parseInput("Breakfast at 7am").time, "07:00");
  assert.equal(parseInput("Dinner at 8pm").time, "20:00");
});

test("the effort is guessed from the words, for the scheduler", () => {
  assert.equal(parseInput("Write the Northwind proposal").effort, "deep");
  assert.equal(parseInput("Reply to Marco about the invoice").effort, "light");
  assert.equal(parseInput("Call with Lena at 11").effort, "meeting");
  assert.equal(parseInput("Pick up the birthday gift").effort, "errand");
});

test("a calendar event is asked for by name", () => {
  const draft = parseInput("Add a calendar event: board meeting at 16:00");
  assert.equal(draft.type, "gcal");
  assert.equal(draft.time, "16:00");
  assert.equal(draft.title, "Board meeting");
});

test("empty or useless input gives an empty title, never a crash", () => {
  assert.equal(parseInput("").title, "");
  assert.equal(parseInput("   ").title, "");
  assert.equal(parseInput("remind me to").title, "");
});

test("the title keeps its own capitals and loses filler", () => {
  assert.equal(parseInput("please add a task to email the Northwind team").title, "Email the Northwind team");
  assert.equal(parseInput("i need to book flights for December").title, "Book flights for December");
});

test("a line with no clock time never becomes a timed entry", () => {
  for (const line of [
    "Write the Northwind proposal for 2 hours",
    "Review the deck for 3 hours tomorrow",
    "Reply to Marco about the invoice, 20 min",
  ]) {
    const draft = parseInput(line);
    assert.equal(draft.time, "", `${line} should carry no time`);
    assert.equal(draft.type, "task", `${line} should be a task`);
  }
});
