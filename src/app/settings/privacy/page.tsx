import { redirect } from "next/navigation";

import { DataActions } from "@/components/data-actions";
import { SettingsScreen } from "@/components/settings-screen";
import { auth } from "@/auth";
import { loadSettings } from "@/lib/settings";
import { PRIVACY_SCREEN } from "@/lib/settings-spec";
import { prisma } from "@/lib/prisma";

export default async function Privacy() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) redirect("/signin");

  const settings = await loadSettings(user.id);
  return <SettingsScreen spec={PRIVACY_SCREEN} values={settings} after={<DataActions />} />;
}
