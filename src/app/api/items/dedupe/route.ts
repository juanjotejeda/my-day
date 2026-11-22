import { auth } from "@/auth";
import { duplicateIds } from "@/lib/plan/dedupe";
import { prisma } from "@/lib/prisma";

/**
 * Clears out the copies the calendars made of each other before the sync knew
 * to skip them. GET lists what would go; POST removes it. The oldest copy of
 * each meeting stays, so nothing disappears from the day.
 */
async function allowed(request: Request): Promise<boolean> {
  const secret = request.headers.get("x-worker-secret");
  if (process.env.WORKER_SECRET && secret === process.env.WORKER_SECRET) return true;
  const session = await auth();
  return session?.user?.email?.toLowerCase() === process.env.ALLOWED_EMAIL?.toLowerCase();
}

async function copies() {
  const email = process.env.ALLOWED_EMAIL?.toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) return null;

  const rows = await prisma.item.findMany({
    where: { userId: user.id, sourceKind: "calendar", archivedAt: null },
    select: { id: true, title: true, start: true, end: true, createdAt: true, day: true },
  });
  return { user, rows, extra: duplicateIds(rows) };
}

export async function GET(request: Request) {
  if (!(await allowed(request))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const found = await copies();
  if (!found) return Response.json({ error: "no user" }, { status: 409 });

  const byId = new Map(found.rows.map((row) => [row.id, row]));
  return Response.json({
    calendarItems: found.rows.length,
    duplicates: found.extra.length,
    examples: found.extra.slice(0, 10).map((id) => {
      const row = byId.get(id);
      return { title: row?.title, start: row?.start, day: row?.day };
    }),
  });
}

export async function POST(request: Request) {
  if (!(await allowed(request))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const found = await copies();
  if (!found) return Response.json({ error: "no user" }, { status: 409 });

  const { count } = await prisma.item.deleteMany({ where: { id: { in: found.extra } } });
  return Response.json({ removed: count, calendarItems: found.rows.length - count });
}
