import type { Draft } from "./types.ts";

/**
 * Turns a spoken line into a draft, the same reading the design does.
 * Milestone 3 replaces this with a Mistral parse call behind lib/ai.
 */
export function parseSpeech(said: string): Draft {
  const text = said || "";
  const lower = text.toLowerCase();

  let type: Draft["type"] = "task";
  if (/remind/.test(lower)) type = "reminder";
  else if (/(meeting|call with|appointment|dentist|doctor|lunch with|dinner with|coffee with)/.test(lower)) {
    type = "appt";
  }

  const day: Draft["day"] = /tomorrow/.test(lower) ? "tomorrow" : "today";

  let time = "";
  const at = lower.match(/at (\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/);
  if (at) {
    let hour = Number.parseInt(at[1], 10);
    const minute = at[2] ? Number.parseInt(at[2], 10) : 0;
    if (at[3] === "pm" && hour < 12) hour += 12;
    if (at[3] === "am" && hour === 12) hour = 0;
    if (!at[3] && hour < 7) hour += 12;
    time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const cleaned = text
    .replace(/^\s*(please\s+)?(remind me to|remind me|add a task to|add)\s+/i, "")
    .replace(/\s+tomorrow/i, "")
    .replace(/\s+today/i, "")
    .replace(/\s+at \d{1,2}([:.]\d{2})?\s*(am|pm)?/i, "")
    .trim();

  return {
    type,
    day,
    time,
    dur: 30,
    text: cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "",
  };
}
