import type { DefinedMarket } from "@/config/markets";
import { formatCompactUSD } from "@/utils/anchor";
import { formatPnL } from "@/utils/sailDisplayFormat";
import {
  resolveSailDropdownPositionTone,
  type SailDropdownPositionTone,
} from "@/utils/sailMarketDropdownPosition";
import { buildSailUserPositionLabel } from "@/utils/sailUserPositionLabel";

export type SailMarketDropdownPositionDisplay = {
  hasPosition: boolean;
  label?: string;
  tone?: SailDropdownPositionTone;
};

function stripPositionPrefix(label: string): string {
  return label.replace(/^Your position ·\s*/, "");
}

/** Position value / PnL label + tone for Sail market dropdown and pair selector. */
export function buildSailMarketDropdownPositionDisplay(params: {
  market: DefinedMarket;
  userDeposit?: bigint;
  leveragedPriceUSD?: number;
  costBasisUSD?: number;
  pnlLoading: boolean;
}): SailMarketDropdownPositionDisplay {
  const { market, userDeposit, leveragedPriceUSD, costBasisUSD, pnlLoading } =
    params;

  if (!userDeposit || userDeposit === 0n) {
    return { hasPosition: false };
  }

  const amount = Number(userDeposit) / 1e18;
  const currentValueUSD =
    leveragedPriceUSD != null &&
    Number.isFinite(leveragedPriceUSD) &&
    leveragedPriceUSD > 0
      ? amount * leveragedPriceUSD
      : undefined;

  const fallback = buildSailUserPositionLabel(
    market,
    userDeposit,
    leveragedPriceUSD,
  );
  const fallbackLabel = fallback.label
    ? stripPositionPrefix(fallback.label)
    : undefined;

  if (pnlLoading) {
    return {
      hasPosition: true,
      label: fallbackLabel,
      tone: "pending",
    };
  }

  if (
    costBasisUSD == null ||
    !Number.isFinite(costBasisUSD) ||
    costBasisUSD <= 0 ||
    currentValueUSD == null ||
    !Number.isFinite(currentValueUSD)
  ) {
    return {
      hasPosition: true,
      label: fallbackLabel,
      tone: "pending",
    };
  }

  const unrealizedPnL = currentValueUSD - costBasisUSD;
  const tone = resolveSailDropdownPositionTone(unrealizedPnL, false);

  return {
    hasPosition: true,
    label: formatPnL(unrealizedPnL).text,
    tone,
  };
}
