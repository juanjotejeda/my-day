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
      <span className={`relative block h-[26px] w-[46px] rounded-full ${on ? "bg-switch-on" : "bg-sky"}`}>
        <span
          className="absolute top-[3px] left-[3px] h-5 w-5 rounded-full bg-knob shadow-[var(--shadow-knob)] transition-transform"
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
              on ? "border-mid bg-sky" : "border-sky bg-card"
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
        className="h-11 w-full accent-[color:var(--primary)]"
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

export type OrderItem = { value: string; label: string };

/**
 * A list you reorder with up and down buttons. Drag is a poor fit on a phone
 * and needs no second hand this way.
 */
export function OrderList({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: OrderItem[];
  value: string[];
  onChange?: (order: string[]) => void;
}) {
  const [order, setOrder] = useState(() => {
    const known = value.filter((key) => items.some((item) => item.value === key));
    const rest = items.map((item) => item.value).filter((key) => !known.includes(key));
    return [...known, ...rest];
  });

  function move(index: number, by: -1 | 1) {
    const next = [...order];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    onChange?.(next);
  }

  const labelOf = (key: string) => items.find((item) => item.value === key)?.label ?? key;

  return (
    <ul aria-label={label} className="flex flex-col">
      {order.map((key, index) => (
        <li key={key} className="flex min-h-[52px] items-center gap-2 border-t border-divider py-1.5">
          <span className="w-5 text-[15px] text-muted tabular-nums">{index + 1}</span>
          <span className="flex-1 text-base">{labelOf(key)}</span>
          <span className="text-[13px] text-muted">
            {index === 0 ? "First" : index === order.length - 1 ? "Last" : ""}
          </span>
          <button
            type="button"
            aria-label={`Move ${labelOf(key)} up`}
            disabled={index === 0}
            onClick={() => move(index, -1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface disabled:opacity-35"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 10L8 5.5 12.5 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={`Move ${labelOf(key)} down`}
            disabled={index === order.length - 1}
            onClick={() => move(index, 1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface disabled:opacity-35"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 6L8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
