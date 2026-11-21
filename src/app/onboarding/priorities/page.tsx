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
import { PRIORITIES_STEP } from "@/lib/settings-spec";

// O5 What matters.
export default async function Priorities() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) redirect("/signin");
  const settings = await loadSettings(user.id);

  const sections = ["When things clash", "Priority people", "Protected time"];

  return (
    <Screen>
      <StepHeader back="/onboarding/energy" step={4} />
      <ScreenHeader title="What matters" sub="Who comes first, and the time nothing may touch." />

      {sections.map((title, index) => (
        <section key={title} className="flex flex-col gap-1.5">
          <SectionTitle>{title}</SectionTitle>
          <ListCard>
            <SettingsFields fields={PRIORITIES_STEP[index]} values={settings} />
          </ListCard>
        </section>
      ))}

      <NoteCard label="WHAT THIS CHANGES">
        Items from these people rank higher. Protected time is never used for work, and clashes are
        solved in the order above.
      </NoteCard>

      <PrimaryLink href="/onboarding/focus">Continue</PrimaryLink>
      <div className="flex-1" />
    </Screen>
  );
}
