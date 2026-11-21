"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma/client";
import { dayDate, dayKey } from "@/lib/day";
import { runPlan } from "@/lib/plan/run";
import { prisma } from "@/lib/prisma";

async function me() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== process.env.ALLOWED_EMAIL?.toLowerCase()) return null;
  return prisma.user.findUnique({ where: { email } });
}

export type CarryChoice = "tom" | "mon" | "later" | "drop";

/**
 * D4: saves the answers to day_reviews and moves whatever was left open.
 * The rating and the note are the experiment's record, kept for 12 months.
 */
export async function closeTheDay(input: {
  feeling?: string;
  planRight?: string;
  note?: string;
  carry: Record<string, CarryChoice>;
}) {
  const user = await me();
  if (!user) return { ok: false as const, message: "Not signed in." };

  const now = new Date();
  const today = dayDate(dayKey(now));
  const tomorrow = dayDate(dayKey(new Date(now.getTime() + 86_400_000)));

  const items = await prisma.item.findMany({
    where: { userId: user.id, day: today, archivedAt: null, status: { not: "dropped" } },
  });

  for (const [itemId, choice] of Object.entries(input.carry)) {
    const item = items.find((row) => row.id === itemId);
    if (!item) continue;

    if (choice === "drop") {
      await prisma.item.update({
        where: { id: item.id },
        data: { status: "dropped", archivedAt: now, start: null, end: null },
      });
    } else if (choice === "later") {
      await prisma.item.update({ where: { id: item.id }, data: { day: null, start: null, end: null } });
    } else {
      // Tomorrow, or the next working Monday.
      const target = choice === "tom" ? tomorrow : nextMonday(now);
      await prisma.item.update({
        where: { id: item.id },
        data: { day: target, start: null, end: null, status: "moved" },
      });
    }

    await prisma.correction.create({
      data: {
        userId: user.id,
        itemId: item.id,
        kind: choice === "drop" ? "dismissed" : "tomorrow",
        before: {
          day: item.day,
          context: { effort: item.effort, sourceKind: item.sourceKind, category: item.category },
        } as Prisma.InputJsonValue,
        after: { carriedTo: choice } as Prisma.InputJsonValue,
      },
    });
  }

  const doneCount = items.filter((item) => item.status === "done").length;

  await prisma.dayReview.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    update: {
      feeling: input.feeling,
      planRight: input.planRight,
      note: input.note?.slice(0, 2000) || null,
      doneCount,
      plannedCount: items.length,
      carryOver: input.carry as Prisma.InputJsonValue,
    },
    create: {
      userId: user.id,
      date: today,
      feeling: input.feeling,
      planRight: input.planRight,
      note: input.note?.slice(0, 2000) || null,
      doneCount,
      plannedCount: items.length,
      carryOver: input.carry as Prisma.InputJsonValue,
    },
  });

  await prisma.eventLog.create({
    data: {
      userId: user.id,
      kind: "day_closed",
      payload: { date: dayKey(now), doneCount, planned: items.length } as Prisma.InputJsonValue,
    },
  });

  await runPlan(user.id, tomorrow);
  revalidatePath("/");
  revalidatePath("/tomorrow");

  const moved = Object.values(input.carry).filter((choice) => choice !== "drop").length;
  return {
    ok: true as const,
    message: moved ? `Day closed. ${moved} ${moved === 1 ? "item" : "items"} carried over.` : "Day closed.",
  };
}

function nextMonday(now: Date): Date {
  const date = new Date(now.getTime());
  const ahead = (8 - date.getUTCDay()) % 7 || 7;
  return dayDate(dayKey(new Date(date.getTime() + ahead * 86_400_000)));
}
