import { notFound, redirect } from "next/navigation";

import {
  BackHeader,
  DetailRow,
  ItemRow,
  ListCard,
  Quote,
  Screen,
  SectionTitle,
} from "@/components/ui";
import { ItemActions } from "@/components/item-actions";
import { ItemEdit } from "@/components/item-edit";
import { TIMEZONE, dayKey, hhmm, minutesOfDay } from "@/lib/day";
import { levelOf } from "@/lib/plan/curve";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const CORRECTION_WORDS: Record<string, string> = {
  tomorrow: "Moved to tomorrow",
  important: "You marked it important",
  more_time: "You gave it 30 more minutes",
  category: "You changed work or personal",
  done: "Marked done",
  moved_time: "Moved to another time",
  dismissed: "Deleted",
};

/** D2 Item detail: the real item, where it came from and what you changed. */
export default async function ItemDetail({ params }: PageProps<"/item/[id]">) {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const { id } = await params;
  const item = await prisma.item.findFirst({
    where: { id, userId: user.id },
    include: { corrections: { orderBy: { createdAt: "asc" } } },
  });
  if (!item) notFound();

  const related = item.start
    ? await prisma.item.findMany({
        where: {
          userId: user.id,
          day: item.day,
          id: { not: item.id },
          archivedAt: null,
          start: { not: null },
        },
        orderBy: { start: "asc" },
        take: 3,
      })
    : [];

  const day = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, day: "numeric", month: "short" });
  const minutes =
    item.start && item.end
      ? Math.round((item.end.getTime() - item.start.getTime()) / 60_000)
      : (item.flexibleDuration ?? null);
  // An event from your own calendar is read here and changed in Google.
  const calendarOnly = item.sourceKind === "calendar" && !item.createdHere;

  return (
    <Screen>
      <BackHeader href="/" label="Today" />

      <ItemEdit
        id={item.id}
        title={item.title}
        date={item.day ? dayKey(item.day, "UTC") : ""}
        time={item.start ? hhmm(item.start) : ""}
        minutes={minutes}
        readOnly={calendarOnly}
        readOnlyNote={calendarOnly ? "This event comes from your calendar. Change it in Google Calendar." : undefined}
      />

      {item.reason ? (
        <section className="flex flex-col gap-1.5">
          <SectionTitle>Why it is here</SectionTitle>
          <ListCard>
            <p className="py-2 text-[15px] leading-relaxed">{item.reason}</p>
          </ListCard>
        </section>
      ) : null}

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Source</SectionTitle>
        <ListCard>
          <DetailRow
            label={
              item.sourceKind === "gmail"
                ? "Gmail"
                : item.sourceKind === "calendar"
                  ? "Google Calendar"
                  : item.sourceKind === "voice"
                    ? "Said out loud"
                    : "Added by you"
            }
            value={day.format(item.createdAt)}
          />
          {item.sourceQuote ? (
            <div className="py-2">
              <Quote>{item.sourceQuote}</Quote>
            </div>
          ) : null}
          {item.sourceUrl ? (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="block py-1.5 text-sm text-accent"
            >
              {item.sourceKind === "gmail" ? "Open the email in Gmail" : "Open in Google Calendar"}
            </a>
          ) : null}
        </ListCard>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>History</SectionTitle>
        <ListCard>
          <DetailRow label={day.format(item.createdAt)} value="Added" />
          {item.corrections.map((correction) => (
            <DetailRow
              key={correction.id}
              label={day.format(correction.createdAt)}
              value={CORRECTION_WORDS[correction.kind] ?? correction.kind}
            />
          ))}
        </ListCard>
      </section>

      {related.length ? (
        <section className="flex flex-col gap-1.5">
          <SectionTitle>Related</SectionTitle>
          <ListCard>
            {related.map((other) => (
              <ItemRow
                key={other.id}
                href={`/item/${other.id}`}
                title={other.title}
                time={other.start ? hhmm(other.start) : "later"}
                meta={`${other.fixed ? "Fixed" : "Flexible"} · ${other.sourceKind === "calendar" ? "Calendar" : other.sourceKind === "gmail" ? "Gmail" : "Added by you"}`}
                fill={other.start ? levelOf(minutesOfDay(other.start)).fill : "var(--energy-low)"}
                variant={other.fixed ? "divider" : "dashed"}
              />
            ))}
          </ListCard>
        </section>
      ) : null}

      <ItemActions
        id={item.id}
        done={item.status === "done"}
        fromCalendar={item.sourceKind === "calendar"}
        calendarOnly={calendarOnly}
        flexible={!item.fixed}
      />
    </Screen>
  );
}
