import { redirect } from "next/navigation";

import { PushPermission } from "@/components/push-permission";
import { SettingsScreen } from "@/components/settings-screen";
import { auth } from "@/auth";
import { loadSettings } from "@/lib/settings";
import { NOTIFICATIONS_SCREEN } from "@/lib/settings-spec";
import { prisma } from "@/lib/prisma";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) redirect("/signin");

  const [settings, devices] = await Promise.all([
    loadSettings(user.id),
    prisma.pushSubscription.count({ where: { userId: user.id } }),
  ]);

  return (
    <SettingsScreen
      spec={NOTIFICATIONS_SCREEN}
      values={settings}
      before={
        <PushPermission publicKey={process.env.VAPID_PUBLIC_KEY ?? ""} devices={devices} />
      }
    />
  );
}
