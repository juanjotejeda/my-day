import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SettingsFields } from "@/components/settings-fields";
import {
  ListCard,
  NoteCard,
  PrimaryLink,
  Screen,
  ScreenHeader,
  SectionTitle,
  StepHeader,
} from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { RHYTHM_STEP } from "@/lib/settings-spec";

// O3 Your rhythm. Every answer saves straight into the settings.
export default async function Rhythm() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) redirect("/signin");
  const settings = await loadSettings(user.id);

  return (
    <Screen>
      <StepHeader back="/onboarding/connect" step={2} />
      <ScreenHeader title="Your rhythm" sub="When your day starts, when work happens and when it stops." />

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Day</SectionTitle>
        <ListCard>
          <SettingsFields fields={RHYTHM_STEP[0]} values={settings} />
        </ListCard>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Work</SectionTitle>
        <ListCard>
          <SettingsFields fields={RHYTHM_STEP[1]} values={settings} />
        </ListCard>
      </section>

      <NoteCard label="WHAT THIS CHANGES">
        Nothing is placed before you wake up or in the last hour before bed. Work tasks stay inside
        working days and hours. Lunch is kept free.
      </NoteCard>

      <PrimaryLink href="/onboarding/energy">Continue</PrimaryLink>
      <div className="flex-1" />
    </Screen>
  );
}
