import type { ParsedEffort, ParsedInput } from "@/lib/parse/input";

/**
 * What the composer holds, by type. An appointment has a date, a start, an end,
 * an all-day switch and a place; a reminder has a date and a time; a task has a
 * duration and either Automatic or a date and time Juan sets himself.
 */
export type DraftType = "gcal" | "appt" | "reminder" | "task";

export type ComposerDraft = {
  type: DraftType;
  text: string;
  /** ISO date. */
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  dur: number;
  /** Tasks only: the scheduler places it. */
  auto: boolean;
  /** What kind of work it is, which decides where the scheduler puts it. */
  effort: ParsedEffort;
};

export const DURATIONS = [15, 30, 60, 120] as const;
const DEFAULT_LENGTH_MIN = 60;

function hhmm(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

function minutesOf(time: string): number {
  const [hours, minutes] = (time || "0:0").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * The next full hour, or the last quarter hour of the day when a full hour
 * would fall on tomorrow: a time on the wrong day is worse than an odd one.
 */
export function nextFullHour(now: Date, timeZone = process.env.TZ || "Europe/Berlin"): string {
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const minutes = minutesOf(local);
  const next = (Math.floor(minutes / 60) + 1) * 60;
  // 23:45 rather than midnight, which would land on the wrong day.
  return hhmm(next >= 1440 ? 1425 : next);
}

export function draftDefaults(type: DraftType, now: Date, today: string): ComposerDraft {
  const start = type === "task" ? "" : nextFullHour(now);
  return {
    type,
    text: "",
    date: today,
    startTime: start,
    endTime: type === "appt" || type === "gcal" ? hhmm(minutesOf(start) + DEFAULT_LENGTH_MIN) : "",
    allDay: false,
    location: "",
    dur: 30,
    auto: true,
    effort: type === "task" ? "light" : "meeting",
  };
}

/** The fields a typed or spoken line already answered. */
export function draftFromParsed(parsed: ParsedInput, now: Date): ComposerDraft {
  const today = parsed.date ?? new Date().toISOString().slice(0, 10);
  const base = draftDefaults(parsed.type, now, today);
  const auto = parsed.type === "task" ? (parsed.auto ?? !parsed.time) : true;
  const startTime = parsed.time || (parsed.type === "task" ? "" : base.startTime);

  return {
    ...base,
    text: parsed.title,
    date: parsed.date ?? base.date,
    startTime,
    endTime:
      parsed.type === "appt" || parsed.type === "gcal"
        ? hhmm(minutesOf(startTime || base.startTime) + (parsed.dur || DEFAULT_LENGTH_MIN))
        : "",
    dur: parsed.dur || base.dur,
    auto,
    effort: parsed.effort,
  };
}

/** What is still missing, in words, or nothing when the draft can be saved. */
export function draftProblem(draft: ComposerDraft): string | null {
  if (!draft.text.trim()) return "Type or say what to add first.";

  if (draft.type === "task") {
    if (!draft.auto && !draft.startTime) return "Set a time, or switch back to Automatic.";
    return null;
  }

  if (draft.allDay) return null;
  if (!draft.startTime) {
    return draft.type === "reminder" ? "A reminder needs a time." : "An appointment needs a start time.";
  }
  if (draft.endTime && minutesOf(draft.endTime) <= minutesOf(draft.startTime)) {
    return "The end is before the start.";
  }
  return null;
}

/** How long an item lasts, in minutes. */
export function draftLength(draft: ComposerDraft): number {
  if (draft.type === "reminder") return 10;
  if (draft.type === "task") return draft.dur;
  if (draft.endTime && draft.startTime) {
    const span = minutesOf(draft.endTime) - minutesOf(draft.startTime);
    return span > 0 ? span : DEFAULT_LENGTH_MIN;
  }
  return DEFAULT_LENGTH_MIN;
}
