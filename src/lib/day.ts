// Everything the app shows is in Juan's timezone, not the server's.
export const TIMEZONE = process.env.TZ || "Europe/Berlin";

export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 22;

/** The calendar day a moment falls on, as YYYY-MM-DD in TIMEZONE. */
export function dayKey(at: Date, timeZone = TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** A YYYY-MM-DD key as the UTC midnight Date that Postgres stores in a date column. */
export function dayDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

export function hhmm(at: Date, timeZone = TIMEZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

/** Minutes since midnight in TIMEZONE, for placing a block on the day strip. */
export function minutesOfDay(at: Date, timeZone = TIMEZONE): number {
  const [h, m] = hhmm(at, timeZone).split(":").map(Number);
  return h * 60 + m;
}

/** Where a moment sits on the strip, 0 to 1 across the DAY_START_HOUR to DAY_END_HOUR window. */
export function stripPosition(at: Date, timeZone = TIMEZONE): number {
  const span = (DAY_END_HOUR - DAY_START_HOUR) * 60;
  return Math.min(1, Math.max(0, (minutesOfDay(at, timeZone) - DAY_START_HOUR * 60) / span));
}
