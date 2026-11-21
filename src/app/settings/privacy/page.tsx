import { redirect } from "next/navigation";

import { DataActions } from "@/components/data-actions";
import { SettingsScreen } from "@/components/settings-screen";
import { PRIVACY_SCREEN } from "@/lib/settings-spec";
import { currentUser, settingsFor } from "@/lib/session";

export default async function Privacy() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const settings = await settingsFor(user.id);
  return <SettingsScreen spec={PRIVACY_SCREEN} values={settings} after={<DataActions />} />;
}
