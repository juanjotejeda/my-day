import Link from "next/link";
import { redirect } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { auth } from "@/auth";
import { ItemRow, ListCard, NoteCard, Screen, ScreenHeader, SectionTitle } from "@/components/ui";
import { hhmm } from "@/lib/day";
import { SAMPLE_LAST_KNOWN } from "@/lib/plan/sample-screens";
import { prisma } from "@/lib/prisma";

/** X2: Google's consent expired, so the plan is the last one that synced. */
export default async function ConnectionLost() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  const source = user
    ? await prisma.source.findUnique({ where: { userId_kind: { userId: user.id, kind: "google" } } })
    : null;
  const syncedAt = source?.lastSyncAt ? hhmm(source.lastSyncAt) : "08:12";

  const date = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <Screen>
      <div role="alert" className="flex flex-col gap-2 rounded-[18px] bg-alert px-4 py-3.5">
        <div className="text-base text-alert-ink">Google sign-in expired</div>
        <p className="text-sm leading-relaxed">
          Calendar and Gmail stopped syncing at {syncedAt}. Your plan may miss new events and
          requests. In Google testing mode this happens every 7 days.
        </p>
        <Link
          href="/signin"
          className="flex min-h-11 items-center self-start rounded-full bg-navy px-[18px] text-[15px] text-white"
        >
          Reconnect Google
        </Link>
      </div>

      <ScreenHeader label={`${date} · synced ${syncedAt}`} title="Last known plan" size={32} />

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Today</SectionTitle>
        <ListCard>
          {SAMPLE_LAST_KNOWN.map((item) => (
            <ItemRow
              key={item.id}
              title={item.title}
              time={item.time}
              meta={item.meta}
              fill={item.fill}
              variant={item.chip}
            />
          ))}
        </ListCard>
      </section>

      <NoteCard label="STILL WORKING">
        Manual reminders and tasks keep working offline. Changes sync when Google is back.
      </NoteCard>

      <div className="flex-1" />
      <BottomNav active="today" reviewCount={4} />
    </Screen>
  );
}
