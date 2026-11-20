import { redirect } from "next/navigation";

import { SourcesScreen } from "@/components/sources-screen";
import { auth } from "@/auth";
import { hhmm } from "@/lib/day";
import { prisma } from "@/lib/prisma";

// Calendar names need the calendar.readonly scope, so the ids stand in for now.
export default async function Sources() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) redirect("/signin");

  const source = await prisma.source.findUnique({
    where: { userId_kind: { userId: user.id, kind: "google" } },
  });

  return (
    <SourcesScreen
      connected={Boolean(source?.encryptedRefreshToken) && !source?.disconnectedAt}
      syncedLabel={source?.lastSyncAt ? `Synced ${hhmm(source.lastSyncAt)}` : "Not synced yet"}
      calendars={source?.calendarIds.length ? source.calendarIds : ["primary"]}
    />
  );
}
