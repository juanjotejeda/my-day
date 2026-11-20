import { auth } from "@/auth";
import { addFromText } from "@/lib/plan/add";
import { prisma } from "@/lib/prisma";

/**
 * Adds one item from a line of text, through the same parser and scheduler the
 * add bar uses. Handy for a phone shortcut, and the way the flow is tested.
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

  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  if (!body?.text) return Response.json({ error: "send { text }" }, { status: 400 });

  const email = process.env.ALLOWED_EMAIL?.toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) return Response.json({ error: "no user yet, sign in first" }, { status: 409 });

  const result = await addFromText(user.id, body.text);
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
