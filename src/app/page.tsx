import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";

// Until milestone 4 brings the settings screens, work hours come from the spec defaults.
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;
const WORK_END = "18:00";
const TIMEZONE = process.env.TZ || "Europe/Berlin";

function parts(now: Date) {
  const weekday = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    weekday: "long",
  }).format(now);
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
  })
    .format(now)
    .replace("/", ".");
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return { weekday, date, time };
}

export default async function Today() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { weekday, date, time } = parts(new Date());
  const hours = `${String(DAY_START_HOUR).padStart(2, "0")} to ${DAY_END_HOUR}`;

  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-4 px-4 pt-6 pb-12">
      <header className="flex items-end justify-between px-1 pt-3 pb-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[17px] font-light text-muted">{weekday}</span>
          <span className="text-[86px] font-light leading-[0.92] tracking-[-0.04em]">
            {date}
          </span>
        </div>
        <div className="flex flex-col gap-3.5 pb-1.5 text-right">
          <div>
            <div className="text-2xl font-light tabular-nums">{time}</div>
            <div className="text-[13px] text-muted">now</div>
          </div>
          <div>
            <div className="text-2xl font-light tabular-nums">{WORK_END}</div>
            <div className="text-[13px] text-muted">work ends</div>
          </div>
        </div>
      </header>

      {/* Add bar: the form behind it arrives with milestone 3. */}
      <div className="sticky top-0 z-10 -mt-1.5 bg-white pt-1.5 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="min-h-[52px] flex-1 rounded-full bg-surface px-[18px] text-left text-[15px] text-muted"
          >
            Add appointment, reminder or task
          </button>
          <button
            type="button"
            disabled
            aria-label="Add by voice"
            className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-navy"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <rect
                x="9"
                y="3"
                width="6"
                height="11"
                rx="3"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.6"
              />
              <path
                d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-2.5 rounded-card border border-line p-4">
        <div
          role="img"
          aria-label={`Whole day from ${DAY_START_HOUR}:00 to ${DAY_END_HOUR}:00, nothing planned`}
          className="h-3.5 rounded-full border border-dashed border-sky"
        />
        <div className="flex justify-between text-[11px] text-muted tabular-nums">
          <span>07</span>
          <span>12</span>
          <span>17</span>
          <span>22</span>
        </div>
        <p className="text-xs leading-relaxed text-muted">{hours} · nothing planned</p>
      </section>

      <div className="flex flex-col gap-2 px-1 pt-7">
        <h1 className="text-[34px] font-light leading-tight tracking-[-0.02em]">
          Nothing planned
        </h1>
        <p className="text-base leading-relaxed text-muted">
          No appointments, no tasks. Your calendar joins in with the next milestone.
        </p>
      </div>

      <div className="flex-1" />

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/signin" });
        }}
        className="px-1"
      >
        <button type="submit" className="min-h-11 text-sm text-muted underline-offset-4 hover:underline">
          Sign out
        </button>
      </form>

      <nav
        aria-label="Main"
        className="sticky bottom-0 z-10 -mx-4 -mb-12 flex border-t border-line bg-white/95 px-3 pt-1.5 pb-3.5"
      >
        <span
          aria-current="page"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-[3px] text-[11px]"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <circle cx="11" cy="11" r="7.5" fill="none" stroke="#243A63" strokeWidth="1.5" />
            <path d="M11 7v4l2.5 2" fill="none" stroke="#243A63" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Today
        </span>
        {/* Review, Insights and Settings arrive with milestones 5, 8 and 4. */}
        <span
          aria-disabled="true"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-[3px] text-[11px] text-muted opacity-45"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <rect x="3.5" y="5" width="15" height="12" rx="2.5" fill="none" stroke="#56647D" strokeWidth="1.5" />
            <path d="M4 6l7 5.5L18 6" fill="none" stroke="#56647D" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          Review
        </span>
        <span
          aria-disabled="true"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-[3px] text-[11px] text-muted opacity-45"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M4 17V11M9 17V6M14 17v-8M19 17V4" fill="none" stroke="#56647D" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Insights
        </span>
        <span
          aria-disabled="true"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-[3px] text-[11px] text-muted opacity-45"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <circle cx="11" cy="11" r="3" fill="none" stroke="#56647D" strokeWidth="1.5" />
            <path
              d="M11 3v2.2M11 16.8V19M3 11h2.2M16.8 11H19M5.3 5.3l1.6 1.6M15.1 15.1l1.6 1.6M5.3 16.7l1.6-1.6M15.1 6.9l1.6-1.6"
              fill="none"
              stroke="#56647D"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Settings
        </span>
      </nav>
    </main>
  );
}
