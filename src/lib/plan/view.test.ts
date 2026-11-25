// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { levelAt as level, levelOf } from "./curve.ts";
import { dur, fmt, pct } from "./format.ts";
import { ahead, energyTrack, freeSlot, nowCard, stripBlocks } from "./view.ts";
import { SAMPLE_DAY } from "./sample.ts";

test("times and durations read as the design writes them", () => {
  assert.equal(fmt(620), "10:20");
  assert.equal(fmt(1110), "18:30");
  assert.equal(dur(45), "45m");
  assert.equal(dur(90), "1h 30m");
  assert.equal(dur(120), "2h");
  assert.equal(pct(7 * 60), 0);
  assert.equal(pct(22 * 60), 100);
  assert.equal(pct(3 * 60), 0, "before the strip clamps to its start");
});

test("the energy curve peaks in the late morning and dips after lunch", () => {
  assert.equal(level(615), 2, "10:15 is peak");
  assert.equal(level(860), 0, "14:20 is the dip");
  assert.equal(levelOf(615).name, "Peak energy");
  assert.equal(energyTrack().length, 30, "one cell per half hour from 07:00 to 22:00");
});

test("the now card shows what is running, with progress", () => {
  const card = nowCard(SAMPLE_DAY, 700); // 11:40, inside the 11:30 client call
  assert.equal(card.has, true);
  assert.equal(card.title, "Northwind client call");
  assert.ok(card.has && card.progress > 30 && card.progress < 40);
});

test("with nothing running the card names the next free time", () => {
  const card = nowCard(SAMPLE_DAY, 545); // 09:05, between the sync and the proposal
  assert.equal(card.has, false);
  assert.equal(card.title, "Free until 09:15");
});

test("next holds three items and the rest falls through", () => {
  const { next, rest } = ahead(SAMPLE_DAY, 545);
  assert.equal(next.length, 3);
  assert.ok(rest.length > 0);
  assert.equal(next[0].title, "Write Northwind proposal");
});

test("later holds the items without a slot", () => {
  const lines = SAMPLE_DAY.filter((item) => item.later);
  assert.equal(lines.length, 2);
});




test("the free slot skips everything already placed", () => {
  const slot = freeSlot(SAMPLE_DAY, 620, 30);
  const clash = SAMPLE_DAY.filter((item) => !item.later).some(
    (item) => item.start < slot + 30 && item.end > slot,
  );
  assert.equal(clash, false);
  assert.equal(slot % 15, 0, "slots land on the quarter hour");
});

test("the strip places a block per scheduled item", () => {
  const blocks = stripBlocks(SAMPLE_DAY);
  assert.equal(blocks.length, SAMPLE_DAY.filter((item) => !item.later).length);
  assert.ok(blocks.every((block) => block.left >= 0 && block.left <= 100));
});

