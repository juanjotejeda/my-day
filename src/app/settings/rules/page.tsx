import { redirect } from "next/navigation";

import { RulesScreen } from "@/components/rules-screen";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureStatedRules, refreshSuggestions, statedRules } from "@/lib/rules/store";

export default async function Rules() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) redirect("/signin");

  // Opening the screen seeds the stated rules and looks for new suggestions.
  await ensureStatedRules(user.id);
  await refreshSuggestions(user.id);

  const [rules, stated] = await Promise.all([
    prisma.rule.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    statedRules(user.id),
  ]);

  return (
    <RulesScreen
      suggestions={rules
        .filter((rule) => rule.origin === "suggested")
        .map((rule) => ({ id: rule.id, text: rule.text, evidence: rule.evidenceCount }))}
      learned={rules
        .filter((rule) => rule.origin === "learned")
        .map((rule) => ({
          id: rule.id,
          text: rule.text,
          active: rule.active,
          evidence: rule.evidenceCount,
        }))}
      stated={[
        ...rules
          .filter((rule) => rule.origin === "stated")
          .map((rule) => ({ id: rule.id, text: rule.text, active: rule.active, switchable: true })),
        ...stated.map((rule) => ({ id: rule.id, text: rule.text, active: true, switchable: false })),
      ]}
    />
  );
}
