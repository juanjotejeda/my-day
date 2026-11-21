import type { Prisma } from "@/generated/prisma/client";
import { parseWithMistral } from "@/lib/ai/parse";
import { TIMEZONE, dayDate, dayKey, hhmm, minutesOfDay } from "@/lib/day";
import { createCalendarEvent, deleteCalendarEvent, isMyDayEvent } from "@/lib/google/calendar-write";
import type { ParsedInput } from "@/lib/parse/input";
import {
  draftFromParsed,
  draftLength,
  draftProblem,
  type ComposerDraft,
} from "@/lib/plan/draft";
import { deleteDecision } from "@/lib/plan/deletable";
import { refreshSuggestions } from "@/lib/rules/store";
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

/** The person an item came from, where that is known from its source line. */
function senderOf(sourceUrl: string | null, reason: string | null): string | null {
  const fromEmail = reason?.match(/from ([^<>\s]+@[^<>\s]+)/i)?.[1];
  if (fromEmail) return fromEmail.replace(/[.,]$/, "");
  const named = reason?.match(/from (?:an email from )?([A-Z][\w'-]+(?: [A-Z][\w'-]+)?)/)?.[1];
  return named ?? null;
}

/** today, tomorrow, or the weekday and date, for a toast. */
function dayWord(day: Date, now = new Date()): string {
  const key = dayKey(day, "UTC");
  if (key === dayKey(now)) return "today";
  if (key === dayKey(new Date(now.getTime() + 86_400_000))) return "tomorrow";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(day);
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
  // This path saves without a composer, so it never creates a Google Calendar
  // event off a reading: that needs the Calendar type chosen by hand.
  return addDraft(userId, draft.type === "gcal" ? { ...draft, type: "appt" } : draft);
}

