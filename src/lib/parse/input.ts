import { readWhen } from "./when.ts";

/**
 * Reads a typed or spoken line into a draft. Deterministic and instant, so the
 * add bar never waits for a model; the Mistral parse in lib/ai/parse.ts takes
 * over for transcripts this cannot make sense of.
 */
export type ParsedType = "gcal" | "appt" | "reminder" | "task";
export type ParsedEffort = "deep" | "light" | "meeting" | "errand";

export type ParsedInput = {
  type: ParsedType;
  title: string;
  /** Kept for the composer's Today and Tomorrow pills. */
  day: "today" | "tomorrow";
  /** The day as an ISO date: a weekday or a date lands here too. */
  date?: string;
  /** "HH:MM", or empty when no time was said. */
  time: string;
  dur: number;
  effort: ParsedEffort;
  /** False when a time was given for a task: it goes exactly there. */
  auto?: boolean;
};

const FILLER =
  /^\s*(please\s+)?(i\s+need\s+to|i\s+have\s+to|i\s+must|add\s+a\s+calendar\s+event\s*:?|add\s+a\s+task\s+to|add\s+a\s+task|add\s+an?\s+event\s*:?|remind\s+me\s+to|remind\s+me|note\s+to\s+self\s*:?|todo\s*:?|add)(\s+|$)/i;

const DURATION_PATTERNS: [RegExp, (match: RegExpMatchArray) => number][] = [
  [/\bfor\s+(\d{1,3})\s*(?:minutes|minute|mins|min|m)\b/i, (m) => Number(m[1])],
  [/[,.]?\s*(\d{1,3})\s*(?:minutes|minute|mins|min)\b/i, (m) => Number(m[1])],
  [/\bfor\s+(\d{1,2})\s*(?:hours|hour|hrs|hr|h)\b/i, (m) => Number(m[1]) * 60],
  [/\b(\d{1,2})\s*(?:hours|hour|hrs|hr)\b/i, (m) => Number(m[1]) * 60],
  [/\bhalf\s+an?\s+hour\b/i, () => 30],
];

const TIME_PATTERN = /\bat\s+(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\b/i;
const ON_WORD = /\s*\bon\s*$/i;

const MEETING_WORDS =
  /\b(meeting|call|standup|stand-up|interview|1:1|one on one|sync|catch up|coffee with|lunch with|dinner with|drinks with)\b/i;
const APPOINTMENT_WORDS =
  /\b(dentist|doctor|appointment|haircut|physio|therapist|school|parents evening|viewing)\b/i;
const DEEP_WORDS = /\b(write|draft|design|proposal|deck|plan|strategy|architecture|deep work|prepare|review)\b/i;
const ERRAND_WORDS = /\b(pick up|collect|buy|post|drop off|shop|groceries|bank|pharmacy)\b/i;
const LIGHT_WORDS = /\b(reply|answer|email|invoice|admin|expenses|book|confirm|send|check|call back|quick)\b/i;

function cleanTitle(text: string, when?: string): string {
  let title = text.trim();
  if (when) {
    title = title.replace(when, " ");
    // "Write the proposal on Monday" should not leave a dangling "on".
    title = title.replace(ON_WORD, "");
  }
  title = title.replace(FILLER, "");
  title = title.replace(TIME_PATTERN, " ");
  for (const [pattern] of DURATION_PATTERNS) title = title.replace(pattern, " ");
  title = title
    .replace(/\b(today|tomorrow|tmr|tmrw)\b/gi, " ")
    .replace(/\s*[,;:]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!title) return "";
  // Only the first letter is touched, so names keep their capitals.
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function readTime(text: string): string {
  const match = text.match(TIME_PATTERN);
  if (!match) return "";

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const suffix = match[3]?.toLowerCase();

  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  // A bare "at 7" means the evening; "at 08:30" is already unambiguous.
  if (!suffix && hour >= 1 && hour <= 7) hour += 12;
  if (hour > 23 || minute > 59) return "";

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function readDuration(text: string): number | null {
  for (const [pattern, read] of DURATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) return read(match);
  }
  if (/\bquick\b/i.test(text)) return 15;
  return null;
}

function readType(text: string, hasTime: boolean): ParsedType {
  if (/\b(calendar event|calendar|in my calendar|google calendar)\b/i.test(text)) return "gcal";
  if (/\bremind(er)?\b/i.test(text)) return "reminder";
  if (MEETING_WORDS.test(text) || APPOINTMENT_WORDS.test(text)) return "appt";
  if (hasTime) return "appt";
  return "task";
}

function readEffort(text: string, type: ParsedType): ParsedEffort {
  if (MEETING_WORDS.test(text)) return "meeting";
  if (ERRAND_WORDS.test(text)) return "errand";
  if (DEEP_WORDS.test(text) && !LIGHT_WORDS.test(text)) return "deep";
  if (LIGHT_WORDS.test(text)) return "light";
  return type === "appt" || type === "gcal" ? "meeting" : "light";
}

export function parseInput(said: string, today?: string): ParsedInput {
  const text = (said ?? "").trim();
  const time = readTime(text);
  const type = readType(text, Boolean(time));
  const reference = today ?? new Date().toISOString().slice(0, 10);
  const when = readWhen(text, reference);

  const tomorrow = new Date(Date.parse(`${reference}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

  return {
    type,
    title: cleanTitle(text, when?.matched),
    day: when?.date === tomorrow ? "tomorrow" : "today",
    date: when?.date ?? reference,
    time,
    dur: readDuration(text) ?? 30,
    effort: readEffort(text, type),
    // A task with a time is a task Juan placed himself.
    auto: type === "task" ? !time : false,
  };
}
