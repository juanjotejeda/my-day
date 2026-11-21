import { TIMEZONE, dayDate, dayKey, minutesOfDay } from "@/lib/day";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";

import { dueNotifications, type DayState, type DuePush, type PushSettings } from "./due";

import { DAY_CLOSE } from "@/lib/flags";
import { sendToDevices, pushReady } from "./send";

export type NotificationRun = {
  ran: boolean;
  due: string[];
  sent: number;
  skipped: string;
};

/** What the day looks like right now, in the shape the notification texts need. */
async function readDay(userId: string, now: Date): Promise<DayState> {
  const today = dayDate(dayKey(now));
  const tomorrow = dayDate(dayKey(new Date(now.getTime() + 86_400_000)));
  const minute = minutesOfDay(now);

  const [items, tomorrowItems, reviewCount, carriedOver, newCandidates] = await Promise.all([
    prisma.item.findMany({
      where: { userId, day: today, archivedAt: null, status: { not: "dropped" } },
      orderBy: { start: "asc" },
    }),
    prisma.item.findMany({
      where: { userId, day: tomorrow, archivedAt: null, fixed: true, start: { not: null } },
      orderBy: { start: "asc" },
      take: 1,
    }),
    prisma.candidate.count({ where: { userId, state: "open" } }),
    prisma.item.count({ where: { userId, day: tomorrow, archivedAt: null, status: "moved" } }),
    prisma.candidate.findMany({
      where: { userId, state: "open", createdAt: { gte: new Date(now.getTime() - 30 * 60_000) } },
      take: 5,
    }),
  ]);

  const timed = items.filter((item) => item.start && !item.allDay);
  const fixed = timed.filter((item) => item.fixed);
  const current = timed.find(
    (item) => minutesOfDay(item.start as Date) <= minute && minute < minutesOfDay(item.end ?? (item.start as Date)),
  );

  return {
    meetings: items.filter((item) => item.effort === "meeting").length,
    mustCount: items.filter((item) => item.rank === "must" && item.status !== "done").length,
    reviewCount,
    doneCount: items.filter((item) => item.status === "done").length,
    plannedCount: items.length,
    firstFixed: fixed[0]?.start
      ? { title: fixed[0].title, minute: minutesOfDay(fixed[0].start) }
      : null,
    firstFixedTomorrow: tomorrowItems[0]?.start
      ? { title: tomorrowItems[0].title, minute: minutesOfDay(tomorrowItems[0].start as Date) }
      : null,
    carriedOver,
    nextFixed: (() => {
      const next = fixed.find((item) => minutesOfDay(item.start as Date) > minute);
      return next?.start
        ? { title: next.title, minute: minutesOfDay(next.start), where: next.sourceUrl ? "see the event" : null }
        : null;
    })(),
    // Deep work in progress counts as a focus block.
    inFocusBlock: Boolean(current && current.effort === "deep"),
    newCandidates: newCandidates.map((candidate) => ({
      id: candidate.id,
      title: ((candidate.extracted as { title?: string } | null)?.title ?? candidate.subject).slice(0, 60),
    })),
  };
}

/** Sends whatever is due now, once per day per kind. */
export async function runNotifications(userId: string, now = new Date()): Promise<NotificationRun> {
  if (!pushReady()) return { ran: false, due: [], sent: 0, skipped: "VAPID keys are not set" };

  const devices = await prisma.pushSubscription.count({ where: { userId } });
  if (!devices) return { ran: false, due: [], sent: 0, skipped: "no device has allowed notifications" };

  const settings = await loadSettings(userId);
  const push: PushSettings = {
    ...settings.notifications,
    workEnd: settings.work.end,
    // Paused with the evening flow, whatever the Notifications switches say.
    evening: settings.notifications.evening && DAY_CLOSE,
    close: settings.notifications.close && DAY_CLOSE,
  };
  const day = await readDay(userId, now);

  // What has already gone out today, so nothing repeats.
  const since = dayDate(dayKey(now));
  const sentToday = await prisma.eventLog.findMany({
    where: { userId, kind: "push_sent", createdAt: { gte: since } },
    select: { payload: true },
  });
  const alreadySent = sentToday
    .map((row) => (row.payload as { key?: string } | null)?.key)
    .filter(Boolean) as string[];

  const due = dueNotifications({ now: minutesOfDay(now), settings: push, day, alreadySent });

  let sent = 0;
  for (const notification of due) {
    const result = await sendToDevices(userId, notification);
    sent += result.sent;
  }

  return { ran: true, due: due.map((notification) => notification.key), sent, skipped: "" };
}

/**
 * The daily notifications with their real content, whatever the time is.
 * This is how they are checked on a new device without waiting for 07:30.
 */
export async function previewNotifications(userId: string, now = new Date()): Promise<DuePush[]> {
  const settings = await loadSettings(userId);
  const push: PushSettings = { ...settings.notifications, workEnd: settings.work.end };
  const day = await readDay(userId, now);

  const kinds: { key: string; at: number }[] = [
    { key: "morning", at: toMinutes(push.morningAt) },
    // The two evening ones only when the evening flow is on.
    ...(DAY_CLOSE
      ? [
          { key: "close", at: toMinutes(push.workEnd) + 30 },
          { key: "evening", at: toMinutes(push.eveningAt) },
        ]
      : []),
  ];

  const previews: DuePush[] = [];
  for (const kind of kinds) {
    const [built] = dueNotifications({
      now: kind.at,
      // Switched on for the preview, and quiet hours ignored: this is a check.
      settings: { ...push, morning: true, evening: true, close: true, quietStart: "00:00", quietEnd: "00:00" },
      day: { ...day, inFocusBlock: false },
      alreadySent: [],
    });
    if (built) previews.push({ ...built, key: `preview:${built.key}` });
  }

  // The fixed-event nudge, with tomorrow's first event when today holds none.
  const nextFixed = day.nextFixed ?? day.firstFixedTomorrow ?? { title: "A fixed event", minute: 11 * 60 };
  previews.push({
    key: "preview:before",
    title: nextFixed.title,
    body: `At ${String(Math.floor(nextFixed.minute / 60)).padStart(2, "0")}:${String(
      nextFixed.minute % 60,
    ).padStart(2, "0")} · this is the reminder before a fixed event`,
    url: "/",
    urgent: true,
  });

  return previews;
}

function toMinutes(time: string): number {
  const [hours, minutes] = (time ?? "").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/** Used by the test endpoint and the worker log. */
export type { DuePush };
export const PUSH_TIMEZONE = TIMEZONE;
