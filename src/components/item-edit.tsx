"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { editItem } from "@/app/actions";
import { DetailRow, PanelCard } from "@/components/ui";

/**
 * The top of the item detail: the name, when it happens and how long it takes,
 * all editable. Nothing is saved until Save, so a half-typed title never lands.
 */
export function ItemEdit({
  id,
  title,
  date,
  time,
  minutes,
  readOnly = false,
  readOnlyNote,
}: {
  id: string;
  title: string;
  /** YYYY-MM-DD, or "" for an item with no day yet. */
  date: string;
  /** HH:MM, or "" when the scheduler has not placed it. */
  time: string;
  minutes: number | null;
  /** A Google event: it is read here and moved in Google. */
  readOnly?: boolean;
  readOnlyNote?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState({ title, date, time, minutes: minutes ? String(minutes) : "" });
  const [status, setStatus] = useState("");
  const [saving, start] = useTransition();

  const dirty = readOnly
    ? draft.title !== title
    : draft.title !== title ||
      draft.date !== date ||
      draft.time !== time ||
      draft.minutes !== (minutes ? String(minutes) : "");

  function save() {
    setStatus("Saving");
    start(async () => {
      const result = await editItem(id, {
        ...(draft.title !== title ? { title: draft.title } : {}),
        ...(draft.date !== date ? { date: draft.date } : {}),
        ...(draft.time !== time ? { time: draft.time } : {}),
        ...(draft.minutes !== (minutes ? String(minutes) : "") ? { minutes: Number(draft.minutes) } : {}),
      });
      setStatus(result.message);
      if (result.ok) router.refresh();
    });
  }

  const field = "min-h-10 rounded-full border border-sky bg-card px-3 text-right text-[15px] text-navy";

  return (
    <>
      <textarea
        value={draft.title}
        aria-label="Name"
        rows={Math.min(4, Math.ceil(draft.title.length / 24) || 1)}
        onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        className="w-full resize-none bg-transparent px-1 text-[36px] leading-tight font-light tracking-[-0.02em] text-navy outline-none"
      />

      <PanelCard>
        {readOnly ? (
          <>
            <DetailRow label="Planned" value={time || "Not scheduled"} />
            <DetailRow label="Length" value={minutes ? `${minutes} min` : "not set"} />
            <DetailRow label="Day" value={date || "Later"} />
          </>
        ) : (
          <>
            <DetailRow
              label="Planned"
              value={
                <input
                  type="time"
                  aria-label="Planned"
                  value={draft.time}
                  onChange={(event) => setDraft({ ...draft, time: event.target.value })}
                  className={field}
                />
              }
            />
            <DetailRow
              label="Length"
              value={
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    aria-label="Length in minutes"
                    min={5}
                    max={600}
                    step={5}
                    value={draft.minutes}
                    onChange={(event) => setDraft({ ...draft, minutes: event.target.value })}
                    className={`${field} w-24`}
                  />
                  <span className="text-[15px] text-muted">min</span>
                </span>
              }
            />
            <DetailRow
              label="Day"
              value={
                <input
                  type="date"
                  aria-label="Day"
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                  className={field}
                />
              }
            />
          </>
        )}
      </PanelCard>

      {readOnlyNote ? <p className="px-1 text-[13px] leading-snug text-muted">{readOnlyNote}</p> : null}

      {dirty ? (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="min-h-12 rounded-full bg-primary text-[15px] text-on-primary disabled:opacity-60"
        >
          Save
        </button>
      ) : null}
      {status ? <p className="px-1 text-[13px] leading-snug text-muted">{status}</p> : null}
    </>
  );
}
