"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setTheme } from "@/app/settings/actions";
import type { Theme } from "@/lib/theme";

/**
 * The moon and sun button at the end of the date line. It flips the theme at
 * once for the eye, then stores the choice, which is what the Settings switch
 * reads as well.
 */
export function ThemeToggle({ theme }: { theme: Theme }) {
  const router = useRouter();
  const [shown, setShown] = useState<Theme>(theme);
  const [, start] = useTransition();

  const next: Theme = shown === "night" ? "day" : "night";

  return (
    <button
      type="button"
      aria-label={next === "night" ? "Switch to night mode" : "Switch to day mode"}
      onClick={() => {
        setShown(next);
        // The attribute changes first, so the screen does not wait for the save.
        document.documentElement.dataset.theme = next;
        start(async () => {
          await setTheme(next);
          router.refresh();
        });
      }}
      className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-sky text-navy"
    >
      {next === "night" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
