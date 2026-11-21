import { auth } from "@/auth";
import { previewNotifications } from "@/lib/push/run";
import { pushReady, sendToDevices } from "@/lib/push/send";
import { prisma } from "@/lib/prisma";

/**
 * Sends one notification now, or with { all: true } the four daily ones with
 * their real content, so a new device can be checked in a minute.
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
  if (!user) return Response.json({ error: "no user" }, { status: 409 });
  if (!pushReady()) return Response.json({ error: "VAPID keys are not set here" }, { status: 503 });

  const devices = await prisma.pushSubscription.count({ where: { userId: user.id } });
  if (!devices) return Response.json({ error: "no device has allowed notifications yet" }, { status: 409 });

  const body = (await request.json().catch(() => null)) as { all?: boolean } | null;

  if (body?.all) {
    const previews = await previewNotifications(user.id);
    let sent = 0;
    for (const preview of previews) {
      const result = await sendToDevices(user.id, preview);
      sent += result.sent;
      // Spaced out, so four notifications do not collapse into one banner.
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    return Response.json({ ok: sent > 0, devices, sent, kinds: previews.map((push) => push.key) });
  }

  const result = await sendToDevices(user.id, {
    key: `test:${Date.now()}`,
    title: "My Day",
    body: "Notifications work. This is what they look like.",
    url: "/",
    urgent: false,
  });

  return Response.json({ ok: result.sent > 0, devices, ...result });
}
