import { z } from "zod";

import { bestQuote } from "@/lib/parse/email";

import { CHAT_MODEL } from "./mistral";

/**
 * Reads one email into the items Juan must do or attend, and nothing else.
 * The only place extraction happens, so the provider stays swappable
 * (docs/SPEC.md, "Email extraction with Mistral").
 */
export const extractedItem = z.object({
  kind: z.enum(["task", "appointment", "reminder", "later"]),
  title: z.string().min(1).max(60),
  due: z.string().nullable(),
  start: z.string().nullable(),
  duration_min: z.number().int().min(5).max(480).nullable(),
  person: z.string().nullable(),
  quote: z.string().max(200),
  promise_by_me: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export const extraction = z.object({ items: z.array(extractedItem).max(5) });

export type ExtractedItem = z.infer<typeof extractedItem>;

const JSON_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "my_day_extraction",
    strict: true,
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: ["task", "appointment", "reminder", "later"] },
              title: { type: "string", description: "short imperative, max 60 characters" },
              due: { type: ["string", "null"], description: "ISO date or null" },
              start: { type: ["string", "null"], description: "ISO datetime or null" },
              duration_min: { type: ["integer", "null"] },
              person: { type: ["string", "null"], description: "who asked or is involved" },
              quote: { type: "string", description: "the exact line it came from, max 200 characters" },
              promise_by_me: { type: "boolean" },
              confidence: { type: "number" },
            },
            required: [
              "kind",
              "title",
              "due",
              "start",
              "duration_min",
              "person",
              "quote",
              "promise_by_me",
              "confidence",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
} as const;

export type EmailForExtraction = {
  from: string;
  to: string;
  date: string;
  subject: string;
  text: string;
};

export type ExtractContext = {
  today: string;
  timezone: string;
  name: string;
  addresses: string[];
  vipPeople?: string[];
  topics?: string[];
};

export type ExtractionResult =
  | { ok: true; items: ExtractedItem[] }
  | { ok: false; error: string };

function instructions(context: ExtractContext): string {
  return [
    `Today is ${context.today} in ${context.timezone}.`,
    `You are reading ${context.name}'s email. His addresses: ${context.addresses.join(", ")}.`,
    context.vipPeople?.length ? `People who always count: ${context.vipPeople.join(", ")}.` : "",
    context.topics?.length ? `Topics that matter: ${context.topics.join(", ")}.` : "",
    "Extract only what he must do or attend himself.",
    "A promise he made counts. A request to someone else does not. A newsletter, a receipt or a notification is never an item.",
    "When nothing is asked of him, return an empty list.",
    "quote must be copied from the email, word for word, at most 200 characters.",
    "confidence is how sure you are that this is really his to do, from 0 to 1.",
    "Use later for something with no date that can wait.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function ask(email: EmailForExtraction, context: ExtractContext): Promise<unknown> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.MISTRAL_API_KEY?.trim()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0,
      max_tokens: 700,
      response_format: JSON_SCHEMA,
      messages: [
        { role: "system", content: instructions(context) },
        {
          role: "user",
          content: [
            `From: ${email.from}`,
            `To: ${email.to}`,
            `Date: ${email.date}`,
            `Subject: ${email.subject}`,
            "",
            email.text,
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral extraction failed: ${response.status} ${(await response.text()).slice(0, 160)}`);
  }

  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("Mistral returned no content");
  return JSON.parse(content);
}

/** Asks once, and once more if the answer does not fit the schema. */
export async function extractFromEmail(
  email: EmailForExtraction,
  context: ExtractContext,
): Promise<ExtractionResult> {
  if (!process.env.MISTRAL_API_KEY?.trim()) return { ok: false, error: "MISTRAL_API_KEY is not set" };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const parsed = extraction.safeParse(await ask(email, context));
      if (parsed.success) {
        return {
          ok: true,
          // The quote has to be a line the email really contains.
          items: parsed.data.items.map((item) => ({
            ...item,
            quote: bestQuote(email.text, item.quote),
          })),
        };
      }
    } catch (error) {
      if (attempt === 1) {
        return { ok: false, error: error instanceof Error ? error.message.slice(0, 160) : "extraction failed" };
      }
    }
  }

  return { ok: false, error: "the answer did not fit the schema twice" };
}
