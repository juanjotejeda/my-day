import { settingsFor } from "@/lib/session";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  BackRow,
  DayHeaderLine,
  ItemRow,
  ListCard,
  NoteCard,
  PrimaryLink,
  Screen,
  SecondaryLink,
  SectionTitle,
} from "@/components/ui";
import { TIMEZONE, dayDate, dayKey, hhmm, minutesOfDay } from "@/lib/day";
import { levelOf } from "@/lib/plan/curve";
import { pct } from "@/lib/plan/format";
import { runPlan } from "@/lib/plan/run";
import { prisma } from "@/lib/prisma";

const WEEKDAY_KEYS = ["su", "mo", "tu", "we", "th", "fr", "sa"];

/** D3 Tomorrow: the next day through the same scheduler, with a Monday preview. */
export default async function Tomorrow() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) redirect("/signin");

  const now = new Date();
  const tomorrowDate = new Date(now.getTime() + 86_400_000);
  const tomorrow = dayDate(dayKey(tomorrowDate));

  // The scheduler runs for tomorrow only when something there is unplaced.
  // The worker plans it after every sync, so a page load is usually a read.
  const unplaced = await prisma.item.count({
    where: {
      userId: user.id,
      day: tomorrow,
      archivedAt: null,
      allDay: false,
      start: null,
      status: { in: ["planned", "moved"] },
    },
  });
  if (unplaced) await runPlan(user.id, tomorrow, now);

  const settings = await settingsFor(user.id);
  const weekday = WEEKDAY_KEYS[new Date(`${dayKey(tomorrowDate)}T12:00:00Z`).getUTCDay()];
  const isWorkday = settings.work.days.includes(weekday);

  const monday = nextMonday(tomorrowDate);
  const [items, mondayItems] = await Promise.all([
    prisma.item.findMany({
      where: { userId: user.id, day: tomorrow, archivedAt: null, status: { not: "dropped" } },
      orderBy: [{ start: "asc" }, { title: "asc" }],
    }),
    isWorkday
      ? Promise.resolve([])
      : prisma.item.findMany({
          where: { userId: user.id, day: dayDate(dayKey(monday)), archivedAt: null },
          orderBy: [{ start: "asc" }],
          take: 3,
        }),
  ]);

  const blocks = items.filter((item) => item.start && !item.allDay);
  const label = `${new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, weekday: "long" }).format(
    tomorrowDate,
  )} ${new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit" })
    .format(tomorrowDate)
    .replace("/", ".")}`;

  return (
    <Screen>
      <BackRow href="/" label="Today" />
      <DayHeaderLine date={`Tomorrow · ${label}`} workEnd={isWorkday ? settings.work.end : undefined} right={isWorkday ? undefined : "no work tomorrow"} />

      <div className="flex flex-col gap-2.5 rounded-card border border-line bg-card p-4">
        <div role="img" aria-label="Tomorrow from 07:00 to 22:00" className="relative h-[26px]">
          {blocks.map((item) => {
            const left = pct(minutesOfDay(item.start as Date));
            const right = pct(minutesOfDay(item.end ?? (item.start as Date)));
            return (
              <span
                key={item.id}
                className={`absolute top-1.5 h-3.5 rounded-full ${
                  item.fixed ? "bg-mid" : "border-[1.5px] border-dashed border-mid"
                }`}
                style={{ left: `${left}%`, width: `${Math.max(right - left, 1)}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[11px] text-muted">
          <span>07</span>
          <span>12</span>
          <span>17</span>
          <span>22</span>
        </div>
      </div>

      {!isWorkday ? (
        <NoteCard label="WEEKEND">
          {settings.protectedTime.noWorkWeekends
            ? "Weekends are protected, so work items wait until Monday."
            : "Not a working day, so only what you chose is planned."}
        </NoteCard>
      ) : null}

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Planned</SectionTitle>
        <ListCard>
          {blocks.length ? (
            blocks.map((item) => (
              <ItemRow
                key={item.id}
                href={`/item/${item.id}`}
                title={item.title}
                time={hhmm(item.start as Date)}
                meta={`${item.fixed ? "Fixed" : "Flexible"} · ${
                  item.sourceKind === "calendar"
                    ? "Calendar"
                    : item.sourceKind === "gmail"
                      ? "Gmail"
                      : item.status === "moved"
                        ? "moved from today"
                        : "Added by you"
                }`}
                fill={levelOf(minutesOfDay(item.start as Date)).fill}
                variant={item.fixed ? "divider" : "dashed"}
              />
            ))
          ) : (
            <p className="py-3 text-[15px] leading-relaxed text-muted">
              Nothing planned yet. What you add today for tomorrow appears here.
            </p>
          )}
        </ListCard>
      </section>

      {mondayItems.length ? (
        <section className="flex flex-col gap-1.5">
          <SectionTitle>Monday preview</SectionTitle>
          <ListCard>
            {mondayItems.map((item) => (
              <ItemRow
                key={item.id}
                href={`/item/${item.id}`}
                title={item.title}
                time={item.start ? `Mon ${hhmm(item.start)}` : "Mon"}
                meta={`${item.fixed ? "Fixed" : "Flexible"} · ${item.sourceKind === "gmail" ? "Gmail" : "Calendar"}`}
                fill={item.start ? levelOf(minutesOfDay(item.start)).fill : "var(--energy-steady)"}
                variant={item.fixed ? "divider" : "sky"}
              />
            ))}
          </ListCard>
        </section>
      ) : null}

      <PrimaryLink href="/">Looks right</PrimaryLink>
      <SecondaryLink href="/">Adjust tomorrow</SecondaryLink>

      <div className="flex-1" />
    </Screen>
  );
}

function nextMonday(from: Date): Date {
  const ahead = (8 - new Date(`${dayKey(from)}T12:00:00Z`).getUTCDay()) % 7 || 7;
  return new Date(from.getTime() + ahead * 86_400_000);
}
