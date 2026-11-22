import { settingsFor } from "@/lib/session";
import { redirect } from "next/navigation";

import { TodayScreen } from "@/components/today-screen";
import { auth } from "@/auth";
import { TIMEZONE, dayDate, dayKey } from "@/lib/day";
import { weekendWaiting } from "@/lib/plan/carry";
import { DEFAULT_RHYTHM } from "@/lib/plan/curve";
import { toPlanItems } from "@/lib/plan/from-db";
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
  // Opening Today is also a morning, but only look when something is actually
  // waiting on an earlier day: one count instead of a write on every load.
  const stale = await prisma.item.count({
    where: {
      userId: user.id,
      archivedAt: null,
      day: { lt: dayDate(dayKey(now)) },
      status: { in: ["planned", "moved"] },
    },
  });
  if (stale) await carryForwardToToday(user.id, now);

  const tomorrow = new Date(now.getTime() + 86_400_000);
  const [stored, storedTomorrow, source, settings, openCandidates] = await Promise.all([
    prisma.item.findMany({
      where: { userId: user.id, day: dayDate(dayKey(now)), status: { not: "dropped" }, archivedAt: null },
      orderBy: [{ start: "asc" }, { title: "asc" }],
    }),
    // What tomorrow holds, so the quiet view can show what is coming.
    prisma.item.findMany({
      where: { userId: user.id, day: dayDate(dayKey(tomorrow)), status: { not: "dropped" }, archivedAt: null },
      orderBy: [{ start: "asc" }, { title: "asc" }],
      take: 5,
    }),
    prisma.source.findUnique({ where: { userId_kind: { userId: user.id, kind: "google" } } }),
    settingsFor(user.id),
    prisma.candidate.count({ where: { userId: user.id, state: "open" } }),
  ]);

  if (source?.disconnectedAt) redirect("/connection-lost");

  // Real items only now: the scheduler fills the day, so no sample day here.
  const items = toPlanItems(stored);
  const tomorrowItems = toPlanItems(storedTomorrow);

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
      tomorrowItems={tomorrowItems}
      banners={banners}
      reviewCount={openCandidates}
      waitingForMonday={waitingForMonday}
      todayDate={dayKey(now)}
      tomorrowDate={dayKey(tomorrow)}
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
