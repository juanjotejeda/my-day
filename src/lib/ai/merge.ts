import type { ParsedEffort, ParsedInput, ParsedType } from "@/lib/parse/input";

/**
 * What the model read, laid over what the parser read. The model decides the
 * structure: it sees the whole sentence, and Juan confirms or changes every
 * field in the composer before anything is saved. Each field is still checked,
 * so a value the model invents in the wrong shape cannot break a screen, and
 * anything it leaves out falls back to the deterministic parser.
 */
export type ModelFields = {
  type?: ParsedType;
  title?: string;
  day?: "today" | "tomorrow";
  time?: string;
  duration_min?: number;
  effort?: ParsedEffort;
  /** The model may answer a date instead of a day. */
  due?: string | null;
  start?: string | null;
};

const TYPES: ParsedType[] = ["gcal", "appt", "reminder", "task"];
const EFFORTS: ParsedEffort[] = ["deep", "light", "meeting", "errand"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function mergeParsed(model: ModelFields, fallback: ParsedInput): ParsedInput {
  const type = model.type && TYPES.includes(model.type) ? model.type : fallback.type;
  const time = model.time && TIME.test(model.time) ? model.time : fallback.time;
  const effort = model.effort && EFFORTS.includes(model.effort) ? model.effort : fallback.effort;
  const duration =
    typeof model.duration_min === "number" && model.duration_min >= 5 && model.duration_min <= 480
      ? Math.round(model.duration_min)
      : fallback.dur;

  const fromStart = model.start && !Number.isNaN(Date.parse(model.start))
    ? new Date(model.start).toISOString().slice(0, 10)
    : null;
  const fromDue = model.due && DATE.test(model.due.slice(0, 10)) ? model.due.slice(0, 10) : null;
  const date = fromStart ?? fromDue ?? fallback.date;

  // A reminder or an appointment with no time cannot be placed: it is a task.
  const coherent = time === "" && type !== "task" ? "task" : type;

  return {
    type: coherent,
    title: model.title?.trim() || fallback.title,
    day: model.day === "today" || model.day === "tomorrow" ? model.day : fallback.day,
    date,
    time,
    dur: duration,
    effort,
    // A task with a time is one Juan placed himself.
    auto: coherent === "task" ? !time : false,
  };
}
