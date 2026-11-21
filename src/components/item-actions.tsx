"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { applyCorrection, deleteItem, unpinItem } from "@/app/actions";

/** The actions at the foot of the item detail, each one a real correction. */
export function ItemActions({
  id,
  done,
  important,
  pinned,
  fromCalendar,
  calendarOnly,
  flexible,
}: {
  id: string;
  done: boolean;
  important: boolean;
  /** Put at a time by you: the scheduler leaves it there until it is unpinned. */
  pinned: boolean;
  fromCalendar: boolean;
  /** An event from your own calendar: it leaves My Day and stays in Google. */
  calendarOnly: boolean;
  flexible: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [armed, setArmed] = useState(false);
  const [, start] = useTransition();

  function act(kind: "done" | "tomorrow" | "more_time" | "category" | "important") {
    setStatus("Saving");
    start(async () => {
      const result = await applyCorrection(id, kind);
      setStatus(result.message);
      router.refresh();
    });
  }

  const deleteWords = calendarOnly
    ? { label: "Remove from my day", armed: "Tap again to remove. It stays in Google Calendar" }
    : fromCalendar
      ? { label: "Delete", armed: "Tap again to delete, here and in Google Calendar" }
      : { label: "Delete", armed: "Tap again to delete" };

  function remove() {
    if (!armed) {
      setArmed(true);
      setStatus(deleteWords.armed);
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
        className="flex min-h-[54px] items-center justify-center rounded-full bg-primary text-base text-on-primary"
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
      <button type="button" onClick={() => act("important")} className={button}>
        {important ? "Remove importance" : "Mark as important"}
      </button>
      <button type="button" onClick={() => act("category")} className={button}>
        Change work or personal
      </button>
      {pinned ? (
        <button
          type="button"
          onClick={() => {
            setStatus("Unpinning");
            start(async () => {
              const result = await unpinItem(id);
              setStatus(result.message);
              router.refresh();
            });
          }}
          className={button}
        >
          Unpin, let My Day place it
        </button>
      ) : null}

      <button
        type="button"
        onClick={remove}
        className="flex min-h-12 items-center justify-center rounded-full border border-sky text-[15px] text-alert-ink"
      >
        {armed ? deleteWords.armed : deleteWords.label}
      </button>

      {status ? <p className="px-2 text-[13px] leading-snug text-muted">{status}</p> : null}
    </div>
  );
}
