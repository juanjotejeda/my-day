import type { Prisma } from "@/generated/prisma/client";

import { gmailLink } from "@/lib/google/gmail-sync";
import { dayDate, dayKey } from "@/lib/day";
import { prisma } from "@/lib/prisma";
import { refreshSuggestions, vipFromRules } from "@/lib/rules/store";
import { runPlan } from "@/lib/plan/run";
import { loadSettings } from "@/lib/settings";

import type { AddResult } from "./add";

export const LOW_CONFIDENCE = 0.4;
export const AUTO_ADD_CONFIDENCE = 0.8;

export type ReviewCandidate = {
  id: string;
  kind: string;
  received: string;
  title: string;
  from: string;
  subject: string;
  quote: string;
  suggestion: string;
  confidence: number;
  gmailUrl: string;
  low: boolean;
};

type Extracted = {
  kind?: string;
  title?: string;
  due?: string | null;
  start?: string | null;
  duration_min?: number | null;
  person?: string | null;
  promise_by_me?: boolean;
};

const KIND_WORD: Record<string, string> = {
  task: "Task",
  appointment: "Appointment",
  reminder: "Reminder",
  later: "Later",
};

/** What the Review screen shows, newest first, low confidence last. */
export async function loadCandidates(userId: string): Promise<ReviewCandidate[]> {
  const rows = await prisma.candidate.findMany({
    where: { userId, state: "open" },
    orderBy: [{ confidence: "desc" }, { receivedAt: "desc" }],
  });

  const when = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return rows.map((row) => {
    const extracted = (row.extracted as Extracted) ?? {};
    const person = (row.from.match(/^(.*?)</)?.[1] ?? row.from).replace(/"/g, "").trim();

    return {
      id: row.id,
      kind: KIND_WORD[extracted.kind ?? "task"] ?? "Task",
      received: when.format(row.receivedAt),
      title: extracted.title ?? row.subject,
      from: person || row.from,
      subject: row.subject,
      quote: row.quote ?? "",
      suggestion: suggestionLine(extracted),
      confidence: row.confidence,
      gmailUrl: gmailLink(row.gmailMessageId),
      low: row.confidence < LOW_CONFIDENCE,
    };
  });
}

function suggestionLine(extracted: Extracted): string {
  const parts: string[] = [];
  if (extracted.kind === "later") parts.push("Later");
  if (extracted.start) parts.push(new Date(extracted.start).toISOString().slice(0, 16).replace("T", " "));
  else if (extracted.due) parts.push(`due ${extracted.due}`);
  if (extracted.duration_min) parts.push(`${extracted.duration_min} min`);
  if (extracted.promise_by_me) parts.push("you promised this");
  if (extracted.person) parts.push(extracted.person);
  return parts.length ? `Suggested: ${parts.join(" · ")}` : "Suggested: placed for you";
}

/** Accepting a candidate: it becomes an item, with the link back to the email. */
export async function acceptCandidate(userId: string, candidateId: string): Promise<AddResult> {
  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, userId } });
  if (!candidate) return { ok: false, message: "That one is gone." };

  const extracted = (candidate.extracted as Extracted) ?? {};
  const kind = extracted.kind ?? "task";
  const start = extracted.start ? new Date(extracted.start) : null;
  const day = start
    ? dayDate(dayKey(start))
    : extracted.due
      ? dayDate(extracted.due.slice(0, 10))
      : dayDate(dayKey(new Date()));

  const settings = await loadSettings(userId);
  const item = await prisma.item.create({
    data: {
      userId,
      type: kind === "appointment" ? "appointment" : kind === "reminder" ? "reminder" : "task",
      title: extracted.title ?? candidate.subject,
      start,
      end: start ? new Date(start.getTime() + (extracted.duration_min ?? 60) * 60_000) : null,
      fixed: Boolean(start),
      flexibleDuration: start ? null : (extracted.duration_min ?? 30),
      rank: kind === "later" ? "later" : extracted.promise_by_me ? "must" : "should",
      category: "work",
      effort: kind === "appointment" ? "meeting" : "light",
      day: kind === "later" ? null : day,
      sourceKind: "gmail",
      sourceRef: candidate.gmailMessageId,
      sourceUrl: gmailLink(candidate.gmailMessageId),
      sourceQuote: settings.privacy.keepQuotes ? candidate.quote : null,
      reason: `Found in an email from ${candidate.from}.`,
    },
  });

  await prisma.candidate.update({ where: { id: candidate.id }, data: { state: "accepted" } });

  if (item.day) {
    const run = await runPlan(userId, item.day);
    const placed = run.reasonFor(item.id);
    if (placed?.start) {
      return { ok: true, message: `Added. ${placed.reason}` };
    }
  }
  return { ok: true, message: kind === "later" ? "Added to Later." : "Added. No free slot today, so it waits." };
}

/** Not a task: the dismissal is the feedback that teaches the rules. */
export async function dismissCandidate(userId: string, candidateId: string): Promise<AddResult> {
  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, userId } });
  if (!candidate) return { ok: false, message: "That one is gone." };

  await prisma.candidate.update({ where: { id: candidate.id }, data: { state: "dismissed" } });
  await prisma.correction.create({
    data: {
      userId,
      kind: "dismissed",
      before: {
        from: candidate.from,
        subject: candidate.subject,
        title: (candidate.extracted as Extracted)?.title ?? null,
        context: {
          sourceKind: "gmail",
          sender: candidate.from.match(/<([^>]+)>/)?.[1] ?? candidate.from,
        },
      } as Prisma.InputJsonValue,
    },
  });

  const suggested = await refreshSuggestions(userId);
  return {
    ok: true,
    message: suggested
      ? "Noted. That is the third time, so there is a rule to look at in Learned rules."
      : "Noted. I will not suggest this again.",
  };
}

/** Candidates from priority people, sure enough to skip Review. */
export async function autoAddReady(userId: string): Promise<number> {
  const [settings, ruleVips] = await Promise.all([loadSettings(userId), vipFromRules(userId)]);
  const vip = [...settings.priorities.vipPeople, ...ruleVips].map((person) => person.toLowerCase());
  if (!vip.length) return 0;

  const open = await prisma.candidate.findMany({
    where: { userId, state: "open", confidence: { gte: AUTO_ADD_CONFIDENCE } },
  });

  let added = 0;
  for (const candidate of open) {
    const from = candidate.from.toLowerCase();
    if (!vip.some((person) => from.includes(person))) continue;
    const result = await acceptCandidate(userId, candidate.id);
    if (result.ok) added += 1;
  }
  return added;
}
