import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ChoiceGroup, TimeRow } from "@/components/controls";
import {
  FieldBlock,
  NoteCard,
  PrimaryLink,
  Screen,
  ScreenHeader,
  SettingsSection,
  StepHeader,
} from "@/components/ui";

const DAYS = [
  { value: "mo", label: "Mon" },
  { value: "tu", label: "Tue" },
  { value: "we", label: "Wed" },
  { value: "th", label: "Thu" },
  { value: "fr", label: "Fri" },
  { value: "sa", label: "Sat" },
  { value: "su", label: "Sun" },
];

// O3 Your rhythm.
export default async function Rhythm() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <Screen>
      <StepHeader back="/onboarding/connect" step={2} />
      <ScreenHeader title="Your rhythm" sub="When your day starts, when work happens and when it stops." />

      <SettingsSection title="Day">
        <TimeRow label="Wake up" defaultValue="06:45" />
        <TimeRow label="Bedtime" defaultValue="23:00" />
      </SettingsSection>

      <SettingsSection title="Work">
        <FieldBlock label="Working days">
          <ChoiceGroup
            label="Working days"
            multi
            choices={DAYS}
            defaultValue={["mo", "tu", "we", "th", "fr"]}
          />
        </FieldBlock>
        <TimeRow label="Work starts" defaultValue="08:30" />
        <TimeRow label="Work ends" defaultValue="18:00" />
        <TimeRow label="Lunch" defaultValue="12:00" />
      </SettingsSection>

      <NoteCard label="WHAT THIS CHANGES">
        Nothing is placed before you wake up or in the last hour before bed. Work tasks stay inside
        working days and hours. Lunch is kept free.
      </NoteCard>

      <PrimaryLink href="/onboarding/energy">Continue</PrimaryLink>
      <div className="flex-1" />
    </Screen>
  );
}
