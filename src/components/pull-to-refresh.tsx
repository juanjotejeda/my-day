"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/** How far the finger travels before the pull counts, in pixels. */
const THRESHOLD = 64;

/**
 * Pull the page down to reload it. The home-screen app has no pull-to-refresh
 * of its own, and the page does not bounce, so the gesture is read here: only
 * from the very top, only downwards, and the rest of the time it does nothing.
 */
export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [pending, start] = useTransition();
  const from = useRef<number | null>(null);
  const distance = useRef(0);

  useEffect(() => {
    function onStart(event: TouchEvent) {
      from.current = window.scrollY <= 0 && event.touches.length === 1 ? event.touches[0].clientY : null;
      distance.current = 0;
    }

    function onMove(event: TouchEvent) {
      if (from.current === null) return;
      // Scrolling away, or pulling up: this is not the gesture.
      if (window.scrollY > 0) {
        from.current = null;
        distance.current = 0;
        setPull(0);
        return;
      }
      const dy = event.touches[0].clientY - from.current;
      distance.current = dy <= 0 ? 0 : Math.min(dy * 0.5, 96);
      setPull(distance.current);
    }

    function onEnd() {
      if (distance.current >= THRESHOLD) start(() => router.refresh());
      from.current = null;
      distance.current = 0;
      setPull(0);
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  const showing = pull > 0 || pending;
  if (!showing) return null;

  const ready = pull >= THRESHOLD;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-center"
      style={{
        transform: `translateY(${pending ? 28 : Math.min(pull, 96) * 0.7}px)`,
        opacity: pending ? 1 : Math.min(pull / THRESHOLD, 1),
      }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card shadow-[var(--shadow-card)]">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          className={pending ? "motion-safe:animate-spin" : ""}
          style={{ transform: pending ? undefined : `rotate(${Math.min(pull / THRESHOLD, 1) * 270}deg)` }}
        >
          <path
            d="M20 12a8 8 0 1 1-2.4-5.7"
            fill="none"
            stroke={ready || pending ? "var(--accent)" : "var(--mid)"}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M20 3.5V8h-4.5" fill="none" stroke={ready || pending ? "var(--accent)" : "var(--mid)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}
