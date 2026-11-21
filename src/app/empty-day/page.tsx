import { redirect } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { auth } from "@/auth";
import { reviewCount } from "@/lib/plan/review-count";
import { DayHeaderLine, ItemRow, ListCard, Screen, ScreenHeader, SectionTitle } from "@/components/ui";
import { TIMEZONE, hhmm } from "@/lib/day";

/**
 * X1: a day with nothing on it. Today falls back to this when the plan is
 * empty; the route also stands alone so the state can be checked any time.
 */
export default async function EmptyDay() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const waiting = await reviewCount();

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
        <span className="h-[52px] w-[52px] rounded-full bg-primary" />
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
      <BottomNav active="today" reviewCount={waiting} />
    </Screen>
  );
}
