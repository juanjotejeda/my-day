/**
 * Reading an email down to the few lines worth sending to the model, and
 * deciding which messages never leave the app at all (docs/SPEC.md, Gmail).
 */
export const MAX_MODEL_CHARS = 6000;

type Part = {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: Part[] | null;
};

function decode(data?: string | null): string {
  if (!data) return "";
  return Buffer.from(data, "base64url").toString("utf8");
}

function findPart(part: Part, mimeType: string): Part | null {
  if (part.mimeType === mimeType && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The message as text: the plain part if there is one, else the html stripped. */
export function plainText(payload: Part | null | undefined): string {
  if (!payload) return "";
  const plain = findPart(payload, "text/plain");
  if (plain) return decode(plain.body?.data).trim();
  const html = findPart(payload, "text/html");
  if (html) return stripHtml(decode(html.body?.data));
  return decode(payload.body?.data).trim();
}

const QUOTE_MARKERS = [
  /^On .*wrote:/m,
  /^Am .*schrieb.*:/m,
  /^-{2,}\s*Original Message\s*-{2,}/im,
  /^_{5,}/m,
  /^From: .*$/m,
  /^Von: .*$/m,
  /^>.*$/m,
];

const SIGNATURE_MARKERS = [
  /^--\s*$/m,
  /^Sent from my (iPhone|iPad|Android|Samsung)/im,
  /^Mit freundlichen Grüßen/im,
  /^Best regards,?$/im,
  /^Kind regards,?$/im,
];

/** The newest message only, without quoted replies or a signature, capped. */
export function trimForModel(text: string): string {
  let body = (text ?? "").replace(/\r\n/g, "\n");

  for (const marker of [...QUOTE_MARKERS, ...SIGNATURE_MARKERS]) {
    const match = body.match(marker);
    if (match?.index !== undefined) body = body.slice(0, match.index);
  }

  return body.replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_MODEL_CHARS);
}

const TOPIC_WORDS: Record<string, string[]> = {
  news: ["newsletter", "unsubscribe", "digest", "weekly round", "bulletin"],
  promo: ["% off", "sale", "offer ends", "discount", "deal", "black friday"],
  notif: ["notification", "build passed", "build failed", "alert:", "no-reply", "noreply"],
};

export type SkipDecision = { skip: boolean; reason: string };

/** Everything that must never reach the model, filtered before any AI call. */
export function shouldSkip(
  message: {
    headers: Record<string, string>;
    labelIds: string[];
    from: string;
    subject: string;
    text?: string;
  },
  filters: { ignoreSenders?: string[]; ignoreTopics?: string[] },
): SkipDecision {
  const labels = message.labelIds ?? [];
  if (labels.includes("SPAM") || labels.includes("TRASH")) return { skip: true, reason: "spam or trash" };
  if (labels.includes("CATEGORY_PROMOTIONS")) return { skip: true, reason: "promotions" };
  if (labels.includes("CATEGORY_SOCIAL")) return { skip: true, reason: "social" };

  const headers = Object.fromEntries(
    Object.entries(message.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );
  if (headers["list-unsubscribe"] || headers["list-id"]) {
    return { skip: true, reason: "a newsletter: it carries List-Unsubscribe" };
  }

  const from = (message.from ?? "").toLowerCase();
  for (const sender of filters.ignoreSenders ?? []) {
    if (sender && from.includes(sender.toLowerCase())) {
      return { skip: true, reason: `an ignored sender: ${sender}` };
    }
  }

  const haystack = `${message.subject ?? ""} ${message.text ?? ""}`.toLowerCase();
  for (const topic of filters.ignoreTopics ?? []) {
    for (const word of TOPIC_WORDS[topic] ?? [topic]) {
      if (word && haystack.includes(word.toLowerCase())) {
        return { skip: true, reason: `an ignored topic: ${topic}` };
      }
    }
  }

  return { skip: false, reason: "" };
}

/** The header list Gmail gives back, as a plain object. */
export function headerMap(headers: { name?: string | null; value?: string | null }[] = []) {
  return Object.fromEntries(
    headers.filter((header) => header.name).map((header) => [header.name as string, header.value ?? ""]),
  );
}

/**
 * The line an item really came from. The model is asked to copy a line word for
 * word; when it paraphrases, the closest real line is used instead, so a quote
 * shown to Juan is always something the email actually says.
 */
export function bestQuote(text: string, offered: string): string {
  const candidate = (offered ?? "").trim();
  const body = (text ?? "").replace(/\r\n/g, "\n");
  if (!candidate) return "";
  if (body.includes(candidate)) return candidate.slice(0, 200);

  const words = candidate
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 3);
  if (!words.length) return "";

  let best = "";
  let bestScore = 0;
  for (const line of body.split(/\n|(?<=[.!?])\s+/)) {
    const clean = line.trim();
    if (clean.length < 12) continue;
    const lower = clean.toLowerCase();
    const score = words.filter((word) => lower.includes(word)).length / words.length;
    if (score > bestScore) {
      bestScore = score;
      best = clean;
    }
  }

  // Half the words have to be there, otherwise it is not the same sentence.
  return bestScore >= 0.5 ? best.slice(0, 200) : "";
}
