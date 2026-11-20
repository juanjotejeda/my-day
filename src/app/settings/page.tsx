import { redirect } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { auth } from "@/auth";
import { DetailRow, LinkRow, ListCard, Screen, ScreenHeader, SettingsSection } from "@/components/ui";

// S0 Settings hub.
export default async function Settings() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <Screen>
      <ScreenHeader title="Settings" />

      <ListCard>
        <LinkRow href="/settings/profile" label="Profile and account" />
      </ListCard>

      <SettingsSection title="Your rhythm">
        <LinkRow href="/settings/rhythm" label="Rhythm and energy" sub="Wake, bed, energy curve" />
        <LinkRow href="/settings/work" label="Work and focus" sub="Hours, focus blocks, breaks" />
      </SettingsSection>

      <SettingsSection title="What matters">
        <LinkRow href="/settings/priorities" label="Priorities and protected time" />
        <LinkRow href="/settings/rules" label="Learned rules" sub="1 suggestion waiting" />
      </SettingsSection>

      <SettingsSection title="Connections and alerts">
        <LinkRow href="/settings/sources" label="Sources" sub="Calendar, Gmail, reminders" />
        <LinkRow href="/settings/notifications" label="Notifications" />
      </SettingsSection>

      <SettingsSection title="Data">
        <LinkRow href="/settings/privacy" label="Privacy and data" sub="What is stored and for how long" />
        <LinkRow href="/settings/archive" label="Archive" sub="Deleted items, kept for 30 days" />
      </SettingsSection>

      <SettingsSection title="About">
        <DetailRow label="Version" value="Prototype 0.1" />
        <LinkRow href="/end-of-day" label="Daily feedback" />
        <LinkRow href="/empty-day" label="Preview: empty day" />
        <LinkRow href="/connection-lost" label="Preview: connection lost" />
        <LinkRow href="/onboarding" label="Run onboarding again" />
      </SettingsSection>

      <div className="flex-1" />
      <BottomNav active="settings" reviewCount={4} />
    </Screen>
  );
}
