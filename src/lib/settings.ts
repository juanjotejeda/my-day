import type { z } from "zod";

import { SECTIONS } from "./settings-schemas.ts";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export { SECTIONS };
export type SectionName = keyof typeof SECTIONS;
export type Settings = { [K in SectionName]: z.infer<(typeof SECTIONS)[K]> };

/** Settings columns hold rhythm, work, focus, priorities, protected and notifications;
 *  privacy and profile live inside the notifications-adjacent JSON to avoid a migration. */
const COLUMN: Record<SectionName, "rhythm" | "work" | "focus" | "priorities" | "protectedTime" | "notifications"> = {
  rhythm: "rhythm",
  work: "work",
  focus: "focus",
  priorities: "priorities",
  protectedTime: "protectedTime",
  notifications: "notifications",
  privacy: "priorities",
  profile: "rhythm",
  appearance: "rhythm",
};

const NESTED: Partial<Record<SectionName, string>> = {
  privacy: "privacy",
  profile: "profile",
  appearance: "appearance",
};

function parse<K extends SectionName>(section: K, value: unknown): Settings[K] {
  const result = SECTIONS[section].safeParse(value ?? {});
  return (result.success ? result.data : SECTIONS[section].parse({})) as Settings[K];
}

/** Every section, with defaults for anything never saved. */
export async function loadSettings(userId: string): Promise<Settings> {
  const row = await prisma.settings.findUnique({ where: { userId } });
  const raw = (row ?? {}) as Record<string, unknown>;

  const read = (section: SectionName) => {
    const column = raw[COLUMN[section]] as Record<string, unknown> | undefined;
    const nested = NESTED[section];
    return nested ? (column?.[nested] as unknown) : column;
  };

  return Object.fromEntries(
    (Object.keys(SECTIONS) as SectionName[]).map((section) => [section, parse(section, read(section))]),
  ) as Settings;
}

/** Saves one section, merging into its column, and keeps a history row. */
export async function saveSection<K extends SectionName>(userId: string, section: K, values: unknown) {
  const parsed = SECTIONS[section].partial().parse(values);
  const current = await loadSettings(userId);
  const merged = { ...current[section], ...parsed };
  const column = COLUMN[section];
  const nested = NESTED[section];

  const existing = await prisma.settings.findUnique({ where: { userId } });
  const columnValue = ((existing?.[column] as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const nextColumn = nested ? { ...columnValue, [nested]: merged } : { ...columnValue, ...merged };

  await prisma.settings.upsert({
    where: { userId },
    update: { [column]: nextColumn as Prisma.InputJsonValue },
    create: { userId, [column]: nextColumn as Prisma.InputJsonValue },
  });

  await prisma.settingsHistory.create({
    data: { userId, settings: { section, values: merged } as Prisma.InputJsonValue },
  });

  return merged;
}
