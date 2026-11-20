import { redirect } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { ChoiceGroup } from "@/components/controls";
import { auth } from "@/auth";
import {
  DetailRow,
  ListCard,
  NoteCard,
  PanelCard,
  PrimaryLink,
  Screen,
  ScreenHeader,
  SectionTitle,
} from "@/components/ui";
import { SAMPLE_END_OF_DAY } from "@/lib/plan/sample-screens";

// Answers save to day_reviews once milestone 7 wires up the day loop.
export default async function EndOfDay() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const day = SAMPLE_END_OF_DAY;

  return (
    <Screen>
      <ScreenHeader label={day.when} title={day.headline} size={44} />

      <PanelCard>
        {day.stats.map((stat) => (
          <DetailRow key={stat.label} label={stat.label} sub={stat.sub} value={stat.value} />
        ))}
      </PanelCard>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Still open</SectionTitle>
        <ListCard>
          {day.open.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 py-2">
              <p className="text-base leading-relaxed">{item.title}</p>
              <ChoiceGroup label={item.title} choices={day.carryChoices} defaultValue={["mon"]} />
            </div>
          ))}
        </ListCard>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>How did today feel?</SectionTitle>
        <ListCard>
          <div className="py-2">
            <ChoiceGroup label="How did today feel?" choices={day.feelChoices} defaultValue={["fine"]} />
          </div>
        </ListCard>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Was the plan right?</SectionTitle>
        <ListCard>
          <div className="py-2">
            <ChoiceGroup label="Was the plan right?" choices={day.planChoices} defaultValue={["part"]} />
          </div>
        </ListCard>
      </section>

      <NoteCard label="WHY WE ASK">
        Your answers feed Insights and help My Day set better durations and placements. Nothing here
        changes your calendar.
      </NoteCard>

      <PrimaryLink href="/">Close the day</PrimaryLink>

      <div className="flex-1" />
      <BottomNav active="today" reviewCount={4} />
    </Screen>
  );
}
