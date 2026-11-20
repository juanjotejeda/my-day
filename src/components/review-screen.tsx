"use client";

import { useState, useTransition } from "react";

import { acceptCandidate, dismissCandidate } from "@/app/actions";
import { BottomNav } from "@/components/bottom-nav";
import { SwitchRow } from "@/components/controls";
import { saveSettings } from "@/app/settings/actions";
import { Chip, ListCard, Quote, Screen, ScreenHeader, SectionTitle } from "@/components/ui";
import type { ReviewCandidate } from "@/lib/plan/candidates";

/** D1 Review: what Mistral found in the email, nothing added without a yes. */
export function ReviewScreen({
  candidates,
  autoAdd,
}: {
  candidates: ReviewCandidate[];
  autoAdd: boolean;
}) {
  const [decided, setDecided] = useState<string[]>([]);
  const [showLow, setShowLow] = useState(false);
  const [toast, setToast] = useState("");
  const [, start] = useTransition();

  const open = candidates.filter((candidate) => !decided.includes(candidate.id));
  const sure = open.filter((candidate) => !candidate.low);
  const low = open.filter((candidate) => candidate.low);

  function decide(id: string, accept: boolean) {
    setDecided((current) => [...current, id]);
    start(async () => {
      const result = accept ? await acceptCandidate(id) : await dismissCandidate(id);
      setToast(result.message);
      setTimeout(() => setToast(""), 4000);
    });
  }

  function card(candidate: ReviewCandidate) {
    return (
      <div key={candidate.id} className="flex flex-col gap-2.5 rounded-card border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <Chip>{candidate.kind}</Chip>
          <span className="text-xs text-muted">{candidate.received}</span>
        </div>
        <div className="text-[22px] font-light">{candidate.title}</div>
        <div className="text-[13px] text-muted">
          From {candidate.from} · {candidate.subject}
        </div>
        {candidate.quote ? <Quote>{candidate.quote}</Quote> : null}
        <div className="text-[13px] text-accent">{candidate.suggestion}</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => decide(candidate.id, true)}
            className="min-h-11 flex-1 rounded-full bg-navy text-sm text-white"
          >
            Add to plan
          </button>
          <button
            type="button"
            onClick={() => decide(candidate.id, false)}
            className="min-h-11 flex-1 rounded-full border border-sky bg-white text-sm text-navy"
          >
            Not a task
          </button>
        </div>
        <a href={candidate.gmailUrl} className="text-[13px] text-accent" target="_blank" rel="noreferrer">
          Open in Gmail
        </a>
      </div>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        label="Review"
        title="Found in your email"
        sub="Nothing joins your day without your yes. Each item shows the line it came from."
      />

      {sure.map(card)}

      {!open.length ? (
        <div className="flex flex-col gap-2 p-1">
          <h2 className="text-[26px] font-light">Nothing waiting</h2>
          <p className="text-base leading-relaxed text-muted">
            Every request from your email has an answer. New ones appear here after each sync.
          </p>
        </div>
      ) : null}

      {low.length ? (
        showLow ? (
          <>
            <SectionTitle count={low.length}>Low confidence</SectionTitle>
            {low.map(card)}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowLow(true)}
            className="min-h-11 px-1 text-left text-sm text-accent"
          >
            Show low-confidence ({low.length})
          </button>
        )
      ) : null}

      <section className="flex flex-col gap-1.5">
        <SectionTitle>Auto-add</SectionTitle>
        <ListCard>
          <SwitchRow
            label="Add items from people who always count"
            sub="Skip review for your priority people"
            defaultOn={autoAdd}
            onChange={(on) => {
              start(async () => {
                await saveSettings("priorities", { autoAddVip: on });
                setToast(on ? "Priority people skip Review from now on." : "Everything comes through Review.");
                setTimeout(() => setToast(""), 3000);
              });
            }}
          />
        </ListCard>
      </section>

      <div className="flex-1" />
      <BottomNav active="review" reviewCount={open.length} />

      {toast ? (
        <div
          role="status"
          className="fixed right-4 bottom-24 left-4 z-30 mx-auto max-w-[398px] rounded-full bg-navy px-3.5 py-3 text-[13px] leading-snug text-white"
        >
          {toast}
        </div>
      ) : null}
    </Screen>
  );
}
