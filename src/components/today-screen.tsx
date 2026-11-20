"use client";

import { useRef, useState } from "react";

import { AddBar } from "@/components/add-bar";
import { AdjustSheet, type AdjustAction } from "@/components/adjust-sheet";
import { BottomNav } from "@/components/bottom-nav";
import { DayStrip } from "@/components/day-strip";
import { Card, EnergyDot, PillLink, SectionTitle, TimeChip } from "@/components/ui";

import { fmt } from "@/lib/plan/format";
import type { Draft, PlanItem } from "@/lib/plan/types";
import { ahead, freeSlot, laterRows, load, nowCard, prioritySections, protectedLine } from "@/lib/plan/view";

type View = "now" | "priority";

export function TodayScreen({
  weekday,
  date,
  now,
  workEnd,
  items: initial,
  banners,
  reviewCount,
}: {
  weekday: string;
  date: string;
  now: number;
  workEnd: string;
  items: PlanItem[];
  banners: string[];
  reviewCount: number;
}) {
  const [items, setItems] = useState(initial);
  const [view, setView] = useState<View>("now");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [restOpen, setRestOpen] = useState(true);
  const [laterOpen, setLaterOpen] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function say(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }

  const selectedItem = items.find((item) => item.id === selected) ?? null;

  function act(action: AdjustAction) {
    if (!selectedItem) return;
    let message = "";
    setItems((current) =>
      current.map((item) => {
        if (item.id !== selectedItem.id) return item;
        const next = { ...item };
        if (action === "tomorrow") {
          if (next.fixed) message = "Calendar events are read-only here. Move it in Google Calendar.";
          else if (next.moved) {
            next.moved = false;
            message = "Back on your list.";
          } else {
            next.moved = true;
            message = "Moved to tomorrow. I will remember this for similar items.";
          }
        }
        if (action === "important") {
          next.important = !next.important;
          if (next.important) next.rank = "must";
          message = next.important
            ? "Marked as important. Similar items rank higher from now on."
            : "Back to normal priority.";
        }
        if (action === "time") {
          if (next.fixed || next.later) message = "This item has no flexible duration.";
          else {
            next.end += 30;
            message = "Added 30 minutes. I will plan more time for tasks like this.";
          }
        }
        if (action === "personal") {
          next.category = next.category === "personal" ? "work" : "personal";
          message =
            next.category === "personal" ? "Saved as a personal commitment." : "Saved as a work task.";
        }
        return next;
      }),
    );
    setSelected(null);
    say(message);
  }

  function add(draft: Draft) {
    const text = draft.text.trim();
    if (!text) {
      say("Type or say what to add first.");
      return;
    }

    const item: PlanItem = {
      id: `n${Date.now()}`,
      title: text,
      start: 0,
      end: 0,
      fixed: true,
      category: "personal",
      source: "Added by you",
      why: "",
      rank: "should",
      effort: "Personal",
    };
    let message: string;

    if (draft.type === "task") {
      const start = freeSlot(items, Math.max(now, 510), draft.dur);
      item.fixed = false;
      item.category = "work";
      item.effort = "Light task";
      item.start = start;
      item.end = start + draft.dur;
      item.why = "Task you added. Placed in the next free slot that fits.";
      message =
        draft.day === "tomorrow"
          ? "Task added for tomorrow."
          : `Task added. Placed at ${fmt(start)}, the next free slot.`;
    } else {
      if (!draft.time) {
        say(`Add a time for this ${draft.type === "reminder" ? "reminder." : "appointment."}`);
        return;
      }
      const [hours, minutes] = draft.time.split(":").map(Number);
      const start = hours * 60 + minutes;
      item.start = start;
      item.end = start + (draft.type === "reminder" ? 10 : 60);
      item.rank = "must";
      if (draft.type === "gcal") {
        item.source = "Calendar";
        item.category = "work";
        item.effort = "Meeting";
        item.why = "You added this. It is created in Google Calendar as a new event.";
      } else if (draft.type === "appt") {
        item.effort = "Meeting";
        item.why = "Appointment you added.";
      } else {
        item.source = "Reminder";
        item.effort = "Errand";
        item.why = "Reminder you added.";
      }
      message = `${draft.type === "reminder" ? "Reminder" : "Appointment"} added for ${
        draft.day === "tomorrow" ? "tomorrow" : "today"
      } at ${draft.time}.`;
    }

    if (draft.day === "tomorrow") item.moved = true;
    setItems((current) => [...current, item]);
    say(message);
  }

  const card = nowCard(items, now);
  const { next, rest } = ahead(items, now);
  const later = laterRows(items);
  const sections = prioritySections(items, now, done);
  const bar = load(items);

  return (
    <main className="relative mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-4 px-4 pt-6 pb-12">
      <header className="flex items-end justify-between px-1 pt-3 pb-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[17px] font-light text-muted">{weekday}</span>
          <span className="text-[86px] font-light leading-[0.92] tracking-[-0.04em]">{date}</span>
        </div>
        <div className="flex flex-col gap-3.5 pb-1.5 text-right">
          <div>
            <div className="text-2xl font-light tabular-nums">{fmt(now)}</div>
            <div className="text-[13px] text-muted">now</div>
          </div>
          <div>
            <div className="text-2xl font-light tabular-nums">{workEnd}</div>
            <div className="text-[13px] text-muted">work ends</div>
          </div>
        </div>
      </header>

      <AddBar onAdd={add} />

      {banners.length ? (
        <div className="flex flex-col gap-1.5">
          {banners.map((title) => (
            <div key={title} className="rounded-card bg-surface px-4 py-3 text-[15px]">
              {title}
              <span className="pl-2 text-xs text-muted">all day</span>
            </div>
          ))}
        </div>
      ) : null}

      <DayStrip items={items} now={now} />

      <div role="group" aria-label="View" className="grid grid-cols-2 gap-1 rounded-full bg-sky p-1">
        {(["now", "priority"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => setView(key)}
            className={`min-h-10 rounded-full text-sm ${
              view === key ? "bg-white text-navy shadow-[0_1px_3px_rgba(36,58,99,0.08)]" : "text-muted"
            }`}
          >
            {key === "now" ? "Now" : "Priority"}
          </button>
        ))}
      </div>

      {view === "now" ? (
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
                <button
                  type="button"
                  onClick={() => setSelected(card.id)}
                  className="min-h-11 self-start rounded-full border border-sky px-4 text-sm text-navy"
                >
                  Adjust
                </button>
              </>
            ) : null}
          </section>

          {next.length ? (
            <section className="flex flex-col gap-2">
              <SectionTitle>Next</SectionTitle>
              <Card className="overflow-hidden">
                {next.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    aria-label={row.aria}
                    onClick={() => setSelected(row.id)}
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
                  </button>
                ))}
              </Card>
            </section>
          ) : null}

          {rest.length ? (
            <Card className="px-[14px]">
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
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelected(row.id)}
                      className="flex min-h-11 w-full items-center gap-2.5 border-t border-divider py-1.5 text-left text-sm"
                    >
                      <span className="h-6 w-1 flex-none rounded-sm" style={{ background: row.fill }} />
                      <span className="w-11 flex-none text-muted tabular-nums">{row.time.slice(0, 5)}</span>
                      <span>{row.title}</span>
                    </button>
                  ))
                : null}
            </Card>
          ) : null}

          {later.length ? (
            <div className="rounded-card border border-dashed border-sky px-[14px]">
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
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelected(row.id)}
                      className="flex min-h-12 w-full flex-col gap-0.5 border-t border-dashed border-divider py-2 text-left"
                    >
                      <span className="text-sm">{row.title}</span>
                      <span className="text-xs text-muted">
                        {row.tag} · {row.source}
                      </span>
                    </button>
                  ))
                : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 rounded-card border border-line bg-white p-[14px]">
            <div className="flex items-baseline justify-between text-[13px]">
              <span>Does today fit?</span>
              <span className={bar.over ? "text-mid" : "text-[#2E7A55]"}>{bar.verdict}</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-divider">
              <div className="h-2 bg-mid" style={{ width: `${bar.fixedPct}%` }} />
              <div className="h-2 bg-mid opacity-45" style={{ width: `${bar.flexPct}%` }} />
            </div>
            <div className="flex gap-3.5 text-xs text-muted">
              <span>Fixed {bar.fixed}</span>
              <span>Flexible {bar.flex}</span>
              <span>of {bar.avail}</span>
            </div>
          </div>

          {sections.map((section) => (
            <section key={section.key} className="flex flex-col gap-2">
              <SectionTitle count={section.count} hint={section.hint}>
                {section.name}
              </SectionTitle>
              <Card className="overflow-hidden">
                {section.items.map((row) => (
                  <div key={row.id} className="flex items-center gap-1 border-b border-divider pr-3 pl-1 last:border-b-0">
                    <button
                      type="button"
                      aria-label={`${row.done ? "Mark not done" : "Mark done"}: ${row.title}`}
                      onClick={() => setDone((current) => ({ ...current, [row.id]: !row.done }))}
                      className="flex h-11 w-11 flex-none items-center justify-center"
                    >
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full border-2"
                        style={{
                          background: row.done ? "#8AA9DE" : "transparent",
                          borderColor: row.done ? "#8AA9DE" : row.important ? "#8AA9DE" : "#B3C8EC",
                        }}
                      >
                        {row.done ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                            <path
                              d="M2.5 6.2l2.3 2.3 4.7-5"
                              fill="none"
                              stroke="#FFFFFF"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : null}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelected(row.id)}
                      className="flex min-w-0 flex-1 flex-col gap-1 py-3 text-left"
                    >
                      <span className={`text-[15px] ${row.done ? "line-through opacity-55" : ""}`}>{row.title}</span>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <TimeChip time={row.time} fixed={row.fixed} />
                        <EnergyDot fill={row.fill} />
                        <span>{row.meta}</span>
                      </span>
                    </button>
                  </div>
                ))}
              </Card>
            </section>
          ))}

          <div className="flex flex-col gap-1.5 px-1 text-[13px] text-muted">
            <div className="text-navy">Protected time</div>
            <div>{protectedLine(items)}</div>
          </div>

          {later.length ? (
            <section className="flex flex-col gap-2">
              <SectionTitle count={later.length}>Later</SectionTitle>
              {later.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelected(row.id)}
                  className="flex min-h-[52px] w-full flex-col gap-0.5 rounded-card border border-dashed border-sky px-3.5 py-2.5 text-left"
                >
                  <span className="text-sm">{row.title}</span>
                  <span className="text-xs text-muted">
                    {row.tag} · {row.source}
                  </span>
                </button>
              ))}
            </section>
          ) : null}
        </div>
      )}

      <div className="flex gap-2 pt-2 pb-5">
        <PillLink href="/tomorrow">Plan tomorrow</PillLink>
        <PillLink href="/end-of-day">Close the day</PillLink>
      </div>

      <BottomNav active="today" reviewCount={reviewCount} />

      {toast ? (
        <div
          role="status"
          className="fixed right-4 bottom-24 left-4 z-30 mx-auto max-w-[398px] rounded-full bg-navy px-3.5 py-3 text-[13px] leading-snug text-white"
        >
          {toast}
        </div>
      ) : null}

      {selectedItem ? (
        <AdjustSheet item={selectedItem} onAct={act} onClose={() => setSelected(null)} />
      ) : null}
    </main>
  );
}
