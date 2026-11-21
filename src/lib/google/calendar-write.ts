import { google } from "googleapis";

import { sourceRefFor } from "./map-event";
import { googleAuth } from "./client";

/** The marker My Day puts on the events it creates, so it can recognise its own. */
export const MY_DAY_MARKER = "Added in My Day";

/**
 * Creates one new event in Google Calendar. My Day only ever inserts: it never
 * edits or deletes an event that already exists (docs/SPEC.md, Google access).
 */
export async function createCalendarEvent(
  userId: string,
  event: { title: string; start: Date; end: Date; calendarId?: string; location?: string },
): Promise<{ ok: true; sourceRef: string; htmlLink: string | null } | { ok: false; error: string }> {
  try {
    const { auth, source } = await googleAuth(userId);
    const calendarId = event.calendarId ?? source.calendarIds[0] ?? "primary";
    const calendar = google.calendar({ version: "v3", auth });

    const { data } = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: event.title,
        ...(event.location ? { location: event.location } : {}),
        start: { dateTime: event.start.toISOString() },
        end: { dateTime: event.end.toISOString() },
        description: MY_DAY_MARKER,
      },
    });

    if (!data.id) return { ok: false, error: "Google did not return an event id." };
    return { ok: true, sourceRef: sourceRefFor(calendarId, data.id), htmlLink: data.htmlLink ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 120) : "unknown error" };
  }
}

function splitRef(sourceRef: string): { calendarId: string; eventId: string } | null {
  const at = sourceRef.lastIndexOf(":");
  if (at <= 0) return null;
  return { calendarId: sourceRef.slice(0, at), eventId: sourceRef.slice(at + 1) };
}

/**
 * Did My Day create this event? Asked of Google, because the marker lives on
 * the event itself and so survives a resync or a fresh database.
 */
export async function isMyDayEvent(userId: string, sourceRef: string): Promise<boolean> {
  const ref = splitRef(sourceRef);
  if (!ref) return false;
  try {
    const { auth } = await googleAuth(userId);
    const calendar = google.calendar({ version: "v3", auth });
    const { data } = await calendar.events.get({ calendarId: ref.calendarId, eventId: ref.eventId });
    return Boolean(data.description?.includes(MY_DAY_MARKER));
  } catch {
    return false;
  }
}

/**
 * Deletes an event in Google Calendar. Only ever used on events My Day created
 * itself: events from anywhere else stay untouched (docs/SPEC.md).
 */
export async function deleteCalendarEvent(
  userId: string,
  sourceRef: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ref = splitRef(sourceRef);
  if (!ref) return { ok: false, error: "that event has no calendar reference" };

  try {
    const { auth } = await googleAuth(userId);
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({ calendarId: ref.calendarId, eventId: ref.eventId });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    // Already gone counts as deleted.
    if (/410|404|deleted/i.test(message)) return { ok: true };
    return { ok: false, error: message.slice(0, 120) };
  }
}
