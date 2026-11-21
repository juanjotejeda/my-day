import Link from "next/link";
import type { ReactNode } from "react";

/** What just happened: a dark pill at the top edge, gone after a moment. */
export function Toast({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="fixed inset-x-4 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 mx-auto max-w-[398px] rounded-full bg-toast px-5 py-4 text-center text-[15px] leading-snug text-toast-ink shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur [animation:toast-in_180ms_ease-out] motion-reduce:animate-none"
    >
      {children}
    </div>
  );
}

/** White card, 1px line, 22px radius: the surface every list sits on. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-card ${className}`}>{children}</div>;
}

export function SectionTitle({ children, count, hint }: { children: ReactNode; count?: number; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between px-1">
      <h2 className="text-[22px] font-light">
        {children}
        {count === undefined ? null : <span className="pl-2 text-base text-muted">{count}</span>}
      </h2>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

/** Time chip: filled for fixed items, dashed outline for flexible ones. */
export function TimeChip({ time, fixed }: { time: string; fixed: boolean }) {
  return (
    <span
      className={`rounded-full px-[7px] py-0.5 tabular-nums ${
        fixed ? "bg-raised text-navy" : "border border-dashed border-mid text-accent"
      }`}
    >
      {time}
    </span>
  );
}

export function EnergyDot({ fill }: { fill: string }) {
  return <span className="h-2 w-2 rounded-sm" style={{ background: fill }} />;
}

/** Full-width pill link, used for Plan tomorrow and Close the day. */
export function PillLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-sky text-[15px] text-navy"
    >
      {children}
    </Link>
  );
}

/** Back to where this screen came from: a round button and that screen's name. */
export function BackRow({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex min-h-12 items-center gap-2">
      <Link
        href={href}
        aria-label={`Back to ${label}`}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-navy"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            d="M11 3.5L5.5 9l5.5 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <span className="flex-1 text-[15px] text-muted">{label}</span>
    </div>
  );
}

/** The screen shell: 390px design width, centred, with room for the bottom nav. */
export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main className={`mx-auto flex w-full max-w-[430px] min-h-[100dvh] flex-1 flex-col gap-4 px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] ${className}`}>
      {children}
    </main>
  );
}

/** Small label over a big light headline, the top of every screen but Today. */
export function ScreenHeader({
  label,
  title,
  sub,
  size = 36,
}: {
  label?: string;
  title: string;
  sub?: string;
  size?: 32 | 36 | 40 | 44 | 64;
}) {
  return (
    <div className="flex flex-col gap-2 p-1">
      {label ? <div className="text-[15px] text-muted">{label}</div> : null}
      <h1
        className="leading-tight font-light tracking-[-0.02em]"
        style={{ fontSize: `${size}px` }}
      >
        {title}
      </h1>
      {sub ? <p className="text-base leading-relaxed text-muted">{sub}</p> : null}
    </div>
  );
}

export type ChipVariant = "sky" | "divider" | "dashed";

export function Chip({ children, variant = "sky" }: { children: ReactNode; variant?: ChipVariant }) {
  const styles: Record<ChipVariant, string> = {
    sky: "bg-sky text-navy",
    divider: "bg-raised text-navy",
    dashed: "border border-dashed border-mid text-accent",
  };
  return (
    <span className={`inline-flex min-h-[26px] items-center rounded-full px-2.5 text-xs ${styles[variant]}`}>
      {children}
    </span>
  );
}

