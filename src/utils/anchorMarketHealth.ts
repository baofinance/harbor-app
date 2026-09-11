/**
 * Market Health classification for Earn mint modal.
 * CR safety and mint liquidity are separate signals — never call a market
 * "Healthy" when CR is unknown or mint capacity is zero.
 */

import { formatEther } from "viem";

export type MarketHealthStatus = "healthy" | "watch" | "stressed" | "unknown";
export type MarketLiquidityStatus = "liquid" | "low_liquid" | "unknown";

/** Below this USD capacity → Low liquid (high CR can still be thin). */
export const MARKET_LOW_LIQUID_USD_THRESHOLD = 10_000;

/** Probe size for mintPeggedTokenDryRun to discover capacity. */
export const MARKET_HEALTH_MINT_PROBE_WEI = 10n ** 24n; // 1,000,000 wrapped units

/** On-chain sentinel when pegged supply is 0 (no debt → infinite CR). */
export const MAX_UINT256 = (1n << 256n) - 1n;

/** Match Transparency: treat extreme CR as ∞ (≥ 10,000%). */
export const MARKET_CR_INFINITY_THRESHOLD_PERCENT = 10_000;

/** Default min CR floor (100%) when minter config bands are missing. */
const DEFAULT_MIN_CR_WAD = 10n ** 18n;

export function isSaturatedCollateralRatio(
  ratio: bigint | undefined | null,
): boolean {
  if (ratio === undefined || ratio === null) return false;
  // type(uint256).max or any value too large for JS Number safely
  if (ratio >= MAX_UINT256 / 2n) return true;
  const pct = Number(ratio) / 1e16;
  return Number.isFinite(pct) && pct >= MARKET_CR_INFINITY_THRESHOLD_PERCENT;
}

export function formatMarketCrPercent(ratio: bigint | undefined): string {
  if (ratio === undefined || ratio === null) return "—";
  if (isSaturatedCollateralRatio(ratio)) return "∞";
  const pct = Number(ratio) / 1e16;
  if (!Number.isFinite(pct)) return "∞";
  return `${Math.round(pct).toLocaleString("en-US")}%`;
}

/** Whole dollars, no decimals. Unknown → em dash (not $0). */
export function formatMaxMintableUsd(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value <= 0) return "$0";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/** e.g. "142.519 haETH - $623" */
export function formatMaxMintableHaAndUsd(input: {
  haAmount: number | undefined | null;
  haSymbol: string;
  usd: number | undefined | null;
}): string {
  const { haAmount, haSymbol, usd } = input;
  const usdText = formatMaxMintableUsd(usd);
  if (haAmount == null || !Number.isFinite(haAmount) || haAmount < 0) {
    return usdText;
  }
  const abs = Math.abs(haAmount);
  const maxDecimals = abs >= 1 ? 4 : 6;
  const haText =
    haAmount <= 0
      ? "0"
      : haAmount.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: maxDecimals,
        });
  return `${haText} ${haSymbol} - ${usdText}`;
}

/**
 * Convert max wrapped-collateral capacity into the user's selected deposit asset units.
 */
export function maxMintableWrappedToDepositAmount(input: {
  wrappedTaken: bigint;
  depositAsset: string | undefined;
  wrappedCollateralSymbol: string | undefined;
  underlyingCollateralSymbol: string | undefined;
  wrappedRate: bigint | undefined;
}): number | undefined {
  const {
    wrappedTaken,
    depositAsset,
    wrappedCollateralSymbol,
    underlyingCollateralSymbol,
    wrappedRate,
  } = input;
  if (wrappedTaken <= 0n) return 0;

  const asset = (depositAsset || "").toLowerCase();
  const wrapped = (wrappedCollateralSymbol || "").toLowerCase();
  const underlying = (underlyingCollateralSymbol || "").toLowerCase();
  const rate = wrappedRate && wrappedRate > 0n ? wrappedRate : 10n ** 18n;

  if (!asset || asset === wrapped) {
    return Number(formatEther(wrappedTaken));
  }

  if (asset === underlying || asset === "fxusd" || asset === "steth" || asset === "eth") {
    const inUnderlying = (wrappedTaken * rate) / 10n ** 18n;
    return Number(formatEther(inUnderlying));
  }

  if (asset === "usdc") {
    const inUnderlying = (wrappedTaken * rate) / 10n ** 18n;
    // fxUSD/USDC ≈ 1:1; USDC has 6 decimals — return human units
    return Number(formatEther(inUnderlying));
  }

  return Number(formatEther(wrappedTaken));
}

export function classifyMarketHealthStatus(
  collateralRatio: bigint | undefined,
  minCollateralRatio: bigint | undefined,
  maxMintableUsd?: number | null,
): MarketHealthStatus {
  if (collateralRatio === undefined) {
    return "unknown";
  }

  // No mint capacity → not a healthy mint market, even if CR looks fine.
  if (
    maxMintableUsd != null &&
    Number.isFinite(maxMintableUsd) &&
    maxMintableUsd <= 0
  ) {
    return "stressed";
  }

  if (isSaturatedCollateralRatio(collateralRatio)) {
    if (
      maxMintableUsd != null &&
      Number.isFinite(maxMintableUsd) &&
      maxMintableUsd < MARKET_LOW_LIQUID_USD_THRESHOLD
    ) {
      return "watch";
    }
    return "healthy";
  }

  const minCr =
    minCollateralRatio && minCollateralRatio > 0n
      ? minCollateralRatio
      : DEFAULT_MIN_CR_WAD;

  if (collateralRatio < minCr) return "stressed";
  // Within 20% above minimum CR
  if (collateralRatio < (minCr * 120n) / 100n) return "watch";

  // Thin capacity with a safe CR → Watch, not Healthy.
  if (
    maxMintableUsd != null &&
    Number.isFinite(maxMintableUsd) &&
    maxMintableUsd < MARKET_LOW_LIQUID_USD_THRESHOLD
  ) {
    return "watch";
  }

  return "healthy";
}

export function classifyMarketLiquidityStatus(
  maxMintableUsd: number | undefined | null,
): MarketLiquidityStatus {
  if (maxMintableUsd == null || !Number.isFinite(maxMintableUsd)) {
    return "unknown";
  }
  return maxMintableUsd < MARKET_LOW_LIQUID_USD_THRESHOLD
    ? "low_liquid"
    : "liquid";
}

export function marketHealthStatusLabel(status: MarketHealthStatus): string {
  switch (status) {
    case "stressed":
      return "Stressed";
    case "watch":
      return "Watch";
    case "unknown":
      return "Unavailable";
    default:
      return "Healthy";
  }
}

export function marketLiquidityStatusLabel(
  status: MarketLiquidityStatus,
): string {
  if (status === "unknown") return "Unavailable";
  return status === "liquid" ? "Liquid" : "Low liquid";
}
