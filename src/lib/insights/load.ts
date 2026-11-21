import { dayKey } from "@/lib/day";
import { prisma } from "@/lib/prisma";

import { weekMeasures, weekRange, type WeekMeasures } from "./week";

/** The week's rows, read once and measured by the pure functions. */
export async function loadWeek(userId: string, now = new Date()): Promise<WeekMeasures> {
  const { start } = weekRange(now);
  const from = new Date(`${start}T00:00:00Z`);

  const [items, corrections, candidates, reviews, planRuns] = await Promise.all([
    prisma.item.findMany({
      where: { userId, archivedAt: null, day: { gte: from } },
      include: { corrections: { select: { kind: true } } },
    }),
    prisma.correction.findMany({ where: { userId, createdAt: { gte: from } } }),
    prisma.candidate.findMany({ where: { userId, createdAt: { gte: from } } }),
    prisma.dayReview.findMany({ where: { userId, date: { gte: from } } }),
    prisma.eventLog.findMany({ where: { userId, kind: "plan_run", createdAt: { gte: from } } }),
  ]);

  const minutes = (start: Date | null, end: Date | null, fallback: number | null) =>
    start && end ? Math.round((end.getTime() - start.getTime()) / 60_000) : (fallback ?? 0);

  return weekMeasures(
    {
      today: dayKey(now),
      items: items
        .filter((item) => item.day && !item.allDay)
        .map((item) => {
          const planned = minutes(item.start, item.end, item.flexibleDuration);
          return {
            day: dayKey(item.day as Date, "UTC"),
            status: item.status,
            // A fixed event that has ended happened, unless it was dropped.
            followed:
              item.status === "done" ||
              (item.fixed && item.status !== "dropped" && Boolean(item.end && item.end <= now)),
            effort: item.effort,
            plannedMin: planned,
            doneMin: item.status === "done" ? planned : 0,
            // A correction on the item means the plan was not taken as proposed.
            corrected: item.corrections.some((correction) =>
              ["tomorrow", "more_time", "moved_time", "important", "category"].includes(correction.kind),
            ),
          };
        }),
      corrections: corrections.map((correction) => ({
        day: dayKey(correction.createdAt),
        kind: correction.kind,
      })),
      candidates: candidates.map((candidate) => ({
        day: dayKey(candidate.createdAt),
        state: candidate.state,
      })),
      reviews: reviews.map((review) => ({
        day: dayKey(review.date, "UTC"),
        feeling: review.feeling,
        planRight: review.planRight,
        trust: review.trust,
      })),
      planRuns: planRuns.map((run) => ({ day: dayKey(run.createdAt) })),
    },
    now,
  );
}

export { type WeekMeasures };
export const WEEK_DAYS = (now: Date) => weekRange(now).days;
