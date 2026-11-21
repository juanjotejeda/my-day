import type { Item } from "@/generated/prisma/client";

import { TIMEZONE, dayDate, dayKey, minutesOfDay } from "@/lib/day";
import { carryForward } from "@/lib/plan/carry";
import { DEFAULT_RHYTHM } from "@/lib/plan/curve";
import { prisma } from "@/lib/prisma";
import { plan, type Rule, type SchedulerItem, type SchedulerSettings } from "@/lib/scheduler/plan";
import { vipFromRules } from "@/lib/rules/store";
import { loadSettings } from "@/lib/settings";

const DEFAULT_TASK_MIN = 30;

/** The day in minutes from midnight, as the scheduler wants it. */
function toSchedulerItem(item: Item): SchedulerItem {
  const start = item.start ? minutesOfDay(item.start) : undefined;
  const end = item.end ? minutesOfDay(item.end) : undefined;
  const fixed = item.fixed && start !== undefined;

  return {
    id: item.id,
    title: item.title,
    fixed,
    start,
    end,
    durationMin: fixed && end !== undefined && start !== undefined
      ? end - start
      : (item.flexibleDuration ?? DEFAULT_TASK_MIN),
    rank: item.rank,
    category: item.category,
    effort: item.effort ?? (item.type === "task" ? "light" : "meeting"),
    important: item.important,
    dueDay: item.day ? dayKey(item.day, "UTC") : undefined,
  };
}

export async function schedulerSettingsFor(userId: string): Promise<SchedulerSettings> {
  const [settings, ruleVips] = await Promise.all([loadSettings(userId), vipFromRules(userId)]);
  return {
    rhythm: {
      ...DEFAULT_RHYTHM,
      peakStart: settings.rhythm.peakStart,
      dip: settings.rhythm.dip,
      secondWind: settings.rhythm.secondWind,
      wake: settings.rhythm.wake,
      bed: settings.rhythm.bed,
    },
    work: {
      days: settings.work.days,
      start: settings.work.start,
      end: settings.work.end,
      hardStop: settings.work.hardStop,
      lunchStart: settings.work.lunchStart,
      lunchLength: settings.work.lunchLength,
    },
    focus: {
      blockLength: settings.focus.blockLength,
      breakLength: settings.focus.breakLength,
      maxFocusHours: settings.focus.maxFocusHours,
      bufferMin: settings.focus.bufferMin,
      meetingWarn: settings.focus.meetingWarn,
    },
    priorities: {
      clashOrder: settings.priorities.clashOrder,
      vipPeople: [...new Set([...settings.priorities.vipPeople, ...ruleVips])],
    },
    protectedTime: settings.protectedTime,
  };
}

/** Turns a Date on the day into the minute of that day, in Juan's timezone. */
function minutesToDate(day: Date, minutes: number): Date {
  const key = dayKey(day, "UTC");
  // Build the wall-clock time in TIMEZONE, then let the Date hold the instant.
  const offsetMinutes = wallClockOffset(key);
  return new Date(Date.parse(`${key}T00:00:00Z`) + (minutes - offsetMinutes) * 60_000);
}

/** The timezone's offset in minutes for a given day, so wall-clock times land right. */
function wallClockOffset(key: string): number {
  const noon = new Date(`${key}T12:00:00Z`);
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(noon);
  const [hours, minutes] = local.split(":").map(Number);
  return hours * 60 + minutes - 12 * 60;
}

export type PlanRun = {
  placed: number;
  later: number;
  overloaded: boolean;
  /** What happened to one item, for the toast after an add. */
  reasonFor(itemId: string): { start?: Date; end?: Date; reason: string } | null;
};

/**
 * Runs the scheduler for one day and writes the placements back onto the items,
 * so every screen reads a day that is already planned.
 */
