import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { EnergyCurveSaving } from "@/components/energy-curve-saving";
import { SettingsFields } from "@/components/settings-fields";
import { ListCard, NoteCard, PrimaryLink, Screen, ScreenHeader, StepHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { ENERGY_STEP } from "@/lib/settings-spec";

// O4 Your energy. The curve and the chronotype save as they are set.
export default async function Energy() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) redirect("/signin");
  const settings = await loadSettings(user.id);

  return (
    <Screen>
      <StepHeader back="/onboarding/rhythm" step={3} />
      <ScreenHeader title="Your energy" sub="When your focus is at its best, and when it dips." />

      <ListCard>
        <SettingsFields fields={ENERGY_STEP} values={settings} />
      </ListCard>

      <EnergyCurveSaving
        peak={settings.rhythm.peakStart}
        dip={settings.rhythm.dip}
        secondWind={settings.rhythm.secondWind}
      />

      <NoteCard label="WHAT THIS CHANGES">
        Deep work goes into your peak window. Replies and admin go into dips. Meetings go into steady
        time when you have a choice. The energy track on Today uses this curve.
      </NoteCard>

      <PrimaryLink href="/onboarding/priorities">Continue</PrimaryLink>
      <div className="flex-1" />
    </Screen>
  );
}
