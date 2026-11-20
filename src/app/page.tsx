import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { DayStrip } from "@/components/day-strip";
import { DAY_END_HOUR, DAY_START_HOUR, TIMEZONE, hhmm } from "@/lib/day";
import { syncCalendars } from "@/lib/google/calendar-sync";
import { prisma } from "@/lib/prisma";
import { progressThrough } from "@/lib/day-plan";
import { loadToday } from "@/lib/today";

// Work hours still come from the spec defaults; the settings screens arrive with milestone 4.
const WORK_END = "18:00";

function header(now: Date) {
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit" })
    .format(now)
    .replace("/", ".");
  return { weekday, date };
}

function timeRange(start: Date | null, end: Date | null): string {
  if (!start) return "all day";
  return end ? `${hhmm(start)} to ${hhmm(end)}` : hhmm(start);
}

export default async function Today() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const email = session.user.email?.toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user) redirect("/signin");

  const now = new Date();
  const { weekday, date } = header(now);
  const [plan, source] = await Promise.all([
    loadToday(user.id, now),
    prisma.source.findUnique({ where: { userId_kind: { userId: user.id, kind: "google" } } }),
  ]);
  const { banners, blocks, current, next, later, earlier, total } = plan;
  const cardItem = current ?? next[0] ?? null;
  const nextList = current ? next : next.slice(1);
  const disconnected = Boolean(source?.disconnectedAt);

  async function syncNow() {
    "use server";
    const signedIn = await auth();
    const signedInEmail = signedIn?.user?.email?.toLowerCase();
    if (!signedInEmail || signedInEmail !== process.env.ALLOWED_EMAIL?.toLowerCase()) return;
    const me = await prisma.user.findUnique({ where: { email: signedInEmail } });
    if (me) await syncCalendars(me.id).catch(() => undefined);
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-4 px-4 pt-6 pb-12">
      <header className="flex items-end justify-between px-1 pt-3 pb-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[17px] font-light text-muted">{weekday}</span>
          <span className="text-[86px] font-light leading-[0.92] tracking-[-0.04em]">{date}</span>
        </div>
        <div className="flex flex-col gap-3.5 pb-1.5 text-right">
          <div>
            <div className="text-2xl font-light tabular-nums">{hhmm(now)}</div>
            <div className="text-[13px] text-muted">now</div>
          </div>
          <div>
            <div className="text-2xl font-light tabular-nums">{WORK_END}</div>
            <div className="text-[13px] text-muted">work ends</div>
          </div>
        </div>
      </header>

      {disconnected ? (
        <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
          <p className="text-[15px]">Google is no longer connected, so today may be out of date.</p>
          <a href="/signin" className="text-sm text-accent underline-offset-4 hover:underline">
            Reconnect Google
          </a>
        </div>
      ) : null}

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
              <rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
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

      {banners.length ? (
        <div className="flex flex-col gap-1.5">
          {banners.map((item) => (
            <div key={item.id} className="rounded-card bg-surface px-4 py-3 text-[15px]">
              {item.title}
              <span className="pl-2 text-xs text-muted">all day</span>
            </div>
          ))}
        </div>
      ) : null}

      <DayStrip blocks={blocks} now={now} />

      {cardItem ? (
        <section className="flex flex-col gap-2.5 rounded-card bg-surface p-4">
          <span className="text-xs tracking-[0.1em] text-accent">{current ? "NOW" : "NEXT"}</span>
          <h1 className="text-[32px] font-light leading-tight tracking-[-0.01em]">{cardItem.title}</h1>
          <p className="text-[15px]">{timeRange(cardItem.start, cardItem.end)}</p>
          {current ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-divider">
              <div className="h-1.5 bg-mid" style={{ width: `${progressThrough(current, now) * 100}%` }} />
            </div>
          ) : null}
          <p className="text-[13px] leading-relaxed text-muted">
            {current
              ? "From your calendar, so it stays fixed."
              : "Nothing on right now. The day is yours until then."}
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-2 px-1 pt-7">
          <h1 className="text-[34px] font-light leading-tight tracking-[-0.02em]">
            {total ? "Nothing left today" : "Nothing planned"}
          </h1>
          <p className="text-base leading-relaxed text-muted">
            {total
              ? "Everything in your calendar today has already happened."
              : `${String(DAY_START_HOUR).padStart(2, "0")} to ${DAY_END_HOUR} with nothing in your calendar.`}
          </p>
        </div>
      )}

      {nextList.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="mx-1 text-[22px] font-light">Next</h2>
          <ul className="overflow-hidden rounded-card border border-line">
            {nextList.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 border-b border-divider px-3.5 py-2.5 last:border-b-0"
              >
                <span className="w-1 self-stretch rounded-sm bg-mid" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[15px]">{item.title}</span>
                  <span className="text-xs text-muted tabular-nums">{timeRange(item.start, item.end)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {later.length ? (
        <details className="rounded-card border border-line px-3.5 py-1">
          <summary className="flex min-h-[50px] cursor-pointer items-center justify-between text-[15px]">
            Rest of today ({later.length})
          </summary>
          <ul className="pb-2">
            {later.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 border-t border-divider py-2.5">
                <span className="text-[15px]">{item.title}</span>
                <span className="text-xs text-muted tabular-nums">{timeRange(item.start, item.end)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {/* Open when nothing is on now and nothing is coming: the day still had events. */}
      {earlier.length ? (
        <details open={!cardItem} className="rounded-card border border-line px-3.5 py-1">
          <summary className="flex min-h-[50px] cursor-pointer items-center justify-between text-[15px]">
            Earlier today ({earlier.length})
          </summary>
          <ul className="pb-2">
            {earlier.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 border-t border-divider py-2.5 text-muted"
              >
                <span className="text-[15px]">{item.title}</span>
                <span className="text-xs tabular-nums">{timeRange(item.start, item.end)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="flex-1" />

      <div className="flex items-center justify-between gap-4 px-1">
        <form action={syncNow}>
          <button type="submit" className="min-h-11 text-sm text-accent underline-offset-4 hover:underline">
            Sync now
          </button>
        </form>
        <span className="text-xs text-muted">
          {source?.lastSyncAt ? `synced ${hhmm(source.lastSyncAt)}` : "not synced yet"}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button type="submit" className="min-h-11 text-sm text-muted underline-offset-4 hover:underline">
            Sign out
          </button>
        </form>
      </div>

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
