import { moveItem, unpinItem } from "@/lib/plan/add";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

/** Moves an item to a date and time, or unpins it: the sheet's own path. */
export async function POST(request: Request) {
  const secret = request.headers.get("x-worker-secret");
  const fromWorker = Boolean(
    process.env.WORKER_SECRET && secret && secret === process.env.WORKER_SECRET,
  );
  if (!fromWorker && !(await currentUser())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { id?: string; date?: string; time?: string; allDay?: boolean; unpin?: boolean }
    | null;
  if (!body?.id) return Response.json({ error: "send { id }" }, { status: 400 });

  const email = process.env.ALLOWED_EMAIL?.toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) return Response.json({ error: "no user" }, { status: 409 });

  const result = body.unpin
    ? await unpinItem(user.id, body.id)
    : await moveItem(user.id, body.id, {
        date: body.date ?? "",
        time: body.time ?? "",
        allDay: body.allDay,
      });

  return Response.json(result, { status: result.ok ? 200 : 422 });
}
