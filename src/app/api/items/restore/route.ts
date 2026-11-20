import { auth } from "@/auth";
import { restoreItem } from "@/lib/plan/add";
import { prisma } from "@/lib/prisma";

/** Puts an archived item back, the same path the Archive page uses. */
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

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return Response.json({ error: "send { id }" }, { status: 400 });

  const email = process.env.ALLOWED_EMAIL?.toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) return Response.json({ error: "no user" }, { status: 409 });

  const result = await restoreItem(user.id, body.id);
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
