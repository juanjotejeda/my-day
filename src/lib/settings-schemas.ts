import { z } from "zod";

/** Settings are JSON columns, so Zod guards every read and write. */
export const rhythmSchema = z.object({
  wake: z.string().default("06:45"),
  bed: z.string().default("23:00"),
  chronotype: z.enum(["early", "mid", "late"]).default("mid"),
  peakStart: z.number().min(5).max(16).default(9),
  dip: z.boolean().default(true),
  secondWind: z.boolean().default(true),
  learnFromCorrections: z.boolean().default(true),
});

export const workSchema = z.object({
  days: z.array(z.string()).default(["mo", "tu", "we", "th", "fr"]),
  start: z.string().default("08:30"),
  end: z.string().default("18:00"),
  hardStop: z.boolean().default(true),
  lunchStart: z.string().default("12:00"),
  lunchLength: z.number().default(60),
});

export const focusSchema = z.object({
  blockLength: z.number().default(120),
  breakLength: z.number().default(15),
  maxFocusHours: z.number().default(4),
  bufferMin: z.number().default(10),
  meetingWarn: z.number().default(4),
});

export const prioritiesSchema = z.object({
  clashOrder: z.array(z.string()).default(["family", "clients", "team", "admin"]),
  vipPeople: z.array(z.string()).default(["cof", "lena", "school"]),
  topics: z.array(z.string()).default(["prop", "contract"]),
  ignoreTopics: z.array(z.string()).default(["news", "promo", "notif"]),
  urgentDue: z.boolean().default(true),
  urgentWaiting: z.boolean().default(true),
  urgentVip: z.boolean().default(true),
  /** Candidates from priority people, sure enough to skip Review. */
  autoAddVip: z.boolean().default(false),
});

export const protectedSchema = z.object({
  exercise: z.boolean().default(true),
  familyDinner: z.boolean().default(true),
  noWorkWeekends: z.boolean().default(true),
});

export const notificationsSchema = z.object({
  morning: z.boolean().default(true),
  morningAt: z.string().default("07:30"),
  evening: z.boolean().default(true),
  eveningAt: z.string().default("20:30"),
  close: z.boolean().default(true),
  beforeEvents: z.number().default(10),
  foundItems: z.enum(["now", "batch"]).default("batch"),
  silentInFocus: z.boolean().default(true),
  quietStart: z.string().default("21:30"),
  quietEnd: z.string().default("07:00"),
});

export const privacySchema = z.object({
  keepQuotes: z.boolean().default(true),
  retentionDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  processSentMail: z.boolean().default(true),
});

/** Night mode and the view: choices, remembered per user, never automatic.
 *  The app opens simple; the eye brings the rest of the day back. */
export const appearanceSchema = z.object({
  theme: z.enum(["day", "night"]).default("day"),
  view: z.enum(["full", "simple"]).default("simple"),
});

export const profileSchema = z.object({
  language: z.enum(["en", "de"]).default("en"),
  clock24: z.boolean().default(true),
  weekStart: z.enum(["mo", "su"]).default("mo"),
});

export const SECTIONS = {
  rhythm: rhythmSchema,
  work: workSchema,
  focus: focusSchema,
  priorities: prioritiesSchema,
  protectedTime: protectedSchema,
  notifications: notificationsSchema,
  privacy: privacySchema,
  profile: profileSchema,
  appearance: appearanceSchema,
} as const;

/**
 * What a save really changes: the validated fields the caller named. A partial
 * parse still fills in the defaults for everything else, so merging the whole
 * parse would reset the fields nobody touched: saving the view would put the
 * theme back to day.
 */
export function suppliedFields(section: keyof typeof SECTIONS, values: unknown): Record<string, unknown> {
  const parsed = SECTIONS[section].partial().parse(values) as Record<string, unknown>;
  const named = values && typeof values === "object" ? (values as Record<string, unknown>) : {};
  return Object.fromEntries(Object.entries(parsed).filter(([key]) => key in named));
}
