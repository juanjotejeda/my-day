"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type Tab = "today" | "review" | "insights" | "settings";

const TABS: { key: Tab; href: string; label: string; match: (path: string) => boolean; icon: ReactNode }[] = [
  {
    key: "today",
    href: "/",
    label: "Today",
    match: (path) =>
      path === "/" ||
      ["/tomorrow", "/end-of-day", "/empty-day", "/connection-lost", "/item"].some((start) =>
        path.startsWith(start),
      ),
    icon: (
      <>
        <circle cx="11" cy="11" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 7v4l2.5 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    key: "review",
    href: "/review",
    label: "Review",
    match: (path) => path.startsWith("/review"),
    icon: (
      <>
        <rect x="3.5" y="4.5" width="15" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3.5 9h15M7.5 2.5v3.5M14.5 2.5v3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    key: "insights",
    href: "/insights",
    label: "Insights",
    match: (path) => path.startsWith("/insights"),
    icon: (
      <path
        d="M4 17V11M9 17V6M14 17v-8M19 17V4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    ),
  },
  {
    key: "settings",
    href: "/settings",
    label: "Settings",
    match: (path) => path.startsWith("/settings"),
    icon: (
      <>
        <circle cx="11" cy="11" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M11 3v2.2M11 16.8V19M3 11h2.2M16.8 11H19M5.3 5.3l1.6 1.6M15.1 15.1l1.6 1.6M5.3 16.7l1.6-1.6M15.1 6.9l1.6-1.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    ),
  },
];

/** The two screens with no app behind them yet. */
const WITHOUT_NAV = ["/signin", "/privacy"];

/**
 * The bottom bar, rendered once by the root layout so it is on every screen.
 * The active tab is read from the path in the browser, so the highlight moves
 * the moment you tap rather than waiting for the page.
 */
export function BottomNav({ reviewCount = 0 }: { reviewCount?: number }) {
  const pathname = usePathname() ?? "/";
  if (WITHOUT_NAV.includes(pathname)) return null;

  const current = Math.max(
    TABS.findIndex((tab) => tab.match(pathname)),
    0,
  );

  return (
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/95 px-3 pt-1.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] backdrop-blur"
      >
        <div className="relative mx-auto flex w-full max-w-[406px]">
          {/* The indicator wraps the icon and its label, and slides to the new tab. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 left-0 flex w-1/4 justify-center transition-transform duration-[250ms] ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(${current * 100}%)` }}
          >
            <span className="h-full min-w-[68px] rounded-2xl bg-sky" />
          </span>

          {TABS.map((tab, position) => {
            const on = position === current;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                prefetch
                aria-current={on ? "page" : undefined}
                className={`relative z-10 flex min-h-14 flex-1 flex-col items-center justify-center gap-[3px] text-[11px] transition-colors ${
                  on ? "text-navy" : "text-muted"
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                  {tab.icon}
                </svg>
                {tab.label}
                {tab.key === "review" && reviewCount > 0 ? (
                  <span className="absolute top-0.5 left-[52%] flex h-4 min-w-4 items-center justify-center rounded-lg bg-accent px-1 text-[10px] text-on-primary">
                    {reviewCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
  );
}
