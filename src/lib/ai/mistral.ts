/**
 * The only place that talks to Mistral. Features call this module, never the
 * API directly, so the provider stays swappable (docs/SPEC.md, lib/ai).
 */
const BASE = "https://api.mistral.ai/v1";

export const CHAT_MODEL = "mistral-small-latest";
export const TRANSCRIBE_MODEL = "voxtral-mini-latest";

export class MistralNotConfigured extends Error {}

function key(): string {
  const value = process.env.MISTRAL_API_KEY?.trim();
  if (!value) throw new MistralNotConfigured("MISTRAL_API_KEY is not set");
  return value;
}

async function call(path: string, init?: RequestInit) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${key()}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  if (!response.ok) {
    // Never let a key reach a log line or an error message.
    throw new Error(`Mistral ${path} failed: ${response.status} ${text.slice(0, 200)}`);
  }
  return JSON.parse(text) as unknown;
}

export type Ping = {
  ok: true;
  models: number;
  chatModelAvailable: boolean;
  transcribeModelAvailable: boolean;
  answer: string;
  latencyMs: number;
};

/** Checks the key works: lists the models, then asks for one short answer. */
export async function ping(): Promise<Ping> {
  const startedAt = Date.now();

  const list = (await call("/models")) as { data?: { id?: string }[] };
  const ids = (list.data ?? []).map((model) => model.id ?? "");

  const completion = (await call("/chat/completions", {
    method: "POST",
    body: JSON.stringify({
      model: CHAT_MODEL,
      max_tokens: 8,
      temperature: 0,
      messages: [{ role: "user", content: "Reply with the single word: ready" }],
    }),
  })) as { choices?: { message?: { content?: string } }[] };

  return {
    ok: true,
    models: ids.length,
    chatModelAvailable: ids.includes(CHAT_MODEL),
    transcribeModelAvailable: ids.includes(TRANSCRIBE_MODEL),
    answer: (completion.choices?.[0]?.message?.content ?? "").trim().slice(0, 40),
    latencyMs: Date.now() - startedAt,
  };
}

/**
 * Voxtral turns a short recording into text. The audio is never written to
 * disk and is dropped as soon as the transcript comes back (docs/SPEC.md).
 */
export async function transcribe(audio: Blob, filename: string, bias?: string[]): Promise<string> {
  const form = new FormData();
  form.append("model", TRANSCRIBE_MODEL);
  form.append("file", audio, filename);
  if (bias?.length) form.append("prompt", `Names that may be said: ${bias.join(", ")}.`);

  const response = await fetch(`${BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key()}` },
    body: form,
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Mistral transcription failed: ${response.status} ${text.slice(0, 200)}`);

  const body = JSON.parse(text) as { text?: string };
  return (body.text ?? "").trim();
}
