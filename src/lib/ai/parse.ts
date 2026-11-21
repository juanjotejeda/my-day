import { z } from "zod";

import { parseInput, type ParsedInput } from "@/lib/parse/input";

import { mergeParsed } from "./merge";

import { CHAT_MODEL } from "./mistral";

/**
 * Turns a spoken or typed line into a draft with Mistral, validated with Zod
 * (docs/SPEC.md, structured outputs). The deterministic parser answers first
 * and stands in whenever the model is unavailable or returns nonsense.
 */
const schema = z.object({
  type: z.enum(["gcal", "appt", "reminder", "task"]),
  title: z.string().min(1).max(80),
  day: z.enum(["today", "tomorrow"]),
  time: z.string(),
  duration_min: z.number(),
  effort: z.enum(["deep", "light", "meeting", "errand"]),
  /** A date, when the line names one rather than today or tomorrow. */
  due: z.string().nullable().optional(),
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
    "Read the line into one entry for a personal day planner. The person checks every field before it is saved, so read it as you see it.",
    "A reminder is a nudge at a set time. An appointment is an event with other people or a place. A task is work the person does alone, whether or not it names an hour.",
    "Answer gcal only when the line asks for a calendar event.",
    "Never invent a time that was not said: use an empty string, and the app fills a sensible default.",
    "due is an ISO date when the line names a day other than today or tomorrow.",
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

    // The model's reading is the starting point: it sees the whole sentence, and
    // every field is checked and shown in the composer before anything is saved.
    return mergeParsed(parsed.data, fallback);
  } catch {
    // A model that is slow, down or odd must never block the add bar.
    return fallback;
  }
}