/** Stores one draft from the composer and re-plans the day. */
export async function addDraft(userId: string, draft: ParsedInput | ComposerDraft): Promise<AddResult> {
  const composed: ComposerDraft =
    "startTime" in draft ? draft : draftFromParsed(draft, new Date());

  const title = composed.text.trim();
  if (!title) return { ok: false, message: "Type or say what to add first." };

  const problem = draftProblem(composed);
  if (problem) return { ok: false, message: problem };

  const day = dayDate(composed.date);
  const auto = composed.type === "task" && composed.auto;
  const allDay = (composed.type === "appt" || composed.type === "gcal") && composed.allDay;
  // A task Juan gave a time to is pinned: the scheduler leaves it alone.
  const pinned = composed.type === "task" && !composed.auto;

  const start = auto || allDay ? null : at(day, composed.startTime);
  const end = start ? new Date(start.getTime() + draftLength(composed) * 60_000) : null;

  let sourceRef: string | null = null;
  let sourceUrl: string | null = null;
  let calendarNote = "";

  if (composed.type === "gcal" && start && end) {
    const created = await createCalendarEvent(userId, {
      title,
      start,
      end,
      location: composed.location || undefined,
    });
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
      userId,
      type: composed.type === "gcal" ? "calendar" : composed.type === "appt" ? "appointment" : composed.type,
      title,
      start,
      end,
      allDay,
      fixed: !auto,
      pinned,
      location: composed.location || null,
      flexibleDuration: auto ? composed.dur : null,
      rank: composed.type === "task" ? "should" : "must",
      category: composed.effort === "errand" ? "personal" : composed.type === "task" ? "work" : "personal",
      effort: composed.effort,
      day,
      sourceKind: composed.type === "gcal" ? "calendar" : "manual",
      sourceRef,
      sourceUrl,
      createdHere: true,
      reason: pinned
        ? "At the time you chose."
        : allDay
          ? "A day you blocked out."
          : auto
            ? "Task you added."
            : "You added this at a fixed time.",
    },
  });

  const run = await runPlan(userId, day);
  const whenWord = dayWord(day);

  if (allDay) return { ok: true, message: `Added as a day banner for ${whenWord}.${calendarNote}` };

  if (!auto) {
    const kindWord =
      composed.type === "reminder" ? "Reminder" : composed.type === "task" ? "Task" : "Appointment";
    return {
      ok: true,
      message: `${kindWord} added for ${whenWord} at ${composed.startTime}.${calendarNote}`,
    };
  }

  const placed = run.reasonFor(item.id);
  if (placed?.start) {
    const where = whenWord === "today" ? "" : ` ${whenWord}`;
    return { ok: true, message: `Task added${where} at ${hhmm(placed.start)}. ${placed.reason}` };
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
    // What the suggestion engine groups by.
    context: {
      effort: item.effort,
      sourceKind: item.sourceKind,
      category: item.category,
      sender: senderOf(item.sourceUrl, item.reason),
    },
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

  await refreshSuggestions(userId);

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
 * Takes an item out of the day. An event My Day put in Google Calendar is
 * removed there too; an event from your own calendar stays in Google and only
 * leaves My Day, which the next sync respects because the row stays archived.
 */
export async function deleteItem(userId: string, itemId: string): Promise<DeleteResult> {
  const item = await prisma.item.findFirst({ where: { id: itemId, userId } });
  if (!item) return { ok: false, message: "That item is gone already." };

  const decision = deleteDecision({ sourceKind: item.sourceKind, createdHere: item.createdHere });

  // An event created before the marker was stored locally still carries it in Google.
  const ownsEvent =
    decision.kind === "delete"
      ? decision.inGoogle
      : Boolean(item.sourceRef) && (await isMyDayEvent(userId, item.sourceRef as string));

  if (ownsEvent && item.sourceRef) {
    const removed = await deleteCalendarEvent(userId, item.sourceRef);
    if (!removed.ok) {
      return { ok: false, deletable: true, message: `Google would not delete it: ${removed.error}` };
    }
  }

  await prisma.correction.create({
    data: {
      userId,
      itemId: item.id,
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

  // Deleted, not gone: the Archive keeps it for the retention window.
  await prisma.item.update({
    where: { id: item.id },
    data: { archivedAt: new Date(), status: "dropped", start: null, end: null },
  });
  if (item.day) await runPlan(userId, item.day);

  return {
    ok: true,
    deletable: true,
    message: ownsEvent
      ? "Deleted here and in Google Calendar. It is in the Archive for 30 days."
      : item.sourceKind === "calendar"
        ? "Removed from your day. The event stays in Google Calendar, and it is in the Archive for 30 days."
        : "Deleted. It is in the Archive for 30 days.",
  };
}

/** Everything in the Archive, newest first, with the days it has left. */
export async function loadArchive(userId: string, retentionDays: number, now = new Date()) {
  const items = await prisma.item.findMany({
    where: { userId, archivedAt: { not: null } },
    orderBy: { archivedAt: "desc" },
  });

  return items.map((item) => {
    const archivedAt = item.archivedAt as Date;
    const daysKept = Math.floor((now.getTime() - archivedAt.getTime()) / 86_400_000);
    return {
      id: item.id,
      title: item.title,
      archivedAt,
      daysLeft: Math.max(0, retentionDays - daysKept),
      kind: item.type,
      source: item.sourceKind,
      wasCalendarEvent: item.sourceKind === "calendar" && item.createdHere,
      day: item.day,
    };
  });
}

/** Puts an archived item back, and recreates the Google event if it had one. */
export async function restoreItem(userId: string, itemId: string): Promise<AddResult> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, userId, archivedAt: { not: null } },
  });
  if (!item) return { ok: false, message: "That item is not in the Archive." };

  let note = "";
  let sourceRef = item.sourceRef;
  let sourceUrl = item.sourceUrl;

  if (item.sourceKind === "calendar" && item.createdHere) {
    // The event was deleted in Google, so restoring means creating it again.
    const day = item.day ?? dayFor("today");
    const start = item.start ?? at(day, "09:00");
    const end = item.end ?? new Date(start.getTime() + 60 * 60_000);
    const created = await createCalendarEvent(userId, { title: item.title, start, end });
    if (created.ok) {
      sourceRef = created.sourceRef;
      sourceUrl = created.htmlLink;
      note = " The event is back in your Google Calendar.";
    } else {
      note = ` It is in My Day only: ${created.error}`;
    }
  }

  await prisma.item.update({
    where: { id: item.id },
    data: { archivedAt: null, status: "planned", sourceRef, sourceUrl },
  });

  await prisma.correction.create({
    data: {
      userId,
      itemId: item.id,
      kind: "dismissed",
      after: { restored: true, title: item.title } as Prisma.InputJsonValue,
    },
  });

  if (item.day) await runPlan(userId, item.day);
  return { ok: true, message: `Restored.${note}` };
}

