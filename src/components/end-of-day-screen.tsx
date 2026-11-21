"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { closeTheDay, type CarryChoice } from "@/app/end-of-day/actions";
import { BottomNav } from "@/components/bottom-nav";
import { ChoiceGroup } from "@/components/controls";
import {
  DetailRow,
  ListCard,
  NoteCard,
  PanelCard,
  Screen,
  ScreenHeader,
  SectionTitle,
} from "@/components/ui";

const CARRY = [
  { value: "tom", label: "Tomorrow" },
  { value: "mon", label: "Monday" },
  { value: "later", label: "Later" },
  { value: "drop", label: "Drop" },
];
const FEELINGS = [
  { value: "calm", label: "Calm" },
  { value: "fine", label: "Fine" },
  { value: "busy", label: "Busy" },
  { value: "over", label: "Overloaded" },
  { value: "chaos", label: "Chaotic" },
];
const PLAN = [
  { value: "yes", label: "Mostly" },
  { value: "part", label: "Partly" },
  { value: "no", label: "Not really" },
];

/** D4 End of day: the counts, what to do with what is open, and how it felt. */
export function EndOfDayScreen({
  when,
  headline,
  stats,
  open,
  reviewCount,
  saved,
}: {
  when: string;
  headline: string;
  stats: { label: string; sub?: string; value: string }[];
  open: { id: string; title: string }[];
  reviewCount: number;
  saved: { feeling?: string; planRight?: string; note?: string };
}) {
  const router = useRouter();
  const [carry, setCarry] = useState<Record<string, CarryChoice>>({});
  const [feeling, setFeeling] = useState(saved.feeling ?? "");
  const [planRight, setPlanRight] = useState(saved.planRight ?? "");
  const [note, setNote] = useState(saved.note ?? "");
  const [status, setStatus] = useState("");
  const [, start] = useTransition();

  return (
    <Screen>
      <ScreenHeader label={when} title={headline} size={44} />

      <PanelCard>
        {stats.map((stat) => (
          <DetailRow key={stat.label} label={stat.label} sub={stat.sub} value={stat.value} />
        ))}
      </PanelCard>

      {open.length ? (
        <section className="flex flex-col gap-1.5">
          <SectionTitle>Still open</SectionTitle>
          <ListCard>
            {open.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 border-t border-divider py-2 first:border-t-0">
                <p className="text-base leading-relaxed">{item.title}</p>
                <ChoiceGroup
                  label={item.title}
                  choices={CARRY}
                  defaultValue={[]}
                  onChange={(picked) =>
                    setCarry((current) => ({ ...current, [item.id]: picked[0] as CarryChoice }))
                  }
                />
              </div>
            ))}
          </ListCard>
        </section>
      ) : null}

      <section className="flex flex-col gap-1.5">
        <SectionTitle>How did today feel?</SectionTitle>
        <ListCard>
          <div className="py-2">
            <ChoiceGroup
              label="How did today feel?"
              choices={FEELINGS}
              defaultValue={feeling ? [feeling] : []}
              onChange={(picked) => setFeeling(picked[0] ?? "")}
            />
          </div>
        </ListCard>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Was the plan right?</SectionTitle>
        <ListCard>
          <div className="flex flex-col gap-3 py-2">
            <ChoiceGroup
              label="Was the plan right?"
              choices={PLAN}
              defaultValue={planRight ? [planRight] : []}
              onChange={(picked) => setPlanRight(picked[0] ?? "")}
            />
            <label className="flex flex-col gap-1.5 text-[13px] text-muted">
              Anything worth remembering?
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Optional. Kept for a year, so the experiment can be read back."
                className="w-full rounded-[14px] border border-sky bg-surface p-3 text-base font-light text-navy"
              />
            </label>
          </div>
        </ListCard>
      </section>

      <NoteCard label="WHY WE ASK">
        Your answers feed Insights and help My Day set better durations and placements. Nothing here
        changes your calendar.
      </NoteCard>

      <button
        type="button"
        onClick={() =>
          start(async () => {
            setStatus("Saving");
            const result = await closeTheDay({ feeling, planRight, note, carry });
            setStatus(result.message);
            if (result.ok) {
              router.refresh();
              setTimeout(() => router.push("/"), 900);
            }
          })
        }
        className="flex min-h-[54px] items-center justify-center rounded-full bg-navy text-base text-white"
      >
        Close the day
      </button>

      {status ? <p className="px-1 text-[13px] text-muted">{status}</p> : null}

      <div className="flex-1" />
      <BottomNav active="today" reviewCount={reviewCount} />
    </Screen>
  );
}
