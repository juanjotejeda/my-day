import { redirect } from "next/navigation";

import { SettingsScreen } from "@/components/settings-screen";
import { signOut } from "@/auth";
import { DetailRow, ListCard, SectionTitle } from "@/components/ui";
import { PROFILE_SCREEN } from "@/lib/settings-spec";
import { currentUser, settingsFor } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function Profile() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const [settings, source] = await Promise.all([
    settingsFor(user.id),
    prisma.source.findUnique({ where: { userId_kind: { userId: user.id, kind: "google" } } }),
  ]);

  const since = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    user.createdAt,
  );

  return (
    <SettingsScreen
      spec={PROFILE_SCREEN}
      values={settings}
      before={
        <section className="flex flex-col gap-1.5">
          <SectionTitle>Account</SectionTitle>
          <ListCard>
            <DetailRow
              label="Google account"
              sub={user.email}
              value={source?.disconnectedAt ? "Disconnected" : "Connected"}
            />
            <DetailRow label="Using My Day since" value={since} />
            <DetailRow label="Plan" value="Personal experiment" />
          </ListCard>
        </section>
      }
      after={
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <ListCard>
            <button type="submit" className="flex min-h-14 w-full items-center text-[15px] text-navy">
              Sign out
            </button>
          </ListCard>
        </form>
      }
    />
  );
}
