/**
 * The same meeting can sit in two calendars you follow: your own copy and the
 * one on a calendar you share. Google gives each copy its own calendar id, so
 * both arrive, and the day shows the appointment twice.
 *
 * Pure, so the rule is testable: an event is a copy of another when the title
 * and the exact times match. The oldest row stays and the rest go.
 */
export type DedupeRow = {
  id: string;
  title: string;
  start: Date | null;
  end: Date | null;
  createdAt: Date;
};

export function keyOf(row: { title: string; start: Date | null; end: Date | null }): string {
  return [
    row.title.trim().toLowerCase(),
    row.start ? row.start.toISOString() : "none",
    row.end ? row.end.toISOString() : "none",
  ].join("|");
}

/** The ids of the extra copies, oldest row of each group kept. */
export function duplicateIds(rows: DedupeRow[]): string[] {
  const seen = new Map<string, DedupeRow>();
  const extra: string[] = [];

  for (const row of [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const key = keyOf(row);
    const first = seen.get(key);
    if (first) extra.push(row.id);
    else seen.set(key, row);
  }

  return extra;
}
