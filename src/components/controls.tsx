"use client";

import { useState } from "react";

/** The switch from the designs: 46 by 26 track, navy when on. */
export function Switch({
  label,
  defaultOn = false,
  onChange,
}: {
  label: string;
  defaultOn?: boolean;
  onChange?: (on: boolean) => void;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        setOn(!on);
        onChange?.(!on);
      }}
      className="flex h-11 w-14 flex-none items-center justify-center"
    >
      <span className={`relative block h-[26px] w-[46px] rounded-full ${on ? "bg-navy" : "bg-sky"}`}>
        <span
          className="absolute top-[3px] left-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(36,58,99,0.2)] transition-transform"
          style={{ transform: on ? "translateX(20px)" : undefined }}
        />
      </span>
    </button>
  );
}

/** A row with a label, an explanation and a switch. */
export function SwitchRow({
  label,
  sub,
  defaultOn,
  onChange,
}: {
  label: string;
  sub?: string;
  defaultOn?: boolean;
  onChange?: (on: boolean) => void;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 border-t border-divider py-2">
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-base">{label}</span>
        {sub ? <span className="text-[13px] leading-snug text-muted">{sub}</span> : null}
      </div>
      <Switch label={label} defaultOn={defaultOn} onChange={onChange} />
    </div>
  );
}

export type Choice = { value: string; label: string };

/** Pills where one, or several, can be chosen. */
export function ChoiceGroup({
  label,
  choices,
  defaultValue = [],
  multi = false,
  onChange,
}: {
  label: string;
  choices: Choice[];
  defaultValue?: string[];
  multi?: boolean;
  onChange?: (values: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>(defaultValue);

  function choose(value: string) {
    const next = multi
      ? picked.includes(value)
        ? picked.filter((item) => item !== value)
        : [...picked, value]
      : [value];
    setPicked(next);
    onChange?.(next);
  }

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {choices.map((choice) => {
        const on = picked.includes(choice.value);
        return (
          <button
            key={choice.value}
            type="button"
            aria-pressed={on}
            onClick={() => choose(choice.value)}
            className={`min-h-10 rounded-full border px-3.5 text-sm text-navy ${
              on ? "border-mid bg-sky" : "border-sky bg-white"
            }`}
          >
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}

/** A labelled slider, used across the settings screens. */
export function RangeRow({
  label,
  min,
  max,
  step = 1,
  defaultValue,
  format,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  format: (value: number) => string;
  onChange?: (value: number) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="flex flex-col gap-2 border-t border-divider py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-base">{label}</span>
        <span className="text-[15px] text-muted tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => {
          const next = Number(event.target.value);
          setValue(next);
          onChange?.(next);
        }}
        className="h-11 w-full accent-[#243A63]"
      />
    </div>
  );
}

/** A time field in a settings row. */
export function TimeRow({
  label,
  defaultValue,
  onChange,
}: {
  label: string;
  defaultValue: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <label className="flex min-h-[52px] items-center justify-between gap-3 border-t border-divider py-1.5">
      <span className="text-base">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          onChange?.(event.target.value);
        }}
        className="min-h-10 rounded-full border border-sky bg-surface px-3 text-[15px] text-navy"
      />
    </label>
  );
}
