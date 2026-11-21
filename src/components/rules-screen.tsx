"use client";

import { useState, useTransition } from "react";

import {
  acceptSuggestion,
  declineSuggestion,
  resetLearnedRules,
  toggleRule,
} from "@/app/settings/rules/actions";
import { Switch } from "@/components/controls";
import {
  BackHeader,
  ListCard,
  NoteCard,
  Screen,
  ScreenHeader,
  SettingsSection,
} from "@/components/ui";

export type RuleRow = { id: string; text: string; active: boolean; evidence: number };
export type Suggestion = { id: string; text: string; evidence: number };

/** S6 Learned rules: what your corrections taught, and what they propose next. */
export function RulesScreen({
  suggestions,
  learned,
  stated,
}: {
  suggestions: Suggestion[];
  learned: RuleRow[];
  stated: { id: string; text: string; active: boolean; switchable: boolean }[];
}) {
  const [open, setOpen] = useState(suggestions);
  const [status, setStatus] = useState("");
  const [armed, setArmed] = useState(false);
  const [, start] = useTransition();

  function say(message: string) {
    setStatus(message);
    setTimeout(() => setStatus(""), 4000);
  }

  function decide(id: string, accept: boolean) {
    setOpen((current) => current.filter((suggestion) => suggestion.id !== id));
    start(async () => {
      const result = accept ? await acceptSuggestion(id) : await declineSuggestion(id);
      say(result.message);
    });
  }

  return (
    <Screen>
      <BackHeader href="/settings" label="Settings" />
      <ScreenHeader title="Learned rules" sub="Your corrections, turned into rules you control." />

      {open.map((suggestion) => (
        <div
          key={suggestion.id}
          className="flex flex-col gap-2.5 rounded-card border border-sky bg-surface p-4"
        >
          <div className="text-xs tracking-[0.08em] text-accent">SUGGESTION</div>
          <p className="text-[15px] leading-relaxed">
            {suggestion.text}. That is {suggestion.evidence} times now.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => decide(suggestion.id, true)}
              className="min-h-11 flex-1 rounded-full bg-navy text-sm text-white"
            >
              Make it a rule
            </button>
            <button
              type="button"
              onClick={() => decide(suggestion.id, false)}
              className="min-h-11 flex-1 rounded-full border border-sky bg-white text-sm text-navy"
            >
              Not now
            </button>
          </div>
        </div>
      ))}

      <SettingsSection title="Rules from you">
        {stated.length ? (
          stated.map((rule) => (
            <div key={rule.id} className="flex min-h-14 items-center gap-3 border-t border-divider py-2">
              <span className="flex-1 text-base">{rule.text}</span>
              {rule.switchable ? (
                <Switch
                  label={rule.text}
                  defaultOn={rule.active}
                  onChange={(on) =>
                    start(async () => {
                      const result = await toggleRule(rule.id, on);
                      say(result.message);
                    })
                  }
                />
              ) : (
                <span className="text-[13px] text-muted">From settings</span>
              )}
            </div>
          ))
        ) : (
          <p className="py-3 text-[15px] text-muted">Your settings have not stated any rules yet.</p>
        )}
      </SettingsSection>

      <SettingsSection title="Learned from corrections">
        {learned.length ? (
          learned.map((rule) => (
            <div key={rule.id} className="flex min-h-14 items-center gap-3 border-t border-divider py-2">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-base">{rule.text}</span>
                <span className="text-[13px] leading-snug text-muted">
                  From {rule.evidence} corrections
                </span>
              </div>
              <Switch
                label={rule.text}
                defaultOn={rule.active}
                onChange={(on) =>
                  start(async () => {
                    const result = await toggleRule(rule.id, on);
                    say(result.message);
                  })
                }
              />
            </div>
          ))
        ) : (
          <p className="py-3 text-[15px] leading-relaxed text-muted">
            Nothing learned yet. Adjust an item three times the same way and a rule appears here.
          </p>
        )}
      </SettingsSection>

      <NoteCard label="HOW RULES WORK">
        Rules apply from the next plan, which runs the moment you accept one. Turning one off keeps
        it here so you can turn it back on.
      </NoteCard>

      {learned.length ? (
        <ListCard>
          <button
            type="button"
            onClick={() => {
              if (!armed) {
                setArmed(true);
                say("Tap again to forget every learned rule.");
                return;
              }
              setArmed(false);
              start(async () => {
                const result = await resetLearnedRules();
                say(result.message);
              });
            }}
            className="flex min-h-14 w-full items-center text-[15px] text-alert-ink"
          >
            {armed ? "Tap again to reset all learned rules" : "Reset all learned rules"}
          </button>
        </ListCard>
      ) : null}

      {status ? <p className="px-1 text-[13px] leading-relaxed text-muted">{status}</p> : null}
      <div className="flex-1" />
    </Screen>
  );
}
