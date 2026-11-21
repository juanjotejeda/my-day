/**
 * The five measures on Insights, computed from the items, the corrections, the
 * candidates and the day reviews of the current week (docs/SPEC.md, Insights).
 * Pure, so each measure is testable and nothing is guessed.
 */
export type WeekItem = {
  day: string;
  status: string;
  effort: string | null;
  plannedMin: number;
  doneMin: number;
  /** Whether Juan corrected this item: moved, stretched or reranked it. */
  corrected: boolean;
  /**
   * Whether the plan held for this item: ticked done, or a fixed event that has
   * passed. Nobody ticks a meeting they attended, so without this the bars read
   * zero for days that went exactly as planned.
   */
  followed: boolean;
};

export type WeekInput = {
  today: string;
  items: WeekItem[];
  corrections: { day: string; kind: string }[];
  candidates: { day: string; state: "open" | "accepted" | "dismissed" }[];
  reviews: { day: string; feeling?: string | null; planRight?: string | null; trust?: number | null }[];
  planRuns: { day: string }[];
};

export type WeekMeasures = {
  start: string;
  days: string[];
  /** Percent of planned items Juan left as proposed. */
  planAccepted: number;
  correctionsPerDay: number;
  emailCorrect: { kept: number; decided: number };
  focus: { doneMin: number; plannedMin: number };
  byDay: { date: string; label: string; percent: number; planned: number }[];
  feeling: string | null;
  planRight: string | null;
  trust: number | null;
  daysReviewed: number;
  patterns: string[];
};

const LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Monday to today: the week Insights reports on. */
export function weekRange(now: Date): { start: string; days: string[] } {
  const today = new Date(`${isoDay(now)}T00:00:00Z`);
  const weekday = today.getUTCDay() || 7; // Monday is 1, Sunday is 7
  const monday = new Date(today.getTime() - (weekday - 1) * 86_400_000);

  const days: string[] = [];
  for (let index = 0; index < weekday; index += 1) {
    days.push(isoDay(new Date(monday.getTime() + index * 86_400_000)));
  }
  return { start: isoDay(monday), days };
}

function round(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function weekMeasures(input: WeekInput, now = new Date(`${input.today}T12:00:00Z`)): WeekMeasures {
  const { start, days } = weekRange(now);
  const inWeek = (day: string) => days.includes(day);

  const items = input.items.filter((item) => inWeek(item.day));
  const corrections = input.corrections.filter((correction) => inWeek(correction.day));
  const candidates = input.candidates.filter((candidate) => inWeek(candidate.day));
  const reviews = input.reviews.filter((review) => inWeek(review.day)).sort((a, b) => a.day.localeCompare(b.day));

  const planAccepted = items.length
    ? round((items.filter((item) => !item.corrected).length / items.length) * 100, 0)
    : 0;

  const kept = candidates.filter((candidate) => candidate.state === "accepted").length;
  const decided = candidates.filter((candidate) => candidate.state !== "open").length;

  const deep = items.filter((item) => item.effort === "deep");
  const focus = {
    doneMin: deep.reduce((total, item) => total + item.doneMin, 0),
    plannedMin: deep.reduce((total, item) => total + item.plannedMin, 0),
  };

  const byDay = days.map((date) => {
    const ofDay = items.filter((item) => item.day === date);
    const followed = ofDay.filter((item) => item.followed || item.status === "done").length;
    return {
      date,
      label: LABELS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7],
      percent: ofDay.length ? round((followed / ofDay.length) * 100, 0) : 0,
      planned: ofDay.length,
    };
  });

  const newest = reviews[reviews.length - 1];

  return {
    start,
    days,
    planAccepted,
    correctionsPerDay: days.length ? round(corrections.length / days.length) : 0,
    emailCorrect: { kept, decided },
    focus,
    byDay,
    feeling: newest?.feeling ?? null,
    planRight: newest?.planRight ?? null,
    trust: newest?.trust ?? null,
    daysReviewed: reviews.length,
    patterns: patternsFrom(corrections, items),
  };
}

/** Only what the week actually shows, never a claim with nothing behind it. */
function patternsFrom(corrections: { kind: string }[], items: WeekItem[]): string[] {
  const patterns: string[] = [];

  const stretched = corrections.filter((correction) => correction.kind === "more_time").length;
  if (stretched >= 3) {
    patterns.push(`Tasks ran longer than planned ${stretched} times. Stretch the ones you know are long.`);
  }

  const moved = corrections.filter((correction) => correction.kind === "tomorrow").length;
  if (moved >= 3) {
    patterns.push(`${moved} items moved to another day. The day may be holding more than it fits.`);
  }

  const deep = items.filter((item) => item.effort === "deep");
  const deepDone = deep.filter((item) => item.status === "done").length;
  if (deep.length >= 3 && deepDone < deep.length / 2) {
    patterns.push(`Only ${deepDone} of ${deep.length} deep work blocks happened. Fewer, longer blocks may hold better.`);
  }

  return patterns;
}
