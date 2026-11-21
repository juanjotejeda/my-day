"use client";

import Link from "next/link";
import { useState } from "react";

import { fmt } from "@/lib/plan/format";
import { levelOf } from "@/lib/plan/curve";
import type { PlanItem } from "@/lib/plan/types";

export type AdjustAction = "important" | "tomorrow" | "time" | "personal";

/** The adjust sheet from the design: four corrections, details link, close. */
export function AdjustSheet({
  item,
  onAct,
  onDelete,
  onMove,
  onUnpin,
  onClose,
  today,
  tomorrow,
}: {
  item: PlanItem;
  onAct: (action: AdjustAction) => void;
  onDelete?: (id: string) => void;
  onMove?: (id: string, when: { date: string; time: string }) => void;
  onUnpin?: (id: string) => void;
  onClose: () => void;
  today: string;
  tomorrow: string;
}) {
  const [armed, setArmed] = useState(false);
  const [moving, setMoving] = useState(false);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(item.start ? fmt(item.start) : "09:00");
  const fromCalendar = item.source === "Calendar";
  const scheduled = !item.later && !item.moved;
  // An event from the calendar is moved in Google, not here.
  const fromCalendarOnly = item.source === "Calendar" && !item.createdHere;
  // An event My Day did not create stays in Google; everything else really goes.
  const deleteWords = fromCalendarOnly
    ? { label: "Remove from my day", armed: "Tap again to remove. It stays in Google Calendar" }
    : fromCalendar
      ? { label: "Delete", armed: "Tap again to delete, here and in Google Calendar" }
      : { label: "Delete", armed: "Tap again to delete" };
  const lines = {
    kind: item.fixed ? "Fixed event" : "Flexible",
    time: scheduled ? `${fmt(item.start)}-${fmt(item.end)}` : "Not scheduled",
    energy: scheduled ? levelOf(item.start).name : "Energy not set",
    important: item.important ? "Remove importance" : "Mark as important",
    tomorrow: item.fixed ? "Fixed in your calendar" : item.moved ? "Bring back" : "Move to tomorrow",
    duration: item.fixed || item.later ? "Duration is fixed" : "I need 30 more minutes",
    category: item.category === "personal" ? "This is a work task" : "This is a personal commitment",
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end bg-[rgba(0,0,0,0.45)]">
      <button type="button" aria-label="Close" onClick={onClose} className="flex-1" />
      <div
        role="dialog"
        aria-label="Adjust item"
        className="mx-auto flex w-full max-w-[430px] flex-col gap-2 rounded-t-card bg-card px-4 pt-5 pb-6"
      >
        <p className="text-xs text-muted">
          {lines.kind} · {lines.time} · {lines.energy}
        </p>
        <p className="text-lg">{item.title}</p>
        <p className="pb-1.5 text-[13px] leading-snug text-muted">
          {item.why} Source: {item.source}.
        </p>

        {item.pinned ? (
          <div className="flex items-center gap-3 rounded-full bg-raised px-3.5 py-2">
            <span className="flex-1 text-[13px]">Pinned by you</span>
            {onUnpin ? (
              <button type="button" onClick={() => onUnpin(item.id)} className="min-h-9 text-sm text-accent">
                Unpin
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Change date and time: a real calendar move, which pins the item. */}
        {onMove && !fromCalendarOnly ? (
          moving ? (
            <div className="flex flex-col gap-2 rounded-[18px] bg-surface p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDate(today)}
                  aria-pressed={date === today}
                  className={`min-h-10 rounded-full border px-3.5 text-sm ${
                    date === today ? "border-mid bg-sky" : "border-sky bg-card"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDate(tomorrow)}
                  aria-pressed={date === tomorrow}
                  className={`min-h-10 rounded-full border px-3.5 text-sm ${
                    date === tomorrow ? "border-mid bg-sky" : "border-sky bg-card"
                  }`}
                >
                  Tomorrow
                </button>
                <input
                  type="date"
                  value={date}
                  aria-label="Date"
                  onChange={(event) => setDate(event.target.value)}
                  className="min-h-10 rounded-full border border-sky bg-card px-3 text-[15px]"
                />
                <input
                  type="time"
                  value={time}
                  aria-label="Time"
                  onChange={(event) => setTime(event.target.value)}
                  className="min-h-10 rounded-full border border-sky bg-card px-3 text-[15px]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onMove(item.id, { date, time })}
                  className="min-h-11 flex-1 rounded-full bg-primary text-sm text-on-primary"
                >
                  Move it here
                </button>
                <button
                  type="button"
                  onClick={() => setMoving(false)}
                  className="min-h-11 rounded-full border border-sky px-4 text-sm"
                >
                  Keep as is
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMoving(true)}
              className="min-h-[46px] rounded-full bg-surface px-3.5 text-left text-[15px] text-navy"
            >
              Change date and time
            </button>
          )
        ) : null}

        <button
          type="button"
          onClick={() => onAct("important")}
          className="min-h-[46px] rounded-full bg-divider px-3.5 text-left text-[15px] text-navy"
        >
          {lines.important}
        </button>
        <button
          type="button"
          onClick={() => onAct("tomorrow")}
          className="min-h-[46px] rounded-full bg-surface px-3.5 text-left text-[15px] text-navy"
        >
          {lines.tomorrow}
        </button>
        <button
          type="button"
          onClick={() => onAct("time")}
          className="min-h-[46px] rounded-full bg-surface px-3.5 text-left text-[15px] text-navy"
        >
          {lines.duration}
        </button>
        <button
          type="button"
          onClick={() => onAct("personal")}
          className="min-h-[46px] rounded-full bg-surface px-3.5 text-left text-[15px] text-navy"
        >
          {lines.category}
        </button>

        {onDelete ? (
          <button
            type="button"
            onClick={() => {
              if (!armed) {
                setArmed(true);
                return;
              }
              onDelete(item.id);
            }}
            className="min-h-[46px] rounded-full bg-surface px-3.5 text-left text-[15px] text-alert-ink"
          >
            {armed ? deleteWords.armed : deleteWords.label}
          </button>
        ) : null}

        <Link
          href={`/item/${item.id}`}
          className="flex min-h-[46px] items-center rounded-full border border-sky px-3.5 text-[15px] text-navy"
        >
          See details and source
        </Link>
        <button type="button" onClick={onClose} className="min-h-[46px] text-[15px] text-navy">
          Close
        </button>
      </div>
    </div>
  );
}
