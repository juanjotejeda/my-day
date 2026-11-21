import { redirect } from "next/navigation";

import { SettingsScreen } from "@/components/settings-screen";
import { RHYTHM_SCREEN } from "@/lib/settings-spec";
import { currentUser, settingsFor } from "@/lib/session";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const settings = await settingsFor(user.id);
  return <SettingsScreen spec={RHYTHM_SCREEN} values={settings} />;
}
