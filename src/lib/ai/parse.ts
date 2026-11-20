import { z } from "zod";

import { parseInput, type ParsedInput } from "@/lib/parse/input";

import { CHAT_MODEL } from "./mistral";

/**
 * Turns a spoken or typed line into a draft with Mistral, validated with Zod
 * (docs/SPEC.md, structured outputs). The deterministic parser answers first
 * and stands in whenever the model is unavailable or returns nonsense.
 */
const schema = z.object({
  type: z.enum(["gcal", "appt", "reminder", "task"]),
  title: z.string().min(1).max(60),
  day: z.enum(["today", "tomorrow"]),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).or(z.literal("")),
  duration_min: z.number().int().min(5).max(480),
  effort: z.enum(["deep", "light", "meeting", "errand"]),
});

const JSON_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "my_day_draft",
    strict: true,
    schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["gcal", "appt", "reminder", "task"] },
        title: { type: "string", description: "short imperative, max 60 characters" },
        day: { type: "string", enum: ["today", "tomorrow"] },
        time: { type: "string", description: "HH:MM in 24-hour clock, or an empty string" },
        duration_min: { type: "integer" },
        effort: { type: "string", enum: ["deep", "light", "meeting", "errand"] },
      },
      required: ["type", "title", "day", "time", "duration_min", "effort"],
      additionalProperties: false,
    },
  },
} as const;

export type ParseContext = {
  /** Today's date, so "tomorrow" means something. */
  today: string;
  timezone: string;
  /** Names worth spelling correctly. */
  people?: string[];
};

export async function parseWithMistral(said: string, context: ParseContext): Promise<ParsedInput> {
  const fallback = parseInput(said);
  if (!process.env.MISTRAL_API_KEY?.trim() || !said.trim()) return fallback;

  const prompt = [
    `Today is ${context.today} in ${context.timezone}.`,
    context.people?.length ? `People who may be mentioned: ${context.people.join(", ")}.` : "",
    "Read the line into one entry for a personal day planner.",
    "A reminder is a nudge at a set time. An appointment is a fixed meeting at a stated time. A task has no stated time and gets placed for the person.",
    "If the line states no clock time, the type is always task, whatever the wording sounds like.",
    "Never invent a time that was not said: use an empty string.",
    "Never answer gcal: creating a Google Calendar event is a choice the person makes by hand.",
    "effort: deep for focused writing or design, meeting for calls, errand for things done out of the house, light for replies and admin.",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.MISTRAL_API_KEY.trim()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0,
        max_tokens: 200,
        response_format: JSON_SCHEMA,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: said },
        ],
      }),
    });

    if (!response.ok) return fallback;

    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return fallback;

    const parsed = schema.safeParse(JSON.parse(content));
    if (!parsed.success) return fallback;

    // Two guards on the model, because both mistakes are expensive:
    // a model-invented time, and a calendar write nobody asked for.
    const time = fallback.time ? parsed.data.time || fallback.time : "";
    const type =
      parsed.data.type === "gcal" || (time === "" && parsed.data.type !== "task")
        ? ("task" as const)
        : parsed.data.type;

    return {
      type,
      // When comes from the deterministic parser: weekdays and dates are its job,
      // and a model-invented day is as costly as a model-invented time.
      date: fallback.date,
      title: parsed.data.title.trim().slice(0, 60),
      day: fallback.day,
      time,
      dur: parsed.data.duration_min,
      effort: parsed.data.effort,
    };
  } catch {
    // A model that is slow, down or odd must never block the add bar.
    return fallback;
  }
}
