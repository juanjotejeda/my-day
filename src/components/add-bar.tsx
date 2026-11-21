"use client";

import { useEffect, useRef, useState } from "react";

import { parseInput } from "@/lib/parse/input";
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
  const [notice, setNotice] = useState("");
  const [parsed, setParsed] = useState<(Draft & { title?: string }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  // Recording happens here and goes to /api/voice, which transcribes it with
  // Voxtral. The browser speech API is not used: the spec rules it out inside a
  // home-screen app. The audio is never stored, here or on the server.
  async function openVoice() {
    setMode("voice");
    setHeard("");
    setNotice("");

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setNotice("This browser cannot record. Type it instead.");
      setListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        if (!chunks.length) return;

        setNotice("Writing it down");
        const audio = new Blob(chunks, { type: recorder.mimeType || "audio/mp4" });
        const body = new FormData();
        body.append("audio", audio, recorder.mimeType.includes("webm") ? "note.webm" : "note.mp4");

        try {
          const response = await fetch("/api/voice", { method: "POST", body });
          const result = (await response.json()) as {
            transcript?: string;
            draft?: Draft & { title?: string };
            error?: string;
          };
          if (!response.ok || !result.transcript) {
            setNotice(result.error ?? "That did not come through. Try again.");
            return;
          }
          setHeard(result.transcript);
          setNotice("");
          setParsed(result.draft ?? null);
        } catch {
          setNotice("That did not come through. Try again.");
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setListening(true);
      // 30 seconds is the limit, as the spec says.
      timer.current = setTimeout(() => stopRecording(), 30_000);
    } catch {
      setNotice("Microphone access was refused.");
      setListening(false);
    }
  }

  function stopRecording() {
    if (timer.current) clearTimeout(timer.current);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorderRef.current = null;
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    },
    [],
  );

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const close = () => {
    stopRecording();
    setMode("");
    setDraft(EMPTY_DRAFT);
    setHeard("");
    setNotice("");
    setParsed(null);
  };

  const pillStyle = (on: boolean) =>
    on ? "border-mid bg-sky" : "border-sky bg-card";

  const hint =
    draft.type === "task"
      ? draft.day === "tomorrow"
        ? "Goes to tomorrow. I will place it in a free slot."
        : "I will place it in the next free slot today."
      : draft.type === "reminder"
        ? "You get a reminder at this time."
        : "Fixed in your day at this time.";

  return (
    <div className="sticky top-0 z-10 -mt-1.5 bg-card pt-1.5 pb-2">
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
          className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-primary"
        >
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
        </button>
      </div>

      {mode === "type" ? (
        <div className="mt-2.5 flex flex-col gap-3.5 rounded-card border border-sky bg-card p-4 shadow-[var(--shadow-card)]">
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
              className="min-h-12 flex-1 rounded-full bg-primary text-[15px] text-on-primary"
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
        <div className="mt-2.5 flex flex-col gap-3 rounded-card border border-sky bg-card p-4 shadow-[var(--shadow-card)]">
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
              {listening ? "Listening, tap stop when you are done" : notice || "Got it. Review before adding."}
            </span>
          </div>

          <p className="min-h-[58px] text-[22px] leading-snug font-light text-navy">
            {heard || (listening ? "Speak now" : notice || "Tap the microphone to start")}
          </p>
          <p className="text-xs leading-snug text-muted">
            Say what, when and what kind. For example: remind me to call the plumber tomorrow at 9.
          </p>

          <div className="flex gap-2">
            {listening ? (
              <button
                type="button"
                onClick={stopRecording}
                className="min-h-12 flex-1 rounded-full bg-primary text-[15px] text-on-primary"
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                disabled={!heard}
                onClick={() => {
                  const read = parsed ?? parseInput(heard);
                  setDraft({
                    type: (read.type ?? "task") as AddType,
                    text: (parsed?.title ?? parseInput(heard).title) || heard,
                    time: read.time ?? "",
                    day: (read.day ?? "today") as Draft["day"],
                    dur: ((read as { dur?: number }).dur ?? 30) as Draft["dur"],
                  });
                  setHeard("");
                  setParsed(null);
                  setMode("type");
                }}
                className="min-h-12 flex-1 rounded-full bg-primary text-[15px] text-on-primary disabled:opacity-40"
              >
                Review and add
              </button>
            )}
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
