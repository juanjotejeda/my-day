import { redirect } from "next/navigation";

import { PushPermission } from "@/components/push-permission";
import { SettingsScreen } from "@/components/settings-screen";
import { NOTIFICATIONS_SCREEN } from "@/lib/settings-spec";
import { currentUser, settingsFor } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const [settings, devices] = await Promise.all([
    settingsFor(user.id),
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
