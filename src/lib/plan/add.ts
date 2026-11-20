import type { Prisma } from "@/generated/prisma/client";
import { parseWithMistral } from "@/lib/ai/parse";
import { TIMEZONE, dayDate, dayKey, hhmm } from "@/lib/day";
import { createCalendarEvent, deleteCalendarEvent, isMyDayEvent } from "@/lib/google/calendar-write";
import type { ParsedInput } from "@/lib/parse/input";
import { CALENDAR_REFUSAL, deleteDecision } from "@/lib/plan/deletable";
import { runPlan } from "@/lib/plan/run";
import { prisma } from "@/lib/prisma";

/**
 * Adding items and writing corrections, with the day re-planned after each one.
 * The server actions in app/actions.ts and the /api/add route both call these.
 */

function dayFor(which: "today" | "tomorrow", now = new Date()): Date {
  const when = which === "today" ? now : new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return dayDate(dayKey(when));
}

/** A wall-clock time on a day, as an instant. */
function at(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const key = dayKey(day, "UTC");
  const noon = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    hour12: false,
  }).format(new Date(`${key}T12:00:00Z`));
  const offset = Number(noon) * 60 - 12 * 60;
  return new Date(Date.parse(`${key}T00:00:00Z`) + (hours * 60 + minutes - offset) * 60_000);
}

export type AddResult = { ok: boolean; message: string };

/** Reads a line with the parser, stores the item, then re-plans the day. */
export async function addFromText(userId: string, said: string): Promise<AddResult> {
  const draft = await parseWithMistral(said, { today: dayKey(new Date()), timezone: TIMEZONE });
  // A line of text never writes to Google Calendar: that needs the Calendar
  // button in the composer, so an event is always something Juan chose.
  return addDraft(userId, draft.type === "gcal" ? { ...draft, type: "appt" } : draft);
}

/** Stores one draft from the composer and re-plans the day. */
export async function addDraft(userId: string, draft: ParsedInput): Promise<AddResult> {
  const title = draft.title.trim();
  if (!title) return { ok: false, message: "Type or say what to add first." };

  const day = dayFor(draft.day);
  const timed = draft.type !== "task";
  if (timed && !draft.time) {
    return { ok: false, message: `Add a time for this ${draft.type === "reminder" ? "reminder" : "appointment"}.` };
  }

  const start = timed ? at(day, draft.time) : null;
  const lengthMin = draft.type === "reminder" ? 10 : draft.type === "task" ? draft.dur : 60;
  const end = start ? new Date(start.getTime() + lengthMin * 60_000) : null;

  let sourceRef: string | null = null;
  let sourceUrl: string | null = null;
  let calendarNote = "";

  if (draft.type === "gcal" && start && end) {
    const created = await createCalendarEvent(userId, { title, start, end });
    if (created.ok) {
      sourceRef = created.sourceRef;
      sourceUrl = created.htmlLink;
      calendarNote = " It is in your Google Calendar.";
    } else {
      calendarNote = ` It is in My Day only: ${created.error}`;
    }
  }

  const item = await prisma.item.create({
    data: {
      userId: userId,
      type: draft.type === "gcal" ? "calendar" : draft.type === "appt" ? "appointment" : draft.type,
      title,
      start,
      end,
      fixed: timed,
      flexibleDuration: timed ? null : draft.dur,
      rank: timed ? "must" : "should",
      category: draft.effort === "errand" ? "personal" : "work",
      effort: draft.effort,
      day,
      sourceKind: draft.type === "gcal" ? "calendar" : "manual",
      createdHere: true,
      sourceRef,
      sourceUrl,
      reason: timed ? "You added this at a fixed time." : "Task you added.",
    },
  });

  const run = await runPlan(userId, day);

  if (timed) {
    return {
      ok: true,
      message: `${draft.type === "reminder" ? "Reminder" : draft.type === "gcal" ? "Event" : "Appointment"} added for ${
        draft.day === "tomorrow" ? "tomorrow" : "today"
      } at ${draft.time}.${calendarNote}`,
    };
  }

  const placed = run.reasonFor(item.id);
  if (placed?.start) {
    return { ok: true, message: `Task added at ${hhmm(placed.start)}. ${placed.reason}` };
  }
  return { ok: true, message: `Task added to Later. ${placed?.reason ?? "No free slot today."}` };
}

export type CorrectionKind = "tomorrow" | "important" | "more_time" | "category" | "done";

