"use client";

import { useEffect, useState } from "react";

import { ListCard } from "@/components/ui";

type State = "unknown" | "unsupported" | "default" | "granted" | "denied" | "subscribed";

function keyToBytes(base64: string): ArrayBuffer {
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes.buffer;
}

/**
 * Asks for notification permission, never on first load: only from this button,
 * as the spec says. Every device asks for itself, a laptop as much as a phone,
 * so the card reads this browser's own subscription rather than the total. On
 * an iPhone it works once the app runs from the home screen icon (iOS 16.4).
 */
export function PushPermission({ publicKey, devices }: { publicKey: string; devices: number }) {
  const [state, setState] = useState<State>("unknown");
  const [status, setStatus] = useState("");
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function look() {
      const supported =
        "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        if (!cancelled) setState("unsupported");
        return;
      }

      // Another device being subscribed says nothing about this one.
      const registration = await navigator.serviceWorker.getRegistration();
      const here = await registration?.pushManager.getSubscription();
      if (cancelled) return;

      setState(
        Notification.permission === "granted" && here ? "subscribed" : (Notification.permission as State),
      );
      const display = window.matchMedia("(display-mode: standalone)").matches;
      setStandalone(display || !/iPhone|iPad/.test(navigator.userAgent));
    }

    const timer = setTimeout(look, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [devices]);

  async function allow() {
    setStatus("Asking");
    try {
      const permission = await Notification.requestPermission();
      setState(permission);
      if (permission !== "granted") {
        setStatus("Not allowed. You can change it in your browser settings.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyToBytes(publicKey),
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) {
        setStatus("The app could not store this device. Try again.");
        return;
      }
      setState("subscribed");
      setStatus("This device will get your notifications.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message.slice(0, 120) : "That did not work.");
    }
  }

  async function test(all: boolean) {
    setStatus("Sending");
    const response = await fetch("/api/push/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all }),
    });
    const body = (await response.json()) as { ok?: boolean; error?: string; sent?: number };
    setStatus(
      body.ok
        ? all
          ? `${body.sent ?? 0} sent. They arrive a second apart.`
          : "Sent. It should appear in a moment."
        : (body.error ?? "That did not work."),
    );
  }

  return (
    <ListCard>
      {!standalone ? (
        <p className="py-3 text-[15px] leading-relaxed text-muted">
          On an iPhone, notifications work once My Day runs from its home screen icon. Open this
          page from the icon, then come back here.
        </p>
      ) : null}

      {state === "unsupported" ? (
        <p className="py-3 text-[15px] leading-relaxed text-muted">
          This browser cannot show notifications.
        </p>
      ) : (
        <button
          type="button"
          onClick={state === "subscribed" ? () => test(false) : allow}
          className="flex min-h-14 w-full items-center justify-between text-[15px] text-navy"
        >
          <span>
            {state === "subscribed" ? "Send a test notification" : "Allow notifications here"}
          </span>
          <span className="text-[13px] text-muted">
            {state === "subscribed"
              ? `this device, ${devices} in all`
              : state === "denied"
                ? "blocked"
                : devices
                  ? `off here, ${devices} elsewhere`
                  : "off"}
          </span>
        </button>
      )}

      {state === "subscribed" ? (
        <button
          type="button"
          onClick={() => test(true)}
          className="flex min-h-14 w-full items-center justify-between border-t border-divider text-[15px] text-navy"
        >
          <span>Send every daily notification</span>
          <span className="text-[13px] text-muted">to check them</span>
        </button>
      ) : null}

      {status ? <p className="pb-3 text-[13px] leading-relaxed text-muted">{status}</p> : null}
    </ListCard>
  );
}
