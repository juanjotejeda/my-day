import { sendNotification, setVapidDetails } from "web-push";

import { prisma } from "@/lib/prisma";

import type { DuePush } from "./due";

/** Web push, VAPID only, to the devices Juan installed the app on. */
export function pushReady(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
}

function configure() {
  setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || `mailto:${process.env.ALLOWED_EMAIL ?? "juan@example.com"}`,
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
}

export type SendResult = { sent: number; gone: number; failed: number };

/** Sends one notification to every device, forgetting the ones that have gone. */
export async function sendToDevices(userId: string, push: DuePush): Promise<SendResult> {
  const result: SendResult = { sent: 0, gone: 0, failed: 0 };
  if (!pushReady()) return result;
  configure();

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  const payload = JSON.stringify({ title: push.title, body: push.body, url: push.url, key: push.key });

  for (const subscription of subscriptions) {
    try {
      await sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys as { p256dh: string; auth: string },
        },
        payload,
        { TTL: 3600, urgency: push.urgent ? "high" : "normal" },
      );
      result.sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      // 404 and 410 mean the device unsubscribed or the app was removed.
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: subscription.id } });
        result.gone += 1;
      } else {
        result.failed += 1;
      }
    }
  }

  await prisma.eventLog.create({
    data: {
      userId,
      kind: "push_sent",
      payload: { key: push.key, title: push.title, ...result },
    },
  });

  return result;
}
