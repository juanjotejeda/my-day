// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { dueNotifications, type PushSettings } from "./due.ts";

const SETTINGS: PushSettings = {
  morning: true,
  morningAt: "07:30",
  evening: true,
  eveningAt: "20:30",
  close: true,
  beforeEvents: 10,
  foundItems: "batch",
  silentInFocus: true,
  quietStart: "21:30",
  quietEnd: "07:00",
  workEnd: "18:00",
};

const day = {
  meetings: 2,
  mustCount: 3,
  reviewCount: 4,
  doneCount: 5,
  plannedCount: 9,
  firstFixed: { title: "Co-founder sync", minute: 510 },
  firstFixedTomorrow: { title: "Weekly planning", minute: 600 },
  carriedOver: 2,
  nextFixed: null,
  inFocusBlock: false,
};

test("the morning overview is due at its time, and says what the day holds", () => {
  const [push] = dueNotifications({ now: 7 * 60 + 30, settings: SETTINGS, day, alreadySent: [] });
  assert.equal(push.key, "morning");
  assert.match(push.body, /2 meetings/);
  assert.match(push.body, /Co-founder sync/);
  assert.match(push.body, /3 must/i);
  assert.match(push.body, /4 waiting/i);
  assert.equal(push.url, "/");
});

test("a notification is not sent twice on the same day", () => {
  const sent = dueNotifications({ now: 7 * 60 + 35, settings: SETTINGS, day, alreadySent: ["morning"] });
  assert.deepEqual(sent, []);
});

test("a notification still goes out a few minutes late, but not an hour late", () => {
  assert.equal(dueNotifications({ now: 7 * 60 + 34, settings: SETTINGS, day, alreadySent: [] }).length, 1);
  assert.equal(dueNotifications({ now: 8 * 60 + 40, settings: SETTINGS, day, alreadySent: [] }).length, 0);
});

test("plan tomorrow names tomorrow's first fixed item and what carried over", () => {
  const [push] = dueNotifications({ now: 20 * 60 + 30, settings: SETTINGS, day, alreadySent: [] });
  assert.equal(push.key, "evening");
  assert.match(push.body, /Weekly planning/);
  assert.match(push.body, /2 items/);
  assert.equal(push.url, "/tomorrow");
});

test("close the day comes half an hour after work ends, with the count", () => {
  const [push] = dueNotifications({ now: 18 * 60 + 30, settings: SETTINGS, day, alreadySent: [] });
  assert.equal(push.key, "close");
  assert.match(push.body, /5 of 9/);
  assert.equal(push.url, "/end-of-day");
});

test("a fixed event is announced within the lead time", () => {
  const withNext = { ...day, nextFixed: { title: "Northwind client call", minute: 690, where: "Google Meet" } };
  const [push] = dueNotifications({ now: 680, settings: SETTINGS, day: withNext, alreadySent: [] });
  assert.equal(push.key, "before:690");
  assert.match(push.body, /11:30/);
  assert.match(push.body, /Google Meet/);
});

test("quiet hours silence everything except a fixed event about to start", () => {
  const night = { ...day, nextFixed: { title: "Night call", minute: 22 * 60, where: null } };
  const quiet = dueNotifications({ now: 21 * 60 + 50, settings: SETTINGS, day: night, alreadySent: [] });
  assert.equal(quiet.length, 1);
  assert.equal(quiet[0].key, "before:1320");

  const eveningInQuiet = dueNotifications({
    now: 21 * 60 + 50,
    settings: { ...SETTINGS, eveningAt: "21:50" },
    day,
    alreadySent: [],
  });
  assert.deepEqual(eveningInQuiet, [], "the evening nudge waits for another day");
});

test("a focus block silences everything but the fixed event", () => {
  const focused = { ...day, inFocusBlock: true, nextFixed: { title: "Call", minute: 700, where: null } };
  const pushes = dueNotifications({ now: 690, settings: SETTINGS, day: focused, alreadySent: [] });
  assert.deepEqual(pushes.map((push) => push.key), ["before:700"]);
});

test("switched off means nothing arrives", () => {
  const off: PushSettings = { ...SETTINGS, morning: false, evening: false, close: false, beforeEvents: 0 };
  for (const now of [7 * 60 + 30, 18 * 60 + 30, 20 * 60 + 30]) {
    assert.deepEqual(dueNotifications({ now, settings: off, day, alreadySent: [] }), []);
  }
});

test("new email items ride along with the overview, unless Right away is set", () => {
  const batched = dueNotifications({ now: 7 * 60 + 30, settings: SETTINGS, day, alreadySent: [] });
  assert.match(batched[0].body, /4 waiting/i, "the count rides in the overview");

  const now = dueNotifications({
    now: 10 * 60,
    settings: { ...SETTINGS, foundItems: "now" },
    day: { ...day, newCandidates: [{ id: "c1", title: "Send the proposal" }] },
    alreadySent: [],
  });
  assert.equal(now.length, 1);
  assert.equal(now[0].key, "candidate:c1");
  assert.equal(now[0].url, "/review");
});

test("an empty day says so kindly, instead of naming nothing", () => {
  const quietDay = {
    ...day,
    meetings: 0,
    mustCount: 0,
    reviewCount: 0,
    firstFixed: null,
  };
  const [push] = dueNotifications({ now: 7 * 60 + 30, settings: SETTINGS, day: quietDay, alreadySent: [] });
  assert.match(push.body, /nothing fixed|clear|quiet/i);
});
