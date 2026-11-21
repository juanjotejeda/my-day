"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { dayDate, dayKey } from "@/lib/day";
import { runPlan } from "@/lib/plan/run";
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

  // Everything the scheduler reads reshapes the day straight away: changing the
  // peak window moves deep work, which is milestone 4's test.
  if (["rhythm", "work", "focus", "priorities", "protectedTime"].includes(section)) {
    const now = new Date();
    await runPlan(user.id, dayDate(dayKey(now)));
    await runPlan(user.id, dayDate(dayKey(new Date(now.getTime() + 86_400_000))));
    revalidatePath("/");
  }

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

/**
 * S7: removes every row and signs out, as the spec says. The Google events
 * themselves are untouched: deleting My Day's data never changes a calendar.
 */
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
    prisma.pushSubscription.deleteMany({ where: { userId: user.id } }),
    prisma.settings.deleteMany({ where: { userId: user.id } }),
    // The encrypted Google token goes with it: signing in again starts fresh.
    prisma.source.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
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

/** Used after a delete: there is no account left to stay signed in to. */
export async function signOutEverywhere() {
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo: "/signin" });
}

/** Day or night. The same setting the moon button and the Settings switch use. */
export async function setTheme(theme: "day" | "night") {
  const user = await me();
  if (!user) return { ok: false as const, error: "unauthorized" };
  await saveSection(user.id, "appearance", { theme });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** The eye in the date line: full Today, or the simple one. */
export async function setView(view: "full" | "simple") {
  const user = await me();
  if (!user) return { ok: false as const, error: "unauthorized" };
  await saveSection(user.id, "appearance", { view });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
