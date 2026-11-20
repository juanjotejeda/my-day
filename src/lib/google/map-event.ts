import type { calendar_v3 } from "googleapis";

import { dayDate, dayKey } from "../day.ts";

export type MappedEvent = {
  sourceRef: string;
  title: string;
  start: Date | null;
  end: Date | null;
  allDay: boolean;
  day: Date;
  sourceUrl: string | null;
};

/** `calendarId:eventId`, so the same event id in two calendars stays two items. */
export function sourceRefFor(calendarId: string, eventId: string): string {
  return `${calendarId}:${eventId}`;
}

/**
 * A Google event as My Day stores it, or null when it does not belong in the plan:
 * cancelled, declined by Juan, or without an id or a start.
 */
export function mapEvent(
  event: calendar_v3.Schema$Event,
  calendarId: string,
  timeZone?: string,
): MappedEvent | null {
  if (!event.id || event.status === "cancelled") return null;

  const declined = event.attendees?.some((a) => a.self && a.responseStatus === "declined");
  if (declined) return null;

  const allDay = Boolean(event.start?.date);
  const startAt = event.start?.dateTime ? new Date(event.start.dateTime) : null;
  const endAt = event.end?.dateTime ? new Date(event.end.dateTime) : null;

  // All-day events become a day banner, so they keep the day but no time.
  const key = allDay
    ? event.start?.date
    : startAt
      ? dayKey(startAt, timeZone)
      : undefined;
  if (!key) return null;

  return {
    sourceRef: sourceRefFor(calendarId, event.id),
    title: event.summary?.trim() || "Untitled event",
    start: allDay ? null : startAt,
    end: allDay ? null : endAt,
    allDay,
    day: dayDate(key),
    sourceUrl: event.htmlLink ?? null,
  };
}
