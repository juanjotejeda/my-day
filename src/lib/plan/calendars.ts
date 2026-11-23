/**
 * Which calendar an item came from. The sync stores `calendarId:eventId`, and
 * Google writes your own calendar as either "primary" or your email address.
 * Pure, so "is this mine?" is testable without a Google account.
 */
export function calendarOf(sourceRef: string | null): string | null {
  if (!sourceRef) return null;
  const at = sourceRef.indexOf(":");
  return at > 0 ? sourceRef.slice(0, at) : null;
}

export function fromAnotherCalendar(sourceRef: string | null, email: string): boolean {
  const calendar = calendarOf(sourceRef);
  if (!calendar) return false;
  return calendar !== "primary" && calendar.toLowerCase() !== email.toLowerCase();
}