/** White card holding rows that separate themselves with a top line. */
export function ListCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-card px-4 pt-1 pb-2 ${className}`}>{children}</div>;
}

export function PanelCard({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2.5 rounded-card border border-line bg-card p-4">{children}</div>;
}

/** Label on the left, value on the right: the settings and detail row. */
export function DetailRow({ label, sub, value }: { label: ReactNode; sub?: ReactNode; value?: ReactNode }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 border-t border-divider py-1.5">
      <div className="flex flex-col gap-0.5">
        <span className="text-base">{label}</span>
        {sub ? <span className="text-[13px] leading-snug text-muted">{sub}</span> : null}
      </div>
      {value ? <span className="text-right text-[15px] text-muted">{value}</span> : null}
    </div>
  );
}

/** One plan item in a list: energy bar, title, time chip, meta. */
export function ItemRow({
  title,
  time,
  meta,
  fill,
  variant = "divider",
  href,
}: {
  title: string;
  time: string;
  meta: string;
  fill: string;
  variant?: ChipVariant;
  href?: string;
}) {
  const inner = (
    <>
      <span className="w-1 flex-none self-stretch rounded-sm" style={{ background: fill }} />
      <span className="flex flex-1 flex-col gap-1">
        <span className="text-base">{title}</span>
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Chip variant={variant}>{time}</Chip>
          <span>{meta}</span>
        </span>
      </span>
    </>
  );

  const className = "flex min-h-[60px] gap-3 border-t border-divider py-2.5 text-left";
  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

/** Quiet explainer block: small accent label over a sentence. */
export function NoteCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[18px] bg-surface px-4 py-3.5">
      <div className="text-xs tracking-[0.08em] text-accent">{label}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="m-0 rounded-xl bg-surface px-3 py-2.5 text-sm leading-relaxed">{children}</blockquote>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-[54px] items-center justify-center rounded-full bg-primary text-base text-on-primary"
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-[52px] items-center justify-center rounded-full border border-sky bg-card text-[15px] text-navy"
    >
      {children}
    </Link>
  );
}

/** Round back button with the screen it returns to. */
export function BackHeader({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex min-h-12 items-center gap-2">
      <Link
        href={href}
        aria-label="Back"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-surface"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            d="M11 3.5L5.5 9l5.5 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <span className="flex-1 text-[15px] text-muted">{label}</span>
    </div>
  );
}

export function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[18px] bg-surface p-3.5">
      <span className="text-[30px] font-light">{value}</span>
      <span className="text-[13px] text-muted">{label}</span>
    </div>
  );
}

/** Back arrow with "Step n of 5" and the progress bars under it. */
export function StepHeader({ back, step, steps = 5 }: { back: string; step: number; steps?: number }) {
  return (
    <>
      <BackHeader href={back} label={`Step ${step} of ${steps}`} />
      <div role="img" aria-label={`Step ${step} of ${steps}`} className="flex gap-1.5 px-1 pt-1">
        {Array.from({ length: steps }, (_, index) => (
          <span
            key={index}
            className={`h-1 flex-1 rounded-sm ${index < step ? "bg-primary" : "bg-sky"}`}
          />
        ))}
      </div>
    </>
  );
}

/** A row that leads somewhere, with a chevron. */
export function LinkRow({ href, label, sub, value }: { href: string; label: string; sub?: string; value?: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center justify-between gap-3 border-t border-divider py-1.5 text-navy"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-base">{label}</span>
        {sub ? <span className="text-[13px] leading-snug text-muted">{sub}</span> : null}
      </span>
      <span className="flex items-center gap-2 text-sm text-muted">
        {value}
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M5 2.5L9.5 7 5 11.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
    </Link>
  );
}

/** Section title over a list card. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <SectionTitle>{title}</SectionTitle>
      <ListCard>{children}</ListCard>
    </section>
  );
}

/** A labelled block of choice pills inside a card. */
export function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="text-[13px] text-muted">{label}</div>
      {children}
    </div>
  );
}

/** A row inside a card that leads somewhere, with a value on the right. */
export function PillRow({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[56px] items-center justify-between border-b border-divider text-[15px] text-navy last:border-b-0"
    >
      <span>{label}</span>
      <span className="flex items-center gap-2 text-sm text-muted">
        {value}
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M5 2.5L9.5 7 5 11.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
    </Link>
  );
}

/**
 * The line a day opens with: the date on the left, the time and the end of work
 * on the right. One small line, with the add bar straight underneath.
 */
export function DayHeaderLine({
  date,
  now,
  workEnd,
  right,
  action,
}: {
  date: string;
  now?: string;
  workEnd?: string;
  /** Said instead of the times, when a day has no working hours. */
  right?: string;
  /** The eye and the moon sit at the end of the line. */
  action?: ReactNode;
}) {
  const parts = [now ? `${now} now` : null, workEnd ? `${workEnd} work ends` : null].filter(Boolean);
  const tail = right ?? parts.join(" · ");

  return (
    <div className="-mb-2.5 flex items-center justify-between gap-2 pl-1 text-[15px] text-muted tabular-nums">
      {/* The date owns the first line; the times sit under it. */}
      <span>
        <h1 className="block text-[15px] font-normal text-navy">{date}</h1>
        {tail}
      </span>
      {action}
    </div>
  );
}
