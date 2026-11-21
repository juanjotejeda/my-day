/**
 * What comes forward, and what waits. An unfinished item from a past day is
 * still to be done, so it joins today rather than disappearing behind the date
 * it was planned for.
 */
export type CarryItem = {
  id: string;
  /** ISO date, or null for Later. */
  day: string | null;
  status: "planned" | "done" | "moved" | "dropped";
  allDay: boolean;
  sourceKind: "calendar" | "gmail" | "manual" | "voice";
  category: "work" | "personal";
  start: Date | null;
};

/** The ids of the items that should move to today. */
export function carryForward(items: CarryItem[], today: string): string[] {
  return items
    .filter((item) => {
      if (!item.day || item.day >= today) return false;
      // What happened, happened: done and dropped items stay on their day.
      if (item.status === "done" || item.status === "dropped") return false;
      // A calendar event belongs to its date in Google, and all-day events are banners.
      if (item.sourceKind === "calendar" || item.allDay) return false;
      return true;
    })
    .map((item) => item.id);
}

/** How many work items are waiting for Monday, for the line on Today. */
export function weekendWaiting(
  items: { category: string; start: number | Date | null; allDay: boolean }[],
  day: { isWorkday: boolean; noWorkWeekends: boolean },
): number {
  if (day.isWorkday || !day.noWorkWeekends) return 0;
  return items.filter((item) => item.category === "work" && !item.start && !item.allDay).length;
}
