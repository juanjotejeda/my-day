"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setView } from "@/app/settings/actions";
import type { View } from "@/lib/theme";

/**
 * The eye in the date line. Outlined on the full Today, filled on the simple
 * one, and the choice is stored per user, the way night mode is.
 */
export function ViewToggle({ view }: { view: View }) {
  const router = useRouter();
  const [shown, setShown] = useState<View>(view);
  const [, start] = useTransition();

  const next: View = shown === "simple" ? "full" : "simple";

  return (
    <button
      type="button"
      aria-label={next === "simple" ? "Switch to simple view" : "Switch to full view"}
      aria-pressed={shown === "simple"}
      onClick={() => {
        setShown(next);
        start(async () => {
          await setView(next);
          router.refresh();
        });
      }}
      className={`flex h-11 w-11 flex-none items-center justify-center rounded-full border border-sky text-navy ${
        shown === "simple" ? "bg-sky" : ""
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
