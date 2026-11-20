import { type Rhythm, levelAt, levelOf, peakWindow, toMinutes } from "../plan/curve.ts";

/**
 * The scheduler: a pure function, so it runs the same in tests, in the worker
 * and after every edit (docs/SPEC.md, "Scheduling rules").
 */

export type Effort = "deep" | "light" | "meeting" | "errand" | "break";
export type Rank = "must" | "should" | "could" | "protected" | "later";
export type Category = "work" | "personal";

export type SchedulerItem = {
  id: string;
  title: string;
  fixed: boolean;
  /** Minutes from midnight, for fixed items. */
  start?: number;
  end?: number;
  durationMin: number;
  rank: Rank;
  category: Category;
  effort: Effort;
  important?: boolean;
  /** ISO date, for ordering by what is due first. */
  dueDay?: string;
  /** Who asked, so priority people come first. */
  person?: string;
  /** Which clash group this belongs to: family, clients, team, admin. */
  group?: string;
};

export type Placement = {
  id: string;
  title: string;
  start: number;
  end: number;
  fixed: boolean;
  rank: Rank;
  category: Category;
  effort: Effort;
  important: boolean;
  reason: string;
};

export type Postponed = { id: string; title: string; reason: string };

export type Rule = {
  id: string;
  kind: string;
  active: boolean;
  params: Record<string, unknown>;
};

export type SchedulerSettings = {
  rhythm: Rhythm;
  work: {
    days: string[];
    start: string;
    end: string;
    hardStop: boolean;
    lunchStart: string;
    lunchLength: number;
  };
  focus: {
    blockLength: number;
    breakLength: number;
    maxFocusHours: number;
    bufferMin: number;
    meetingWarn: number;
  };
  priorities: { clashOrder: string[]; vipPeople: string[] };
  protectedTime: { exercise: boolean; familyDinner: boolean; noWorkWeekends: boolean };
};

export type PlanResult = {
  placements: Placement[];
  later: Postponed[];
  overloaded: boolean;
  fixedMinutes: number;
  flexibleMinutes: number;
  availableMinutes: number;
};

type Interval = { start: number; end: number };

const DAY_END = 24 * 60;
const STEP = 15;
const WEEKDAY_KEYS = ["su", "mo", "tu", "we", "th", "fr", "sa"];
const RANK_ORDER: Record<Rank, number> = { must: 0, protected: 0, should: 1, could: 2, later: 3 };

function weekdayKey(day: string): string {
  return WEEKDAY_KEYS[new Date(`${day}T12:00:00Z`).getUTCDay()];
}

function merge(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const span of sorted) {
    const last = out[out.length - 1];
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else out.push({ ...span });
  }
  return out;
}

function free(span: Interval, busy: Interval[]): boolean {
  return !busy.some((taken) => span.start < taken.end && span.end > taken.start);
}

/** Which energy level each effort wants to sit in. */
function wantedLevel(effort: Effort): 0 | 1 | 2 | null {
  if (effort === "deep") return 2;
  if (effort === "meeting") return 1;
  if (effort === "light" || effort === "errand") return 0;
  return null;
}

function roundUp(minute: number): number {
  return Math.ceil(minute / STEP) * STEP;
}

/** Rules that change an item before it is placed (step 7 of the order). */
function applyRules(item: SchedulerItem, rules: Rule[]): SchedulerItem {
  let next = { ...item };
  for (const rule of rules) {
    if (!rule.active) continue;
    const params = rule.params ?? {};

    if (rule.kind === "extra_minutes") {
      const effort = params.effort as Effort | undefined;
      const minutes = Number(params.minutes ?? 0);
      if (!item.fixed && minutes && (!effort || effort === next.effort)) {
        next = { ...next, durationMin: next.durationMin + minutes };
      }
    }

    if (rule.kind === "category") {
      const match = String(params.match ?? "").toLowerCase();
      const category = params.category as Category | undefined;
      const hit = match && (next.id.toLowerCase() === match || next.title.toLowerCase().includes(match));
      if (hit && category) next = { ...next, category };
    }

    if (rule.kind === "rank") {
      const match = String(params.match ?? "").toLowerCase();
      const rank = params.rank as Rank | undefined;
      const hit = match && (next.id.toLowerCase() === match || next.title.toLowerCase().includes(match));
      if (hit && rank) next = { ...next, rank };
    }
  }
  return next;
}

