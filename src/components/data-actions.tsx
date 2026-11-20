"use client";

import { useState, useTransition } from "react";

import { ListCard } from "@/components/ui";
import { deleteMyData } from "@/app/settings/actions";

/** S7: export everything, or clear the plan data after a second tap. */
export function DataActions() {
  const [armed, setArmed] = useState(false);
  const [status, setStatus] = useState("");
  const [, start] = useTransition();

  function remove() {
    if (!armed) {
      setArmed(true);
      setStatus("Tap again to delete every item, candidate, correction and rule.");
      return;
    }
    start(async () => {
      const result = await deleteMyData();
      setArmed(false);
      setStatus(result.ok ? "Deleted. Your next sync fills the day again." : "Could not delete");
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
          {armed ? "Tap again to delete all My Day data" : "Delete all My Day data"}
        </button>
      </ListCard>
      {status ? <p className="px-1 text-[13px] leading-relaxed text-muted">{status}</p> : null}
    </>
  );
}
