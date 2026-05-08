import type { DefinedMarket } from "@/config/markets";
import { parseLongSide, parseShortSide } from "@/utils/marketSideLabels";
import {
  bandsFromConfig,
  getActiveFeeBand,
  getCurrentFee,
  type FeeBand,
} from "@/utils/sailFeeBands";
import type { SailContractReads } from "@/types/sail";

export type SailDirectionBadge = "LONG" | "SHORT";

export type SailMarketCardModel = {
  leverageRatio: bigint | undefined;
  collateralRatio: bigint | undefined;
  longSide: string;
  shortSide: string;
  mintFeeRatio: bigint | undefined;
  redeemFeeRatio: bigint | undefined;
  activeMintBand: FeeBand | undefined;
  activeRedeemBand: FeeBand | undefined;
  mintBands: FeeBand[] | undefined;
  redeemBands: FeeBand[] | undefined;
  direction: SailDirectionBadge;
  collateralSymbol: string;
};

/**
 * Pure derived state for Sail basic cards (mirrors the non-hook portion of
 * `SailMarketRow` reads + fee bands). Does not include PnL or oracle fallback
 * `useContractRead` paths — token name / sides use batch reads only.
 */
export function buildSailMarketCardModel(
  market: DefinedMarket,
  reads: SailContractReads,
  baseOffset: number,
  hasOracle: boolean,
  hasToken: boolean,
  minterConfigData: unknown | undefined
): SailMarketCardModel {
  const leverageRatio = reads?.[baseOffset]?.result as bigint | undefined;
  const collateralRatio = reads?.[baseOffset + 2]?.result as bigint | undefined;

  const collateralSymbol = market.collateral?.symbol?.toLowerCase() || "";
  const isFxUSDMarket =
    collateralSymbol === "fxusd" || collateralSymbol === "fxsave";

  const tokenOffset = hasOracle ? (isFxUSDMarket ? 6 : 5) : 4;
  const tokenName = hasToken
    ? (reads?.[baseOffset + tokenOffset]?.result as string | undefined)
    : undefined;
  const shortSide = parseShortSide(tokenName, market);
  const longSide = parseLongSide(tokenName, market);

  let mintBands: FeeBand[] | undefined;
  let redeemBands: FeeBand[] | undefined;
  if (minterConfigData && typeof minterConfigData === "object") {
    const cfg = minterConfigData as Record<string, unknown>;
    mintBands = bandsFromConfig(cfg.mintLeveragedIncentiveConfig);
    redeemBands = bandsFromConfig(cfg.redeemLeveragedIncentiveConfig);
  }

  const mintFeeRatio = getCurrentFee(mintBands, collateralRatio);
  const redeemFeeRatio = getCurrentFee(redeemBands, collateralRatio);
  const activeMintBand = getActiveFeeBand(mintBands, collateralRatio);
  const activeRedeemBand = getActiveFeeBand(redeemBands, collateralRatio);

  const haystack = (
    tokenName ||
    market.leveragedToken?.name ||
    market.leveragedToken?.description ||
    ""
  ).toLowerCase();
  const pegTargetRaw =
    market.pegTarget ||
    (market.peggedToken?.symbol?.toLowerCase() === "hausd"
      ? "USD"
      : market.peggedToken?.symbol?.toLowerCase() === "haeur"
        ? "EUR"
        : market.peggedToken?.symbol?.toLowerCase() === "habtc"
          ? "BTC"
          : market.peggedToken?.symbol?.toLowerCase() === "haeth"
            ? "ETH"
            : "");
  const pegTarget = (pegTargetRaw || "").toString().trim().toLowerCase();
  const collateral = (market.collateral?.symbol || "").trim().toLowerCase();

  /**
   * Direction rules (compact basic cards):
   * - USD collateral (fxSAVE/fxUSD) → SHORT
   * - stETH collateral vs USD/EUR → LONG
   * - stETH collateral vs BTC → SHORT
   * Fallback: explicit “short” product naming → SHORT; else LONG.
   */
  const direction: SailDirectionBadge = (() => {
    if (collateral === "fxsave" || collateral === "fxusd") return "SHORT";
    const isStethCollateral = collateral === "wsteth" || collateral === "steth";
    if (isStethCollateral && (pegTarget === "usd" || pegTarget === "eur"))
      return "LONG";
    if (isStethCollateral && pegTarget === "btc") return "SHORT";
    if (
      /\bharbor short\b/.test(haystack) ||
      /\bshort\s+[a-z]{2,6}\s+versus\b/.test(haystack)
    )
      return "SHORT";
    return "LONG";
  })();

  return {
    leverageRatio,
    collateralRatio,
    longSide,
    shortSide,
    mintFeeRatio,
    redeemFeeRatio,
    activeMintBand,
    activeRedeemBand,
    mintBands,
    redeemBands,
    direction,
    collateralSymbol: market.collateral?.symbol || "",
  };
}
