"use client";

import { useState, useTransition } from "react";

import { ChoiceGroup, SwitchRow } from "@/components/controls";
import {
  BackHeader,
  DetailRow,
  FieldBlock,
  ListCard,
  Screen,
  ScreenHeader,
  SettingsSection,
} from "@/components/ui";
import { disconnectGoogle, syncNow } from "@/app/settings/actions";

/** S5 Sources: the real Google connection, plus the calendars and reach settings. */
export function SourcesScreen({
  connected,
  syncedLabel,
  calendars,
}: {
  connected: boolean;
  syncedLabel: string;
  calendars: string[];
}) {
  const [status, setStatus] = useState("");
  const [armed, setArmed] = useState(false);
  const [, start] = useTransition();

  function runSync() {
    setStatus("Syncing");
    start(async () => {
      const result = await syncNow();
      setStatus(result.ok ? `Synced, ${result.upserted ?? 0} events` : `Sync failed: ${result.error}`);
    });
  }

  function disconnect() {
    if (!armed) {
      setArmed(true);
      setStatus("Tap again to disconnect");
      return;
    }
    start(async () => {
      const result = await disconnectGoogle();
      setArmed(false);
      setStatus(result.ok ? "Disconnected. Sign in again to reconnect." : "Could not disconnect");
    });
  }

  return (
    <Screen>
      <BackHeader href="/settings" label="Settings" />
      <ScreenHeader title="Sources" sub="Where My Day gets your day from." />

      <SettingsSection title="Google Calendar">
        <DetailRow
          label={connected ? "Connected, calendar events" : "Not connected"}
          value={syncedLabel}
        />
        {calendars.map((calendar) => (
          <SwitchRow key={calendar} label={calendar} defaultOn />
        ))}
      </SettingsSection>

      <SettingsSection title="Gmail">
        <DetailRow label="Connected, read-only" value={syncedLabel} />
        <FieldBlock label="Look in">
          <ChoiceGroup
            label="Look in"
            choices={[
              { value: "inbox", label: "Inbox only" },
              { value: "all", label: "All mail" },
            ]}
            defaultValue={["inbox"]}
          />
        </FieldBlock>
        <SwitchRow label="Include my sent mail" sub="Finds promises you made" defaultOn />
        <FieldBlock label="Look back">
          <ChoiceGroup
            label="Look back"
            choices={[
              { value: "7", label: "7 days" },
              { value: "14", label: "14 days" },
              { value: "30", label: "30 days" },
            ]}
            defaultValue={["14"]}
          />
        </FieldBlock>
      </SettingsSection>

      <SettingsSection title="My Day">
        <DetailRow label="Manual entries" sub="Typed or spoken in the add bar" value="On" />
      </SettingsSection>

      <SettingsSection title="Coming later">
        <DetailRow label="Telegram" sub="Send reminders to a private bot" value="Planned" />
        <DetailRow label="WhatsApp" sub="Not part of the first version" value="Investigating" />
      </SettingsSection>

      <ListCard>
        <button type="button" onClick={runSync} className="flex min-h-14 w-full items-center text-[15px] text-navy">
          Sync now
        </button>
        <button
          type="button"
          onClick={disconnect}
          className="flex min-h-14 w-full items-center border-t border-divider text-[15px] text-alert-ink"
        >
          {armed ? "Tap again to disconnect Google" : "Disconnect Google"}
        </button>
      </ListCard>

      {status ? <p className="px-1 text-[13px] text-muted">{status}</p> : null}
      <div className="flex-1" />
    </Screen>
  );
}
