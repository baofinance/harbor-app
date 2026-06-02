"use client";

import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";

const STAGES = [
  { key: "deposits_open", label: "Deposits Open", order: 1 },
  { key: "capacity_reached", label: "Capacity Reached", order: 2 },
  { key: "market_launch", label: "Market Launch", order: 3 },
  { key: "claim_tokens", label: "Claim Tokens", order: 4 },
  { key: "earn_forever", label: "Earn Forever", order: 5 },
] as const;

function activeStageOrder(status: ActiveVoyageStatus): number {
  switch (status) {
    case "deposits_open":
    case "almost_full":
      return 1;
    case "capacity_reached":
      return 2;
    case "preparing_launch":
    case "opening_soon":
      return 3;
    case "claim_available":
      return 4;
    case "launch_complete":
      return 5;
    default:
      return 1;
  }
}

export type GenesisMaidenVoyageStageStripProps = {
  status: ActiveVoyageStatus;
};

export function GenesisMaidenVoyageStageStrip({
  status,
}: GenesisMaidenVoyageStageStripProps) {
  const activeOrder = activeStageOrder(status);

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[640px] lg:min-w-0">
        <div className="mb-2 grid grid-cols-5 gap-2">
          {STAGES.map((stage) => {
            const isCompleted = stage.order < activeOrder;
            const isActive = stage.order === activeOrder;
            return (
              <div
                key={stage.key}
                className={`text-center text-[10px] font-semibold uppercase tracking-wide ${
                  isActive
                    ? "text-[#C6F6E4]"
                    : isCompleted
                      ? "text-white/75"
                      : "text-white/35"
                }`}
              >
                {stage.label}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-5 items-center gap-2">
          {STAGES.map((stage) => {
            const isCompleted = stage.order < activeOrder;
            const isActive = stage.order === activeOrder;
            return (
              <div key={`${stage.key}-node`} className="flex items-center">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                    isActive
                      ? "border-[#4A9784]/60 bg-[#4A9784]/20 text-[#C6F6E4]"
                      : isCompleted
                        ? "border-white/25 bg-white/10 text-white/80"
                        : "border-white/15 bg-transparent text-white/35"
                  }`}
                >
                  {stage.order}
                </span>
                {stage.order !== STAGES.length ? (
                  <span
                    className={`h-px w-full ${
                      stage.order < activeOrder ? "bg-white/45" : "bg-white/15"
                    }`}
                    aria-hidden
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
