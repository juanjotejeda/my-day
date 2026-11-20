import type { Item } from "@/generated/prisma/client";

import { minutesOfDay } from "@/lib/day";

import type { PlanItem } from "./types";

const DEFAULT_MIN = 30;

/** A stored item as the screens want it: minutes from midnight, in Juan's timezone. */
export function toPlanItem(item: Item): PlanItem {
  const start = item.start ? minutesOfDay(item.start) : 0;
  const end = item.end ? minutesOfDay(item.end) : start + DEFAULT_MIN;

  return {
    id: item.id,
    title: item.title,
    start,
    end: end > start ? end : start + DEFAULT_MIN,
    fixed: item.fixed,
    category: item.category,
    source: item.sourceKind === "calendar" ? "Calendar" : item.sourceKind === "gmail" ? "Gmail" : "Added by you",
    why: item.reason ?? (item.sourceKind === "calendar" ? "From your Google Calendar." : "You added this."),
    rank: item.rank,
    effort: item.effort ? item.effort.charAt(0).toUpperCase() + item.effort.slice(1) : "Meeting",
    important: item.important,
    done: item.status === "done",
    createdHere: item.createdHere,
  };
}

/**
 * All-day events are banners, never blocks. An item the scheduler could not
 * place has no start, so it shows under Later with its reason.
 */
export function toPlanItems(items: Item[]): PlanItem[] {
  return items
    .filter((item) => !item.allDay)
    .map((item) => (item.start ? toPlanItem(item) : { ...toPlanItem(item), later: true }));
}