function sortFlexible(items: SchedulerItem[], settings: SchedulerSettings): SchedulerItem[] {
  const clash = settings.priorities.clashOrder;
  const vip = settings.priorities.vipPeople.map((person) => person.toLowerCase());

  return [...items].sort((a, b) => {
    const rank = RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
    if (rank) return rank;

    const important = Number(b.important ?? false) - Number(a.important ?? false);
    if (important) return important;

    const due = (a.dueDay ?? "9999-12-31").localeCompare(b.dueDay ?? "9999-12-31");
    if (due) return due;

    const vipA = a.person && vip.includes(a.person.toLowerCase()) ? 0 : 1;
    const vipB = b.person && vip.includes(b.person.toLowerCase()) ? 0 : 1;
    if (vipA !== vipB) return vipA - vipB;

    const groupA = a.group ? clash.indexOf(a.group) : clash.length;
    const groupB = b.group ? clash.indexOf(b.group) : clash.length;
    if (groupA !== groupB) return groupA - groupB;

    return a.id.localeCompare(b.id);
  });
}

/** Split anything longer than one focus block, with a break between the parts. */
function intoBlocks(item: SchedulerItem, blockLength: number): { suffix: string; minutes: number }[] {
  if (item.effort === "meeting" || item.durationMin <= blockLength) {
    return [{ suffix: "", minutes: item.durationMin }];
  }
  const parts: { suffix: string; minutes: number }[] = [];
  let left = item.durationMin;
  let index = 1;
  while (left > 0) {
    const minutes = Math.min(blockLength, left);
    parts.push({ suffix: `-${index}`, minutes });
    left -= minutes;
    index += 1;
  }
  return parts;
}

export function plan({
  day,
  items,
  settings,
  rules = [],
  earliest,
}: {
  day: string;
  items: SchedulerItem[];
  settings: SchedulerSettings;
  rules?: Rule[];
  /** Nothing is placed before this minute, so a re-plan never moves work into the past. */
  earliest?: number;
}): PlanResult {
  const { rhythm, work, focus } = settings;
  const wake = toMinutes(rhythm.wake);
  const bed = toMinutes(rhythm.bed);
  const workStart = toMinutes(work.start);
  const workEnd = toMinutes(work.end);
  const lunchStart = toMinutes(work.lunchStart);
  const isWorkday = work.days.includes(weekdayKey(day));
  const [peakStart, peakEnd] = peakWindow(rhythm);

  // Step 1: block the frame.
  const frame: Interval[] = [
    { start: 0, end: wake },
    { start: Math.max(bed - 60, 0), end: DAY_END },
    { start: lunchStart, end: lunchStart + work.lunchLength },
  ];
  if (earliest !== undefined) frame.push({ start: 0, end: earliest });

  // Step 2: fixed items hold their times.
  const fixed = items
    .filter((item) => item.fixed && item.start !== undefined && item.end !== undefined)
    .sort((a, b) => (a.start as number) - (b.start as number));

  const placements: Placement[] = fixed.map((item) => ({
    id: item.id,
    title: item.title,
    start: item.start as number,
    end: item.end as number,
    fixed: true,
    rank: item.rank,
    category: item.category,
    effort: item.effort,
    important: Boolean(item.important),
    reason:
      item.rank === "protected"
        ? `Protected time, ${fmtRange(item.start as number, item.end as number)}, kept free of work.`
        : `Fixed in your calendar, ${fmtRange(item.start as number, item.end as number)}.`,
  }));

  // Step 3: buffers around meetings.
  const busy = merge([
    ...frame,
    ...fixed.map((item) => {
      const buffer = item.effort === "meeting" ? focus.bufferMin : 0;
      return { start: (item.start as number) - buffer, end: (item.end as number) + buffer };
    }),
  ]);

  // Steps 4 and 7: rank the flexible items, with rules applied first.
  const flexible = sortFlexible(
    items.filter((item) => !item.fixed).map((item) => applyRules(item, rules)),
    settings,
  );

  const later: Postponed[] = [];
  let focusPlaced = 0;

  for (const item of flexible) {
    if (item.category === "work" && !isWorkday && settings.protectedTime.noWorkWeekends) {
      later.push({ id: item.id, title: item.title, reason: "Weekends are protected, so this waits for Monday." });
      continue;
    }

    // Where this item is allowed to sit at all.
    const rangeStart = item.category === "work" ? Math.max(wake, workStart) : wake;
    const rangeEnd =
      item.category === "work" && isWorkday && work.hardStop ? Math.min(workEnd, bed - 60) : bed - 60;

    // Step 5: split long tasks into focus blocks.
    const blocks = intoBlocks(item, focus.blockLength);
    const placedParts: Placement[] = [];
    let cursor = rangeStart;
    let failed = false;

    for (const block of blocks) {
      if (item.effort === "deep" && focusPlaced + block.minutes > focus.maxFocusHours * 60) {
        failed = true;
        break;
      }

      // Step 6: the best free slot, by energy, then the earliest that fits.
      const slot =
        findSlot(block.minutes, cursor, rangeEnd, busy, rhythm, wantedLevel(item.effort), [peakStart, peakEnd]) ??
        findSlot(block.minutes, cursor, rangeEnd, busy, rhythm, null, [peakStart, peakEnd]);

      if (!slot) {
        failed = true;
        break;
      }

      placedParts.push({
        id: `${item.id}${block.suffix}`,
        title: blocks.length > 1 ? `${item.title} (${placedParts.length + 1} of ${blocks.length})` : item.title,
        start: slot.start,
        end: slot.end,
        fixed: false,
        rank: item.rank,
        category: item.category,
        effort: item.effort,
        important: Boolean(item.important),
        reason: reasonFor(item, slot, rhythm, [peakStart, peakEnd]),
      });

      busy.push({ start: slot.start, end: slot.end });
      busy.sort((a, b) => a.start - b.start);
      cursor = slot.end + focus.breakLength;
      if (item.effort === "deep") focusPlaced += block.minutes;
    }

    if (failed || placedParts.length !== blocks.length) {
      // Steps 8: whatever does not fit goes to Later, with the reason why.
      for (const part of placedParts) {
        const index = busy.findIndex((span) => span.start === part.start && span.end === part.end);
        if (index >= 0) busy.splice(index, 1);
      }
      later.push({
        id: item.id,
        title: item.title,
        reason:
          item.effort === "deep" && focusPlaced >= focus.maxFocusHours * 60
            ? "No focus time left today, so this waits."
            : "No free slot today.",
      });
      continue;
    }

    placements.push(...placedParts);
  }

  const fixedMinutes = placements
    .filter((p) => p.fixed && p.rank !== "protected")
    .reduce((total, p) => total + (p.end - p.start), 0);
  const flexibleMinutes = placements
    .filter((p) => !p.fixed)
    .reduce((total, p) => total + (p.end - p.start), 0);
  const availableMinutes = Math.max(0, workEnd - workStart - settings.work.lunchLength);
  const meetings = placements.filter((p) => p.effort === "meeting").length;

  return {
    placements: placements.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id)),
    later,
    overloaded:
      later.length > 0 || fixedMinutes + flexibleMinutes > availableMinutes || meetings > focus.meetingWarn,
    fixedMinutes,
    flexibleMinutes,
    availableMinutes,
  };
}

