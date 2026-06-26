"use client";

import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import { MV_STAGE_ACTIVE_TEXT, MV_TEXT_ON_GLASS } from "./maidenVoyageLayoutStyles";

const STAGES = [
  { key: "deposits_open", label: "Deposits open", order: 1 },
  { key: "capacity_reached", label: "Capacity reached", order: 2 },
  { key: "market_launch", label: "Market launch", order: 3 },
  { key: "claim_tokens", label: "Claim tokens", order: 4 },
  { key: "earn_forever", label: "Earn forever", order: 5 },
] as const;

export function getMaidenVoyageActiveStageLabel(
  status: ActiveVoyageStatus
): string {
  const order = activeStageOrder(status);
  return STAGES.find((stage) => stage.order === order)?.label ?? "Deposits open";
}

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

export type GenesisMaidenVoyageStageLabelProps = {
  status: ActiveVoyageStatus;
  className?: string;
};

/** Compact “Stage: Deposits open” line for card header. */
export function GenesisMaidenVoyageStageLabel({
  status,
  className = "",
}: GenesisMaidenVoyageStageLabelProps) {
  return (
    <p className={`${MV_STAGE_ACTIVE_TEXT} ${MV_TEXT_ON_GLASS} ${className}`.trim()}>
      Stage:{" "}
      <span className="font-semibold text-white">
        {getMaidenVoyageActiveStageLabel(status)}
      </span>
    </p>
  );
}

export type GenesisMaidenVoyageStageStripProps = {
  status: ActiveVoyageStatus;
  /** Hide the heading when it is shown in the card header. */
  showHeading?: boolean;
};

export function GenesisMaidenVoyageStageStrip({
  status,
  showHeading = true,
}: GenesisMaidenVoyageStageStripProps) {
  const activeOrder = activeStageOrder(status);

  return (
    <div className="w-full">
      {showHeading ? <GenesisMaidenVoyageStageLabel status={status} /> : null}

      <div
        className={
          showHeading
            ? "mt-3 grid w-full grid-cols-5 gap-1 sm:gap-2"
            : "grid w-full grid-cols-5 gap-1 sm:gap-2"
        }
        role="list"
        aria-label="Voyage stages"
      >
        {STAGES.map((stage) => {
          const isActive = stage.order === activeOrder;
          return (
            <div
              key={stage.key}
              role="listitem"
              aria-current={isActive ? "step" : undefined}
              className="flex min-w-0 flex-col items-center gap-1.5"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums sm:h-6 sm:w-6 sm:text-[11px] ${
                  isActive
                    ? "bg-white/90 backdrop-blur-sm text-[#0a1628] shadow-sm"
                    : "bg-black text-white/75 ring-1 ring-white/15"
                }`}
              >
                {stage.order}
              </span>
              <span
                className={`w-full px-0.5 text-center text-[9px] font-medium leading-tight tracking-wide sm:text-[10px] ${
                  isActive ? "text-white" : "text-white/50"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
