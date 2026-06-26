import type { DefinedMarket } from "@/config/markets";
import { formatCompactUSD } from "@/utils/anchor";
import { formatToken } from "@/utils/formatters";

export type SailUserPositionInfo = {
  hasPosition: boolean;
  valueUsd?: number;
  label?: string;
};

export function buildSailUserPositionLabel(
  market: DefinedMarket,
  userDeposit: bigint | undefined,
  leveragedPriceUSD: number | undefined,
): SailUserPositionInfo {
  if (!userDeposit || userDeposit === 0n) {
    return { hasPosition: false };
  }

  const sym = market.leveragedToken?.symbol ?? "Sail";
  const amount = Number(formatToken(userDeposit, 18, 4));
  const valueUsd =
    leveragedPriceUSD && leveragedPriceUSD > 0
      ? amount * leveragedPriceUSD
      : undefined;

  const label =
    valueUsd != null && valueUsd > 0
      ? `Your position · ${formatCompactUSD(valueUsd)}`
      : `Your position · ${amount} ${sym}`;

  return { hasPosition: true, valueUsd, label };
}
