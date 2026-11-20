import { redirect } from "next/navigation";

import { ReviewScreen } from "@/components/review-screen";
import { auth } from "@/auth";
import { loadCandidates } from "@/lib/plan/candidates";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";

export default async function Review() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) redirect("/signin");

  const [candidates, settings] = await Promise.all([loadCandidates(user.id), loadSettings(user.id)]);
  return <ReviewScreen candidates={candidates} autoAdd={Boolean(settings.priorities.autoAddVip)} />;
}
