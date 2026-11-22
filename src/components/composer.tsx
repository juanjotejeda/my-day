"use client";

import { useState } from "react";

import { Switch } from "@/components/controls";
import { DURATIONS, draftLength, draftProblem, type ComposerDraft, type DraftType } from "@/lib/plan/draft";

const TYPES: { key: DraftType; label: string; sub: string }[] = [
  { key: "gcal", label: "Calendar", sub: "Google event" },
  { key: "appt", label: "Appointment", sub: "Other events" },
  { key: "reminder", label: "Reminder", sub: "At a time, or placed for you" },
  { key: "task", label: "Task", sub: "Placed for you" },
];

/**
 * The composer, with the fields each type actually needs: an appointment has a
 * date, a start, an end, an all-day switch and a place; a reminder a date and a
 * time; a task a duration and either Automatic or a date and time.
 */
export function Composer({
  draft,
  today,
  tomorrow,
  onChange,
  onAdd,
  onCancel,
  busy,
}: {
  draft: ComposerDraft;
  today: string;
  tomorrow: string;
  onChange: (patch: Partial<ComposerDraft>) => void;
  onAdd: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const problem = draftProblem(draft);
  const places = draft.type === "task" || draft.type === "reminder";
  const timed = !places || !draft.auto;
  const pill = (on: boolean) => (on ? "border-mid bg-sky" : "border-sky bg-card");

  const hint =
    draft.type === "task"
      ? draft.auto
        ? "I will place it in the next free slot that fits."
        : "It goes exactly where you put it, and nothing moves it."
      : draft.type === "reminder"
        ? "You get a reminder at this time."
        : draft.allDay
          ? "A day banner, with no time of its own."
          : `Fixed in your day, ${draftLength(draft)} minutes.`;

  return (
    <div className="mt-2.5 flex flex-col gap-3.5 rounded-card border border-sky bg-card p-4 shadow-[var(--shadow-card)]">
      <div role="group" aria-label="What kind" className="grid grid-cols-2 gap-2">
        {TYPES.map((type) => (
          <button
            key={type.key}
            type="button"
            aria-pressed={draft.type === type.key}
            onClick={() => onChange({ type: type.key })}
            className={`flex min-h-14 flex-col gap-0.5 rounded-2xl border px-3 py-2 text-left ${pill(
              draft.type === type.key,
            )}`}
          >
            <span className="text-[15px]">{type.label}</span>
            <span className="text-xs text-muted">{type.sub}</span>
          </button>
        ))}
      </div>

      {draft.type === "gcal" ? (
        <p className="text-xs leading-snug text-muted">
          Creates the event in Google Calendar. My Day only ever adds new events.
        </p>
      ) : null}

      <label className="flex flex-col gap-1.5 text-xs text-muted">
        What
        <input
          type="text"
          value={draft.text}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder="For example: Dentist with Thiago"
          className="min-h-12 w-full rounded-[14px] border border-sky bg-surface px-3.5 text-base font-light text-navy"
        />
      </label>

      {places ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted">When</span>
          <div className="flex flex-wrap gap-2">
            {([true, false] as const).map((auto) => (
              <button
                key={String(auto)}
                type="button"
                aria-pressed={draft.auto === auto}
                onClick={() => onChange({ auto, ...(auto ? { startTime: "" } : {}) })}
                className={`min-h-10 rounded-full border px-3.5 text-sm text-navy ${pill(draft.auto === auto)}`}
              >
                {auto ? "Automatic" : "Set date and time"}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {draft.type === "appt" || draft.type === "gcal" ? (
        <div className="flex min-h-14 items-center gap-3 border-t border-divider pt-2">
          <span className="flex-1 text-base">All day</span>
          <Switch label="All day" defaultOn={draft.allDay} onChange={(on) => onChange({ allDay: on })} />
        </div>
      ) : null}

      {timed ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted">Date</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={draft.date === today}
              onClick={() => onChange({ date: today })}
              className={`min-h-10 rounded-full border px-3.5 text-sm text-navy ${pill(draft.date === today)}`}
            >
              Today
            </button>
            <button
              type="button"
              aria-pressed={draft.date === tomorrow}
              onClick={() => onChange({ date: tomorrow })}
              className={`min-h-10 rounded-full border px-3.5 text-sm text-navy ${pill(draft.date === tomorrow)}`}
            >
              Tomorrow
            </button>
            <input
              type="date"
              value={draft.date}
              aria-label="Date"
              onChange={(event) => onChange({ date: event.target.value })}
              className="min-h-10 rounded-full border border-sky bg-surface px-3 text-[15px] text-navy"
            />
          </div>
        </div>
      ) : null}

      {timed && !draft.allDay ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted">
            {draft.type === "appt" || draft.type === "gcal" ? "From" : "At"}
            <input
              type="time"
              value={draft.startTime}
              onChange={(event) => onChange({ startTime: event.target.value })}
              className="min-h-10 rounded-full border border-sky bg-surface px-3 text-[15px] text-navy"
            />
          </label>
          {draft.type === "appt" || draft.type === "gcal" ? (
            <label className="flex items-center gap-2 text-xs text-muted">
              to
              <input
                type="time"
                value={draft.endTime}
                onChange={(event) => onChange({ endTime: event.target.value })}
                className="min-h-10 rounded-full border border-sky bg-surface px-3 text-[15px] text-navy"
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {draft.type === "task" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">How long</span>
          {DURATIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              aria-pressed={draft.dur === minutes}
              onClick={() => onChange({ dur: minutes })}
              className={`min-h-10 rounded-full border px-3.5 text-sm text-navy ${pill(draft.dur === minutes)}`}
            >
              {minutes < 60 ? `${minutes} min` : `${minutes / 60}h`}
            </button>
          ))}
        </div>
      ) : null}

      {draft.type === "appt" || draft.type === "gcal" ? (
        <label className="flex flex-col gap-1.5 text-xs text-muted">
          Where, if anywhere
          <input
            type="text"
            value={draft.location}
            onChange={(event) => onChange({ location: event.target.value })}
            placeholder="A room, an address, a link"
            className="min-h-12 w-full rounded-[14px] border border-sky bg-surface px-3.5 text-base font-light text-navy"
          />
        </label>
      ) : null}

      <p className="text-xs leading-snug text-muted">{touched && problem ? problem : hint}</p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setTouched(true);
            if (!problem) onAdd();
          }}
          className="min-h-12 flex-1 rounded-full bg-primary text-[15px] text-on-primary disabled:opacity-60"
        >
          {busy ? "Adding" : "Add to my day"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-full border border-sky px-[18px] text-[15px] text-navy"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
