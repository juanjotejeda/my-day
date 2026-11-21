import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";

import { suggestRules, type CorrectionContext, type CorrectionRecord } from "./suggest";

/** The rules the scheduler and the Gmail filters read. */
export async function activeRules(userId: string) {
  return prisma.rule.findMany({ where: { userId, active: true }, orderBy: { createdAt: "asc" } });
}

/** Senders a rule says are never a task. */
export async function ignoredSenders(userId: string): Promise<string[]> {
  const rules = await prisma.rule.findMany({
    where: { userId, active: true, kind: "ignore_sender" },
  });
  return rules
    .map((rule) => String((rule.params as { sender?: string } | null)?.sender ?? ""))
    .filter(Boolean);
}

/** Priority people a rule has learned, on top of the ones in settings. */
export async function vipFromRules(userId: string): Promise<string[]> {
  const rules = await prisma.rule.findMany({ where: { userId, active: true, kind: "vip_person" } });
  return rules
    .map((rule) => String((rule.params as { person?: string } | null)?.person ?? ""))
    .filter(Boolean);
}

/** The rules Juan asked for by name, seeded once so they are visible and switchable. */
export async function ensureStatedRules(userId: string): Promise<void> {
  const existing = await prisma.rule.findFirst({ where: { userId, kind: "carried_first" } });
  if (existing) return;

  await prisma.rule.create({
    data: {
      userId,
      text: "On Mondays, work carried over goes before work that is new",
      kind: "carried_first",
      params: { weekday: "mo" } as Prisma.InputJsonValue,
      origin: "stated",
      active: true,
    },
  });
}

/** Looks at the corrections and writes any new suggestion into the rules table. */
export async function refreshSuggestions(userId: string): Promise<number> {
  const [corrections, existing] = await Promise.all([
    prisma.correction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.rule.findMany({ where: { userId } }),
  ]);

  const records: CorrectionRecord[] = corrections.map((row) => {
    const before = (row.before as Record<string, unknown> | null) ?? {};
    const after = (row.after as Record<string, unknown> | null) ?? {};
    const context = ((before.context as CorrectionContext | undefined) ?? {}) as CorrectionContext;
    return {
      kind: row.kind,
      createdAt: row.createdAt,
      context: {
        ...context,
        after: typeof after.category === "string" ? after.category : context.after,
      },
    };
  });

  const suggestions = suggestRules(
    records,
    existing.map((rule) => ({ kind: rule.kind, params: (rule.params ?? {}) as Record<string, unknown> })),
  );

  for (const suggestion of suggestions) {
    await prisma.rule.create({
      data: {
        userId,
        text: suggestion.text,
        kind: suggestion.kind,
        params: suggestion.params as Prisma.InputJsonValue,
        origin: "suggested",
        evidenceCount: suggestion.evidenceCount,
        // A suggestion changes nothing until Juan accepts it.
        active: false,
      },
    });
  }

  return suggestions.length;
}

/** The rules Juan stated himself, read from his settings. */
export async function statedRules(userId: string) {
  const settings = await loadSettings(userId);
  const stated: { id: string; text: string; active: boolean }[] = [];

  if (settings.work.hardStop) {
    stated.push({
      id: "stated-hard-stop",
      text: `Do not schedule work after ${settings.work.end}`,
      active: true,
    });
  }
  if (settings.protectedTime.noWorkWeekends) {
    stated.push({ id: "stated-weekends", text: "No work at weekends", active: true });
  }
  if (settings.protectedTime.familyDinner) {
    stated.push({ id: "stated-dinner", text: "Family dinner is protected", active: true });
  }
  if (settings.protectedTime.exercise) {
    stated.push({ id: "stated-exercise", text: "Exercise time is protected", active: true });
  }
  for (const topic of settings.priorities.ignoreTopics) {
    stated.push({ id: `stated-ignore-${topic}`, text: `${topic} mail is never a task`, active: true });
  }

  return stated;
}
