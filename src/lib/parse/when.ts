/**
 * Reads when something should happen: today, tomorrow, a weekday, or a date.
 * Returns the day as an ISO date and the words it read, so the title can lose
 * them. Everything is worked out against a reference date, so it is testable.
 */
export type When = { date: string; matched: string };

const WEEKDAYS = [
  ["sunday", "sun"],
  ["monday", "mon"],
  ["tuesday", "tue", "tues"],
  ["wednesday", "wed"],
  ["thursday", "thu", "thur", "thurs"],
  ["friday", "fri"],
  ["saturday", "sat"],
];

const MONTHS = [
  ["january", "jan"],
  ["february", "feb"],
  ["march", "mar"],
  ["april", "apr"],
  ["may"],
  ["june", "jun"],
  ["july", "jul"],
  ["august", "aug"],
  ["september", "sep", "sept"],
  ["october", "oct"],
  ["november", "nov"],
  ["december", "dec"],
];

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(from: string, days: number): string {
  return iso(new Date(Date.parse(`${from}T00:00:00Z`) + days * 86_400_000));
}

function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function monthIndex(word: string): number {
  const lower = word.toLowerCase();
  return MONTHS.findIndex((names) => names.includes(lower));
}

export function readWhen(said: string, today: string): When | null {
  const text = (said ?? "").trim();
  if (!text) return null;

  // An ISO date, as it is.
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return { date: isoMatch[1], matched: isoMatch[0] };

  // A day and a month, in either order.
  const monthNames = MONTHS.flat().join("|");
  const dayMonth = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})\\b`, "i"));
  const monthDay = text.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i"));
  const dated = dayMonth
    ? { day: Number(dayMonth[1]), month: monthIndex(dayMonth[2]), matched: dayMonth[0] }
    : monthDay
      ? { day: Number(monthDay[2]), month: monthIndex(monthDay[1]), matched: monthDay[0] }
      : null;

  if (dated && dated.month >= 0 && dated.day >= 1 && dated.day <= 31) {
    const year = Number(today.slice(0, 4));
    const candidate = `${year}-${String(dated.month + 1).padStart(2, "0")}-${String(dated.day).padStart(2, "0")}`;
    // A date already behind us means the same date next year.
    const date = candidate >= today ? candidate : `${year + 1}${candidate.slice(4)}`;
    return { date, matched: dated.matched };
  }

  if (/\b(today|tonight|this evening)\b/i.test(text)) {
    return { date: today, matched: (text.match(/\b(today|tonight|this evening)\b/i) as RegExpMatchArray)[0] };
  }
  if (/\b(tomorrow|tmr|tmrw)\b/i.test(text)) {
    return { date: addDays(today, 1), matched: (text.match(/\b(tomorrow|tmr|tmrw)\b/i) as RegExpMatchArray)[0] };
  }

  // A weekday on its own means its next turn. "next Monday" means that weekday
  // in the following Monday-to-Sunday week, the way a calendar reads.
  const dayNames = WEEKDAYS.flat().join("|");
  const weekday = text.match(new RegExp(`\\b(next\\s+)?(${dayNames})\\b(?!s)`, "i"));
  if (weekday) {
    const wanted = WEEKDAYS.findIndex((names) => names.includes(weekday[2].toLowerCase()));
    const current = weekdayOf(today);

    if (weekday[1]) {
      // Monday of the following week, then the weekday inside it.
      const mondayOffset = (8 - current) % 7 || 7;
      const nextMonday = addDays(today, mondayOffset);
      const within = (wanted + 6) % 7; // Monday first
      return { date: addDays(nextMonday, within), matched: weekday[0] };
    }

    // Never today: a named weekday always looks forward.
    let ahead = (wanted - current + 7) % 7;
    if (ahead === 0) ahead = 7;
    return { date: addDays(today, ahead), matched: weekday[0] };
  }

  return null;
}
