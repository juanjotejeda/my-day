import { redirect } from "next/navigation";

import { TodayScreen } from "@/components/today-screen";
import { auth } from "@/auth";
import { TIMEZONE, dayDate, dayKey } from "@/lib/day";
import { weekendWaiting } from "@/lib/plan/carry";
import { DEFAULT_RHYTHM } from "@/lib/plan/curve";
import { toPlanItems } from "@/lib/plan/from-db";
import { loadSettings } from "@/lib/settings";
import { carryForwardToToday } from "@/lib/plan/run";
import { prisma } from "@/lib/prisma";
import { currentTheme } from "@/lib/theme";


export default async function Today() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  const email = session.user.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/signin");

  const now = new Date();
  // Opening Today is also a morning: bring yesterday's unfinished work along.
  await carryForwardToToday(user.id, now);

  const [stored, source, settings, openCandidates] = await Promise.all([
    prisma.item.findMany({
      where: { userId: user.id, day: dayDate(dayKey(now)), status: { not: "dropped" }, archivedAt: null },
      orderBy: [{ start: "asc" }, { title: "asc" }],
    }),
    prisma.source.findUnique({ where: { userId_kind: { userId: user.id, kind: "google" } } }),
    loadSettings(user.id),
    prisma.candidate.count({ where: { userId: user.id, state: "open" } }),
  ]);

  if (source?.disconnectedAt) redirect("/connection-lost");

  // Real items only now: the scheduler fills the day, so no sample day here.
  const items = toPlanItems(stored);

  const weekdayKeys = ["su", "mo", "tu", "we", "th", "fr", "sa"];
  const isWorkday = settings.work.days.includes(
    weekdayKeys[new Date(`${dayKey(now)}T12:00:00Z`).getUTCDay()],
  );
  const waitingForMonday = weekendWaiting(
    stored.map((item) => ({ category: item.category, start: item.start, allDay: item.allDay })),
    { isWorkday, noWorkWeekends: settings.protectedTime.noWorkWeekends },
  );
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
      workEnd={settings.work.end}
      items={items}
      banners={banners}
      reviewCount={openCandidates}
      waitingForMonday={waitingForMonday}
      headerRight={isWorkday ? undefined : "no work today"}
      theme={await currentTheme()}
      rhythm={{
        ...DEFAULT_RHYTHM,
        peakStart: settings.rhythm.peakStart,
        dip: settings.rhythm.dip,
        secondWind: settings.rhythm.secondWind,
        wake: settings.rhythm.wake,
        bed: settings.rhythm.bed,
      }}
    />
  );
}
