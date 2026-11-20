import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** How many candidates are waiting, for the badge on the bottom bar. */
export async function reviewCount(): Promise<number> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return 0;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return 0;
  return prisma.candidate.count({ where: { userId: user.id, state: "open" } });
}
