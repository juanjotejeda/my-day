import { auth } from "@/auth";
import { dayKey } from "@/lib/day";
import { prisma } from "@/lib/prisma";

/** Every item as the database holds it: which day, which status, and why. */
export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  // Looking for one thing: ?q=part of the title, ?day=YYYY-MM-DD.
  const q = url.searchParams.get("q");
  const day = url.searchParams.get("day");

  const items = await prisma.item.findMany({
    where: {
      userId: user.id,
      ...(source ? { sourceKind: source as "manual" | "gmail" | "voice" | "calendar" } : {}),
      ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
      ...(day ? { day: new Date(`${day}T00:00:00.000Z`) } : {}),
    },
    orderBy: [{ day: "asc" }, { start: "asc" }],
    take: 60,
  });

  return Response.json({
    today: dayKey(new Date()),
    count: items.length,
    items: items.map((item) => ({
      title: item.title.slice(0, 46),
      day: item.day ? dayKey(item.day, "UTC") : null,
      status: item.status,
      start: item.start ? item.start.toISOString().slice(11, 16) : null,
      source: item.sourceKind,
      rank: item.rank,
      effort: item.effort,
      category: item.category,
      archived: Boolean(item.archivedAt),
      ref: item.sourceRef,
      reason: (item.reason ?? "").slice(0, 60),
    })),
  });
}
