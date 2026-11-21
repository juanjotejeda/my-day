import { redirect } from "next/navigation";

import { SourcesScreen, type CalendarChoice } from "@/components/sources-screen";
import { SCOPES } from "@/auth";
import { hhmm } from "@/lib/day";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const CALENDAR_LIST_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export default async function Sources() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const source = await prisma.source.findUnique({
    where: { userId_kind: { userId: user.id, kind: "google" } },
  });

  const stored = (source?.calendars as unknown as CalendarChoice[] | null) ?? [];
  const calendars: CalendarChoice[] = stored.length
    ? stored
    : (source?.calendarIds.length ? source.calendarIds : ["primary"]).map((id) => ({
        id,
        name: id === "primary" ? "Primary calendar" : id,
        enabled: true,
      }));

  return (
    <SourcesScreen
      connected={Boolean(source?.encryptedRefreshToken) && !source?.disconnectedAt}
      syncedLabel={source?.lastSyncAt ? `Synced ${hhmm(source.lastSyncAt)}` : "Not synced yet"}
      calendars={calendars}
      gmail={{
        scope: (source?.gmailScope as "inbox" | "all") ?? "inbox",
        lookbackDays: source?.gmailLookbackDays ?? 14,
        includeSent: source?.gmailIncludeSent ?? true,
      }}
      needsConsent={!(source?.scopes ?? []).includes(CALENDAR_LIST_SCOPE) && SCOPES.includes(CALENDAR_LIST_SCOPE)}
    />
  );
}