export async function runPlan(userId: string, day: Date, now = new Date()): Promise<PlanRun> {
  const key = dayKey(day, "UTC");
  const items = await prisma.item.findMany({
    // Moved covers an item carried from an earlier day or pushed to this one:
    // it is still to be done, so the scheduler must see it.
    where: { userId, day: dayDate(key), status: { in: ["planned", "done", "moved"] }, archivedAt: null },
  });

  const plannable = items.filter((item) => !item.allDay);
  if (!plannable.length) {
    return { placed: 0, later: 0, overloaded: false, reasonFor: () => null };
  }

  const [settings, ruleRows] = await Promise.all([
    schedulerSettingsFor(userId),
    prisma.rule.findMany({ where: { userId, active: true } }),
  ]);

  const rules: Rule[] = ruleRows.map((rule) => ({
    id: rule.id,
    kind: rule.kind,
    active: rule.active,
    params: (rule.params as Record<string, unknown>) ?? {},
  }));

  const isToday = key === dayKey(now);
  // Deep work already behind us today still counts against the day's budget.
  const focusSpentMin = plannable
    .filter((item) => item.effort === "deep" && item.start && item.end)
    .filter((item) => item.status === "done" || (item.end as Date) <= now)
    .reduce((total, item) => total + ((item.end as Date).getTime() - (item.start as Date).getTime()) / 60_000, 0);

  const result = plan({
    day: key,
    items: plannable.map(toSchedulerItem),
    settings,
    rules,
    earliest: isToday ? minutesOfDay(now) : undefined,
    focusSpentMin: isToday ? Math.round(focusSpentMin) : 0,
  });

  // A split task keeps one row: the first block's start, the last block's end.
  // ponytail: one row per task, so a split shows as one longer block; separate
  // rows per block can come when the UI needs to show the break between them.
  const byItem = new Map<string, { start: number; end: number; reason: string }>();
  for (const placement of result.placements) {
    if (placement.fixed) continue;
    const baseId = placement.id.replace(/-\d+$/, "");
    const current = byItem.get(baseId);
    byItem.set(baseId, {
      start: current ? Math.min(current.start, placement.start) : placement.start,
      end: current ? Math.max(current.end, placement.end) : placement.end,
      reason: current ? current.reason : placement.reason,
    });
  }

  const writes = [];
  for (const [itemId, slot] of byItem) {
    writes.push(
      prisma.item.update({
        where: { id: itemId },
        data: {
          start: minutesToDate(day, slot.start),
          end: minutesToDate(day, slot.end),
          reason: slot.reason,
        },
      }),
    );
  }
  for (const postponed of result.later) {
    writes.push(
      prisma.item.update({
        where: { id: postponed.id },
        data: { start: null, end: null, reason: postponed.reason },
      }),
    );
  }
  if (writes.length) await prisma.$transaction(writes);

  await prisma.eventLog.create({
    data: {
      userId,
      kind: "plan_run",
      payload: {
        day: key,
        placed: byItem.size,
        later: result.later.length,
        overloaded: result.overloaded,
      },
    },
  });

  return {
    placed: byItem.size,
    later: result.later.length,
    overloaded: result.overloaded,
    reasonFor(itemId) {
      const slot = byItem.get(itemId);
      if (slot) {
        return {
          start: minutesToDate(day, slot.start),
          end: minutesToDate(day, slot.end),
          reason: slot.reason,
        };
      }
      const postponed = result.later.find((entry) => entry.id === itemId);
      return postponed ? { reason: postponed.reason } : null;
    },
  };
}

/**
 * Brings unfinished items from past days onto today, so nothing is lost behind
 * the date it was planned for. Idempotent: once an item is on today it stays.
 */
export async function carryForwardToToday(userId: string, now = new Date()): Promise<number> {
  const today = dayKey(now);
  const stale = await prisma.item.findMany({
    where: {
      userId,
      archivedAt: null,
      day: { lt: dayDate(today), not: null },
      status: { in: ["planned", "moved"] },
    },
  });

  const ids = carryForward(
    stale.map((item) => ({
      id: item.id,
      day: item.day ? dayKey(item.day, "UTC") : null,
      status: item.status,
      allDay: item.allDay,
      sourceKind: item.sourceKind,
      category: item.category,
      start: item.start,
    })),
    today,
  );
  if (!ids.length) return 0;

  await prisma.item.updateMany({
    where: { id: { in: ids } },
    // Status moved marks it as carried, so the screens can say where it is from.
    data: { day: dayDate(today), start: null, end: null, status: "moved" },
  });

  await prisma.eventLog.create({
    data: { userId, kind: "carried_forward", payload: { day: today, count: ids.length } },
  });

  return ids.length;
}
