import {
  DetailRow,
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

      <SettingsSection title="What My Day reads">
        <DetailRow
          label="Google Calendar"
          sub="Your events and free time, so the day is planned around what is already fixed. It can add new events you create here, and never changes the ones you already have."
        />
        <DetailRow
          label="Gmail, read-only"
          sub="Recent messages, to find what you are asked to do or attend. Newsletters and promotions are filtered out before anything is read further."
        />
        <DetailRow
          label="You choose both"
          sub="Google asks you on the next screen, and you can withdraw either one in your Google account at any time."
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
