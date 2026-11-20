import { google, type calendar_v3 } from "googleapis";
import type { Prisma } from "@/generated/prisma/client";

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
};

type SyncTokens = Record<string, string>;

/**
 * Keeps items in step with Google Calendar: sync tokens where possible, a dated
 * window when Google forgets them (410 Gone) or on the first run.
 */
export async function syncCalendars(userId: string): Promise<SyncResult> {
  const { auth, source } = await googleAuth(userId);
  const calendar = google.calendar({ version: "v3", auth });
  const result: SyncResult = { calendars: 0, upserted: 0, deleted: 0, fullSyncs: 0 };

  try {
    const calendarIds = source.calendarIds.length
      ? source.calendarIds
      : await defaultCalendars(userId);

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
 * Which calendars to sync. The calendar.events scope does not allow listing the
 * calendar list (that needs calendar.readonly), so the default is the primary
 * calendar; Sources settings can store more ids in milestone 4.
 */
async function defaultCalendars(userId: string): Promise<string[]> {
  const calendarIds = ["primary"];
  await prisma.source.update({
    where: { userId_kind: { userId, kind: "google" } },
    data: { calendarIds },
  });
  return calendarIds;
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
