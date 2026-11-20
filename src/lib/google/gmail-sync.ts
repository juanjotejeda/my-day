import { google, type gmail_v1 } from "googleapis";

import type { Prisma } from "@/generated/prisma/client";
import { extractFromEmail, type ExtractedItem } from "@/lib/ai/extract";
import { TIMEZONE, dayKey } from "@/lib/day";
import { MAX_MODEL_CHARS, headerMap, plainText, shouldSkip, trimForModel } from "@/lib/parse/email";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";

import { GoogleDisconnected, googleAuth, isInvalidGrant, markDisconnected, statusOf } from "./client";

const PAGE_SIZE = 50;
/** How many messages one run will read, so a first sync cannot run away. */
const MAX_PER_RUN = 25;
const DEDUPE_DAYS = 7;

export type GmailSyncResult = {
  looked: number;
  skipped: number;
  extracted: number;
  candidates: number;
  autoAdded: number;
  errors: number;
};

const empty: GmailSyncResult = { looked: 0, skipped: 0, extracted: 0, candidates: 0, autoAdded: 0, errors: 0 };

/**
 * Keeps the Review queue in step with Gmail: a history token when there is one,
 * a dated search when there is not, pre-filters before any AI call, and one
 * candidate per thing Juan is asked to do (docs/SPEC.md, Gmail and extraction).
 */
