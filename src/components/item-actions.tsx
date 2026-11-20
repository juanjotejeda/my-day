"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { applyCorrection, deleteItem } from "@/app/actions";

/** The actions at the foot of the item detail, each one a real correction. */
export function ItemActions({
  id,
  done,
  canDelete,
  fromCalendar,
  flexible,
}: {
  id: string;
  done: boolean;
  canDelete: boolean;
  fromCalendar: boolean;
  flexible: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [armed, setArmed] = useState(false);
  const [, start] = useTransition();

  function act(kind: "done" | "tomorrow" | "more_time" | "category") {
    setStatus("Saving");
    start(async () => {
      const result = await applyCorrection(id, kind);
      setStatus(result.message);
      router.refresh();
    });
  }

  function remove() {
    if (!armed) {
      setArmed(true);
      setStatus(fromCalendar ? "Tap again to delete, here and in Google Calendar" : "Tap again to delete");
      return;
    }
    start(async () => {
      const result = await deleteItem(id);
      setStatus(result.message);
      if (result.ok) router.push("/");
    });
  }

  const button = "flex min-h-12 items-center justify-center rounded-full border border-sky text-[15px] text-navy";

  return (
    <div className="flex flex-col gap-2 rounded-card bg-surface p-4">
      <button
        type="button"
        onClick={() => act("done")}
        className="flex min-h-[54px] items-center justify-center rounded-full bg-navy text-base text-white"
      >
        {done ? "Back on my list" : "Mark as done"}
      </button>
      <button type="button" onClick={() => act("tomorrow")} className={button}>
        Move to tomorrow
      </button>
      {flexible ? (
        <button type="button" onClick={() => act("more_time")} className={button}>
          I need 30 more minutes
        </button>
      ) : null}
      <button type="button" onClick={() => act("category")} className={button}>
        Change work or personal
      </button>

      {canDelete ? (
        <button
          type="button"
          onClick={remove}
          className="flex min-h-12 items-center justify-center rounded-full border border-sky text-[15px] text-alert-ink"
        >
          {armed ? "Tap again to delete" : "Delete"}
        </button>
      ) : fromCalendar ? (
        <p className="px-2 py-1 text-[13px] leading-snug text-muted">Delete this in Google Calendar.</p>
      ) : null}

      {status ? <p className="px-2 text-[13px] leading-snug text-muted">{status}</p> : null}
    </div>
  );
}
