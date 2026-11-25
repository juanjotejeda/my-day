"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { AddBar } from "@/components/add-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useViewMode } from "@/components/view-mode";
import { ViewToggle } from "@/components/view-toggle";
import { DayStrip } from "@/components/day-strip";
import {
  Card,
  DayHeaderLine,
  EnergyDot,
  NoteCard,
  PillLink,
  PillRow,
  SectionTitle,
  TimeChip,
  Toast,
} from "@/components/ui";

import { fmt } from "@/lib/plan/format";
import type { PlanItem } from "@/lib/plan/types";
import type { ComposerDraft } from "@/lib/plan/draft";
import { ahead, laterRows, nowCard } from "@/lib/plan/view";
import { addDraft } from "@/app/actions";
import { DAY_CLOSE, PLAN_TOMORROW } from "@/lib/flags";
import type { Rhythm } from "@/lib/plan/curve";
import type { Theme } from "@/lib/theme";

export function TodayScreen({
  weekday,
  date,
  now,
  workEnd,
  items: allItems,
  tomorrowItems: allTomorrow,
  banners,
  reviewCount,
  rhythm,
  waitingForMonday,
  todayDate,
  tomorrowDate,
  headerRight,
  theme,
}: {
  weekday: string;
  date: string;
  now: number;
  workEnd: string;
  items: PlanItem[];
  /** Tomorrow's first few, so the simple view says what is coming. */
  tomorrowItems: PlanItem[];
  banners: string[];
  reviewCount: number;
  rhythm: Rhythm;
  waitingForMonday: number;
  todayDate: string;
  tomorrowDate: string;
  /** Said instead of the times when today is not a working day. */
  headerRight?: string;
  theme: Theme;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  // The simple view keeps the date line, the Now box and Next, and no more.
  const simple = useViewMode().view === "simple";
  const [toast, setToast] = useState("");
  // Your own calendar is the day; the shared ones are there when you ask.
  const [allCalendars, setAllCalendars] = useState(false);
  const [restOpen, setRestOpen] = useState(true);
  const [laterOpen, setLaterOpen] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function say(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
  }






  function add(draft: ComposerDraft) {
    say("Adding");
    start(async () => {
      const result = await addDraft(draft);
      say(result.message);
      router.refresh();
    });
  }

  const items = allCalendars ? allItems : allItems.filter((item) => !item.otherCalendar);
  const tomorrowItems = (allCalendars ? allTomorrow : allTomorrow.filter((item) => !item.otherCalendar)).slice(
    0,
    5,
  );

  const card = nowCard(items, now);

  // A day with no slot filled at all is the empty-day state.
  const scheduled = items.filter((item) => !item.later && !item.moved && item.start);
  const { next, rest } = ahead(items, now);
  // The full view folds everything after the third into Rest of today. The
  // simple view has no fold, so it lists the whole rest of the day.
  const coming = simple ? [...next, ...rest] : next;
  const later = laterRows(items);

  return (
    <main className="relative mx-auto flex w-full max-w-[430px] min-h-[100dvh] flex-1 flex-col gap-4 px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <DayHeaderLine
        date={`${weekday} ${date}`}
        now={fmt(now)}
        workEnd={workEnd}
        right={headerRight}
        action={
          <span className="flex items-center gap-2">
            <button
              type="button"
              aria-label={allCalendars ? "Show only my calendar" : "Show every calendar"}
              aria-pressed={allCalendars}
              onClick={() => setAllCalendars((on) => !on)}
              className={`flex h-11 w-11 flex-none items-center justify-center rounded-full border border-sky text-navy ${
                allCalendars ? "bg-sky" : ""
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="9" cy="9" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M3.5 19.5c0-3 2.5-4.6 5.5-4.6s5.5 1.6 5.5 4.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M16 6.2a3.2 3.2 0 0 1 0 5.9M17.5 15.4c2 .5 3.3 1.9 3.3 4.1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <ViewToggle />
            <ThemeToggle theme={theme} />
          </span>
        }
      />

      {/* Adding is the full view's job; the simple view only shows the day. */}
      {simple ? null : <AddBar className="appear" onAdd={add} today={todayDate} tomorrow={tomorrowDate} />}

      {!simple && banners.length ? (
        <div className="flex flex-col gap-1.5">
          {banners.map((title) => (
            <div key={title} className="rounded-card bg-surface px-4 py-3 text-[15px]">
              {title}
              <span className="pl-2 text-xs text-muted">all day</span>
            </div>
          ))}
        </div>
      ) : null}

      {simple ? null : (
        <div className="appear" style={{ animationDelay: "60ms" }}>
          <DayStrip items={items} now={now} rhythm={rhythm} />
        </div>
      )}

      {!simple && waitingForMonday ? (
        <NoteCard label="WEEKEND">
          {waitingForMonday} work {waitingForMonday === 1 ? "item waits" : "items wait"} for Monday.
          Weekends are protected, so only what you choose happens today.
        </NoteCard>
      ) : null}

      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-2.5 rounded-card bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-[0.1em] text-accent">{card.label}</span>
            <span className="flex items-center gap-1.5 rounded-full border border-sky px-2 py-[3px] text-xs">
              <EnergyDot fill={card.fill} />
              {card.energy}
            </span>
          </div>
          <h2 className="text-[32px] leading-tight font-light tracking-[-0.01em]">{card.title}</h2>
          <p className="text-[15px] opacity-85">{card.sub}</p>
          {card.has ? (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-divider">
                <div className="h-1.5 bg-mid" style={{ width: `${card.progress}%` }} />
              </div>
              <p className="text-[13px] leading-relaxed text-muted">{card.why}</p>
              <Link
                href={`/item/${card.id}`}
                className="flex min-h-11 items-center self-start rounded-full border border-sky px-4 text-sm text-navy"
              >
                Details and source
              </Link>
            </>
          ) : null}
        </section>

        {/* X1: a day with nothing on it still offers what there is. */}
        {!simple && !scheduled.length && !banners.length ? (
          <section className="flex flex-col gap-2">
            <SectionTitle>If you want something</SectionTitle>
            <Card className="px-[14px]">
              {later.length ? (
                <button
                  type="button"
                  onClick={() => setLaterOpen(true)}
                  className="flex min-h-[56px] w-full items-center justify-between border-b border-divider text-left text-[15px]"
                >
                  <span>Later</span>
                  <span className="text-sm text-muted">
                    {later.length} {later.length === 1 ? "item" : "items"}
                  </span>
                </button>
              ) : null}
              <PillRow href="/tomorrow" label="Tomorrow" value="see the plan" />
              <PillRow
                href="/review"
                label="Review"
                value={reviewCount ? `${reviewCount} waiting` : "nothing waiting"}
              />
            </Card>
          </section>
        ) : null}

        {coming.length ? (
          <section className="flex flex-col gap-2">
            <SectionTitle>Next</SectionTitle>
            <Card className="overflow-hidden">
              {coming.map((row) => (
                <Link
                  key={row.id}
                  aria-label={row.aria}
                  href={`/item/${row.id}`}
                  className="flex min-h-[60px] w-full items-center gap-3 border-b border-divider px-[14px] py-2.5 text-left last:border-b-0"
                >
                  <span className="w-1 self-stretch rounded-sm" style={{ background: row.fill }} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[15px]">{row.title}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <TimeChip time={row.time} fixed={row.fixed} />
                      <span>{row.meta}</span>
                    </span>
                  </span>
                </Link>
              ))}
            </Card>
          </section>
        ) : null}

        {!simple && rest.length ? (
          <Card className="appear px-[14px]">
            <button
              type="button"
              aria-expanded={restOpen}
              onClick={() => setRestOpen((open) => !open)}
              className="flex min-h-[50px] w-full items-center justify-between text-[15px]"
            >
              <span>Rest of today ({rest.length})</span>
              <span className="text-[13px] text-muted">{restOpen ? "Hide" : "Show"}</span>
            </button>
            {restOpen
              ? rest.map((row) => (
                  <Link
                    key={row.id}
                    href={`/item/${row.id}`}
                    className="flex min-h-11 w-full items-center gap-2.5 border-t border-divider py-1.5 text-left text-sm"
                  >
                    <span className="h-6 w-1 flex-none rounded-sm" style={{ background: row.fill }} />
                    <span className="w-11 flex-none text-muted tabular-nums">{row.time.slice(0, 5)}</span>
                    <span>{row.title}</span>
                  </Link>
                ))
              : null}
          </Card>
        ) : null}

        {!simple && later.length ? (
          <div className="appear rounded-card border border-dashed border-sky px-[14px]">
            <button
              type="button"
              aria-expanded={laterOpen}
              onClick={() => setLaterOpen((open) => !open)}
              className="flex min-h-[50px] w-full items-center justify-between text-[15px]"
            >
              <span>Later ({later.length})</span>
              <span className="text-[13px] text-muted">{laterOpen ? "Hide" : "Show"}</span>
            </button>
            {laterOpen
              ? later.map((row) => (
                  <Link
                    key={row.id}
                    href={`/item/${row.id}`}
                    className="flex min-h-12 w-full flex-col gap-0.5 border-t border-dashed border-divider py-2 text-left"
                  >
                    <span className="text-sm">{row.title}</span>
                    <span className="text-xs text-muted">
                      {row.tag} · {row.source}
                    </span>
                  </Link>
                ))
              : null}
          </div>
        ) : null}

        {/* The quiet view still says what is coming, so tomorrow is no surprise. */}
        {simple && tomorrowItems.length ? (
          <section className="flex flex-col gap-2">
            <SectionTitle>Tomorrow</SectionTitle>
            <Card className="overflow-hidden">
              {tomorrowItems.map((row) => (
                <Link
                  key={row.id}
                  href={`/item/${row.id}`}
                  className="flex min-h-[52px] w-full items-center gap-3 border-b border-divider px-[14px] py-2 text-left last:border-b-0"
                >
                  <span className="w-11 flex-none text-sm text-muted tabular-nums">
                    {row.later || !row.start ? "--:--" : fmt(row.start)}
                  </span>
                  <span className="min-w-0 flex-1 text-[15px]">{row.title}</span>
                </Link>
              ))}
            </Card>
          </section>
        ) : null}
      </div>


      {!simple && (PLAN_TOMORROW || DAY_CLOSE) ? (
        <div className="appear flex gap-2 pt-2 pb-5" style={{ animationDelay: "180ms" }}>
          {PLAN_TOMORROW ? <PillLink href="/tomorrow">Plan tomorrow</PillLink> : null}
          {DAY_CLOSE ? <PillLink href="/end-of-day">Close the day</PillLink> : null}
        </div>
      ) : null}

      {toast ? (
        <Toast>{toast}</Toast>
      ) : null}

    </main>
  );
}
