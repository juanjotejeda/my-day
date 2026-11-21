"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { AddBar } from "@/components/add-bar";
import { AdjustSheet, type AdjustAction } from "@/components/adjust-sheet";
import { BottomNav } from "@/components/bottom-nav";
import { DayStrip } from "@/components/day-strip";
import { Card, EnergyDot, NoteCard, PillLink, PillRow, SectionTitle, TimeChip } from "@/components/ui";

import { fmt } from "@/lib/plan/format";
import type { Draft, PlanItem } from "@/lib/plan/types";
import { ahead, laterRows, load, nowCard, prioritySections, protectedLine } from "@/lib/plan/view";
import { addDraft, applyCorrection, deleteItem } from "@/app/actions";
import type { Rhythm } from "@/lib/plan/curve";

type View = "now" | "priority";

export function TodayScreen({
  weekday,
  date,
  now,
  workEnd,
  items,
  banners,
  reviewCount,
  rhythm,
  waitingForMonday,
}: {
  weekday: string;
  date: string;
  now: number;
  workEnd: string;
  items: PlanItem[];
  banners: string[];
  reviewCount: number;
  rhythm: Rhythm;
  waitingForMonday: number;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [view, setView] = useState<View>("now");
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [restOpen, setRestOpen] = useState(true);
  const [laterOpen, setLaterOpen] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function say(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
  }

  const selectedItem = items.find((item) => item.id === selected) ?? null;

  function act(action: AdjustAction) {
    if (!selectedItem) return;
    const kind = action === "time" ? "more_time" : action === "personal" ? "category" : action;
    setSelected(null);
    say("Saving");
    start(async () => {
      const result = await applyCorrection(selectedItem.id, kind);
      say(result.message);
      router.refresh();
    });
  }

  function remove(id: string) {
    setSelected(null);
    say("Deleting");
    start(async () => {
      const result = await deleteItem(id);
      say(result.message);
      router.refresh();
    });
  }

  function markDone(id: string) {
    start(async () => {
      const result = await applyCorrection(id, "done");
      if (!result.ok) say(result.message);
      router.refresh();
    });
  }

  function add(draft: Draft) {
    say("Adding");
    start(async () => {
      const result = await addDraft({
        type: draft.type,
        title: draft.text,
        day: draft.day,
        time: draft.time,
        dur: draft.dur,
        effort: draft.type === "task" ? "light" : "meeting",
      });
      say(result.message);
      router.refresh();
    });
  }

  const card = nowCard(items, now);
  // A day with no slot filled at all is the empty-day state.
  const scheduled = items.filter((item) => !item.later && !item.moved && item.start);
  const { next, rest } = ahead(items, now);
  const later = laterRows(items);
  const sections = prioritySections(
    items,
    now,
    Object.fromEntries(items.filter((item) => item.done).map((item) => [item.id, true])),
  );
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

      <DayStrip items={items} now={now} rhythm={rhythm} />

      {waitingForMonday ? (
        <NoteCard label="WEEKEND">
          {waitingForMonday} work {waitingForMonday === 1 ? "item waits" : "items wait"} for Monday.
          Weekends are protected, so only what you choose happens today.
        </NoteCard>
      ) : null}

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

          {/* X1: a day with nothing on it still offers what there is. */}
          {!scheduled.length && !banners.length ? (
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
                      onClick={() => markDone(row.id)}
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
        <AdjustSheet
          item={selectedItem}
          onAct={act}
          onDelete={remove}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </main>
  );
}
