import { redirect } from "next/navigation";

import { SettingsScreen } from "@/components/settings-screen";
import { auth } from "@/auth";
import { loadSettings } from "@/lib/settings";
import { PRIORITIES_SCREEN } from "@/lib/settings-spec";
import { prisma } from "@/lib/prisma";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) redirect("/signin");

  const settings = await loadSettings(user.id);
  return <SettingsScreen spec={PRIORITIES_SCREEN} values={settings} />;
}
