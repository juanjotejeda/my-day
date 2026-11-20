import type { PlanItem } from "./types.ts";

/**
 * Real calendar events plus the sample items for everything not connected yet.
 * When the day holds real events, the design's Calendar samples step aside so
 * Juan sees his own day; on a day with no events the full sample day shows, so
 * the screen can still be judged.
 */
export function mergeWithSample(real: PlanItem[], sample: PlanItem[]): PlanItem[] {
  if (!real.length) return sample;
  const filler = sample.filter((item) => item.source !== "Calendar");
  const taken = new Set(real.map((item) => `${item.start}-${item.end}`));
  return [...real, ...filler.filter((item) => !taken.has(`${item.start}-${item.end}`))];
}
