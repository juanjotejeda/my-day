"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { ParsedInput } from "@/lib/parse/input";
import type { ComposerDraft } from "@/lib/plan/draft";
import {
  addDraft as addDraftFor,
  deleteItem as deleteItemFor,
  editItem as editItemFor,
  moveItem as moveItemFor,
  restoreItem as restoreItemFor,
  unpinItem as unpinItemFor,
  addFromText as addFromTextFor,
  applyCorrection as applyCorrectionFor,
  replanToday as replanTodayFor,
  type AddResult,
  type CorrectionKind,
} from "@/lib/plan/add";
import {
  acceptCandidate as acceptCandidateFor,
  dismissCandidate as dismissCandidateFor,
} from "@/lib/plan/candidates";
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

export async function addDraft(draft: ParsedInput | ComposerDraft): Promise<AddResult> {
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

export async function deleteItem(itemId: string): Promise<AddResult> {
  const user = await me();
  if (!user) return { ok: false, message: "Not signed in." };
  const result = await deleteItemFor(user.id, itemId);
  revalidatePath("/");
  return result;
}

export async function editItem(
  itemId: string,
  fields: { title?: string; date?: string; time?: string; minutes?: number },
): Promise<AddResult> {
  const user = await me();
  if (!user) return { ok: false, message: "Not signed in." };
  const result = await editItemFor(user.id, itemId, fields);
  revalidatePath("/");
  revalidatePath(`/item/${itemId}`);
  return result;
}

export async function restoreArchived(itemId: string): Promise<AddResult> {
  const user = await me();
  if (!user) return { ok: false, message: "Not signed in." };
  const result = await restoreItemFor(user.id, itemId);
  revalidatePath("/");
  revalidatePath("/settings/archive");
  return result;
}

export async function acceptCandidate(candidateId: string): Promise<AddResult> {
  const user = await me();
  if (!user) return { ok: false, message: "Not signed in." };
  const result = await acceptCandidateFor(user.id, candidateId);
  revalidatePath("/");
  revalidatePath("/review");
  return result;
}

export async function dismissCandidate(candidateId: string): Promise<AddResult> {
  const user = await me();
  if (!user) return { ok: false, message: "Not signed in." };
  const result = await dismissCandidateFor(user.id, candidateId);
  revalidatePath("/review");
  return result;
}

export async function moveItem(
  itemId: string,
  when: { date: string; time: string; allDay?: boolean },
): Promise<AddResult> {
  const user = await me();
  if (!user) return { ok: false, message: "Not signed in." };
  const result = await moveItemFor(user.id, itemId, when);
  revalidatePath("/");
  revalidatePath("/tomorrow");
  return result;
}

export async function unpinItem(itemId: string): Promise<AddResult> {
  const user = await me();
  if (!user) return { ok: false, message: "Not signed in." };
  const result = await unpinItemFor(user.id, itemId);
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
