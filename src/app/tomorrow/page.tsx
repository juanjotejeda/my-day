import { redirect } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { auth } from "@/auth";
import { reviewCount } from "@/lib/plan/review-count";
import {
  ItemRow,
  ListCard,
  NoteCard,
  PrimaryLink,
  Screen,
  ScreenHeader,
  SecondaryLink,
  SectionTitle,
} from "@/components/ui";
import { SAMPLE_TOMORROW } from "@/lib/plan/sample-screens";

// Tomorrow runs through the same scheduler once milestone 3 lands.
export default async function Tomorrow() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const waiting = await reviewCount();

  return (
    <Screen>
      <ScreenHeader label={SAMPLE_TOMORROW.weekday} title="Tomorrow" size={40} />

      <div className="flex flex-col gap-2.5 rounded-card border border-line bg-white p-4">
        <div role="img" aria-label="Tomorrow from 07:00 to 22:00" className="relative h-[26px]">
          {SAMPLE_TOMORROW.blocks.map((block) => (
            <span
              key={`${block.left}-${block.width}`}
              className={`absolute top-1.5 h-3.5 rounded-full ${
                block.fixed ? "bg-mid" : "border-[1.5px] border-dashed border-mid"
              }`}
              style={{ left: `${block.left}%`, width: `${block.width}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-muted">
          <span>07</span>
          <span>12</span>
          <span>17</span>
          <span>22</span>
        </div>
      </div>

      <NoteCard label="WEEKEND">{SAMPLE_TOMORROW.weekendNote}</NoteCard>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Planned</SectionTitle>
        <ListCard>
          {SAMPLE_TOMORROW.planned.map((item) => (
            <ItemRow
              key={item.id}
              title={item.title}
              time={item.time}
              meta={item.meta}
              fill={item.fill}
              variant={item.dashed ? "dashed" : "divider"}
            />
          ))}
        </ListCard>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Monday preview</SectionTitle>
        <ListCard>
          {SAMPLE_TOMORROW.monday.map((item) => (
            <ItemRow
              key={item.id}
              href={item.id === "m1" ? "/item/prop" : undefined}
              title={item.title}
              time={item.time}
              meta={item.meta}
              fill={item.fill}
              variant={item.chip}
            />
          ))}
        </ListCard>
      </section>

      <PrimaryLink href="/">Looks right</PrimaryLink>
      <SecondaryLink href="/">Adjust tomorrow</SecondaryLink>

      <div className="flex-1" />
      <BottomNav active="today" reviewCount={waiting} />
    </Screen>
  );
}
