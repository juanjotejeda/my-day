import { redirect } from "next/navigation";

import { InsightsScreen } from "@/components/insights-screen";
import { auth } from "@/auth";
import { loadWeek } from "@/lib/insights/load";
import { dur } from "@/lib/plan/format";
import { reviewCount } from "@/lib/plan/review-count";
import { prisma } from "@/lib/prisma";

/** D5 on real data: the five measures for the week so far. */
export default async function Insights() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const waiting = await reviewCount();
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) redirect("/signin");

  const week = await loadWeek(user.id);
  const started = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${week.start}T12:00:00Z`),
  );

  return (
    <InsightsScreen
      label={`Insights · week of ${started}`}
      tiles={[
        { value: `${week.planAccepted}%`, label: "Plan accepted as proposed" },
        { value: String(week.correctionsPerDay), label: "Corrections per day" },
        {
          value: week.emailCorrect.decided
            ? `${week.emailCorrect.kept} of ${week.emailCorrect.decided}`
            : "none yet",
          label: "Email items kept",
        },
        {
          value: week.focus.plannedMin
            ? `${dur(week.focus.doneMin)} of ${dur(week.focus.plannedMin)}`
            : "none planned",
          label: "Focus done, of planned",
        },
      ]}
      bars={week.byDay.map((day) => ({ label: day.label, percent: day.percent, planned: day.planned }))}
      patterns={week.patterns}
      questions={{ feeling: week.feeling, planRight: week.planRight, daysReviewed: week.daysReviewed }}
      reviewCount={waiting}
      enoughData={week.days.length >= 3}
    />
  );
}
