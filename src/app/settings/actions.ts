"use server";

import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SECTIONS, type SectionName, saveSection } from "@/lib/settings";

type Calendar = { id: string; name: string; enabled: boolean };

async function me() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== process.env.ALLOWED_EMAIL?.toLowerCase()) return null;
  return prisma.user.findUnique({ where: { email } });
}

/** Saves one settings section. Returns what was stored, or an error string. */
export async function saveSettings(section: SectionName, values: Record<string, unknown>) {
  if (!(section in SECTIONS)) return { ok: false as const, error: "unknown section" };
  const user = await me();
  if (!user) return { ok: false as const, error: "unauthorized" };

  await saveSection(user.id, section, values);
  return { ok: true as const };
}

/** S5: run a sync now. */
export async function syncNow() {
  const user = await me();
  if (!user) return { ok: false as const, error: "unauthorized" };
  const { syncCalendars } = await import("@/lib/google/calendar-sync");
  try {
    const result = await syncCalendars(user.id);
    return { ok: true as const, ...result };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "sync failed" };
  }
}

/** S5: forget the Google connection. Signing in again restores it. */
export async function disconnectGoogle() {
  const user = await me();
  if (!user) return { ok: false as const, error: "unauthorized" };
  await prisma.source.updateMany({
    where: { userId: user.id, kind: "google" },
    data: { encryptedRefreshToken: null, disconnectedAt: new Date(), lastError: "Disconnected by you" },
  });
  return { ok: true as const };
}

/** S7: remove the plan data, keeping the account and the Google connection. */
export async function deleteMyData() {
  const user = await me();
  if (!user) return { ok: false as const, error: "unauthorized" };

  await prisma.$transaction([
    prisma.correction.deleteMany({ where: { userId: user.id } }),
    prisma.candidate.deleteMany({ where: { userId: user.id } }),
    prisma.item.deleteMany({ where: { userId: user.id } }),
    prisma.rule.deleteMany({ where: { userId: user.id } }),
    prisma.dayReview.deleteMany({ where: { userId: user.id } }),
    prisma.eventLog.deleteMany({ where: { userId: user.id } }),
    prisma.settingsHistory.deleteMany({ where: { userId: user.id } }),
    prisma.source.updateMany({
      where: { userId: user.id },
      data: { calendarSyncToken: {}, lastSyncAt: null },
    }),
  ]);

  return { ok: true as const };
}

/** S5: tick or untick one calendar. Only ticked calendars are synced. */
export async function setCalendarEnabled(calendarId: string, enabled: boolean) {
  const user = await me();
  if (!user) return { ok: false as const, error: "unauthorized" };

  const source = await prisma.source.findUnique({
    where: { userId_kind: { userId: user.id, kind: "google" } },
  });
  if (!source) return { ok: false as const, error: "no source" };

  const calendars = ((source.calendars as unknown as Calendar[] | null) ?? []).map((calendar) =>
    calendar.id === calendarId ? { ...calendar, enabled } : calendar,
  );
  const calendarIds = calendars.filter((calendar) => calendar.enabled).map((calendar) => calendar.id);

  await prisma.source.update({
    where: { userId_kind: { userId: user.id, kind: "google" } },
    data: {
      calendars: calendars as unknown as Prisma.InputJsonValue,
      calendarIds: calendarIds.length ? calendarIds : [],
      // A calendar that joins later needs a full window, not an old sync token.
      calendarSyncToken: enabled ? {} : (source.calendarSyncToken as Prisma.InputJsonValue),
    },
  });

  return { ok: true as const, synced: calendarIds };
}

/** S5: how far into Gmail My Day looks. */
export async function setGmailReach(values: {
  scope?: "inbox" | "all";
  lookbackDays?: 7 | 14 | 30;
  includeSent?: boolean;
}) {
  const user = await me();
  if (!user) return { ok: false as const, error: "unauthorized" };

  await prisma.source.updateMany({
    where: { userId: user.id, kind: "google" },
    data: {
      ...(values.scope ? { gmailScope: values.scope } : {}),
      ...(values.lookbackDays ? { gmailLookbackDays: values.lookbackDays } : {}),
      ...(values.includeSent === undefined ? {} : { gmailIncludeSent: values.includeSent }),
    },
  });

  return { ok: true as const };
}
