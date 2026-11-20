/**
 * Turns repeated corrections into rules to propose. Pure, so the thresholds are
 * testable: the spec asks for a suggestion after three of the same correction
 * on similar items (docs/SPEC.md, "Corrections to rules").
 */
export const SUGGEST_AFTER = 3;
/** Corrections stop counting after this long, so an old habit fades. */
export const EVIDENCE_DAYS = 60;

export type CorrectionContext = {
  effort?: string | null;
  sourceKind?: string | null;
  category?: string | null;
  sender?: string | null;
  /** What the correction changed it to, where that matters. */
  after?: string | null;
};

export type CorrectionRecord = {
  kind: "tomorrow" | "important" | "more_time" | "category" | "done" | "moved_time" | "dismissed";
  context: CorrectionContext;
  createdAt: Date;
};

export type RuleSuggestion = {
  kind: "extra_minutes" | "category" | "rank" | "ignore_sender" | "vip_person";
  text: string;
  params: Record<string, string | number>;
  evidenceCount: number;
};

type Group = { key: string; suggestion: Omit<RuleSuggestion, "evidenceCount">; count: number };

const EFFORT_WORDS: Record<string, string> = {
  deep: "Deep work",
  light: "Light tasks",
  meeting: "Meetings",
  errand: "Errands",
  break: "Breaks",
};

function effortWord(effort?: string | null): string {
  return EFFORT_WORDS[effort ?? ""] ?? "These items";
}

/** What one correction would mean as a rule, or nothing. */
function asRule(record: CorrectionRecord): Omit<RuleSuggestion, "evidenceCount"> | null {
  const { kind, context } = record;

  if (kind === "more_time" && context.effort) {
    return {
      kind: "extra_minutes",
      text: `${effortWord(context.effort)} need 30 minutes more than planned`,
      params: { effort: context.effort, minutes: 30 },
    };
  }

  if (kind === "category" && context.effort && context.after) {
    return {
      kind: "category",
      text: `${effortWord(context.effort)} are ${context.after}, not ${
        context.after === "personal" ? "work" : "personal"
      }`,
      params: { effort: context.effort, category: context.after },
    };
  }

  if (kind === "tomorrow" && context.effort) {
    return {
      kind: "rank",
      text: `${effortWord(context.effort)} are rarely today's work: rank them Could`,
      params: { effort: context.effort, rank: "could" },
    };
  }

  if (kind === "dismissed" && context.sender) {
    return {
      kind: "ignore_sender",
      text: `Mail from ${context.sender} is never a task`,
      params: { sender: context.sender },
    };
  }

  if (kind === "important" && context.sender) {
    return {
      kind: "vip_person",
      text: `${context.sender} always counts`,
      params: { person: context.sender },
    };
  }

  return null;
}

function keyOf(suggestion: Omit<RuleSuggestion, "evidenceCount">): string {
  return `${suggestion.kind}:${Object.entries(suggestion.params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${value}`)
    .join(",")}`;
}

/** The rules worth proposing, given the corrections and the rules already known. */
export function suggestRules(
  corrections: CorrectionRecord[],
  existing: { kind: string; params: Record<string, unknown> }[] = [],
  now = new Date(),
): RuleSuggestion[] {
  const cutoff = now.getTime() - EVIDENCE_DAYS * 86_400_000;
  const known = new Set(
    existing.map((rule) =>
      keyOf({
        kind: rule.kind as RuleSuggestion["kind"],
        text: "",
        params: (rule.params ?? {}) as Record<string, string | number>,
      }),
    ),
  );

  const groups = new Map<string, Group>();
  for (const record of corrections) {
    if (record.createdAt.getTime() < cutoff) continue;
    const suggestion = asRule(record);
    if (!suggestion) continue;

    const key = keyOf(suggestion);
    const group = groups.get(key);
    if (group) group.count += 1;
    else groups.set(key, { key, suggestion, count: 1 });
  }

  return [...groups.values()]
    .filter((group) => group.count >= SUGGEST_AFTER && !known.has(group.key))
    .sort((a, b) => b.count - a.count)
    .map((group) => ({ ...group.suggestion, evidenceCount: group.count }));
}
