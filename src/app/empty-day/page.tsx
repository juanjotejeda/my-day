import { currentUser } from "@/lib/session";
import { redirect } from "next/navigation";

import { DayHeaderLine, ItemRow, ListCard, Screen, ScreenHeader, SectionTitle } from "@/components/ui";
import { TIMEZONE, hhmm } from "@/lib/day";

/**
 * X1: a day with nothing on it. Today falls back to this when the plan is
 * empty; the route also stands alone so the state can be checked any time.
 */
export default async function EmptyDay() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const now = new Date();
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit" })
    .format(now)
    .replace("/", ".");

  return (
    <Screen>
      <DayHeaderLine date={`${weekday} ${date}`} now={hhmm(now)} right={`${hhmm(now)} now · nothing planned`} />

      <div className="flex items-center gap-2">
        <span className="flex min-h-[52px] flex-1 items-center rounded-full border border-sky bg-surface px-[18px] text-[15px] text-muted">
          Add appointment, reminder or task
        </span>
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary text-on-primary">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </div>

      <div className="flex flex-col gap-2.5 rounded-card border border-line p-4">
        <div className="h-3.5 rounded-full border border-dashed border-sky" />
        <p className="text-xs leading-relaxed text-muted">07 to 22 · nothing planned</p>
      </div>

      <ScreenHeader title="Nothing planned" sub="Your weekend is protected. Work waits until Monday." size={36} />

      <section className="flex flex-col gap-1.5">
        <SectionTitle>If you want something</SectionTitle>
        <ListCard>
          <ItemRow href="/" title="Later" time="2 items" meta="No date yet" fill="var(--energy-low)" variant="divider" />
          <ItemRow
            href="/tomorrow"
            title="Monday preview"
            time="3 items"
            meta="From your calendar"
            fill="var(--sky)"
            variant="divider"
          />
        </ListCard>
      </section>

      <div className="flex-1" />
    </Screen>
  );
}
