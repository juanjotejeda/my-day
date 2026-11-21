import { redirect } from "next/navigation";

import { RulesScreen } from "@/components/rules-screen";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureStatedRules, refreshSuggestions, statedRules } from "@/lib/rules/store";

export default async function Rules() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  // Seed the stated rules once, and look for new suggestions only when a
  // correction has arrived since the newest rule was written.
  await ensureStatedRules(user.id);
  const newest = await prisma.rule.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const freshCorrections = await prisma.correction.count({
    where: { userId: user.id, ...(newest ? { createdAt: { gt: newest.createdAt } } : {}) },
  });
  if (freshCorrections) await refreshSuggestions(user.id);

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
