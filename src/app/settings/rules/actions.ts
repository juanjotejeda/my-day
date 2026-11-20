"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { dayDate, dayKey } from "@/lib/day";
import { runPlan } from "@/lib/plan/run";
import { prisma } from "@/lib/prisma";

async function me() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== process.env.ALLOWED_EMAIL?.toLowerCase()) return null;
  return prisma.user.findUnique({ where: { email } });
}

async function replan(userId: string) {
  const now = new Date();
  await runPlan(userId, dayDate(dayKey(now)));
  await runPlan(userId, dayDate(dayKey(new Date(now.getTime() + 86_400_000))));
  revalidatePath("/");
  revalidatePath("/settings/rules");
}

/** S6: accept a suggestion. It applies from the next plan, which runs now. */
export async function acceptSuggestion(ruleId: string) {
  const user = await me();
  if (!user) return { ok: false as const, message: "Not signed in." };

  const rule = await prisma.rule.findFirst({ where: { id: ruleId, userId: user.id } });
  if (!rule) return { ok: false as const, message: "That suggestion is gone." };

  await prisma.rule.update({
    where: { id: rule.id },
    data: { active: true, origin: "learned" },
  });
  await replan(user.id);
  return { ok: true as const, message: "It is a rule now, and the plan already follows it." };
}

/** S6: not now. The suggestion goes; more of the same correction brings it back. */
export async function declineSuggestion(ruleId: string) {
  const user = await me();
  if (!user) return { ok: false as const, message: "Not signed in." };
  await prisma.rule.deleteMany({ where: { id: ruleId, userId: user.id, origin: "suggested" } });
  revalidatePath("/settings/rules");
  return { ok: true as const, message: "Left as it is." };
}

/** S6: turn a rule off without losing it, or back on. */
export async function toggleRule(ruleId: string, active: boolean) {
  const user = await me();
  if (!user) return { ok: false as const, message: "Not signed in." };
  await prisma.rule.updateMany({ where: { id: ruleId, userId: user.id }, data: { active } });
  await replan(user.id);
  return { ok: true as const, message: active ? "Back on." : "Off. It stays here if you want it again." };
}

/** S6: forget everything learned. Stated rules and settings are untouched. */
export async function resetLearnedRules() {
  const user = await me();
  if (!user) return { ok: false as const, message: "Not signed in." };
  const { count } = await prisma.rule.deleteMany({
    where: { userId: user.id, origin: { in: ["learned", "suggested"] } },
  });
  await replan(user.id);
  return { ok: true as const, message: `${count} learned ${count === 1 ? "rule" : "rules"} forgotten.` };
}
