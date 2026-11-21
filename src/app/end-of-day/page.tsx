import { redirect } from "next/navigation";

import { EndOfDayScreen } from "@/components/end-of-day-screen";
import { auth } from "@/auth";
import { TIMEZONE, dayDate, dayKey, hhmm } from "@/lib/day";
import { dur } from "@/lib/plan/format";
import { reviewCount } from "@/lib/plan/review-count";
import { prisma } from "@/lib/prisma";

/** D4 on real data: what today holds, what is still open, what you answered. */
export default async function EndOfDay() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const waiting = await reviewCount();
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) redirect("/signin");

  const now = new Date();
  const today = dayDate(dayKey(now));

  const [items, corrections, review] = await Promise.all([
    prisma.item.findMany({
      where: { userId: user.id, day: today, archivedAt: null, status: { not: "dropped" } },
      orderBy: { start: "asc" },
    }),
    prisma.correction.count({ where: { userId: user.id, createdAt: { gte: today } } }),
    prisma.dayReview.findUnique({ where: { userId_date: { userId: user.id, date: today } } }),
  ]);

  const done = items.filter((item) => item.status === "done");
  const moved = items.filter((item) => item.status === "moved").length;
  const focusMin = items
    .filter((item) => item.effort === "deep" && item.start && item.end)
    .reduce((total, item) => total + ((item.end as Date).getTime() - (item.start as Date).getTime()) / 60_000, 0);
  const focusDone = items
    .filter((item) => item.effort === "deep" && item.status === "done" && item.start && item.end)
    .reduce((total, item) => total + ((item.end as Date).getTime() - (item.start as Date).getTime()) / 60_000, 0);

  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return (
    <EndOfDayScreen
      when={`${when} · ${hhmm(now)}`}
      headline={items.length ? `${done.length} of ${items.length} done` : "Nothing was planned"}
      stats={[
        { label: "Focus time", value: focusMin ? `${dur(Math.round(focusDone))} of ${dur(Math.round(focusMin))}` : "none planned" },
        { label: "Moved", value: `${moved} ${moved === 1 ? "item" : "items"}` },
        { label: "Corrections", sub: "Saved as feedback", value: String(corrections) },
      ]}
      open={items
        .filter((item) => item.status !== "done")
        .map((item) => ({ id: item.id, title: item.title }))}
      reviewCount={waiting}
      saved={{
        feeling: review?.feeling ?? undefined,
        planRight: review?.planRight ?? undefined,
        note: review?.note ?? undefined,
      }}
    />
  );
}
