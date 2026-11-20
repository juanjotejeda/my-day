import { redirect } from "next/navigation";

import { SwitchRow } from "@/components/controls";
import { auth } from "@/auth";
import {
  BackHeader,
  ListCard,
  NoteCard,
  Screen,
  ScreenHeader,
  SettingsSection,
} from "@/components/ui";

// S6 Learned rules. Real rules and suggestions arrive with milestone 6.
const STATED = ["Do not schedule work after 18:00", "Gym is personal, not work"];
const LEARNED = [
  "Proposals take 2h, not 1h",
  "Invoice questions are Should, not Must",
  "Afternoon tasks need 15 min extra",
  "Lena Hoffmann always counts",
  "Newsletters are never tasks",
];

export default async function Rules() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <Screen>
      <BackHeader href="/settings" label="Settings" />
      <ScreenHeader title="Learned rules" sub="Your corrections, turned into rules you control." />

      <div className="flex flex-col gap-2.5 rounded-card border border-sky bg-surface p-4">
        <div className="text-xs tracking-[0.08em] text-accent">SUGGESTION</div>
        <p className="text-[15px] leading-relaxed">
          You moved admin tasks to Friday 5 times. Plan admin on Fridays?
        </p>
        <div className="flex gap-2">
          <button type="button" className="min-h-11 flex-1 rounded-full bg-navy text-sm text-white">
            Make it a rule
          </button>
          <button
            type="button"
            className="min-h-11 flex-1 rounded-full border border-sky bg-white text-sm text-navy"
          >
            Not now
          </button>
        </div>
      </div>

      <SettingsSection title="Rules from you">
        {STATED.map((rule) => (
          <SwitchRow key={rule} label={rule} defaultOn />
        ))}
      </SettingsSection>

      <SettingsSection title="Learned from corrections">
        {LEARNED.map((rule) => (
          <SwitchRow key={rule} label={rule} defaultOn />
        ))}
      </SettingsSection>

      <NoteCard label="HOW RULES WORK">
        Rules apply from the next plan. Turning one off keeps it here so you can turn it back on.
      </NoteCard>

      <ListCard>
        <button type="button" className="flex min-h-14 w-full items-center text-[15px] text-alert-ink">
          Reset all learned rules
        </button>
      </ListCard>

      <div className="flex-1" />
    </Screen>
  );
}
