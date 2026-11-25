import { DEFAULT_RHYTHM, LEVELS, type Rhythm, levelAt, levelOf } from "./curve.ts";
import { dur, fmt, pct } from "./format.ts";
import type { PlanItem } from "./types.ts";

/** The working minutes a day is measured against on the Priority view. */
export const AVAILABLE_MIN = 570;

export type StripBlock = { id: string; left: number; width: number; fixed: boolean };

export type NowCard =
  | { has: true; label: "NOW"; title: string; sub: string; energy: string; fill: string; progress: number; why: string; id: string }
  | { has: false; label: "FREE"; title: string; sub: string; energy: string; fill: string };

export type ListRow = {
  id: string;
  title: string;
  time: string;
  fixed: boolean;
  fill: string;
  meta: string;
  aria: string;
};

export type LaterRow = { id: string; title: string; tag: string; source: string };


/** Items with a slot today, in time order. */
export function scheduled(items: PlanItem[]): PlanItem[] {
  return items.filter((item) => !item.later && !item.moved).sort((a, b) => a.start - b.start);
}

export function stripBlocks(items: PlanItem[]): StripBlock[] {
  return scheduled(items).map((item) => ({
    id: item.id,
    left: pct(item.start),
    width: Math.max(pct(item.end) - pct(item.start), 0.6),
    fixed: item.fixed,
  }));
}

/** 30 cells of energy colour under the strip. */
export function energyTrack(rhythm: Rhythm = DEFAULT_RHYTHM): string[] {
  const cells: string[] = [];
  for (let m = 7 * 60; m < 22 * 60; m += 30) cells.push(LEVELS[levelAt(m + 15, rhythm)].fill);
  return cells;
}

export function nowCard(items: PlanItem[], now: number): NowCard {
  const vis = scheduled(items);
  const current = vis.find((item) => item.start <= now && now < item.end) ?? null;
  const upcoming = vis.find((item) => item.start > now) ?? null;
  const here = levelOf(now);

  if (current) {
    return {
      has: true,
      label: "NOW",
      id: current.id,
      title: current.title,
      sub: `Until ${fmt(current.end)} · ${current.end - now} min left`,
      energy: here.name,
      fill: here.fill,
      progress: ((now - current.start) / (current.end - current.start)) * 100,
      why: `${current.why} From ${current.source}.`,
    };
  }

  return {
    has: false,
    label: "FREE",
    title: upcoming ? `Free until ${fmt(upcoming.start)}` : "Nothing left today",
    sub: upcoming ? `${here.fit}. Take a break or pull something forward.` : "Enjoy your evening.",
    energy: here.name,
    fill: here.fill,
  };
}

function row(item: PlanItem): ListRow {
  return {
    id: item.id,
    title: item.title,
    time: item.fixed ? fmt(item.start) : `${fmt(item.start)} ~${dur(item.end - item.start)}`,
    fixed: item.fixed,
    fill: levelOf(item.start).fill,
    meta: `${item.fixed ? "Fixed" : "Flexible"} · ${levelOf(item.start).name}${item.important ? " · Important" : ""}`,
    aria: `${item.title}, ${fmt(item.start)}`,
  };
}

/** What is still ahead: the next three, then the rest of today. */
export function ahead(items: PlanItem[], now: number): { next: ListRow[]; rest: ListRow[] } {
  const vis = scheduled(items);
  const current = vis.find((item) => item.start <= now && now < item.end) ?? null;
  const after = vis.filter((item) => item.start > now || (item.end > now && item.id !== current?.id));
  return { next: after.slice(0, 3).map(row), rest: after.slice(3).map(row) };
}

export function laterRows(items: PlanItem[]): LaterRow[] {
  return items
    .filter((item) => item.later || item.moved)
    .map((item) => ({
      id: item.id,
      title: item.title,
      source: item.source,
      tag: item.carried ? "Carried over" : item.moved ? "Tomorrow" : "No date yet",
    }));
}




/** The next free slot that fits, rounded to the quarter hour. */
export function freeSlot(items: PlanItem[], from: number, length: number): number {
  const busy = scheduled(items);
  let start = Math.ceil(from / 15) * 15;
  let moved = true;
  let guard = 0;
  while (moved && guard < 50) {
    moved = false;
    guard += 1;
    for (const item of busy) {
      if (item.start < start + length && item.end > start) {
        start = Math.ceil(item.end / 15) * 15;
        moved = true;
      }
    }
  }
  return start;
}
