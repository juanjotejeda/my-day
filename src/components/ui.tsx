import Link from "next/link";
import type { ReactNode } from "react";

/** White card, 1px line, 22px radius: the surface every list sits on. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-white ${className}`}>{children}</div>;
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
        fixed ? "bg-divider text-navy" : "border border-dashed border-mid text-accent"
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

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2 text-[15px] text-muted">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path d="M9 2.5L4.5 7 9 11.5" fill="none" stroke="#56647D" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      {children}
    </Link>
  );
}

/** The screen shell: 390px design width, centred, with room for the bottom nav. */
export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main className={`mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-4 px-4 pt-6 pb-12 ${className}`}>
      {children}
    </main>
  );
}
