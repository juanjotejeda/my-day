import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SettingsFields } from "@/components/settings-fields";
import { NoteCard, PrimaryLink, Screen, ScreenHeader, SettingsSection, StepHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { FOCUS_STEP } from "@/lib/settings-spec";

// O6 Focus and breaks.
export default async function Focus() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) redirect("/signin");
  const settings = await loadSettings(user.id);

  return (
    <Screen>
      <StepHeader back="/onboarding/priorities" step={5} />
      <ScreenHeader title="Focus and breaks" sub="How long you work in one go, and what sits between." />

      <SettingsSection title="Focus">
        <SettingsFields fields={FOCUS_STEP} values={settings} />
      </SettingsSection>

      <NoteCard label="WHAT THIS CHANGES">
        Long tasks are split into focus blocks with a break after each. Buffers keep meetings from
        running back to back.
      </NoteCard>

      <PrimaryLink href="/onboarding/ready">Build my first day</PrimaryLink>
      <div className="flex-1" />
    </Screen>
  );
}
