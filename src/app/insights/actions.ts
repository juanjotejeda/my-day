"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { dayDate, dayKey } from "@/lib/day";
import { prisma } from "@/lib/prisma";

/** D5: the trust answer belongs to the experiment's record, with the ratings. */
export async function saveTrust(trust: number) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== process.env.ALLOWED_EMAIL?.toLowerCase()) {
    return { ok: false as const, message: "Not signed in." };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false as const, message: "Not signed in." };

  const today = dayDate(dayKey(new Date()));
  await prisma.dayReview.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    update: { trust },
    create: { userId: user.id, date: today, trust },
  });

  revalidatePath("/insights");
  return { ok: true as const, message: "Saved." };
}
