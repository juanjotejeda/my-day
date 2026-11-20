"use client";

import Link from "next/link";

import { fmt } from "@/lib/plan/format";
import { levelOf } from "@/lib/plan/energy";
import type { PlanItem } from "@/lib/plan/types";

export type AdjustAction = "important" | "tomorrow" | "time" | "personal";

/** The adjust sheet from the design: four corrections, details link, close. */
export function AdjustSheet({
  item,
  onAct,
  onClose,
}: {
  item: PlanItem;
  onAct: (action: AdjustAction) => void;
  onClose: () => void;
}) {
  const scheduled = !item.later && !item.moved;
  const lines = {
    kind: item.fixed ? "Fixed event" : "Flexible",
    time: scheduled ? `${fmt(item.start)}-${fmt(item.end)}` : "Not scheduled",
    energy: scheduled ? levelOf(item.start).name : "Energy not set",
    important: item.important ? "Remove importance" : "This is more important",
    tomorrow: item.fixed ? "Fixed in your calendar" : item.moved ? "Bring back" : "Move to tomorrow",
    duration: item.fixed || item.later ? "Duration is fixed" : "I need 30 more minutes",
    category: item.category === "personal" ? "This is a work task" : "This is a personal commitment",
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end bg-[rgba(36,58,99,0.25)]">
      <button type="button" aria-label="Close" onClick={onClose} className="flex-1" />
      <div
        role="dialog"
        aria-label="Adjust item"
        className="mx-auto flex w-full max-w-[430px] flex-col gap-2 rounded-t-card bg-white px-4 pt-5 pb-6"
      >
        <p className="text-xs text-muted">
          {lines.kind} · {lines.time} · {lines.energy}
        </p>
        <p className="text-lg">{item.title}</p>
        <p className="pb-1.5 text-[13px] leading-snug text-muted">
          {item.why} Source: {item.source}.
        </p>

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
