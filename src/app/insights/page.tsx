import { redirect } from "next/navigation";
import Link from "next/link";

import { BottomNav } from "@/components/bottom-nav";
import { ChoiceGroup } from "@/components/controls";
import { auth } from "@/auth";
import { reviewCount } from "@/lib/plan/review-count";
import { DetailRow, ListCard, Screen, ScreenHeader, SectionTitle, StatTile } from "@/components/ui";
import { SAMPLE_INSIGHTS } from "@/lib/plan/sample-screens";

// The five measures come from events_log, items, candidates and day_reviews in milestone 8.
export default async function Insights() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const waiting = await reviewCount();

  const data = SAMPLE_INSIGHTS;

  return (
    <Screen>
      <ScreenHeader label={data.label} title="This week" size={40} />

      <div className="grid grid-cols-2 gap-2">
        {data.tiles.map((tile) => (
          <StatTile key={tile.label} value={tile.value} label={tile.label} />
        ))}
      </div>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Plan followed, by day</SectionTitle>
        <ListCard>
          <div className="flex gap-2.5 py-2.5">
            {data.days.map((day) => (
              <div key={day.day} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-[90px] w-full items-end">
                  <div
                    className={`w-full rounded-t-lg rounded-b-sm ${day.strong ? "bg-mid" : "bg-sky"}`}
                    style={{ height: `${day.height}%` }}
                  />
                </div>
                <span className="text-xs text-muted">{day.day}</span>
              </div>
            ))}
          </div>
        </ListCard>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Patterns</SectionTitle>
        <ListCard>
          {data.patterns.map((pattern) => (
            <p key={pattern} className="py-1.5 text-[15px] leading-relaxed">
              {pattern}
            </p>
          ))}
          <Link href="/settings/rules" className="block py-1.5 text-sm text-accent">
            See learned rules
          </Link>
        </ListCard>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Your test questions</SectionTitle>
        <ListCard>
          {data.questions.map((question) => (
            <DetailRow key={question.q} label={question.q} value={question.a} />
          ))}
          <div className="flex flex-col gap-2 py-2">
            <p className="text-[13px] text-muted">How much do you trust My Day as your main overview?</p>
            <ChoiceGroup
              label="How much do you trust My Day as your main overview?"
              choices={data.trustChoices}
              defaultValue={["4"]}
            />
          </div>
        </ListCard>
      </section>

      <p className="text-xs leading-relaxed text-muted">Sample data for the prototype.</p>

      <div className="flex-1" />
      <BottomNav active="insights" reviewCount={waiting} />
    </Screen>
  );
}
