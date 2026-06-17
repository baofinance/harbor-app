"use client";

import { formatUSD } from "@/utils/formatters";
import {
  formatMaidenVoyageOwnershipPct,
  formatMaidenVoyageYieldSharePct,
} from "@/utils/maidenVoyageYieldShareEstimate";
import {
  MV_BODY_TEXT,
  MV_CAPTION_TEXT,
  MV_DETAILS_PANEL,
  MV_SECTION_LABEL,
} from "./maidenVoyageLayoutStyles";

export type GenesisFoundingPositionExplainerProps = {
  depositUsd: number;
  capUsd: number | null;
  ownershipPct: number | null;
  revenueSharePct: number | null;
  yieldRevSharePct: number | null;
};

function ExplainerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <span className={MV_SECTION_LABEL}>{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums text-white/90">
        {value}
      </span>
    </div>
  );
}

export function GenesisFoundingPositionExplainer({
  depositUsd,
  capUsd,
  ownershipPct,
  revenueSharePct,
  yieldRevSharePct,
}: GenesisFoundingPositionExplainerProps) {
  const ownershipLabel = formatMaidenVoyageOwnershipPct(ownershipPct);
  const revenueShareLabel = formatMaidenVoyageYieldSharePct(revenueSharePct);
  const poolLabel =
    yieldRevSharePct != null && yieldRevSharePct > 0
      ? `${yieldRevSharePct}%`
      : "—";

  return (
    <details className={`${MV_DETAILS_PANEL} group`}>
      <summary className="cursor-pointer list-none px-3 py-2.5 sm:px-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-white/90">
            How is this calculated?
          </span>
          <span
            className="shrink-0 text-xs font-semibold uppercase tracking-wide text-white/45 transition group-open:text-white/65"
            aria-hidden
          >
            <span className="group-open:hidden">Show</span>
            <span className="hidden group-open:inline">Hide</span>
          </span>
        </div>
      </summary>

      <div className="space-y-3 border-t border-white/10 px-3 py-3 sm:px-4 sm:py-4">
        <ExplainerRow
          label="Your deposit"
          value={formatUSD(depositUsd, { compact: false })}
        />
        <ExplainerRow
          label="Voyage capacity"
          value={
            capUsd != null && capUsd > 0
              ? formatUSD(capUsd, { compact: false })
              : "—"
          }
        />
        <ExplainerRow
          label="Your ownership"
          value={`${ownershipLabel} of this voyage`}
        />
        <p className={`${MV_BODY_TEXT} font-mono text-sm tabular-nums`}>
          Founding reward: {ownershipLabel} × {poolLabel} revenue allocation ={" "}
          {revenueShareLabel} of future market revenue
        </p>
        <p className={MV_CAPTION_TEXT}>
          Revenue share is tied to your voyage ownership at genesis end and
          subject to maintaining eligibility after launch. This is not a
          projection of market TVL, trading volume, or dollar returns.
        </p>
      </div>
    </details>
  );
}
