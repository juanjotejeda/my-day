import { DetailRow, NoteCard, PanelCard, PrimaryLink, Screen, ScreenHeader, SecondaryLink } from "@/components/ui";
import { TIMEZONE } from "@/lib/day";

// O7 First day ready. The counts come from the real plan once the milestones land.
export default function Ready() {
  const today = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <Screen>
      <div className="h-8" />
      <ScreenHeader label={today} title="Your first day is ready" size={40} />

      <PanelCard>
        <DetailRow label="Meetings" value="3" />
        <DetailRow label="Follow-ups from email" sub="Waiting for your review" value="2" />
        <DetailRow label="Focus time" sub="Starts 09:15, your peak" value="2h" />
        <DetailRow label="End of work" value="18:00" />
      </PanelCard>

      <NoteCard label="FIRST WEEK">
        The first week is a learning week. Move, stretch or reprioritise anything that feels wrong.
        Each correction teaches My Day how your days work.
      </NoteCard>

      <div className="h-2" />
      <PrimaryLink href="/">Open My Day</PrimaryLink>
      <SecondaryLink href="/review">Review email items first</SecondaryLink>
      <div className="flex-1" />
    </Screen>
  );
}
