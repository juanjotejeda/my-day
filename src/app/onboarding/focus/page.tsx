import { ChoiceGroup, SwitchRow } from "@/components/controls";
import { FieldBlock, NoteCard, PrimaryLink, Screen, ScreenHeader, SettingsSection, StepHeader } from "@/components/ui";

const FOCUS = [
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
  { value: "120", label: "2 hours" },
];
const BREAKS = [
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
  { value: "20", label: "20 min" },
];
const BUFFERS = [
  { value: "0", label: "None" },
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
];

// O6 Focus and breaks.
export default function Focus() {
  return (
    <Screen>
      <StepHeader back="/onboarding/priorities" step={5} />
      <ScreenHeader title="Focus and breaks" sub="How long you work in one go, and what sits between." />

      <SettingsSection title="Focus">
        <FieldBlock label="Focus block">
          <ChoiceGroup label="Focus block" choices={FOCUS} defaultValue={["120"]} />
        </FieldBlock>
        <FieldBlock label="Break after focus">
          <ChoiceGroup label="Break after focus" choices={BREAKS} defaultValue={["15"]} />
        </FieldBlock>
        <FieldBlock label="Buffer between meetings">
          <ChoiceGroup label="Buffer between meetings" choices={BUFFERS} defaultValue={["10"]} />
        </FieldBlock>
        <SwitchRow label="Hard stop at end of work" sub="Never plan work after 18:00" defaultOn />
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
