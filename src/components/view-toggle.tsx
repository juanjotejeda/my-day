"use client";

import { useViewMode } from "@/components/view-mode";

/**
 * The eye in the date line. Outlined on the full Today, filled on the simple
 * one. It reveals the rest of the day for this visit; the app opens simple.
 */
export function ViewToggle() {
  const { view, setView } = useViewMode();
  const next = view === "simple" ? "full" : "simple";

  return (
    <button
      type="button"
      aria-label={next === "simple" ? "Switch to simple view" : "Switch to full view"}
      aria-pressed={view === "simple"}
      onClick={() => setView(next)}
      className={`flex h-11 w-11 flex-none items-center justify-center rounded-full border border-sky text-navy ${
        view === "simple" ? "bg-sky" : ""
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </button>
  );
}
