"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SECTIONS, type SectionName, saveSection } from "@/lib/settings";

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
