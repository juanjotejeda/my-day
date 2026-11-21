"use client";

import Link from "next/link";

import { BottomNav } from "@/components/bottom-nav";
import { DetailRow, ListCard, Screen, ScreenHeader, SectionTitle, StatTile } from "@/components/ui";

const FEELING_WORDS: Record<string, string> = {
  calm: "Calm",
  fine: "Fine",
  busy: "Busy",
  over: "Overloaded",
  chaos: "Chaotic",
};
const PLAN_WORDS: Record<string, string> = { yes: "Mostly", part: "Partly", no: "Not really" };

/** D5 Weekly insights, from the week's own rows. */
export function InsightsScreen({
  label,
  tiles,
  bars,
  patterns,
  questions,
  reviewCount,
  enoughData,
}: {
  label: string;
  tiles: { value: string; label: string }[];
  bars: { label: string; percent: number; planned: number }[];
  patterns: string[];
  questions: { feeling: string | null; planRight: string | null; daysReviewed: number };
  reviewCount: number;
  enoughData: boolean;
}) {
  return (
    <Screen>
      <ScreenHeader label={label} title="This week" size={40} />

      <div className="grid grid-cols-2 gap-2">
        {tiles.map((tile) => (
          <StatTile key={tile.label} value={tile.value} label={tile.label} />
        ))}
      </div>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Plan followed, by day</SectionTitle>
        <ListCard>
          <div className="flex gap-2.5 py-2.5">
            {bars.map((bar) => (
              <div key={bar.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-[90px] w-full items-end">
                  <div
                    className={`w-full rounded-t-lg rounded-b-sm ${
                      bar.percent >= 70 ? "bg-mid" : bar.planned ? "bg-sky" : "bg-divider"
                    }`}
                    style={{ height: `${Math.max(bar.percent, bar.planned ? 6 : 3)}%` }}
                  />
                </div>
                <span className="text-xs text-muted">{bar.label}</span>
              </div>
            ))}
          </div>
        </ListCard>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Patterns</SectionTitle>
        <ListCard>
          {patterns.length ? (
            patterns.map((pattern) => (
              <p key={pattern} className="py-1.5 text-[15px] leading-relaxed">
                {pattern}
              </p>
            ))
          ) : (
            <p className="py-2 text-[15px] leading-relaxed text-muted">
              {enoughData
                ? "Nothing stands out this week. That is a good sign."
                : "Not enough of a week yet. Patterns appear once a few days are behind you."}
            </p>
          )}
          <Link href="/settings/rules" className="block py-1.5 text-sm text-accent">
            See learned rules
          </Link>
        </ListCard>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Did it really capture the important things of the day?</SectionTitle>
        <ListCard>
          <DetailRow
            label="Captured the important things?"
            value={questions.planRight ? (PLAN_WORDS[questions.planRight] ?? questions.planRight) : "not answered"}
          />
          <DetailRow
            label="How the days felt"
            sub={`${questions.daysReviewed} ${questions.daysReviewed === 1 ? "day" : "days"} reviewed`}
            value={questions.feeling ? (FEELING_WORDS[questions.feeling] ?? questions.feeling) : "not answered"}
          />
        </ListCard>
      </section>

      <p className="text-xs leading-relaxed text-muted">
        Counted from this week&rsquo;s own items, corrections, email decisions and end-of-day answers.
      </p>

      <div className="flex-1" />
      <BottomNav active="insights" reviewCount={reviewCount} />
    </Screen>
  );
}
