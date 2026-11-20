import { SwitchRow } from "@/components/controls";
import {
  LinkRow,
  ListCard,
  NoteCard,
  PrimaryLink,
  Screen,
  ScreenHeader,
  SecondaryLink,
  SettingsSection,
  StepHeader,
} from "@/components/ui";

// O2 Connect Google.
export default function Connect() {
  return (
    <Screen>
      <StepHeader back="/onboarding" step={1} />
      <ScreenHeader title="Connect Google" sub="My Day reads two things. You choose both." />

      <SettingsSection title="Access">
        <SwitchRow
          label="Google Calendar"
          sub="See your events and free time. Read-only."
          defaultOn
        />
        <SwitchRow
          label="Gmail"
          sub="Find requests, deadlines and promises in your email. Read-only."
          defaultOn
        />
      </SettingsSection>

      <NoteCard label="WHAT MY DAY WILL NOT DO">
        My Day never sends email, never deletes anything and never changes events that already exist.
        It stores the items it extracts and a link back to the source, not your full emails.
      </NoteCard>

      <ListCard>
        <LinkRow href="/settings/privacy" label="Privacy and data" value="Details" />
      </ListCard>

      <div className="h-2" />
      <PrimaryLink href="/onboarding/rhythm">Allow read-only access</PrimaryLink>
      <SecondaryLink href="/onboarding/rhythm">Skip Gmail for now</SecondaryLink>
      <div className="flex-1" />
    </Screen>
  );
}
