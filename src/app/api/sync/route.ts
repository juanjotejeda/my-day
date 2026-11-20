import { auth } from "@/auth";
import { GoogleDisconnected } from "@/lib/google/client";
import { syncCalendars } from "@/lib/google/calendar-sync";
import { dayDate, dayKey } from "@/lib/day";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { loadToday } from "@/lib/today";

/** The worker with the shared secret, or Juan's own session. */
async function authorize(request: Request): Promise<boolean> {
  const secret = request.headers.get("x-worker-secret");
  if (process.env.WORKER_SECRET && secret && secret === process.env.WORKER_SECRET) return true;
  const session = await auth();
  return session?.user?.email?.toLowerCase() === process.env.ALLOWED_EMAIL?.toLowerCase();
}

/**
 * What the server itself sees: when it last synced and how many items it holds.
 * Useful for telling "the server has no events" apart from "this browser is
 * showing an old page". No titles, no event content.
 */
export async function GET(request: Request) {
  const allowed = await authorize(request);
  if (!allowed) return Response.json({ error: "unauthorized" }, { status: 401 });

  const email = process.env.ALLOWED_EMAIL?.toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) return Response.json({ error: "no user yet, sign in first" }, { status: 409 });

  const [source, today, total] = await Promise.all([
    prisma.source.findUnique({ where: { userId_kind: { userId: user.id, kind: "google" } } }),
    prisma.item.count({ where: { userId: user.id, day: dayDate(dayKey(new Date())) } }),
    prisma.item.count({ where: { userId: user.id } }),
  ]);

  // The same loaders the screens use, so their view of the data is visible here.
  const [plan, settings] = await Promise.all([loadToday(user.id), loadSettings(user.id)]);

  return Response.json({
    commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 8) ?? "local",
    timezone: process.env.TZ ?? null,
    day: dayKey(new Date()),
    itemsToday: today,
    itemsTotal: total,
    calendarIds: source?.calendarIds ?? [],
    // Which Google scopes the stored consent actually carries, and what the
    // calendar list discovery found. No tokens, no event content.
    scopes: source?.scopes ?? [],
    calendars: source?.calendars ?? [],
    tokenStored: Boolean(source?.encryptedRefreshToken),
    lastSyncAt: source?.lastSyncAt ?? null,
    lastError: source?.lastError ?? null,
    disconnected: Boolean(source?.disconnectedAt),
    today: {
      banners: plan.banners.length,
      blocks: plan.blocks.length,
      hasCurrent: Boolean(plan.current),
      next: plan.next.length,
      later: plan.later.length,
      earlier: plan.earlier.length,
      headline: plan.current ? "NOW card" : plan.next.length ? "NEXT card" : plan.total ? "Nothing left today" : "Nothing planned",
    },
    settings,
  });
}

/**
 * Runs a calendar sync. Called by the worker service every 5 minutes with the
 * shared secret, or by Juan's own session for an immediate sync.
 */
export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const email = process.env.ALLOWED_EMAIL?.toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) return Response.json({ error: "no user yet, sign in first" }, { status: 409 });

  try {
    const result = await syncCalendars(user.id);
    await prisma.eventLog.create({
      data: { userId: user.id, kind: "calendar_sync", payload: result },
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.eventLog.create({
      data: { userId: user.id, kind: "calendar_sync_error", payload: { message } },
    });
    if (error instanceof GoogleDisconnected) {
      return Response.json({ error: "disconnected", message }, { status: 409 });
    }
    return Response.json({ error: "sync_failed", message }, { status: 502 });
  }
}
