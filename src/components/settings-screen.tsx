"use client";

import { type ReactNode, useState } from "react";

import { EnergyCurve } from "@/components/energy-curve";
import { SettingsFields, type Values } from "@/components/settings-fields";
import { saveSettings } from "@/app/settings/actions";
import {
  BackHeader,
  ListCard,
  NoteCard,
  Screen,
  ScreenHeader,
  SectionTitle,
} from "@/components/ui";
import type { ScreenSpec } from "@/lib/settings-spec";

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
  const [status, setStatus] = useState("");

  function note(message: string) {
    setStatus(message);
    if (message !== "Saving") setTimeout(() => setStatus(""), 1800);
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
          const rhythm = values[group.curve.section] ?? {};
          return (
            <EnergyCurve
              key={index}
              defaultPeak={Number(rhythm.peakStart ?? 9)}
              defaultDip={Boolean(rhythm.dip ?? true)}
              defaultSecond={Boolean(rhythm.secondWind ?? true)}
              onChange={async (change) => {
                note("Saving");
                const result = await saveSettings(group.curve.section, { [change.key]: change.value });
                note(result.ok ? "Saved" : "Not saved");
              }}
            />
          );
        }
        return (
          <section key={index} className="flex flex-col gap-1.5">
            {group.title ? <SectionTitle>{group.title}</SectionTitle> : null}
            <ListCard>
              <SettingsFields fields={group.fields} values={values} onSaved={note} />
            </ListCard>
          </section>
        );
      })}

      {after}

      <div className="flex-1" />
    </Screen>
  );
}
