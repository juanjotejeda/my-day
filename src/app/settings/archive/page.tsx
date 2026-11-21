import { redirect } from "next/navigation";

import { ArchiveScreen, type ArchivedItem } from "@/components/archive-screen";
import { TIMEZONE } from "@/lib/day";
import { loadArchive } from "@/lib/plan/add";
import { currentUser, settingsFor } from "@/lib/session";

export default async function Archive() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const settings = await settingsFor(user.id);
  const archived = await loadArchive(user.id, settings.privacy.retentionDays);

  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const items: ArchivedItem[] = archived.map((item) => ({
    id: item.id,
    title: item.title,
    deleted: `Deleted ${when.format(item.archivedAt)}`,
    daysLeft: item.daysLeft,
    note: item.wasCalendarEvent ? "was a calendar event" : item.source === "voice" ? "added by voice" : "",
  }));

  return <ArchiveScreen items={items} retentionDays={settings.privacy.retentionDays} />;
}
