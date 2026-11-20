import type { Item } from "@/generated/prisma/client";

import { DAY_END_HOUR, DAY_START_HOUR, stripPosition } from "@/lib/day";

/**
 * The whole day as one line: fixed blocks solid, the now line across it.
 * The energy track and dashed flexible blocks arrive with the scheduler.
 */
export function DayStrip({ blocks, now }: { blocks: Item[]; now: Date }) {
  const placed = blocks
    .filter((item) => item.start)
    .map((item) => {
      const start = item.start as Date;
      const end = item.end ?? new Date(start.getTime() + 30 * 60_000);
      const left = stripPosition(start);
      const right = stripPosition(end);
      return { id: item.id, left, width: Math.max(right - left, 0.012) };
    });

  const nowLeft = stripPosition(now);
  const label = placed.length
    ? `Day from ${DAY_START_HOUR}:00 to ${DAY_END_HOUR}:00 with ${placed.length} fixed ${
        placed.length === 1 ? "block" : "blocks"
      }`
    : `Day from ${DAY_START_HOUR}:00 to ${DAY_END_HOUR}:00, nothing planned`;

  return (
    <section className="flex flex-col gap-2.5 rounded-card border border-line p-4">
      <div role="img" aria-label={label} className="relative h-3.5">
        {placed.length === 0 ? (
          <div className="absolute inset-0 rounded-full border border-dashed border-sky" />
        ) : (
          <>
            <div className="absolute inset-0 rounded-full bg-divider" />
            {placed.map((block) => (
              <div
                key={block.id}
                className="absolute top-0 h-3.5 rounded-full bg-mid"
                style={{ left: `${block.left * 100}%`, width: `${block.width * 100}%` }}
              />
            ))}
          </>
        )}
        <div
          className="absolute -top-1 h-[22px] w-0.5 bg-navy"
          style={{ left: `${nowLeft * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-muted tabular-nums">
        <span>07</span>
        <span>12</span>
        <span>17</span>
        <span>22</span>
      </div>
    </section>
  );
}
