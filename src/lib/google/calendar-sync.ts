import { google, type calendar_v3 } from "googleapis";
import type { Prisma } from "@/generated/prisma/client";

import { keyOf } from "@/lib/plan/dedupe";
import { prisma } from "@/lib/prisma";

import { GoogleDisconnected, googleAuth, isInvalidGrant, markDisconnected, statusOf } from "./client";
import { mapEvent, sourceRefFor } from "./map-event";

const DAYS_BACK = 14;
const DAYS_AHEAD = 30;
const PAGE_SIZE = 250;

export type SyncResult = {
  calendars: number;
  upserted: number;
  deleted: number;
  fullSyncs: number;
  /** Events already here from another calendar you follow. */
  duplicates: number;
};

type SyncTokens = Record<string, string>;

/**
 * Keeps items in step with Google Calendar: sync tokens where possible, a dated
 * window when Google forgets them (410 Gone) or on the first run.
 */
export async function syncCalendars(userId: string): Promise<SyncResult> {
  const { auth, source } = await googleAuth(userId);
  const calendar = google.calendar({ version: "v3", auth });
  const result: SyncResult = { calendars: 0, upserted: 0, deleted: 0, fullSyncs: 0, duplicates: 0 };

  try {
    const known = (source.calendars as unknown as { id: string }[] | null) ?? [];
    const calendarIds = source.calendarIds.length && known.length
      ? source.calendarIds
      : await discoverCalendars(calendar, userId);

    const tokens = { ...((source.calendarSyncToken as SyncTokens | null) ?? {}) };

    for (const calendarId of calendarIds) {
      result.calendars += 1;
      let events: calendar_v3.Schema$Event[];
      let nextSyncToken: string | undefined;

      if (tokens[calendarId]) {
        try {
          ({ events, nextSyncToken } = await listIncremental(calendar, calendarId, tokens[calendarId]));
        } catch (error) {
          if (statusOf(error) !== 410) throw error;
          // Google dropped the token: start the window again.
          delete tokens[calendarId];
          result.fullSyncs += 1;
          ({ events, nextSyncToken } = await listWindow(calendar, calendarId));
        }
      } else {
        result.fullSyncs += 1;
        ({ events, nextSyncToken } = await listWindow(calendar, calendarId));
      }

      for (const event of events) {
        const mapped = mapEvent(event, calendarId);
        if (!mapped) {
          if (!event.id) continue;
          const { count } = await prisma.item.deleteMany({
            where: { userId, sourceRef: sourceRefFor(calendarId, event.id) },
          });
          result.deleted += count;
          continue;
        }

        const data = {
          title: mapped.title,
          start: mapped.start,
          end: mapped.end,
          allDay: mapped.allDay,
          day: mapped.day,
          sourceUrl: mapped.sourceUrl,
        };

        // The same meeting in two calendars arrives twice, once per calendar id.
        // Only a new row can be a copy; a row we already keep is just updated.
        const known = await prisma.item.findUnique({
          where: { userId_sourceRef: { userId, sourceRef: mapped.sourceRef } },
          select: { id: true },
        });
        if (!known) {
          const sameDay = await prisma.item.findMany({
            where: { userId, sourceKind: "calendar", day: mapped.day, archivedAt: null },
            select: { title: true, start: true, end: true },
          });
          if (sameDay.some((row) => keyOf(row) === keyOf(mapped))) {
            result.duplicates += 1;
            continue;
          }
        }

        await prisma.item.upsert({
          where: { userId_sourceRef: { userId, sourceRef: mapped.sourceRef } },
          update: data,
          create: {
            userId,
            type: "calendar",
            fixed: true,
            sourceKind: "calendar",
            sourceRef: mapped.sourceRef,
            effort: "meeting",
            ...data,
          },
        });
        result.upserted += 1;
      }

      if (nextSyncToken) tokens[calendarId] = nextSyncToken;
    }

    await prisma.source.update({
      where: { userId_kind: { userId, kind: "google" } },
      data: {
        calendarSyncToken: tokens as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
        lastError: null,
        disconnectedAt: null,
      },
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isInvalidGrant(error)) {
      await markDisconnected(userId, message);
      throw new GoogleDisconnected(message);
    }
    await prisma.source.updateMany({
      where: { userId, kind: "google" },
      data: { lastError: message },
    });
    throw error;
  }
}

/**
 * Reads the calendar list and keeps names and choices in the source row. Needs
 * calendar.readonly; without it the primary calendar stands in, so a stale
 * consent still syncs.
 */
async function discoverCalendars(calendar: calendar_v3.Calendar, userId: string): Promise<string[]> {
  let found: { id: string; name: string; enabled: boolean }[] = [];

  try {
    const { data } = await calendar.calendarList.list({ minAccessRole: "reader" });
    found = (data.items ?? [])
      .filter((entry) => entry.id)
      .map((entry) => ({
        id: entry.id as string,
        name: entry.summary ?? (entry.id as string),
        // Calendars hidden or unticked in Google start off here too.
        enabled: entry.selected !== false && !entry.hidden,
      }));
  } catch (error) {
    if (statusOf(error) !== 403) throw error;
  }

  if (!found.length) found = [{ id: "primary", name: "Primary calendar", enabled: true }];

  const calendarIds = found.filter((entry) => entry.enabled).map((entry) => entry.id);
  await prisma.source.update({
    where: { userId_kind: { userId, kind: "google" } },
    data: {
      calendars: found as unknown as Prisma.InputJsonValue,
      calendarIds: calendarIds.length ? calendarIds : ["primary"],
    },
  });

  return calendarIds.length ? calendarIds : ["primary"];
}

async function listIncremental(calendar: calendar_v3.Calendar, calendarId: string, syncToken: string) {
  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  do {
    const { data } = await calendar.events.list({
      calendarId,
      syncToken,
      singleEvents: true,
      showDeleted: true,
      maxResults: PAGE_SIZE,
      pageToken,
    });
    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken ?? undefined;
    nextSyncToken = data.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  return { events, nextSyncToken };
}

async function listWindow(calendar: calendar_v3.Calendar, calendarId: string) {
  const now = Date.now();
  const timeMin = new Date(now - DAYS_BACK * 86_400_000).toISOString();
  const timeMax = new Date(now + DAYS_AHEAD * 86_400_000).toISOString();

  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  do {
    const { data } = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      showDeleted: true,
      maxResults: PAGE_SIZE,
      pageToken,
    });
    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken ?? undefined;
    nextSyncToken = data.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  return { events, nextSyncToken };
}