function findSlot(
  minutes: number,
  from: number,
  until: number,
  busy: Interval[],
  rhythm: Rhythm,
  level: 0 | 1 | 2 | null,
  peak: [number, number],
): Interval | null {
  for (let start = roundUp(Math.max(from, 0)); start + minutes <= until; start += STEP) {
    const span = { start, end: start + minutes };
    if (!free(span, busy)) continue;
    if (level !== null) {
      // Judge the energy in the middle of the block, and keep deep work inside the peak.
      const middle = Math.floor((span.start + span.end) / 2);
      if (levelAt(middle, rhythm) !== level) continue;
      if (level === 2 && (span.start < peak[0] || span.end > peak[1])) continue;
    }
    return span;
  }
  return null;
}

function fmtRange(start: number, end: number): string {
  const fmt = (minute: number) =>
    `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  return `${fmt(start)} to ${fmt(end)}`;
}

function reasonFor(
  item: SchedulerItem,
  slot: Interval,
  rhythm: Rhythm,
  peak: [number, number],
): string {
  const where = fmtRange(slot.start, slot.end);
  const inPeak = slot.start >= peak[0] && slot.end <= peak[1];
  const level = levelOf(Math.floor((slot.start + slot.end) / 2), rhythm);

  if (item.effort === "deep") {
    return inPeak
      ? `Placed in your peak focus hours, ${where}.`
      : `Deep work, ${where}: your peak was taken, this was the next slot that fits.`;
  }
  if (item.effort === "meeting") return `Placed in steady time, ${where}, where calls sit well.`;
  if (item.effort === "light" || item.effort === "errand") {
    return level.name === "Low energy"
      ? `Placed at ${where}, in your dip, where light tasks fit.`
      : `Placed at ${where}, the first slot that fits.`;
  }
  return `Placed at ${where}, the first slot that fits.`;
}
