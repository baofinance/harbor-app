import { MAIDEN_VOYAGE_YIELD_OWNER_SHARE_BPS } from "@/config/tideFlywheel";

/**
 * Gross-up maiden pool revenue to an estimated protocol revenue total.
 *
 * The subgraph credits only the maiden-voyage owner share (default 5%) into
 * `MaidenVoyageYieldGlobal.cumulativeYieldUSD`. This is an estimate, not
 * full protocol revenue — see TIDE flywheel UI disclaimer.
 */
export function estimateGrossProtocolRevenueUsd(
  maidenPoolUsd: number,
  ownerShareBps: number = MAIDEN_VOYAGE_YIELD_OWNER_SHARE_BPS,
): number {
  if (!Number.isFinite(maidenPoolUsd) || maidenPoolUsd <= 0) return 0;
  if (ownerShareBps <= 0) return 0;
  return maidenPoolUsd / (ownerShareBps / 10_000);
}

export function sumMaidenPoolYieldUsd(
  cumulativeYieldUsdValues: Array<string | number | null | undefined>,
): number {
  return cumulativeYieldUsdValues.reduce<number>((sum, raw) => {
    const n =
      typeof raw === "number"
        ? raw
        : Number.parseFloat(String(raw ?? "0"));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export type TideFlywheelRevenueEstimate = {
  maidenPoolUsd: number;
  estimatedGrossRevenueUsd: number;
  isEstimate: true;
};

export function buildTideFlywheelRevenueEstimate(
  cumulativeYieldUsdValues: Array<string | number | null | undefined>,
  ownerShareBps: number = MAIDEN_VOYAGE_YIELD_OWNER_SHARE_BPS,
): TideFlywheelRevenueEstimate {
  const maidenPoolUsd = sumMaidenPoolYieldUsd(cumulativeYieldUsdValues);
  return {
    maidenPoolUsd,
    estimatedGrossRevenueUsd: estimateGrossProtocolRevenueUsd(
      maidenPoolUsd,
      ownerShareBps,
    ),
    isEstimate: true,
  };
}
