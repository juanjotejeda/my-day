"use client";

import { useState, useTransition } from "react";

import { ChoiceGroup, Switch } from "@/components/controls";
import {
  BackHeader,
  DetailRow,
  FieldBlock,
  ListCard,
  Screen,
  ScreenHeader,
  SettingsSection,
} from "@/components/ui";
import {
  disconnectGoogle,
  setCalendarEnabled,
  setGmailReach,
  syncNow,
} from "@/app/settings/actions";

export type CalendarChoice = { id: string; name: string; enabled: boolean };

export type GmailReach = {
  scope: "inbox" | "all";
  lookbackDays: number;
  includeSent: boolean;
};

/** S5 Sources: the real Google connection, its calendars and how far Gmail is read. */
export function SourcesScreen({
  connected,
  syncedLabel,
  calendars,
  gmail,
  needsConsent,
}: {
  connected: boolean;
  syncedLabel: string;
  calendars: CalendarChoice[];
  gmail: GmailReach;
  needsConsent: boolean;
}) {
  const [status, setStatus] = useState("");
  const [armed, setArmed] = useState(false);
  const [, start] = useTransition();

  function say(message: string) {
    setStatus(message);
  }

  function runSync() {
    say("Syncing");
    start(async () => {
      const result = await syncNow();
      say(result.ok ? `Synced, ${result.upserted ?? 0} events` : `Sync failed: ${result.error}`);
    });
  }

  function toggleCalendar(id: string, on: boolean) {
    say(on ? "Adding that calendar" : "Removing that calendar");
    start(async () => {
      const result = await setCalendarEnabled(id, on);
      if (!result.ok) {
        say(`Not saved: ${result.error}`);
        return;
      }
      const sync = await syncNow();
      say(sync.ok ? `Saved. ${sync.upserted ?? 0} events synced.` : "Saved. Next sync picks it up.");
    });
  }

  function saveGmail(patch: Parameters<typeof setGmailReach>[0]) {
    say("Saving");
    start(async () => {
      const result = await setGmailReach(patch);
      say(result.ok ? "Saved" : `Not saved: ${result.error}`);
    });
  }

  function disconnect() {
    if (!armed) {
      setArmed(true);
      say("Tap again to disconnect");
      return;
    }
    start(async () => {
      const result = await disconnectGoogle();
      setArmed(false);
      say(result.ok ? "Disconnected. Sign in again to reconnect." : "Could not disconnect");
    });
  }

  return (
    <Screen>
      <BackHeader href="/settings" label="Settings" />
      <ScreenHeader title="Sources" sub="Where My Day gets your day from." />

      {needsConsent ? (
        <div className="flex flex-col gap-2 rounded-[18px] bg-alert px-4 py-3.5">
          <div className="text-base text-alert-ink">Sign in again for calendar names</div>
          <p className="text-sm leading-relaxed">
            My Day now asks Google for the names of your calendars. Your current consent does not
            include that, so this list shows ids until you sign in again.
          </p>
        </div>
      ) : null}

      <SettingsSection title="Google Calendar">
        <DetailRow label={connected ? "Connected, calendar events" : "Not connected"} value={syncedLabel} />
        {calendars.map((calendar) => (
          <div key={calendar.id} className="flex min-h-14 items-center gap-3 border-t border-divider py-2">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-base">{calendar.name}</span>
              <span className="text-[13px] leading-snug text-muted">
                {calendar.enabled ? "Synced into your day" : "Not synced"}
              </span>
            </div>
            <Switch
              label={calendar.name}
              defaultOn={calendar.enabled}
              onChange={(on) => toggleCalendar(calendar.id, on)}
            />
          </div>
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
            defaultValue={[gmail.scope]}
            onChange={(picked) => saveGmail({ scope: picked[0] as "inbox" | "all" })}
          />
        </FieldBlock>
        <div className="flex min-h-14 items-center gap-3 border-t border-divider py-2">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-base">Include my sent mail</span>
            <span className="text-[13px] leading-snug text-muted">Finds promises you made</span>
          </div>
          <Switch
            label="Include my sent mail"
            defaultOn={gmail.includeSent}
            onChange={(on) => saveGmail({ includeSent: on })}
          />
        </div>
        <FieldBlock label="Look back">
          <ChoiceGroup
            label="Look back"
            choices={[
              { value: "7", label: "7 days" },
              { value: "14", label: "14 days" },
              { value: "30", label: "30 days" },
            ]}
            defaultValue={[String(gmail.lookbackDays)]}
            onChange={(picked) => saveGmail({ lookbackDays: Number(picked[0]) as 7 | 14 | 30 })}
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
