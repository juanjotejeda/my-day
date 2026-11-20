export const STRIP_START = 7 * 60;
export const STRIP_END = 22 * 60;

/** 620 to "10:20". */
export function fmt(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 90 to "1h 30m", 45 to "45m". */
export function dur(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Where a minute sits on the 07:00 to 22:00 strip, in percent. */
export function pct(minute: number): number {
  return Math.max(0, Math.min(100, ((minute - STRIP_START) / (STRIP_END - STRIP_START)) * 100));
}
