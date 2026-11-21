"use client";

import { useEffect, useRef, useState } from "react";

import { Composer } from "@/components/composer";
import { draftDefaults, draftFromParsed, type ComposerDraft } from "@/lib/plan/draft";
import { parseInput } from "@/lib/parse/input";

type Mode = "" | "type" | "voice";

/**
 * The add bar: an outlined button that opens the composer, and a microphone
 * that records a note. Both end in the same review before anything is saved.
 */
export function AddBar({
  onAdd,
  today,
  tomorrow,
  busy,
}: {
  onAdd: (draft: ComposerDraft) => void;
  today: string;
  tomorrow: string;
  busy?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("");
  const [draft, setDraft] = useState<ComposerDraft>(() => draftDefaults("task", new Date(), today));
  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  function openComposer(type: ComposerDraft["type"] = "task") {
    setDraft(draftDefaults(type, new Date(), today));
    setMode("type");
  }

  function close() {
    stopRecording();
    setMode("");
    setHeard("");
    setNotice("");
  }

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
            draft?: Parameters<typeof draftFromParsed>[0];
            error?: string;
          };
          if (!response.ok || !result.transcript) {
            setNotice(result.error ?? "That did not come through. Try again.");
            return;
          }
          setHeard(result.transcript);
          setNotice("");
          // The fields arrive filled in; Juan confirms before it is saved.
          setDraft(draftFromParsed(result.draft ?? parseInput(result.transcript), new Date()));
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

  return (
    <div className="sticky top-0 z-10 -mt-1.5 bg-bg pt-1.5 pb-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => openComposer()}
          className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full border border-mid bg-card px-[18px] text-[15px] text-navy"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 2.5v11M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Add appointment, reminder or task
        </button>
        <button
          type="button"
          onClick={openVoice}
          aria-label="Add by voice"
          className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-primary text-on-primary"
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
        <Composer
          draft={draft}
          today={today}
          tomorrow={tomorrow}
          busy={busy}
          onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          onAdd={() => {
            onAdd(draft);
            close();
          }}
          onCancel={close}
        />
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
              {listening ? "Listening, tap stop when you are done" : notice || "Got it. Check it before adding."}
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
                  setHeard("");
                  setMode("type");
                }}
                className="min-h-12 flex-1 rounded-full bg-primary text-[15px] text-on-primary disabled:opacity-40"
              >
                Check and add
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
