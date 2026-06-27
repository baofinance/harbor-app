import type { DefinedMarket } from "@/config/markets";
import { formatCompactUSD } from "@/utils/anchor";
import { formatEtherNumber } from "@/utils/formatters";

export type SailUserPositionInfo = {
  hasPosition: boolean;
  valueUsd?: number;
  label?: string;
};

function isDisplayableUsd(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

export function buildSailUserPositionLabel(
  market: DefinedMarket,
  userDeposit: bigint | undefined,
  leveragedPriceUSD: number | undefined,
): SailUserPositionInfo {
  if (!userDeposit || userDeposit === 0n) {
    return { hasPosition: false };
  }

  const sym = market.leveragedToken?.symbol ?? "Sail";
  const amount = formatEtherNumber(userDeposit);
  const valueUsd =
    leveragedPriceUSD != null &&
    Number.isFinite(leveragedPriceUSD) &&
    leveragedPriceUSD > 0
      ? amount * leveragedPriceUSD
      : undefined;

  const label = isDisplayableUsd(valueUsd)
    ? `Your position · ${formatCompactUSD(valueUsd)}`
    : Number.isFinite(amount) && amount > 0
      ? `Your position · ${amount.toLocaleString(undefined, {
          maximumFractionDigits: 4,
        })} ${sym}`
      : "Your position";

  return {
    hasPosition: true,
    valueUsd: isDisplayableUsd(valueUsd) ? valueUsd : undefined,
    label,
  };
}