export async function syncGmail(userId: string): Promise<GmailSyncResult> {
  const { auth, source } = await googleAuth(userId);
  if (!source.scopes.some((scope) => scope.includes("gmail.readonly"))) return { ...empty };

  const gmail = google.gmail({ version: "v1", auth });
  const settings = await loadSettings(userId);
  const result: GmailSyncResult = { ...empty };

  try {
    const ids = source.gmailHistoryId
      ? await sinceHistory(gmail, source.gmailHistoryId, source)
      : await byDate(gmail, source.gmailLookbackDays, source.gmailIncludeSent);

    const fresh = await unseen(userId, ids.messageIds);
    result.looked = fresh.length;

    for (const messageId of fresh.slice(0, MAX_PER_RUN)) {
      const handled = await handleMessage(gmail, userId, messageId, settings);
      result.skipped += handled.skipped ? 1 : 0;
      result.extracted += handled.extracted;
      result.candidates += handled.candidates;
      result.autoAdded += handled.autoAdded;
      result.errors += handled.error ? 1 : 0;
    }

    await prisma.source.update({
      where: { userId_kind: { userId, kind: "google" } },
      data: { gmailHistoryId: ids.historyId ?? source.gmailHistoryId, lastError: null },
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isInvalidGrant(error)) {
      await markDisconnected(userId, message);
      throw new GoogleDisconnected(message);
    }
    await prisma.source.updateMany({ where: { userId, kind: "google" }, data: { lastError: message } });
    throw error;
  }
}

/** New messages since the stored historyId; a 404 means the token is too old. */
async function sinceHistory(
  gmail: gmail_v1.Gmail,
  historyId: string,
  source: { gmailLookbackDays: number; gmailIncludeSent: boolean },
): Promise<{ messageIds: string[]; historyId?: string }> {
  try {
    const messageIds: string[] = [];
    let pageToken: string | undefined;
    let latest: string | undefined;

    do {
      const { data } = await gmail.users.history.list({
        userId: "me",
        startHistoryId: historyId,
        historyTypes: ["messageAdded"],
        maxResults: PAGE_SIZE,
        pageToken,
      });
      for (const entry of data.history ?? []) {
        for (const added of entry.messagesAdded ?? []) {
          if (added.message?.id) messageIds.push(added.message.id);
        }
      }
      latest = data.historyId ?? latest;
      pageToken = data.nextPageToken ?? undefined;
    } while (pageToken);

    return { messageIds: [...new Set(messageIds)], historyId: latest };
  } catch (error) {
    if (statusOf(error) !== 404) throw error;
    // Gmail forgot the token: fall back to a dated search.
    return byDate(gmail, source.gmailLookbackDays, source.gmailIncludeSent);
  }
}

/** The first run, and the fallback: everything from the last N days. */
async function byDate(
  gmail: gmail_v1.Gmail,
  lookbackDays: number,
  includeSent: boolean,
): Promise<{ messageIds: string[]; historyId?: string }> {
  const inboxes = includeSent ? ["in:inbox", "in:sent"] : ["in:inbox"];
  const query = `(${inboxes.join(" OR ")}) newer_than:${lookbackDays}d -category:promotions -category:social`;

  const { data } = await gmail.users.messages.list({ userId: "me", q: query, maxResults: PAGE_SIZE });
  const messageIds = (data.messages ?? []).map((message) => message.id as string).filter(Boolean);

  const profile = await gmail.users.getProfile({ userId: "me" });
  return { messageIds, historyId: profile.data.historyId ?? undefined };
}

/** Messages no candidate and no log has seen yet. */
async function unseen(userId: string, messageIds: string[]): Promise<string[]> {
  if (!messageIds.length) return [];
  const [known, logged] = await Promise.all([
    prisma.candidate.findMany({
      where: { userId, gmailMessageId: { in: messageIds } },
      select: { gmailMessageId: true },
    }),
    // Postgres JSON filters have no "in", so the recent log is read and matched here.
    prisma.eventLog.findMany({
      where: { userId, kind: "gmail_message_seen" },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { payload: true },
    }),
  ]);

  const seen = new Set<string>(known.map((row) => row.gmailMessageId));
  for (const row of logged) {
    const id = (row.payload as { id?: string } | null)?.id;
    if (id) seen.add(id);
  }
  return messageIds.filter((id) => !seen.has(id));
}

type Handled = { skipped: boolean; extracted: number; candidates: number; autoAdded: number; error: boolean };

async function handleMessage(
  gmail: gmail_v1.Gmail,
  userId: string,
  messageId: string,
  settings: Awaited<ReturnType<typeof loadSettings>>,
): Promise<Handled> {
  const out: Handled = { skipped: false, extracted: 0, candidates: 0, autoAdded: 0, error: false };

  const { data } = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
  const headers = headerMap(data.payload?.headers ?? []);
  const from = headers.From ?? "";
  const subject = headers.Subject ?? "(no subject)";
  const to = headers.To ?? "";
  const date = headers.Date ?? new Date().toISOString();
  const body = trimForModel(plainText(data.payload));

  const decision = shouldSkip(
    { headers, labelIds: data.labelIds ?? [], from, subject, text: body.slice(0, 500) },
    { ignoreTopics: settings.priorities.ignoreTopics },
  );

  // Seen either way, so no message is read twice.
  await prisma.eventLog.create({
    data: {
      userId,
      kind: "gmail_message_seen",
      payload: { id: messageId, skipped: decision.skip, why: decision.reason } as Prisma.InputJsonValue,
    },
  });

  if (decision.skip || !body) {
    out.skipped = true;
    return out;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const extracted = await extractFromEmail(
    { from, to, date, subject, text: body.slice(0, MAX_MODEL_CHARS) },
    {
      today: dayKey(new Date()),
      timezone: TIMEZONE,
      name: user?.name ?? "Juan",
      addresses: [user?.email ?? ""].filter(Boolean),
      vipPeople: settings.priorities.vipPeople,
      topics: settings.priorities.topics,
    },
  );

  if (!extracted.ok) {
    out.error = true;
    // The reason, not the email: enough to debug without keeping content.
    await prisma.eventLog.create({
      data: {
        userId,
        kind: "gmail_extract_error",
        payload: { id: messageId, error: extracted.error } as Prisma.InputJsonValue,
      },
    });
    return out;
  }

  out.extracted = extracted.items.length;
  for (const item of extracted.items) {
    const stored = await storeCandidate(userId, {
      item,
      messageId,
      threadId: data.threadId ?? messageId,
      from,
      subject,
      receivedAt: new Date(date),
      keepQuotes: settings.privacy.keepQuotes,
    });
    if (stored === "new") out.candidates += 1;
  }

  return out;
}

/** One candidate per request, updating an open one for the same thread. */
async function storeCandidate(
  userId: string,
  input: {
    item: ExtractedItem;
    messageId: string;
    threadId: string;
    from: string;
    subject: string;
    receivedAt: Date;
    keepQuotes: boolean;
  },
): Promise<"new" | "updated"> {
  const since = new Date(Date.now() - DEDUPE_DAYS * 86_400_000);
  const open = await prisma.candidate.findFirst({
    where: { userId, threadId: input.threadId, state: "open", createdAt: { gte: since } },
  });

  const data = {
    from: input.from,
    subject: input.subject,
    receivedAt: input.receivedAt,
    // Never the body: the fields and one short quote, as the privacy page says.
    quote: input.keepQuotes ? input.item.quote.slice(0, 200) || null : null,
    extracted: input.item as unknown as Prisma.InputJsonValue,
    confidence: input.item.confidence,
  };

  if (open) {
    await prisma.candidate.update({ where: { id: open.id }, data });
    return "updated";
  }

  await prisma.candidate.create({
    data: { userId, gmailMessageId: input.messageId, threadId: input.threadId, ...data },
  });
  return "new";
}

/** The link that opens the message in Gmail. */
export function gmailLink(messageId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${messageId}`;
}
