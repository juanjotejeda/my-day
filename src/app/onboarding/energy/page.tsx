import { ChoiceGroup } from "@/components/controls";
import { EnergyCurve } from "@/components/energy-curve";
import { FieldBlock, NoteCard, PrimaryLink, Screen, ScreenHeader, StepHeader } from "@/components/ui";

const CHRONO = [
  { value: "early", label: "Early bird" },
  { value: "mid", label: "In between" },
  { value: "late", label: "Night owl" },
];

// O4 Your energy.
export default function Energy() {
  return (
    <Screen>
      <StepHeader back="/onboarding/rhythm" step={3} />
      <ScreenHeader title="Your energy" sub="When your focus is at its best, and when it dips." />

      <div className="rounded-card border border-line bg-white px-4 pt-1 pb-2">
        <FieldBlock label="Which sounds like you?">
          <ChoiceGroup label="Which sounds like you?" choices={CHRONO} defaultValue={["mid"]} />
        </FieldBlock>
      </div>

      <EnergyCurve />

      <NoteCard label="WHAT THIS CHANGES">
        Deep work goes into your peak window. Replies and admin go into dips. Meetings go into steady
        time when you have a choice. The energy track on Today uses this curve.
      </NoteCard>

      <PrimaryLink href="/onboarding/priorities">Continue</PrimaryLink>
      <div className="flex-1" />
    </Screen>
  );
}
