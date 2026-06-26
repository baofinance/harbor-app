import type { DefinedMarket } from "@/config/markets";
import {
  getSailDirectionChipLabels,
  getSailMarketTokenSymbol,
} from "@/utils/sailMarketDirectionLabels";
import type { MergedChartPoint } from "@/hooks/useSailPriceHistory";

export type PegAssetKey = "USD" | "ETH" | "BTC" | "EUR" | "XAU" | "XAG";

export interface ChainlinkPricePoint {
  timestamp: number;
  priceUsd: number;
}

export interface SailMarketChartConfig {
  longLabel: string;
  shortLabel: string;
  hsSymbol: string;
  /** Collateral USD maps to long side (hsSTETH-* and hsFXUSD-*). */
  collateralIsLong: boolean;
  longPegAsset: PegAssetKey;
  shortPegAsset: PegAssetKey;
  /** Unit label for default Y-axis (short-side asset). */
  defaultUnit: string;
  /** Human label for default metric, e.g. "ETH per $1". */
  defaultMetricLabel: string;
}

export interface SailMarketChartPoint {
  timestamp: number;
  defaultRatio: number;
  longUsd: number;
  shortUsd: number;
  hsPriceUsd: number;
}

export interface LiveSideUsdPrices {
  ethPrice?: number | null;
  btcPrice?: number | null;
  eurPrice?: number | null;
  goldPrice?: number | null;
  silverPrice?: number | null;
}

function sideToPegAsset(label: string): PegAssetKey {
  const normalized = label.toUpperCase();
  if (normalized === "USD") return "USD";
  if (normalized === "ETH") return "ETH";
  if (normalized === "BTC") return "BTC";
  if (normalized === "EUR") return "EUR";
  if (normalized === "GOLD" || normalized === "XAU") return "XAU";
  if (normalized === "SILVER" || normalized === "XAG") return "XAG";
  return "USD";
}

function isFxUsdCollateral(market: DefinedMarket): boolean {
  const symbol = (market.collateral?.symbol || "").toLowerCase();
  return symbol.includes("fxusd") || symbol.includes("fxsave");
}

export function getSailMarketChartConfig(market: DefinedMarket): SailMarketChartConfig {
  const { longLabel, shortLabel } = getSailDirectionChipLabels(market, "", "");
  const hsSymbol = getSailMarketTokenSymbol(market);
  const collateralIsLong = !isFxUsdCollateral(market)
    ? true // hsSTETH-* : long = ETH collateral
    : true; // hsFXUSD-* : long = USD collateral

  const longPegAsset = sideToPegAsset(longLabel);
  const shortPegAsset = sideToPegAsset(shortLabel);

  const defaultUnit = shortLabel;
  const defaultMetricLabel =
    longLabel === "USD"
      ? `${shortLabel} per $1`
      : `${shortLabel} per 1 ${longLabel}`;

  return {
    longLabel,
    shortLabel,
    hsSymbol,
    collateralIsLong,
    longPegAsset,
    shortPegAsset,
    defaultUnit,
    defaultMetricLabel,
  };
}

function pegAssetUsdFromLive(
  asset: PegAssetKey,
  live: LiveSideUsdPrices
): number | null {
  switch (asset) {
    case "USD":
      return 1;
    case "ETH":
      return live.ethPrice ?? null;
    case "BTC":
      return live.btcPrice ?? null;
    case "EUR":
      return live.eurPrice ?? null;
    case "XAU":
      return live.goldPrice ?? null;
    case "XAG":
      return live.silverPrice ?? null;
    default:
      return null;
  }
}

export function computeLiveDefaultRatio(
  config: SailMarketChartConfig,
  live: LiveSideUsdPrices
): number | null {
  const longUsd = pegAssetUsdFromLive(config.longPegAsset, live);
  const shortUsd = pegAssetUsdFromLive(config.shortPegAsset, live);
  if (
    longUsd == null ||
    shortUsd == null ||
    !Number.isFinite(longUsd) ||
    !Number.isFinite(shortUsd) ||
    shortUsd <= 0
  ) {
    return null;
  }
  return longUsd / shortUsd;
}

