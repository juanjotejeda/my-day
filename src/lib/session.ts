import { cache } from "react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadSettings, type Settings } from "@/lib/settings";

/**
 * One request asks for the session, the user and the settings many times: the
 * layout for the theme, the page for its data, a component for a count. React
 * cache keeps each of those to a single query per request.
 */
export const currentSession = cache(async () => auth());

export const currentUser = cache(async () => {
  const session = await currentSession();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== process.env.ALLOWED_EMAIL?.toLowerCase()) return null;
  return prisma.user.findUnique({ where: { email } });
});

export const currentSettings = cache(async (): Promise<Settings | null> => {
  const user = await currentUser();
  return user ? loadSettings(user.id) : null;
});

/** The settings for this user, read once per request. */
export const settingsFor = cache(async (userId: string): Promise<Settings> => {
  const settings = await currentSettings();
  if (settings) return settings;
  return loadSettings(userId);
});
