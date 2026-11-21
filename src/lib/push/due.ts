/**
 * Which notifications are due this minute, and what they say. Pure, so the
 * times, the quiet hours and the wording are all testable (docs/SPEC.md,
 * "Notifications").
 */
export type PushSettings = {
  morning: boolean;
  morningAt: string;
  evening: boolean;
  eveningAt: string;
  close: boolean;
  beforeEvents: number;
  foundItems: "now" | "batch";
  silentInFocus: boolean;
  quietStart: string;
  quietEnd: string;
  /** From the work settings: close the day follows it. */
  workEnd: string;
};

export type FixedItem = { title: string; minute: number; where?: string | null };

export type DayState = {
  meetings: number;
  mustCount: number;
  reviewCount: number;
  doneCount: number;
  plannedCount: number;
  firstFixed: FixedItem | null;
  firstFixedTomorrow: FixedItem | null;
  carriedOver: number;
  /** The next fixed item today, for the lead-time nudge. */
  nextFixed: FixedItem | null;
  inFocusBlock: boolean;
  /** Candidates found since the last run, for the Right away setting. */
  newCandidates?: { id: string; title: string }[];
};

export type DuePush = {
  key: string;
  title: string;
  body: string;
  url: string;
  /** A fixed event may interrupt quiet hours and focus blocks; nothing else may. */
  urgent: boolean;
};

/** How late a scheduled notification may still be sent, in minutes. */
export const GRACE_MIN = 9;

function toMinutes(time: string): number {
  const [hours, minutes] = (time ?? "").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function fmt(minute: number): string {
  return `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

/** Quiet hours can run over midnight, so the window wraps. */
function inQuietHours(now: number, settings: PushSettings): boolean {
  const start = toMinutes(settings.quietStart);
  const end = toMinutes(settings.quietEnd);
  return start <= end ? now >= start && now < end : now >= start || now < end;
}

function due(now: number, at: number): boolean {
  return now >= at && now <= at + GRACE_MIN;
}

export function dueNotifications({
  now,
  settings,
  day,
  alreadySent,
}: {
  now: number;
  settings: PushSettings;
  day: DayState;
  alreadySent: string[];
}): DuePush[] {
  const pushes: DuePush[] = [];
  const sent = new Set(alreadySent);

  // A fixed event inside the lead time: the one thing that may interrupt.
  if (settings.beforeEvents > 0 && day.nextFixed) {
    const lead = day.nextFixed.minute - settings.beforeEvents;
    if (due(now, lead)) {
      pushes.push({
        key: `before:${day.nextFixed.minute}`,
        title: day.nextFixed.title,
        body: [`At ${fmt(day.nextFixed.minute)}`, day.nextFixed.where].filter(Boolean).join(" · "),
        url: "/",
        urgent: true,
      });
    }
  }

  const silenced = inQuietHours(now, settings) || (settings.silentInFocus && day.inFocusBlock);

  if (!silenced) {
    if (settings.morning && due(now, toMinutes(settings.morningAt))) {
      pushes.push({
        key: "morning",
        title: "Your day",
        body: morningBody(day),
        url: "/",
        urgent: false,
      });
    }

    if (settings.evening && due(now, toMinutes(settings.eveningAt))) {
      const first = day.firstFixedTomorrow;
      const carried = day.carriedOver
        ? `${day.carriedOver} ${day.carriedOver === 1 ? "item" : "items"} carried over`
        : "nothing carried over";
      pushes.push({
        key: "evening",
        title: "Tomorrow",
        body: first ? `${first.title} at ${fmt(first.minute)} · ${carried}` : `Nothing fixed yet · ${carried}`,
        url: "/tomorrow",
        urgent: false,
      });
    }

    if (settings.close && due(now, toMinutes(settings.workEnd) + 30)) {
      pushes.push({
        key: "close",
        title: "Close the day",
        body: `${day.doneCount} of ${day.plannedCount} done. Two questions and you are finished.`,
        url: "/end-of-day",
        urgent: false,
      });
    }

    // Right away: one per candidate. Batched ones ride in the morning overview.
    if (settings.foundItems === "now") {
      for (const candidate of day.newCandidates ?? []) {
        pushes.push({
          key: `candidate:${candidate.id}`,
          title: "Found in your email",
          body: candidate.title,
          url: "/review",
          urgent: false,
        });
      }
    }
  }

  return pushes.filter((push) => !sent.has(push.key));
}

function morningBody(day: DayState): string {
  const parts: string[] = [];
  parts.push(day.meetings ? `${day.meetings} ${day.meetings === 1 ? "meeting" : "meetings"}` : "No meetings");
  if (day.firstFixed) parts.push(`first: ${day.firstFixed.title} at ${fmt(day.firstFixed.minute)}`);
  if (day.mustCount) parts.push(`${day.mustCount} must happen`);
  if (day.reviewCount) parts.push(`${day.reviewCount} waiting in Review`);

  if (!day.meetings && !day.firstFixed && !day.mustCount && !day.reviewCount) {
    return "Nothing fixed today. The day is yours.";
  }
  return parts.join(" · ");
}
