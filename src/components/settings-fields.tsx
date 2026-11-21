"use client";

import { useState, useTransition } from "react";

import { saveSettings } from "@/app/settings/actions";
import { ChoiceGroup, OrderList, Switch } from "@/components/controls";
import { DetailRow, FieldBlock, LinkRow } from "@/components/ui";
import type { SectionName } from "@/lib/settings";
import type { Field } from "@/lib/settings-spec";

export type Values = Record<SectionName, Record<string, unknown>>;

/**
 * Renders settings fields and saves each change as it happens. Shared by the
 * settings screens and the onboarding steps, so an answer given during
 * onboarding is the same saved setting.
 */
export function SettingsFields({
  fields,
  values,
  onSaved,
}: {
  fields: Field[];
  values: Values;
  onSaved?: (status: string) => void;
}) {
  const [state, setState] = useState(values);
  const [, start] = useTransition();

  function save(section: SectionName, key: string, value: unknown) {
    setState((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
    onSaved?.("Saving");
    start(async () => {
      const result = await saveSettings(section, { [key]: value });
      onSaved?.(result.ok ? "Saved" : "Not saved");
    });
  }

  return (
    <>
      {fields.map((item, index) => {
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
          return (
            <OrderList
              key={index}
              label={item.label}
              items={item.items}
              value={Array.isArray(raw) ? raw.map(String) : []}
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
              className="h-11 w-full accent-[color:var(--primary)]"
            />
          </div>
        );
      })}
    </>
  );
}
