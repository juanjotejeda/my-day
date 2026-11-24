"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const HOUR = 60 * 60 * 1000;

/**
 * The day moves on without you: once an hour the screen fetches itself again,
 * so a page left open all morning is not still showing breakfast. Only while
 * the app is on screen, and the clock counts from the last refresh, so coming
 * back to it after a long sleep reloads at once rather than up to an hour on.
 */
export function AutoRefresh() {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    // The clock starts when the screen does, never during render.
    if (!last.current) last.current = Date.now();

    function refreshIfDue() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - last.current < HOUR) return;
      last.current = Date.now();
      router.refresh();
    }

    const timer = setInterval(refreshIfDue, 60 * 1000);
    document.addEventListener("visibilitychange", refreshIfDue);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfDue);
    };
  }, [router]);

  return null;
}
