"use client";

import { useEffect, useRef, useState } from "react";

import { SAMPLE_TRANSCRIPT } from "@/lib/plan/sample";
import { parseSpeech } from "@/lib/plan/speech";
import { EMPTY_DRAFT, type AddType, type Draft } from "@/lib/plan/types";

const TYPES: { key: AddType; label: string; sub: string }[] = [
  { key: "gcal", label: "Calendar", sub: "Google event" },
  { key: "appt", label: "Appointment", sub: "Other events" },
  { key: "reminder", label: "Reminder", sub: "At a set time" },
  { key: "task", label: "Task", sub: "Placed for you" },
];

const DURATIONS = [15, 30, 60] as const;

type Mode = "" | "type" | "voice";

export function AddBar({ onAdd }: { onAdd: (draft: Draft) => void }) {
  const [mode, setMode] = useState<Mode>("");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // The spec rules out the browser speech API inside a home-screen app, so the
  // composer plays the design's scripted transcript until Voxtral is wired up.
  function openVoice() {
    if (timer.current) clearInterval(timer.current);
    setMode("voice");
    setHeard("");
    setListening(true);
    let shown = 0;
    timer.current = setInterval(() => {
      shown += 2;
      setHeard(SAMPLE_TRANSCRIPT.slice(0, shown));
      if (shown >= SAMPLE_TRANSCRIPT.length) {
        if (timer.current) clearInterval(timer.current);
        setListening(false);
      }
    }, 55);
  }

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const close = () => {
    setMode("");
    setDraft(EMPTY_DRAFT);
    setHeard("");
  };

  const pillStyle = (on: boolean) =>
    on ? "border-mid bg-sky" : "border-sky bg-white";

  const hint =
    draft.type === "task"
      ? draft.day === "tomorrow"
        ? "Goes to tomorrow. I will place it in a free slot."
        : "I will place it in the next free slot today."
      : draft.type === "reminder"
        ? "You get a reminder at this time."
        : "Fixed in your day at this time.";

  return (
    <div className="sticky top-0 z-10 -mt-1.5 bg-white pt-1.5 pb-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("type")}
          className="min-h-[52px] flex-1 rounded-full bg-surface px-[18px] text-left text-[15px] text-muted"
        >
          Add appointment, reminder or task
        </button>
        <button
          type="button"
          onClick={openVoice}
          aria-label="Add by voice"
          className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-navy"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
            <path
              d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {mode === "type" ? (
        <div className="mt-2.5 flex flex-col gap-3.5 rounded-card border border-sky bg-white p-4 shadow-[0_8px_24px_rgba(36,58,99,0.08)]">
          <div role="group" aria-label="What kind" className="grid grid-cols-2 gap-2">
            {TYPES.map((type) => (
              <button
                key={type.key}
                type="button"
                aria-pressed={draft.type === type.key}
                onClick={() => set({ type: type.key })}
                className={`flex min-h-14 flex-col gap-0.5 rounded-2xl border px-3 py-2 text-left ${pillStyle(
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
              Creates the event in Google Calendar. My Day only ever adds new events, it never changes
              the ones already there.
            </p>
          ) : null}

          <label className="flex flex-col gap-1.5 text-xs text-muted">
            What
            <input
              type="text"
              value={draft.text}
              onChange={(event) => set({ text: event.target.value })}
              placeholder="For example: Dentist with Thiago"
              className="min-h-12 w-full rounded-[14px] border border-sky bg-surface px-3.5 text-base font-light text-navy"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {(["today", "tomorrow"] as const).map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={draft.day === day}
                onClick={() => set({ day })}
                className={`min-h-10 rounded-full border px-3.5 text-sm text-navy ${pillStyle(draft.day === day)}`}
              >
                {day === "today" ? "Today" : "Tomorrow"}
              </button>
            ))}

            {draft.type === "task" ? (
              DURATIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={draft.dur === minutes}
                  onClick={() => set({ dur: minutes })}
                  className={`min-h-10 rounded-full border px-3.5 text-sm text-navy ${pillStyle(draft.dur === minutes)}`}
                >
                  {minutes} min
                </button>
              ))
            ) : (
              <label className="flex items-center gap-2 text-xs text-muted">
                at
                <input
                  type="time"
                  value={draft.time}
                  onChange={(event) => set({ time: event.target.value })}
                  className="min-h-10 rounded-full border border-sky bg-surface px-3 text-[15px] text-navy"
                />
              </label>
            )}
          </div>

          <p className="text-xs text-muted">{hint}</p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onAdd(draft);
                close();
              }}
              className="min-h-12 flex-1 rounded-full bg-navy text-[15px] text-white"
            >
              Add to my day
            </button>
            <button
              type="button"
              onClick={close}
              className="min-h-12 rounded-full border border-sky px-[18px] text-[15px] text-navy"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {mode === "voice" ? (
        <div className="mt-2.5 flex flex-col gap-3 rounded-card border border-sky bg-white p-4 shadow-[0_8px_24px_rgba(36,58,99,0.08)]">
          <div className="flex items-center gap-2.5">
            <div aria-hidden="true" className="flex h-6 items-center gap-[3px]">
              {[10, 18, 24, 14, 8].map((height, index) => (
                <span
                  key={index}
                  className={listening ? "w-[3px] rounded-sm bg-mid motion-safe:animate-pulse" : "w-[3px] rounded-sm bg-mid"}
                  style={{ height, animationDelay: `${index * 0.15}s` }}
                />
              ))}
            </div>
            <span role="status" className="text-sm text-muted">
              {listening ? "Listening" : "Got it. Review before adding."}
            </span>
          </div>

          <p className="min-h-[58px] text-[22px] leading-snug font-light text-navy">{heard || "Speak now"}</p>
          <p className="text-xs leading-snug text-muted">
            Say what, when and what kind. For example: remind me to call the plumber tomorrow at 9.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(parseSpeech(heard || SAMPLE_TRANSCRIPT));
                setHeard("");
                setMode("type");
              }}
              className="min-h-12 flex-1 rounded-full bg-navy text-[15px] text-white"
            >
              Review and add
            </button>
            <button
              type="button"
              onClick={close}
              className="min-h-12 rounded-full border border-sky px-[18px] text-[15px] text-navy"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
