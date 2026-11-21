/**
 * Who may delete what. Pure, so the rule is testable without touching a real
 * calendar: anything can leave My Day, but an event My Day did not create is
 * deleted where it was made. Email is read-only, so an item found in an email
 * leaves the plan and the message itself is never touched.
 */
export type DeleteDecision = { kind: "delete"; inGoogle: boolean } | { kind: "ask-google" };

export function deleteDecision(item: {
  sourceKind: "calendar" | "gmail" | "manual" | "voice";
  createdHere: boolean;
}): DeleteDecision {
  if (item.sourceKind === "calendar") {
    if (item.createdHere) return { kind: "delete", inGoogle: true };
    // The event may still carry My Day's marker from before this was stored.
    return { kind: "ask-google" };
  }

  // Typed, spoken, or found in an email: it only ever lived here.
  return { kind: "delete", inGoogle: false };
}

export const CALENDAR_REFUSAL = "This event came from your calendar. Delete this in Google Calendar.";
