import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  BackHeader,
  Chip,
  DetailRow,
  ItemRow,
  ListCard,
  PanelCard,
  PrimaryLink,
  Quote,
  Screen,
  ScreenHeader,
  SecondaryLink,
  SectionTitle,
} from "@/components/ui";
import { SAMPLE_DETAIL } from "@/lib/plan/sample-screens";
import { SAMPLE_DAY } from "@/lib/plan/sample";
import { fmt } from "@/lib/plan/format";

/**
 * Item detail. The sample item from the design fills the source, history and
 * related blocks; a known item from the day overrides the title and times.
 */
export default async function ItemDetail({ params }: PageProps<"/item/[id]">) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { id } = await params;
  const known = SAMPLE_DAY.find((item) => item.id === id);
  const title = known?.title ?? SAMPLE_DETAIL.title;
  const planned = known && !known.later ? `${fmt(known.start)} to ${fmt(known.end)}` : SAMPLE_DETAIL.planned;

  return (
    <Screen>
      <BackHeader href="/" label="Today" />

      <div className="flex flex-wrap gap-1.5 px-1">
        <Chip variant="dashed">{SAMPLE_DETAIL.tags[0]}</Chip>
        <Chip variant="divider">{SAMPLE_DETAIL.tags[1]}</Chip>
        <Chip>{SAMPLE_DETAIL.tags[2]}</Chip>
      </div>

      <ScreenHeader title={title} />

      <PanelCard>
        <DetailRow label="Planned" value={planned} />
        <DetailRow label="Length" sub={SAMPLE_DETAIL.lengthNote} value={SAMPLE_DETAIL.length} />
        <DetailRow label="Energy then" value={SAMPLE_DETAIL.energy} />
      </PanelCard>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Why it is here</SectionTitle>
        <ListCard>
          <p className="py-2 text-[15px] leading-relaxed">{known?.why ?? SAMPLE_DETAIL.why}</p>
        </ListCard>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Source</SectionTitle>
        <ListCard>
          <DetailRow
            label={SAMPLE_DETAIL.source.kind}
            sub={SAMPLE_DETAIL.source.who}
            value={SAMPLE_DETAIL.source.when}
          />
          <div className="py-2">
            <Quote>{SAMPLE_DETAIL.source.quote}</Quote>
          </div>
          <a href="https://mail.google.com" className="block py-1.5 text-sm text-accent">
            Open the email in Gmail
          </a>
        </ListCard>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>History</SectionTitle>
        <ListCard>
          {SAMPLE_DETAIL.history.map((entry) => (
            <DetailRow key={`${entry.when}-${entry.what}`} label={entry.when} value={entry.what} />
          ))}
        </ListCard>
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Related</SectionTitle>
        <ListCard>
          <ItemRow
            href="/"
            title={SAMPLE_DETAIL.related.title}
            time={SAMPLE_DETAIL.related.time}
            meta={SAMPLE_DETAIL.related.meta}
            fill="#D5E1F5"
          />
        </ListCard>
      </section>

      <div className="flex flex-col gap-2 rounded-card bg-surface p-4">
        <PrimaryLink href="/">Mark as done</PrimaryLink>
        <SecondaryLink href="/tomorrow">Move to tomorrow</SecondaryLink>
        <SecondaryLink href="/">I need 30 more minutes</SecondaryLink>
        <SecondaryLink href="/">This is a personal commitment</SecondaryLink>
      </div>
    </Screen>
  );
}
