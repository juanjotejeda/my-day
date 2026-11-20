import { auth } from "@/auth";
import { GoogleDisconnected } from "@/lib/google/client";
import { syncCalendars } from "@/lib/google/calendar-sync";
import { prisma } from "@/lib/prisma";

/**
 * Runs a calendar sync. Called by the worker service every 5 minutes with the
 * shared secret, or by Juan's own session for an immediate sync.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-worker-secret");
  const fromWorker = Boolean(
    process.env.WORKER_SECRET && secret && secret === process.env.WORKER_SECRET,
  );

  if (!fromWorker) {
    const session = await auth();
    if (session?.user?.email?.toLowerCase() !== process.env.ALLOWED_EMAIL?.toLowerCase()) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
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
