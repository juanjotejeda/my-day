"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setTheme } from "@/app/settings/actions";
import { Switch } from "@/components/controls";

/** Settings > Appearance. The same stored setting the moon button changes. */
export function NightModeRow({ night }: { night: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [, start] = useTransition();

  return (
    <>
      <div className="flex min-h-14 items-center gap-3 border-t border-divider py-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-base">Night mode</span>
          <span className="text-[13px] leading-snug text-muted">
            Darker colours, the same layout. You choose: it never switches by itself.
          </span>
        </div>
        <Switch
          label="Night mode"
          defaultOn={night}
          onChange={(on) => {
            document.documentElement.dataset.theme = on ? "night" : "day";
            setStatus("Saving");
            start(async () => {
              const result = await setTheme(on ? "night" : "day");
              setStatus(result.ok ? "Saved" : "Not saved");
              router.refresh();
              setTimeout(() => setStatus(""), 1600);
            });
          }}
        />
      </div>
      {status ? <p className="pb-2 text-[13px] text-muted">{status}</p> : null}
    </>
  );
}
