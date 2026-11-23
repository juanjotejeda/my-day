import { auth } from "@/auth";
import { dayDate, dayKey, minutesOfDay } from "@/lib/day";
import { PLAN_TOMORROW, DAY_CLOSE } from "@/lib/flags";
import { runNotifications } from "@/lib/push/run";
import { pushReady } from "@/lib/push/send";
import { loadSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

async function me() {
  const email = process.env.ALLOWED_EMAIL?.toLowerCase();
  return email ? prisma.user.findUnique({ where: { email } }) : null;
}

async function allowed(request: Request): Promise<boolean> {
  const secret = request.headers.get("x-worker-secret");
  if (process.env.WORKER_SECRET && secret === process.env.WORKER_SECRET) return true;
  const session = await auth();
  return session?.user?.email?.toLowerCase() === process.env.ALLOWED_EMAIL?.toLowerCase();
}

/** Whether notifications can arrive at all, and what has arrived today. */
export async function GET(request: Request) {
  if (!(await allowed(request))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const user = await me();
  if (!user) return Response.json({ error: "no user" }, { status: 409 });

  const now = new Date();
  const [devices, settings, sentToday] = await Promise.all([
    prisma.pushSubscription.count({ where: { userId: user.id } }),
    loadSettings(user.id),
    prisma.eventLog.findMany({
      where: { userId: user.id, kind: "push_sent", createdAt: { gte: dayDate(dayKey(now)) } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return Response.json({
    keysSet: pushReady(),
    devices,
    now: `${String(Math.floor(minutesOfDay(now) / 60)).padStart(2, "0")}:${String(minutesOfDay(now) % 60).padStart(2, "0")}`,
    scheduled: {
      morning: settings.notifications.morning ? settings.notifications.morningAt : "off",
      planTomorrow: PLAN_TOMORROW && settings.notifications.evening ? settings.notifications.eveningAt : "off",
      closeTheDay: DAY_CLOSE && settings.notifications.close ? "30 min after work ends" : "off",
      beforeEvents: settings.notifications.beforeEvents ? `${settings.notifications.beforeEvents} min` : "off",
      quietHours: `${settings.notifications.quietStart} to ${settings.notifications.quietEnd}`,
    },
    sentToday: sentToday.map((row) => ({
      key: (row.payload as { key?: string } | null)?.key ?? "?",
      at: row.createdAt,
    })),
  });
}

/** The worker calls this every five minutes, right after the sync. */
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
  if (!user) return Response.json({ error: "no user" }, { status: 409 });

  return Response.json(await runNotifications(user.id));
}
