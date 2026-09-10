"use client";

import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";
import { formatUSD } from "@/utils/formatters";
import { getMaidenVoyageActiveStageLabel } from "@/components/genesis/GenesisMaidenVoyageStageStrip";
import { resolveMaidenVoyageYieldShareLabel } from "@/utils/maidenVoyageYieldShareEstimate";
import {
  SAIL_ADVANCED_HEADER_STRIP_DIVIDE,
  SAIL_ADVANCED_HEADER_STRIP_LABEL,
  SAIL_ADVANCED_HEADER_STRIP_SHELL,
  SAIL_ADVANCED_HEADER_STRIP_VALUE,
  SAIL_ADVANCED_LABEL,
} from "./genesisAdvancedStyles";

export type GenesisVoyageStatsStripProps = {
  voyageStatus: ActiveVoyageStatus | null;
  capDisplay: GenesisVoyageCapDisplay | null;
  capLoading?: boolean;
  yieldRevSharePct?: number | null;
  genesisAddress?: string;
  userDepositUsd?: number | null;
};

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center px-2 py-2.5 text-center sm:px-4">
      <span className={SAIL_ADVANCED_HEADER_STRIP_LABEL}>{label}</span>
      <span className={SAIL_ADVANCED_HEADER_STRIP_VALUE} title={value}>
        {value}
      </span>
    </div>
  );
}

export function GenesisVoyageStatsStrip({
  voyageStatus,
  capDisplay,
  capLoading = false,
  yieldRevSharePct = null,
  genesisAddress,
  userDepositUsd = null,
}: GenesisVoyageStatsStripProps) {
  const stage =
    voyageStatus != null
      ? getMaidenVoyageActiveStageLabel(voyageStatus)
      : "—";

  let capacity = "—";
  if (capLoading) {
    capacity = "…";
  } else if (capDisplay) {
    capacity = capDisplay.useTokenCap
      ? `${capDisplay.capCurrent.toFixed(2)} / ${capDisplay.capTotal.toFixed(0)} ${capDisplay.collateralSymbol}`
      : `${formatUSD(capDisplay.capCurrentUsd)} / ${formatUSD(capDisplay.capTotalUsd)}`;
  }

  let estShare = "—";
  if (capDisplay) {
    const ownership = resolveMaidenVoyageYieldShareLabel({
      capDisplay,
      genesisAddress,
      yieldRevSharePct,
      userDepositUsd,
    });
    const isDefaultEstimate =
      ownership.caption.toLowerCase().includes("$1,000") ||
      ownership.caption.toLowerCase().includes("1,000");
    estShare = isDefaultEstimate
      ? `${ownership.label} @ $1,000`
      : ownership.label;
  } else if (capLoading) {
    estShare = "…";
  }

  const revPct =
    yieldRevSharePct != null && Number.isFinite(yieldRevSharePct)
      ? yieldRevSharePct
      : capDisplay?.yieldRevSharePct;
  const revenueShare =
    revPct != null && Number.isFinite(revPct) ? `${revPct}% pool` : "—";

  return (
    <div className="min-w-0">
      <p className={`mb-1 ${SAIL_ADVANCED_LABEL}`}>This voyage</p>
      <div
        className={`${SAIL_ADVANCED_HEADER_STRIP_SHELL} grid grid-cols-2 ${SAIL_ADVANCED_HEADER_STRIP_DIVIDE} sm:grid-cols-4 sm:divide-y-0`}
      >
        <StatCell label="Stage" value={stage} />
        <StatCell label="Capacity" value={capacity} />
        <StatCell label="Est. Your Share" value={estShare} />
        <StatCell label="Revenue Share" value={revenueShare} />
      </div>
    </div>
  );
}
