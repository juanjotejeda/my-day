"use client";

import { useState } from "react";

import { Switch } from "@/components/controls";

function bell(minute: number, mean: number, spread: number): number {
  const z = (minute - mean) / spread;
  return Math.exp((-z * z) / 2);
}

function hm(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * The energy curve from the design: a peak window you drag, a dip after lunch
 * and a second wind. Milestone 4 saves these three to the rhythm settings and
 * feeds the same shape to the scheduler.
 */
export function EnergyCurve({
  defaultPeak = 9,
  defaultDip = true,
  defaultSecond = true,
  onChange,
}: {
  defaultPeak?: number;
  defaultDip?: boolean;
  defaultSecond?: boolean;
  onChange?: (change: { key: "peakStart" | "dip" | "secondWind"; value: number | boolean }) => void;
}) {
  const [peak, setPeak] = useState(defaultPeak);
  const [dip, setDip] = useState(defaultDip);
  const [second, setSecond] = useState(defaultSecond);

  const centre = (peak + 1.5) * 60;
  const value = (minute: number) => {
    const e =
      0.15 +
      0.75 * bell(minute, centre, 95) +
      (second ? 0.32 * bell(minute, centre + 400, 70) : 0) -
      (dip ? 0.14 * bell(minute, centre + 250, 45) : 0) -
      0.1 * bell(minute, 22.5 * 60, 60);
    return Math.max(0.05, Math.min(1, e));
  };

  const points: string[] = [];
  for (let m = 360; m <= 1380; m += 10) {
    points.push(`${(((m - 360) / 1020) * 326).toFixed(1)} ${(104 - value(m) * 94).toFixed(1)}`);
  }
  const line = `M${points.join(" L")}`;

  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-line bg-card p-4">
      <div className="flex flex-col gap-1.5 py-2">
        <svg
          width="100%"
          height="110"
          viewBox="0 0 326 110"
          role="img"
          aria-label="Your energy curve from wake up to bedtime"
        >
          <path d={`${line} L326 110 L0 110 Z`} fill="var(--raised)" />
          <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          <rect
            x={(((peak * 60 - 360) / 1020) * 326).toFixed(1)}
            y="0"
            width={((180 / 1020) * 326).toFixed(1)}
            height="110"
            fill="var(--sky)"
            opacity="0.45"
          />
        </svg>
        <div className="flex justify-between text-[11px] text-muted">
          <span>06</span>
          <span>10</span>
          <span>14</span>
          <span>18</span>
          <span>22</span>
        </div>
        <div className="flex flex-wrap gap-3.5 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-sky" />
            Peak window
          </span>
          <span>
            Deep work {hm(peak)} to {hm(peak + 3)}
            {dip ? " · dip after lunch" : ""}
            {second ? " · second wind" : ""}
          </span>
        </div>
      </div>

      <label className="flex flex-col gap-2.5 py-2.5 text-[13px] text-muted">
        <span className="flex justify-between">
          <span>Peak window</span>
          <span className="text-base text-navy tabular-nums">
            {hm(peak)} to {hm(peak + 3)}
          </span>
        </span>
        <input
          type="range"
          min={7}
          max={14}
          step={0.5}
          value={peak}
          aria-label="Peak window"
          onChange={(event) => {
            const next = Number(event.target.value);
            setPeak(next);
            onChange?.({ key: "peakStart", value: next });
          }}
          className="h-11 w-full accent-[color:var(--accent)]"
        />
      </label>

      <div className="flex min-h-14 items-center gap-3 border-t border-divider py-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-base">Dip after lunch</span>
          <span className="text-[13px] leading-snug text-muted">
            Energy drops for an hour or two after lunch
          </span>
        </div>
        <Switch
          label="Dip after lunch"
          defaultOn={dip}
          onChange={(on) => {
            setDip(on);
            onChange?.({ key: "dip", value: on });
          }}
        />
      </div>

      <div className="flex min-h-14 items-center gap-3 border-t border-divider py-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-base">Second wind</span>
          <span className="text-[13px] leading-snug text-muted">A smaller rise in the late afternoon</span>
        </div>
        <Switch
          label="Second wind"
          defaultOn={second}
          onChange={(on) => {
            setSecond(on);
            onChange?.({ key: "secondWind", value: on });
          }}
        />
      </div>
    </div>
  );
}
