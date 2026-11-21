import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function me() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== process.env.ALLOWED_EMAIL?.toLowerCase()) return null;
  return prisma.user.findUnique({ where: { email } });
}

/** Remembers one installed device, so the worker can reach it. */
export async function POST(request: Request) {
  const user = await me();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return Response.json({ error: "send a push subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    update: { keys: body.keys, userId: user.id },
    create: { userId: user.id, endpoint: body.endpoint, keys: body.keys },
  });

  const devices = await prisma.pushSubscription.count({ where: { userId: user.id } });
  return Response.json({ ok: true, devices });
}

/** Forgets this device. */
export async function DELETE(request: Request) {
  const user = await me();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) return Response.json({ error: "send { endpoint }" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint: body.endpoint } });
  return Response.json({ ok: true });
}
