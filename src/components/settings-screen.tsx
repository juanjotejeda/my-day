"use client";

import { type ReactNode, useState, useTransition } from "react";

import { ChoiceGroup, OrderList, Switch } from "@/components/controls";
import { EnergyCurve } from "@/components/energy-curve";
import {
  BackHeader,
  DetailRow,
  FieldBlock,
  LinkRow,
  ListCard,
  NoteCard,
  Screen,
  ScreenHeader,
  SectionTitle,
} from "@/components/ui";
import { saveSettings } from "@/app/settings/actions";
import type { SectionName } from "@/lib/settings";
import type { Field, ScreenSpec } from "@/lib/settings-spec";

type Values = Record<SectionName, Record<string, unknown>>;

/**
 * Renders a settings screen from its spec and saves each change to the
 * settings table as it happens, so the screens stay consistent with each other.
 */
export function SettingsScreen({
  spec,
  values,
  before,
  after,
}: {
  spec: ScreenSpec;
  values: Values;
  before?: ReactNode;
  after?: ReactNode;
}) {
  const [state, setState] = useState(values);
  const [status, setStatus] = useState("");
  const [, start] = useTransition();

  function save(section: SectionName, key: string, value: unknown) {
    setState((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
    setStatus("Saving");
    start(async () => {
      const result = await saveSettings(section, { [key]: value });
      setStatus(result.ok ? "Saved" : "Not saved");
      setTimeout(() => setStatus(""), 1800);
    });
  }

  function field(item: Field, index: number) {
    if (item.kind === "row") {
      return <DetailRow key={index} label={item.label} sub={item.sub} value={item.value} />;
    }
    if (item.kind === "link") {
      return <LinkRow key={index} href={item.href} label={item.label} sub={item.sub} value={item.value} />;
    }
    if (item.kind === "text") {
      return (
        <p key={index} className="py-2 text-[13px] leading-relaxed text-muted">
          {item.text}
        </p>
      );
    }
    if (item.kind === "order") {
      const raw = state[item.section]?.[item.key];
      const current = Array.isArray(raw) ? raw.map(String) : [];
      return (
        <OrderList
          key={index}
          label={item.label}
          items={item.items}
          value={current}
          onChange={(order) => save(item.section, item.key, order)}
        />
      );
    }
    if (item.kind === "switch") {
      return (
        <div key={index} className="flex min-h-14 items-center gap-3 border-t border-divider py-2">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-base">{item.label}</span>
            {item.sub ? <span className="text-[13px] leading-snug text-muted">{item.sub}</span> : null}
          </div>
          <Switch
            label={item.label}
            defaultOn={Boolean(state[item.section]?.[item.key])}
            onChange={(on) => save(item.section, item.key, on)}
          />
        </div>
      );
    }
    if (item.kind === "time") {
      return (
        <label
          key={index}
          className="flex min-h-[52px] items-center justify-between gap-3 border-t border-divider py-1.5"
        >
          <span className="text-base">{item.label}</span>
          <input
            type="time"
            defaultValue={String(state[item.section]?.[item.key] ?? "")}
            onChange={(event) => save(item.section, item.key, event.target.value)}
            className="min-h-10 rounded-full border border-sky bg-surface px-3 text-base font-light text-navy"
          />
        </label>
      );
    }
    if (item.kind === "pills") {
      const raw = state[item.section]?.[item.key];
      const current = Array.isArray(raw) ? raw.map(String) : [String(raw ?? "")];
      return (
        <FieldBlock key={index} label={item.label}>
          <ChoiceGroup
            label={item.label}
            choices={item.choices}
            multi={item.multi}
            defaultValue={current}
            onChange={(picked) => {
              const value = item.multi
                ? item.numeric
                  ? picked.map(Number)
                  : picked
                : item.numeric
                  ? Number(picked[0])
                  : picked[0];
              save(item.section, item.key, value);
            }}
          />
        </FieldBlock>
      );
    }

    const value = Number(state[item.section]?.[item.key] ?? item.min);
    return (
      <div key={index} className="flex flex-col gap-2 border-t border-divider py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-base">{item.label}</span>
          <span className="text-[15px] text-muted tabular-nums">
            {item.format === "count" ? value : `${value}:00`}
          </span>
        </div>
        <input
          type="range"
          min={item.min}
          max={item.max}
          step={item.step ?? 1}
          defaultValue={value}
          aria-label={item.label}
          onChange={(event) => save(item.section, item.key, Number(event.target.value))}
          className="h-11 w-full accent-[#243A63]"
        />
      </div>
    );
  }

  return (
    <Screen>
      <BackHeader href={spec.back} label="Settings" />
      <div className="flex items-end justify-between">
        <ScreenHeader title={spec.title} sub={spec.sub} />
        <span className="pb-2 text-xs text-muted">{status}</span>
      </div>

      {before}

      {spec.groups.map((group, index) => {
        if ("note" in group) {
          return (
            <NoteCard key={index} label={group.note.label}>
              {group.note.text}
            </NoteCard>
          );
        }
        if ("curve" in group) {
          const rhythm = state[group.curve.section] ?? {};
          return (
            <EnergyCurve
              key={index}
              defaultPeak={Number(rhythm.peakStart ?? 9)}
              defaultDip={Boolean(rhythm.dip ?? true)}
              defaultSecond={Boolean(rhythm.secondWind ?? true)}
              onChange={(next) => save(group.curve.section, next.key, next.value)}
            />
          );
        }
        return (
          <section key={index} className="flex flex-col gap-1.5">
            {group.title ? <SectionTitle>{group.title}</SectionTitle> : null}
            <ListCard>{group.fields.map(field)}</ListCard>
          </section>
        );
      })}

      {after}

      <div className="flex-1" />
    </Screen>
  );
}
