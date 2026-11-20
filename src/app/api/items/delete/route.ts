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

  const body = (await request.json().catch(() => null)) as { id?: string; title?: string } | null;
  const email = process.env.ALLOWED_EMAIL?.toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) return Response.json({ error: "no user" }, { status: 409 });

  let itemId = body?.id;
  if (!itemId && body?.title) {
    const found = await prisma.item.findFirst({
      where: { userId: user.id, title: body.title },
      orderBy: { createdAt: "desc" },
    });
    itemId = found?.id;
  }
  if (!itemId) return Response.json({ error: "send { id } or { title }" }, { status: 400 });

  const result = await deleteItem(user.id, itemId);
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
