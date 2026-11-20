import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ChoiceGroup, SwitchRow } from "@/components/controls";
import {
  DetailRow,
  FieldBlock,
  NoteCard,
  PrimaryLink,
  Screen,
  ScreenHeader,
  SettingsSection,
  StepHeader,
} from "@/components/ui";

const VIP = [
  { value: "cof", label: "Co-founder" },
  { value: "lena", label: "Lena Hoffmann" },
  { value: "school", label: "Thiago's school" },
  { value: "add", label: "+ Add person" },
];

// O5 What matters.
export default async function Priorities() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <Screen>
      <StepHeader back="/onboarding/energy" step={4} />
      <ScreenHeader title="What matters" sub="Who comes first, and the time nothing may touch." />

      <SettingsSection title="When things clash">
        <DetailRow label="1  Family" value="First" />
        <DetailRow label="2  Clients" />
        <DetailRow label="3  Team" />
        <DetailRow label="4  Admin" value="Last" />
        <p className="py-1.5 text-[13px] leading-relaxed text-muted">
          Reordering arrives with the settings screens.
        </p>
      </SettingsSection>

      <SettingsSection title="People who always count">
        <FieldBlock label="Items from these people rank higher">
          <ChoiceGroup label="People who always count" multi choices={VIP} defaultValue={["cof", "lena", "school"]} />
        </FieldBlock>
      </SettingsSection>

      <SettingsSection title="Protected time">
        <SwitchRow label="Exercise" sub="Mon, Wed, Fri at 07:30" defaultOn />
        <SwitchRow label="Family dinner" sub="Every day at 18:30" defaultOn />
        <SwitchRow label="No work at weekends" defaultOn />
      </SettingsSection>

      <NoteCard label="WHAT THIS CHANGES">
        Items from these people rank higher. Protected time is never used for work, and clashes are
        solved in the order above.
      </NoteCard>

      <PrimaryLink href="/onboarding/focus">Continue</PrimaryLink>
      <div className="flex-1" />
    </Screen>
  );
}