/** Every adjust-sheet action: writes a correction, changes the item, re-plans. */
export async function applyCorrection(userId: string, itemId: string, kind: CorrectionKind): Promise<AddResult> {
  const item = await prisma.item.findFirst({ where: { id: itemId, userId: userId } });
  if (!item) return { ok: false, message: "That item is gone." };

  const before: Record<string, unknown> = {
    day: item.day,
    important: item.important,
    flexibleDuration: item.flexibleDuration,
    category: item.category,
    status: item.status,
  };
  const data: Record<string, unknown> = {};
  let message = "";

  if (kind === "tomorrow") {
    if (item.sourceKind === "calendar") {
      return { ok: false, message: "Calendar events are read-only here. Move it in Google Calendar." };
    }
    data.day = dayFor("tomorrow");
    data.start = null;
    data.end = null;
    data.status = "moved";
    message = "Moved to tomorrow. I will remember this for similar items.";
  }

  if (kind === "important") {
    data.important = !item.important;
    if (!item.important) data.rank = "must";
    message = item.important
      ? "Back to normal priority."
      : "Marked as important. Similar items rank higher from now on.";
  }

  if (kind === "more_time") {
    if (item.fixed || !item.flexibleDuration) {
      return { ok: false, message: "This item has no flexible duration." };
    }
    data.flexibleDuration = item.flexibleDuration + 30;
    message = "Added 30 minutes. I will plan more time for tasks like this.";
  }

  if (kind === "category") {
    data.category = item.category === "personal" ? "work" : "personal";
    message = data.category === "personal" ? "Saved as a personal commitment." : "Saved as a work task.";
  }

  if (kind === "done") {
    data.status = item.status === "done" ? "planned" : "done";
    message = data.status === "done" ? "Done." : "Back on your list.";
  }

  const updated = await prisma.item.update({ where: { id: item.id }, data });

  await prisma.correction.create({
    data: {
      userId: userId,
      itemId: item.id,
      kind: kind === "more_time" ? "more_time" : kind === "category" ? "category" : kind,
      before: before as Prisma.InputJsonValue,
      after: {
        day: updated.day,
        important: updated.important,
        flexibleDuration: updated.flexibleDuration,
        category: updated.category,
        status: updated.status,
      },
    },
  });

  // Re-plan the day it left and the day it landed on.
  const days = new Set([item.day?.toISOString(), updated.day?.toISOString()].filter(Boolean) as string[]);
  for (const day of days) await runPlan(userId, new Date(day));

  return { ok: true, message };
}

/** Re-runs the plan for today, after a settings change or on demand. */
export async function replanToday(userId: string): Promise<AddResult> {
  const run = await runPlan(userId, dayFor("today"));
  return {
    ok: true,
    message: run.later
      ? `Plan updated. ${run.placed} placed, ${run.later} moved to Later.`
      : `Plan updated. ${run.placed} placed.`,
  };
}

export type DeleteResult = AddResult & { deletable?: boolean };

/**
 * Deletes an item My Day created: a task, a reminder, or an event it inserted
 * into Google Calendar, which is removed there too. Anything that came from
 * somewhere else stays put, and says where to delete it.
 */
export async function deleteItem(userId: string, itemId: string): Promise<DeleteResult> {
  const item = await prisma.item.findFirst({ where: { id: itemId, userId } });
  if (!item) return { ok: false, message: "That item is gone already." };

  const decision = deleteDecision({ sourceKind: item.sourceKind, createdHere: item.createdHere });

  if (decision.kind === "refuse") {
    return { ok: false, deletable: false, message: decision.message };
  }

  // An event created before the marker was stored locally still carries it in Google.
  const ownsEvent =
    decision.kind === "delete"
      ? decision.inGoogle
      : Boolean(item.sourceRef) && (await isMyDayEvent(userId, item.sourceRef as string));

  if (decision.kind === "ask-google" && !ownsEvent) {
    return { ok: false, deletable: false, message: CALENDAR_REFUSAL };
  }

  if (ownsEvent && item.sourceRef) {
    const removed = await deleteCalendarEvent(userId, item.sourceRef);
    if (!removed.ok) {
      return { ok: false, deletable: true, message: `Google would not delete it: ${removed.error}` };
    }
  }

  await prisma.correction.create({
    data: {
      userId,
      kind: "dismissed",
      before: {
        title: item.title,
        day: item.day,
        start: item.start,
        sourceKind: item.sourceKind,
        deletedFromGoogle: ownsEvent,
      } as Prisma.InputJsonValue,
    },
  });

  await prisma.item.delete({ where: { id: item.id } });
  if (item.day) await runPlan(userId, item.day);

  return {
    ok: true,
    deletable: true,
    message: ownsEvent ? "Deleted here and in Google Calendar." : "Deleted.",
  };
}
