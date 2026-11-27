/**
 * One energy curve for the whole app: the strip, the item labels and the
 * scheduler all read it, built from the rhythm settings (docs/SPEC.md,
 * "Energy curve"). The shape is the one drawn in the onboarding design.
 */
/** The fills name theme tokens, so a level looks right in day and in night. */
export const LEVELS = [
  { name: "Lower energy", fill: "var(--energy-low)", fit: "Light tasks fit" },
  { name: "Steady energy", fill: "var(--energy-steady)", fit: "Meetings fit" },
  { name: "Peak energy", fill: "var(--energy-peak)", fit: "Deep work fits" },
] as const;

export type EnergyLevel = 0 | 1 | 2;

export type Rhythm = {
  /** Hour the peak window starts, e.g. 9 for 09:00. The window is 3 hours long. */
  peakStart: number;
  dip: boolean;
  secondWind: boolean;
  wake: string;
  bed: string;
};

export const DEFAULT_RHYTHM: Rhythm = {
  peakStart: 9,
  dip: true,
  secondWind: true,
  wake: "06:45",
  bed: "23:00",
};

export const PEAK_LENGTH_MIN = 180;

function bell(minute: number, mean: number, spread: number): number {
  const z = (minute - mean) / spread;
  return Math.exp((-z * z) / 2);
}

/** Minutes from midnight for "HH:MM". */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/** 0 to 1 for a minute of the day, under this rhythm. */
export function energyAt(minute: number, rhythm: Rhythm = DEFAULT_RHYTHM): number {
  const centre = (rhythm.peakStart + 1.5) * 60;
  const bedtime = toMinutes(rhythm.bed);
  const value =
    0.15 +
    0.75 * bell(minute, centre, 95) +
    (rhythm.secondWind ? 0.32 * bell(minute, centre + 400, 70) : 0) -
    (rhythm.dip ? 0.14 * bell(minute, centre + 250, 45) : 0) -
    0.1 * bell(minute, bedtime, 60);
  return Math.max(0.05, Math.min(1, value));
}

/** Low below 0.4, steady to 0.7, peak above: the levels the whole app shares. */
export function levelAt(minute: number, rhythm: Rhythm = DEFAULT_RHYTHM): EnergyLevel {
  const value = energyAt(minute, rhythm);
  return value >= 0.7 ? 2 : value >= 0.4 ? 1 : 0;
}

export function levelOf(minute: number, rhythm: Rhythm = DEFAULT_RHYTHM) {
  return LEVELS[levelAt(minute, rhythm)];
}

/** The peak window as minutes from midnight. */
export function peakWindow(rhythm: Rhythm = DEFAULT_RHYTHM): [number, number] {
  const start = rhythm.peakStart * 60;
  return [start, start + PEAK_LENGTH_MIN];
}
