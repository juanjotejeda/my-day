"use client";

import { useState } from "react";

import { saveSettings } from "@/app/settings/actions";
import { EnergyCurve } from "@/components/energy-curve";

/** The energy curve, saving each change to the rhythm settings. */
export function EnergyCurveSaving({
  peak,
  dip,
  secondWind,
}: {
  peak: number;
  dip: boolean;
  secondWind: boolean;
}) {
  const [status, setStatus] = useState("");

  return (
    <div className="flex flex-col gap-1">
      <EnergyCurve
        defaultPeak={peak}
        defaultDip={dip}
        defaultSecond={secondWind}
        onChange={async (change) => {
          setStatus("Saving");
          const result = await saveSettings("rhythm", { [change.key]: change.value });
          setStatus(result.ok ? "Saved" : "Not saved");
          setTimeout(() => setStatus(""), 1600);
        }}
      />
      <span className="px-1 text-xs text-muted">{status}</span>
    </div>
  );
}
