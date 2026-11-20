import Link from "next/link";

export type Tab = "today" | "review" | "insights" | "settings";

const TABS: { key: Tab; href: string; label: string; icon: (color: string) => React.ReactNode }[] = [
  {
    key: "today",
    href: "/",
    label: "Today",
    icon: (c) => (
      <>
        <circle cx="11" cy="11" r="7.5" fill="none" stroke={c} strokeWidth="1.5" />
        <path d="M11 7v4l2.5 2" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    key: "review",
    href: "/review",
    label: "Review",
    icon: (c) => (
      <>
        <rect x="3.5" y="5" width="15" height="12" rx="2.5" fill="none" stroke={c} strokeWidth="1.5" />
        <path d="M4 6l7 5.5L18 6" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      </>
    ),
  },
  {
    key: "insights",
    href: "/insights",
    label: "Insights",
    icon: (c) => (
      <path d="M4 17V11M9 17V6M14 17v-8M19 17V4" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    ),
  },
  {
    key: "settings",
    href: "/settings",
    label: "Settings",
    icon: (c) => (
      <>
        <circle cx="11" cy="11" r="3" fill="none" stroke={c} strokeWidth="1.5" />
        <path
          d="M11 3v2.2M11 16.8V19M3 11h2.2M16.8 11H19M5.3 5.3l1.6 1.6M15.1 15.1l1.6 1.6M5.3 16.7l1.6-1.6M15.1 6.9l1.6-1.6"
          fill="none"
          stroke={c}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    ),
  },
];

export function BottomNav({ active, reviewCount = 0 }: { active: Tab; reviewCount?: number }) {
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-10 -mx-4 -mb-12 flex border-t border-line bg-white/95 px-3 pt-1.5 pb-3.5"
    >
      {TABS.map((tab) => {
        const on = tab.key === active;
        const color = on ? "#243A63" : "#56647D";
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-[3px] text-[11px] ${
              on ? "text-navy" : "text-muted"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              {tab.icon(color)}
            </svg>
            {tab.label}
            {tab.key === "review" && reviewCount > 0 ? (
              <span className="absolute top-0.5 left-[52%] flex h-4 min-w-4 items-center justify-center rounded-lg bg-accent px-1 text-[10px] text-white">
                {reviewCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
