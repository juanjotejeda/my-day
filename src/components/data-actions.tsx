"use client";

import { useState, useTransition } from "react";

import { ListCard } from "@/components/ui";
import { signOutEverywhere } from "@/app/settings/actions";
import { deleteMyData } from "@/app/settings/actions";

/** S7: export everything, or clear the plan data after a second tap. */
export function DataActions() {
  const [armed, setArmed] = useState(false);
  const [status, setStatus] = useState("");
  const [, start] = useTransition();

  function remove() {
    if (!armed) {
      setArmed(true);
      setStatus("Tap again to delete every item, candidate, correction, rule and setting, and sign out.");
      return;
    }
    start(async () => {
      const result = await deleteMyData();
      setArmed(false);
      if (!result.ok) {
        setStatus("Could not delete");
        return;
      }
      setStatus("Everything is deleted. Signing you out.");
      await signOutEverywhere();
    });
  }

  return (
    <>
      <ListCard>
        <a href="/api/export" className="flex min-h-14 w-full items-center text-[15px] text-navy">
          Export my data
        </a>
        <button
          type="button"
          onClick={remove}
          className="flex min-h-14 w-full items-center border-t border-divider text-[15px] text-alert-ink"
        >
          {armed ? "Tap again to delete everything and sign out" : "Delete all My Day data"}
        </button>
      </ListCard>
      {status ? <p className="px-1 text-[13px] leading-relaxed text-muted">{status}</p> : null}
    </>
  );
}
