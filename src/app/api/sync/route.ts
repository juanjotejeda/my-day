import { auth } from "@/auth";
import { GoogleDisconnected } from "@/lib/google/client";
import { syncCalendars } from "@/lib/google/calendar-sync";
import { syncGmail } from "@/lib/google/gmail-sync";
import { dayDate, dayKey } from "@/lib/day";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { purgeArchive } from "@/lib/plan/add";
import { runPlan } from "@/lib/plan/run";
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
  const [plan, settings, openCandidates, extractErrors] = await Promise.all([
    loadToday(user.id),
    loadSettings(user.id),
    prisma.candidate.count({ where: { userId: user.id, state: "open" } }),
    // Reasons only, never email content.
    prisma.eventLog.findMany({
      where: { userId: user.id, kind: "gmail_extract_error" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { payload: true, createdAt: true },
    }),
  ]);

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
    openCandidates,
    extractErrors: extractErrors.map((row) => ({
      at: row.createdAt,
      error: (row.payload as { error?: string } | null)?.error ?? "unknown",
    })),
  });
}

/**
 * Runs a calendar sync. Called by the worker service every 5 minutes with the
 * shared secret, or by Juan's own session for an immediate sync.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { retryErrors?: boolean } | null;
  if (!(await authorize(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const email = process.env.ALLOWED_EMAIL?.toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) return Response.json({ error: "no user yet, sign in first" }, { status: 409 });

  if (body?.retryErrors) {
    // Forget that the failed messages were seen, so this run reads them again.
    const failed = await prisma.eventLog.findMany({
      where: { userId: user.id, kind: "gmail_extract_error" },
      select: { payload: true },
    });
    const ids = new Set(
      failed.map((row) => (row.payload as { id?: string } | null)?.id).filter(Boolean) as string[],
    );
    const seen = await prisma.eventLog.findMany({
      where: { userId: user.id, kind: "gmail_message_seen" },
      select: { id: true, payload: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const remove = seen
      .filter((row) => ids.has((row.payload as { id?: string } | null)?.id ?? ""))
      .map((row) => row.id);
    if (remove.length) await prisma.eventLog.deleteMany({ where: { id: { in: remove } } });

    // The history token only lists new mail, so the window is read again.
    await prisma.source.updateMany({
      where: { userId: user.id, kind: "google" },
      data: { gmailHistoryId: null },
    });
  }

  try {
    const result = await syncCalendars(user.id);
    // Gmail runs after the calendar: a candidate's suggested slot reads the day.
    const mail = await syncGmail(user.id).catch((error) => ({
      error: error instanceof Error ? error.message.slice(0, 160) : "gmail sync failed",
    }));
    // The scheduler runs after every sync, so new events reshape the day at once.
    const run = await runPlan(user.id, dayDate(dayKey(new Date())));
    const settings = await loadSettings(user.id);
    const purged = await purgeArchive(user.id, settings.privacy.retentionDays);
    await prisma.eventLog.create({
      data: { userId: user.id, kind: "calendar_sync", payload: result },
    });
    return Response.json({ ok: true, ...result, gmail: mail, planned: run.placed, later: run.later, purged });
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
