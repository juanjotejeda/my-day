import { DetailRow, PrimaryLink, Screen, ScreenHeader } from "@/components/ui";

// O1 Welcome. Sign-in itself happens on /signin with the real Google consent.
export default function Welcome() {
  return (
    <Screen>
      <div className="h-10" />
      <ScreenHeader
        label="Welcome"
        title="My Day"
        size={64}
        sub="One calm view of your day. Calendar, email follow-ups, reminders and tasks, placed around your energy and what matters to you."
      />
      <div className="h-3" />

      <div className="flex flex-col gap-2.5 rounded-card bg-surface p-4">
        <DetailRow label="Reads, never sends" sub="Read-only access to Google Calendar and Gmail" />
        <DetailRow label="Explains every item" sub="Each item links back to where it came from" />
        <DetailRow label="Learns from you" sub="Your corrections become rules you control" />
      </div>

      <div className="h-6" />
      <PrimaryLink href="/onboarding/connect">Continue with Google</PrimaryLink>
      <p className="text-center text-[13px] leading-relaxed text-muted">
        Personal experiment. Your data stays in your own setup.
      </p>
      <div className="flex-1" />
    </Screen>
  );
}
