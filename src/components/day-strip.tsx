import { DEFAULT_RHYTHM, type Rhythm } from "@/lib/plan/curve";
import { energyTrack, stripBlocks } from "@/lib/plan/view";
import { pct } from "@/lib/plan/format";
import type { PlanItem } from "@/lib/plan/types";

/** The whole day as one line: fixed blocks solid, flexible dashed, energy underneath. */
export function DayStrip({
  items,
  now,
  rhythm = DEFAULT_RHYTHM,
}: {
  items: PlanItem[];
  now: number;
  rhythm?: Rhythm;
}) {
  const blocks = stripBlocks(items);
  const track = energyTrack(rhythm);

  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-card p-[14px] pb-3">
      <div
        role="img"
        aria-label={`Whole day from 07:00 to 22:00 with your energy level underneath, ${blocks.length} blocks planned`}
        className="relative h-9"
      >
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`absolute top-1.5 h-3.5 rounded-full ${
              block.fixed ? "bg-mid" : "border-[1.5px] border-dashed border-mid bg-transparent"
            }`}
            style={{ left: `${block.left}%`, width: `calc(${block.width}% - 2px)` }}
          />
        ))}
        <div className="absolute top-[26px] right-0 left-0 flex h-[7px] overflow-hidden rounded-full">
          {track.map((fill, index) => (
            <div key={index} className="h-[7px] flex-1" style={{ background: fill }} />
          ))}
        </div>
        <div className="absolute top-0 h-9 w-0.5 bg-mid" style={{ left: `calc(${pct(now)}% - 1px)` }} />
      </div>

      <div className="flex justify-between text-[11px] text-muted tabular-nums">
        <span>07</span>
        <span>12</span>
        <span>17</span>
        <span>22</span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-0.5 text-[11px] text-muted">
        <span className="flex items-center gap-[5px]">
          <span className="h-2 w-3 rounded-sm bg-mid" />
          Fixed
        </span>
        <span className="flex items-center gap-[5px]">
          <span className="h-2 w-3 rounded-sm border-[1.5px] border-dashed border-mid" />
          Flexible
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-2.5 rounded-sm bg-divider" />
          <span className="h-1.5 w-2.5 rounded-sm bg-sky" />
          <span className="h-1.5 w-2.5 rounded-sm bg-peak" />
          Energy low to peak
        </span>
      </div>
    </div>
  );
}