/** The end-of-day rating and its note are the experiment's record. */
export const REVIEW_RETENTION_DAYS = 365;

/**
 * Removes what has outstayed its window, as the privacy page promises: the
 * archive, quotes and correction history after the retention setting, the
 * end-of-day ratings and notes after a year.
 */
export async function purgeArchive(userId: string, retentionDays: number, now = new Date()) {
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000);
  const yearAgo = new Date(now.getTime() - REVIEW_RETENTION_DAYS * 86_400_000);

  const [archived, quotes, corrections, logs, reviews] = await prisma.$transaction([
    prisma.item.deleteMany({ where: { userId, archivedAt: { lt: cutoff } } }),
    // The link back to Gmail stays; only the quoted line goes.
    prisma.item.updateMany({
      where: { userId, sourceQuote: { not: null }, createdAt: { lt: cutoff } },
      data: { sourceQuote: null },
    }),
    prisma.correction.deleteMany({ where: { userId, createdAt: { lt: cutoff } } }),
    prisma.eventLog.deleteMany({ where: { userId, createdAt: { lt: cutoff } } }),
    prisma.dayReview.deleteMany({ where: { userId, date: { lt: yearAgo } } }),
  ]);

  return archived.count + quotes.count + corrections.count + logs.count + reviews.count;
}

/**
 * Puts an item at a time Juan chose, and pins it: the scheduler never moves it
 * again. Every move writes a moved_time correction, with the hour it went to,
 * so the rules can learn when he likes this kind of work.
 */
