import { dayDate, dayKey } from "@/lib/day";
import { splitDay, type TodayPlan } from "@/lib/day-plan";
import { prisma } from "@/lib/prisma";

/** Everything the Today screen shows, read from the items table. */
export async function loadToday(userId: string, now = new Date()): Promise<TodayPlan> {
  const items = await prisma.item.findMany({
    where: { userId, day: dayDate(dayKey(now)), status: { not: "dropped" } },
    orderBy: [{ start: "asc" }, { title: "asc" }],
  });
  return splitDay(items, now);
}
