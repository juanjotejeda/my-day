import { auth } from "@/auth";
import { deleteItem } from "@/lib/plan/add";
import { prisma } from "@/lib/prisma";

/**
 * Deletes one item by id, or by exact title when the id is not at hand.
 * The same path the adjust sheet uses, so the rules are identical.
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

  const body = (await request.json().catch(() => null)) as
    | { id?: string; title?: string; contains?: string; dryRun?: boolean }
    | null;
  const email = process.env.ALLOWED_EMAIL?.toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) return Response.json({ error: "no user" }, { status: 409 });

  let itemId = body?.id;
  let matched: { id: string; title: string }[] = [];

  if (!itemId && (body?.title || body?.contains)) {
    matched = await prisma.item.findMany({
      where: body.title
        ? { userId: user.id, title: body.title }
        : { userId: user.id, title: { contains: body.contains as string, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    });
    itemId = matched[0]?.id;
  }

  if (body?.dryRun) return Response.json({ ok: true, matched });
  if (!itemId) {
    return Response.json({ error: "nothing matched", matched }, { status: 404 });
  }

  const result = await deleteItem(user.id, itemId);
  return Response.json({ ...result, matched }, { status: result.ok ? 200 : 422 });
}
