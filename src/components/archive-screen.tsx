"use client";

import { useState, useTransition } from "react";

import { restoreArchived } from "@/app/actions";
import { BackHeader, ListCard, NoteCard, Screen, ScreenHeader, SettingsSection } from "@/components/ui";

export type ArchivedItem = {
  id: string;
  title: string;
  deleted: string;
  daysLeft: number;
  note: string;
};

/** Settings: what you deleted, for as long as the retention window keeps it. */
export function ArchiveScreen({
  items,
  retentionDays,
}: {
  items: ArchivedItem[];
  retentionDays: number;
}) {
  const [gone, setGone] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [, start] = useTransition();

  const left = items.filter((item) => !gone.includes(item.id));

  function restore(id: string) {
    setStatus("Restoring");
    start(async () => {
      const result = await restoreArchived(id);
      if (result.ok) setGone((current) => [...current, id]);
      setStatus(result.message);
    });
  }

  return (
    <Screen>
      <BackHeader href="/settings" label="Settings" />
      <ScreenHeader
        title="Archive"
        sub={`What you deleted, kept for ${retentionDays} days. Completed items are not here: they stay in your day.`}
      />

      {left.length ? (
        <SettingsSection title="Deleted">
          {left.map((item) => (
            <div key={item.id} className="flex min-h-14 items-center gap-3 border-t border-divider py-2">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-base">{item.title}</span>
                <span className="text-[13px] leading-snug text-muted">
                  {item.deleted} · {item.daysLeft === 0 ? "removed today" : `${item.daysLeft} days left`}
                  {item.note ? ` · ${item.note}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => restore(item.id)}
                className="min-h-11 rounded-full border border-sky px-4 text-sm text-navy"
              >
                Restore
              </button>
            </div>
          ))}
        </SettingsSection>
      ) : (
        <ListCard>
          <p className="py-4 text-[15px] leading-relaxed text-muted">
            Nothing deleted. Items you delete appear here, and you can put them back.
          </p>
        </ListCard>
      )}

      <NoteCard label="WHAT HAPPENS NEXT">
        After {retentionDays} days an item is removed for good, as the privacy page says. An event
        My Day created was already deleted in Google Calendar; restoring it creates it again.
      </NoteCard>

      {status ? <p className="px-1 text-[13px] text-muted">{status}</p> : null}
      <div className="flex-1" />
    </Screen>
  );
}
