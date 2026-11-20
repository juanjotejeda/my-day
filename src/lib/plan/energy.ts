/**
 * The energy curve behind the strip, the item labels and placement, exactly as
 * the approved design draws it. Milestone 4 will build the same curve from the
 * rhythm settings instead of these fixed peaks.
 */
export const LEVELS = [
  { name: "Low energy", fill: "#EAF0FA", fit: "Light tasks fit" },
  { name: "Steady energy", fill: "#D5E1F5", fit: "Meetings fit" },
  { name: "Peak energy", fill: "#A3BDE8", fit: "Deep work fits" },
] as const;

export type EnergyLevel = 0 | 1 | 2;

function bell(minute: number, mean: number, spread: number): number {
  const z = (minute - mean) / spread;
  return Math.exp((-z * z) / 2);
}

/** 0 to 1 for a minute of the day. */
export function energy(minute: number): number {
  const e =
    0.22 +
    0.68 * bell(minute, 615, 95) +
    0.12 * bell(minute, 460, 50) +
    0.32 * bell(minute, 990, 75) -
    0.12 * bell(minute, 860, 45);
  return Math.max(0.06, Math.min(1, e));
}

/** Low below 0.4, steady to 0.7, peak above. */
export function level(minute: number): EnergyLevel {
  const e = energy(minute);
  return e >= 0.7 ? 2 : e >= 0.4 ? 1 : 0;
}

export function levelOf(minute: number) {
  return LEVELS[level(minute)];
}
