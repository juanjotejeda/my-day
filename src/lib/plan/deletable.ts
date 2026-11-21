/**
 * What a delete touches. Pure, so the rule is testable without a real calendar:
 * everything can leave My Day, and only an event My Day created in Google is
 * deleted there too. An event from your own calendar stays in Google, and an
 * item found in an email never touches the message.
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

