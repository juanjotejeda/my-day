/**
 * Who may delete what. Pure, so the rule is testable without touching a real
 * calendar: only items My Day created can go, and an event from anywhere else
 * is deleted where it was made.
 */
export type DeleteDecision =
  | { kind: "delete"; inGoogle: boolean }
  | { kind: "ask-google" }
  | { kind: "refuse"; message: string };

export function deleteDecision(item: {
  sourceKind: "calendar" | "gmail" | "manual" | "voice";
  createdHere: boolean;
}): DeleteDecision {
  if (item.sourceKind === "calendar") {
    if (item.createdHere) return { kind: "delete", inGoogle: true };
    // The event may still carry My Day's marker from before this was stored.
    return { kind: "ask-google" };
  }

  if (item.sourceKind === "manual" || item.sourceKind === "voice") {
    return { kind: "delete", inGoogle: false };
  }

  return {
    kind: "refuse",
    message: "This item came from your email. Dismiss it in Review instead.",
  };
}

export const CALENDAR_REFUSAL = "This event came from your calendar. Delete this in Google Calendar.";
