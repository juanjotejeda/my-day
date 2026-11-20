import type { Item } from "@/generated/prisma/client";

import { dayDate, dayKey } from "@/lib/day";
import { prisma } from "@/lib/prisma";

export type TodayPlan = {
  banners: Item[];
  blocks: Item[];
  current: Item | null;
  next: Item[];
  rest: Item[];
  total: number;
};

/** Everything the Today screen shows, read from the items table. */
export async function loadToday(userId: string, now = new Date()): Promise<TodayPlan> {
  const items = await prisma.item.findMany({
    where: { userId, day: dayDate(dayKey(now)), status: { not: "dropped" } },
    orderBy: [{ start: "asc" }, { title: "asc" }],
  });

  const banners = items.filter((item) => item.allDay);
  const blocks = items.filter((item) => !item.allDay && item.start);

  const current =
    blocks.find((item) => {
      const start = item.start as Date;
      const end = item.end ?? new Date(start.getTime() + 30 * 60_000);
      return start <= now && now < end;
    }) ?? null;

  const upcoming = blocks.filter((item) => (item.start as Date) > now);
  const next = upcoming.slice(0, 3);
  const restIds = new Set([current?.id, ...next.map((item) => item.id)].filter(Boolean));
  const rest = items.filter((item) => !item.allDay && !restIds.has(item.id));

  return { banners, blocks, current, next, rest, total: items.length };
}

/** 0 to 1 through a block, for the progress bar on the Now card. */
export function progressThrough(item: Item, now = new Date()): number {
  if (!item.start || !item.end) return 0;
  const span = item.end.getTime() - item.start.getTime();
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - item.start.getTime()) / span));
}
