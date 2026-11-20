import { google } from "googleapis";

import { sourceRefFor } from "./map-event";
import { googleAuth } from "./client";

/**
 * Creates one new event in Google Calendar. My Day only ever inserts: it never
 * edits or deletes an event that already exists (docs/SPEC.md, Google access).
 */
export async function createCalendarEvent(
  userId: string,
  event: { title: string; start: Date; end: Date; calendarId?: string },
): Promise<{ ok: true; sourceRef: string; htmlLink: string | null } | { ok: false; error: string }> {
  try {
    const { auth, source } = await googleAuth(userId);
    const calendarId = event.calendarId ?? source.calendarIds[0] ?? "primary";
    const calendar = google.calendar({ version: "v3", auth });

    const { data } = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: event.title,
        start: { dateTime: event.start.toISOString() },
        end: { dateTime: event.end.toISOString() },
        description: "Added in My Day",
      },
    });

    if (!data.id) return { ok: false, error: "Google did not return an event id." };
    return { ok: true, sourceRef: sourceRefFor(calendarId, data.id), htmlLink: data.htmlLink ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 120) : "unknown error" };
  }
}
