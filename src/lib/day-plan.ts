import type { Item } from "@/generated/prisma/client";

export type TodayPlan = {
  banners: Item[];
  blocks: Item[];
  current: Item | null;
  next: Item[];
  later: Item[];
  earlier: Item[];
  total: number;
};

const DEFAULT_BLOCK_MIN = 30;

function endOf(item: Item): Date {
  const start = item.start as Date;
  return item.end ?? new Date(start.getTime() + DEFAULT_BLOCK_MIN * 60_000);
}

/**
 * Splits a day into what is on now, what is coming and what has passed.
 * Pure, so the rules are testable: see today.test.ts.
 */
export function splitDay(items: Item[], now: Date): TodayPlan {
  const banners = items.filter((item) => item.allDay);
  const blocks = items.filter((item) => !item.allDay && item.start);

  const current = blocks.find((item) => (item.start as Date) <= now && now < endOf(item)) ?? null;
  const upcoming = blocks.filter((item) => (item.start as Date) > now);
  const earlier = blocks.filter((item) => item.id !== current?.id && endOf(item) <= now);

  return {
    banners,
    blocks,
    current,
    next: upcoming.slice(0, 3),
    later: upcoming.slice(3),
    earlier,
    total: items.length,
  };
}

/** 0 to 1 through a block, for the progress bar on the Now card. */
export function progressThrough(item: Item, now = new Date()): number {
  if (!item.start || !item.end) return 0;
  const span = item.end.getTime() - item.start.getTime();
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - item.start.getTime()) / span));
}