function sideUsdAtIndex(
  pegAsset: PegAssetKey,
  isCollateralSide: boolean,
  collateralPrices: number[],
  pegResampled: number[],
  index: number
): number {
  if (pegAsset === "USD") return 1;
  if (isCollateralSide) {
    const v = collateralPrices[index];
    return Number.isFinite(v) && v > 0 ? v : NaN;
  }
  const v = pegResampled[index];
  return Number.isFinite(v) && v > 0 ? v : NaN;
}

export function buildSailMarketChartPoints(
  config: SailMarketChartConfig,
  mergedSubgraph: MergedChartPoint[],
  pegChainlinkHistory: ChainlinkPricePoint[],
  liveFallback?: LiveSideUsdPrices
): SailMarketChartPoint[] {
  if (mergedSubgraph.length === 0) return [];

  const timestamps = mergedSubgraph.map((p) => p.timestamp);
  const collateralPrices = mergedSubgraph.map((p) => p.collateralPriceUSD);
  const hsPrices = mergedSubgraph.map((p) => p.priceUSD);

  const pegAsset =
    config.collateralIsLong ? config.shortPegAsset : config.longPegAsset;

  let pegResampled = resamplePriceSeries(timestamps, pegChainlinkHistory);

  // Flat fallback when Chainlink history is sparse
  if (
    pegAsset !== "USD" &&
    pegResampled.every((v) => !Number.isFinite(v)) &&
    liveFallback
  ) {
    const spot = pegAssetUsdFromLive(pegAsset, liveFallback);
    if (spot != null && spot > 0) {
      pegResampled = timestamps.map(() => spot);
    }
  }

  const longIsCollateral = config.collateralIsLong;
  const shortIsCollateral = !config.collateralIsLong;

  return timestamps.map((timestamp, i) => {
    const longUsd = sideUsdAtIndex(
      config.longPegAsset,
      longIsCollateral,
      collateralPrices,
      pegResampled,
      i
    );
    const shortUsd = sideUsdAtIndex(
      config.shortPegAsset,
      shortIsCollateral,
      collateralPrices,
      pegResampled,
      i
    );
    const hsPriceUsd = hsPrices[i];
    const defaultRatio =
      Number.isFinite(longUsd) && Number.isFinite(shortUsd) && shortUsd > 0
        ? longUsd / shortUsd
        : NaN;

    return {
      timestamp,
      defaultRatio,
      longUsd,
      shortUsd,
      hsPriceUsd,
    };
  });
}

export function formatSailChartDefaultValue(
  value: number | null | undefined,
  config: SailMarketChartConfig
): string {
  if (value == null || !Number.isFinite(value)) return "—";

  if (config.shortLabel === "USD") {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (value < 0.01) {
    return `${value.toFixed(6)} ${config.defaultUnit}`;
  }
  if (value < 1) {
    return `${value.toFixed(4)} ${config.defaultUnit}`;
  }
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} ${config.defaultUnit}`;
}

export function formatSailChartUsdValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value - 1) < 0.001) return "$1.00";
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Forward-fill Chainlink prices onto subgraph timestamps. */
export function resamplePriceSeries(
  masterTimestamps: number[],
  chainlinkSeries: ChainlinkPricePoint[]
): number[] {
  if (masterTimestamps.length === 0) return [];
  if (chainlinkSeries.length === 0) {
    return masterTimestamps.map(() => NaN);
  }

  const result: number[] = [];
  let chainIdx = 0;
  let lastPrice = NaN;

  for (const ts of masterTimestamps) {
    while (
      chainIdx + 1 < chainlinkSeries.length &&
      chainlinkSeries[chainIdx + 1].timestamp <= ts
    ) {
      chainIdx++;
      lastPrice = chainlinkSeries[chainIdx].priceUsd;
    }

    if (chainlinkSeries[chainIdx].timestamp <= ts) {
      lastPrice = chainlinkSeries[chainIdx].priceUsd;
    }

    result.push(lastPrice);
  }

  return result;
}
