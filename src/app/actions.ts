"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { ParsedInput } from "@/lib/parse/input";
import {
  addDraft as addDraftFor,
  addFromText as addFromTextFor,
  applyCorrection as applyCorrectionFor,
  replanToday as replanTodayFor,
  type AddResult,
  type CorrectionKind,
} from "@/lib/plan/add";
import { prisma } from "@/lib/prisma";

export type { AddResult, CorrectionKind };

/** The one allowed account, or nothing. */
async function me() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== process.env.ALLOWED_EMAIL?.toLowerCase()) return null;
  return prisma.user.findUnique({ where: { email } });
}

export async function addFromText(said: string): Promise<AddResult> {
  const user = await me();
  if (!user) return { ok: false, message: "Not signed in." };
  const result = await addFromTextFor(user.id, said);
  revalidatePath("/");
  return result;
}

export async function addDraft(draft: ParsedInput): Promise<AddResult> {
  const user = await me();
  if (!user) return { ok: false, message: "Not signed in." };
  const result = await addDraftFor(user.id, draft);
  revalidatePath("/");
  return result;
}

export async function applyCorrection(itemId: string, kind: CorrectionKind): Promise<AddResult> {
  const user = await me();
  if (!user) return { ok: false, message: "Not signed in." };
  const result = await applyCorrectionFor(user.id, itemId, kind);
  revalidatePath("/");
  return result;
}

export async function replanToday(): Promise<AddResult> {
  const user = await me();
  if (!user) return { ok: false, message: "Not signed in." };
  const result = await replanTodayFor(user.id);
  revalidatePath("/");
  return result;
}
