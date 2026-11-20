import { redirect } from "next/navigation";

import { TodayScreen } from "@/components/today-screen";
import { auth } from "@/auth";
import { TIMEZONE, dayDate, dayKey } from "@/lib/day";
import { toPlanItems } from "@/lib/plan/from-db";
import { mergeWithSample } from "@/lib/plan/merge";
import { SAMPLE_DAY } from "@/lib/plan/sample";
import { prisma } from "@/lib/prisma";

// Work hours and the review count come from settings and Gmail in milestones 4 and 5.
const WORK_END = "18:00";
const SAMPLE_REVIEW_COUNT = 4;

export default async function Today() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  const email = session.user.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/signin");

  const now = new Date();
  const [stored, source] = await Promise.all([
    prisma.item.findMany({
      where: { userId: user.id, day: dayDate(dayKey(now)), status: { not: "dropped" } },
      orderBy: [{ start: "asc" }, { title: "asc" }],
    }),
    prisma.source.findUnique({ where: { userId_kind: { userId: user.id, kind: "google" } } }),
  ]);

  if (source?.disconnectedAt) redirect("/connection-lost");

  const items = mergeWithSample(toPlanItems(stored), SAMPLE_DAY);
  const banners = stored.filter((item) => item.allDay).map((item) => item.title);

  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit" })
    .format(now)
    .replace("/", ".");
  const nowMinutes = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, hour: "2-digit", hour12: false }).format(now),
  ) * 60 +
    Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, minute: "2-digit" }).format(now));

  return (
    <TodayScreen
      weekday={weekday}
      date={date}
      now={nowMinutes}
      workEnd={WORK_END}
      items={items}
      banners={banners}
      reviewCount={SAMPLE_REVIEW_COUNT}
    />
  );
}