export async function moveItem(
  userId: string,
  itemId: string,
  when: { date: string; time: string; allDay?: boolean },
): Promise<AddResult> {
  const item = await prisma.item.findFirst({ where: { id: itemId, userId } });
  if (!item) return { ok: false, message: "That item is gone." };
  if (item.sourceKind === "calendar" && !item.createdHere) {
    return { ok: false, message: "This event came from your calendar. Move it in Google Calendar." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(when.date)) return { ok: false, message: "That date did not read." };
  if (!when.allDay && !/^\d{2}:\d{2}$/.test(when.time)) {
    return { ok: false, message: "That time did not read." };
  }

  const day = dayDate(when.date);
  const minutes =
    item.start && item.end ? (item.end.getTime() - item.start.getTime()) / 60_000 : (item.flexibleDuration ?? 30);
  const start = when.allDay ? null : at(day, when.time);
  const end = start ? new Date(start.getTime() + minutes * 60_000) : null;

  const updated = await prisma.item.update({
    where: { id: item.id },
    data: {
      day,
      start,
      end,
      allDay: Boolean(when.allDay),
      pinned: true,
      status: item.status === "done" ? "done" : "planned",
      reason: when.allDay ? "A day you blocked out." : "At the time you chose.",
    },
  });

  await prisma.correction.create({
    data: {
      userId,
      itemId: item.id,
      kind: "moved_time",
      before: {
        day: item.day,
        start: item.start,
        context: {
          effort: item.effort,
          sourceKind: item.sourceKind,
          category: item.category,
          hour: item.start ? Math.floor(minutesOfDay(item.start) / 60) : null,
        },
      } as Prisma.InputJsonValue,
      after: {
        day: updated.day,
        start: updated.start,
        hour: start ? Math.floor(minutesOfDay(start) / 60) : null,
      } as Prisma.InputJsonValue,
    },
  });

  await refreshSuggestions(userId);
  for (const date of new Set([item.day?.toISOString(), day.toISOString()].filter(Boolean) as string[])) {
    await runPlan(userId, new Date(date));
  }

  const whenWord = dayWord(day);
  return {
    ok: true,
    message: when.allDay
      ? `Moved to ${whenWord}, all day. Pinned, so nothing moves it.`
      : `Moved to ${whenWord} at ${when.time}. Pinned, so nothing moves it.`,
  };
}

/** Lets the scheduler place it again. */
/**
 * The detail screen's edits: the title, the length, and the day or time. A day
 * or time you choose is a move, so it pins the item the way the sheet does.
 */
export async function editItem(
  userId: string,
  itemId: string,
  fields: { title?: string; date?: string; time?: string; minutes?: number },
): Promise<AddResult> {
  const item = await prisma.item.findFirst({ where: { id: itemId, userId } });
  if (!item) return { ok: false, message: "That item is gone." };
  // The name is My Day's own words for it; when it happens is Google's.
  const calendarOnly = item.sourceKind === "calendar" && !item.createdHere;
  if (calendarOnly && (fields.date || fields.time || fields.minutes !== undefined)) {
    return { ok: false, message: "This event came from your calendar. Move it in Google Calendar." };
  }

  const title = fields.title?.trim();
  if (fields.title !== undefined && !title) return { ok: false, message: "It needs a name." };
  const minutes = fields.minutes;
  if (minutes !== undefined && (!Number.isFinite(minutes) || minutes < 5 || minutes > 600)) {
    return { ok: false, message: "A length between 5 and 600 minutes." };
  }

  const patch: Prisma.ItemUpdateInput = {};
  if (title) patch.title = title.slice(0, 200);
  if (minutes !== undefined) {
    // A placed item keeps its start and ends later; an unplaced one just says
    // how long it needs. Either way the move below reads the new length.
    if (item.start) patch.end = new Date(item.start.getTime() + minutes * 60_000);
    else patch.flexibleDuration = Math.round(minutes);
    if (!item.fixed) patch.flexibleDuration = Math.round(minutes);
  }
  if (Object.keys(patch).length) await prisma.item.update({ where: { id: item.id }, data: patch });

  const time = fields.time || (item.start ? hhmm(item.start) : "");
  // A time on an item with no day means today, so picking one is never ignored.
  const date =
    fields.date || (item.day ? dayKey(item.day, "UTC") : fields.time ? dayKey(new Date()) : "");
  const movedDay = Boolean(fields.date) && date !== (item.day ? dayKey(item.day, "UTC") : "");
  const movedTime = Boolean(fields.time) && time !== (item.start ? hhmm(item.start) : "");

  if ((movedDay || movedTime) && date && time) {
    return moveItem(userId, itemId, { date, time, allDay: item.allDay });
  }

  // A day without a time: the scheduler places it on that day.
  if (movedDay && date) {
    await prisma.item.update({ where: { id: item.id }, data: { day: dayDate(date) } });
    for (const when of new Set([item.day?.toISOString(), dayDate(date).toISOString()].filter(Boolean) as string[])) {
      await runPlan(userId, new Date(when));
    }
    return { ok: true, message: `Saved for ${dayWord(dayDate(date))}.` };
  }

  if (item.day) await runPlan(userId, item.day);
  return { ok: true, message: "Saved." };
}

export async function unpinItem(userId: string, itemId: string): Promise<AddResult> {
  const item = await prisma.item.findFirst({ where: { id: itemId, userId, pinned: true } });
  if (!item) return { ok: false, message: "That item is not pinned." };

  // An event keeps its time; anything else goes back to the scheduler, keeping
  // the length it had so it is not silently shortened.
  const minutes =
    item.start && item.end
      ? Math.round((item.end.getTime() - item.start.getTime()) / 60_000)
      : (item.flexibleDuration ?? 30);

  await prisma.item.update({
    where: { id: item.id },
    data:
      item.sourceKind === "calendar"
        ? { pinned: false }
        : {
            pinned: false,
            fixed: false,
            start: null,
            end: null,
            flexibleDuration: minutes,
            reason: "Back with the scheduler.",
          },
  });
  if (item.day) await runPlan(userId, item.day);

  return { ok: true, message: "Unpinned. I will place it again." };
}
