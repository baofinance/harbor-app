"use client";

const MILESTONES = [25, 50, 75, 100] as const;

export type GenesisVoyageProgressMilestonesProps = {
  filledPct: number;
  capFilled: boolean;
};

export function GenesisVoyageProgressMilestones({
  filledPct,
  capFilled,
}: GenesisVoyageProgressMilestonesProps) {
  const currentMilestone = MILESTONES.filter((m) => filledPct >= m).pop();

  return (
    <div
      className="relative mt-1.5 h-4 w-full"
      aria-hidden
    >
      {MILESTONES.map((pct) => {
        const crossed = filledPct >= pct;
        const isCurrent = currentMilestone === pct && !capFilled;
        return (
          <div
            key={pct}
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${pct}%` }}
          >
            <span
              className={`h-2 w-0.5 rounded-full ${
                crossed
                  ? isCurrent
                    ? "bg-[#4A9784] w-1"
                    : "bg-[#4A9784]/70"
                  : "bg-[#1E4775]/20"
              }`}
            />
            <span
              className={`mt-0.5 hidden font-mono text-[9px] tabular-nums sm:block ${
                crossed ? "font-semibold text-[#1E4775]/70" : "text-[#1E4775]/35"
              }`}
            >
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
