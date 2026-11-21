import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";

export type Theme = "day" | "night";

/** The theme this user chose, or day for anyone not signed in. */
export async function currentTheme(): Promise<Theme> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== process.env.ALLOWED_EMAIL?.toLowerCase()) return "day";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return "day";

  const settings = await loadSettings(user.id);
  return settings.appearance.theme;
}
