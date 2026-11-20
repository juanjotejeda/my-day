import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Everything My Day holds about Juan, as one JSON file. Tokens are never included. */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== process.env.ALLOWED_EMAIL?.toLowerCase()) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return Response.json({ error: "no user" }, { status: 409 });

  const [settings, settingsHistory, sources, items, candidates, corrections, rules, dayReviews, eventsLog] =
    await Promise.all([
      prisma.settings.findUnique({ where: { userId: user.id } }),
      prisma.settingsHistory.findMany({ where: { userId: user.id } }),
      prisma.source.findMany({ where: { userId: user.id } }),
      prisma.item.findMany({ where: { userId: user.id } }),
      prisma.candidate.findMany({ where: { userId: user.id } }),
      prisma.correction.findMany({ where: { userId: user.id } }),
      prisma.rule.findMany({ where: { userId: user.id } }),
      prisma.dayReview.findMany({ where: { userId: user.id } }),
      prisma.eventLog.findMany({ where: { userId: user.id } }),
    ]);

  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      user,
      settings,
      settingsHistory,
      // The refresh token stays out of every export.
      sources: sources.map(({ encryptedRefreshToken, ...rest }) => ({ ...rest, tokenStored: Boolean(encryptedRefreshToken) })),
      items,
      candidates,
      corrections,
      rules,
      dayReviews,
      eventsLog,
    },
    null,
    2,
  );

  return new Response(body, {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="my-day-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
