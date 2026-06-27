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

function isPlausiblePegUsdPrice(asset: PegAssetKey, price: number): boolean {
  if (!Number.isFinite(price) || price <= 0) return false;
  switch (asset) {
    case "ETH":
    case "BTC":
    case "XAU":
      return price > 100;
    case "EUR":
      return price > 0.5 && price < 2.5;
    case "XAG":
      return price > 1 && price < 500;
    case "USD":
      return Math.abs(price - 1) < 0.05;
    default:
      return true;
  }
}

/** Resolve peg-asset USD — mirrors {@link computeLiveDefaultRatio} using historical oracles. */
function resolvePegAssetUsd(
  pegAsset: PegAssetKey,
  index: number,
  collateralPrices: number[],
  config: SailMarketChartConfig,
  resampledByAsset: Partial<Record<PegAssetKey, number[]>>,
): number {
  if (pegAsset === "USD") return 1;

  const fromChainlink = resampledByAsset[pegAsset]?.[index];
  if (isPlausiblePegUsdPrice(pegAsset, fromChainlink ?? NaN)) {
    return fromChainlink!;
  }

  // Subgraph collateral USD tracks wstETH/fxSAVE — only use when magnitude matches the peg asset.
  if (config.collateralIsLong && pegAsset === config.longPegAsset) {
    const collateral = collateralPrices[index];
    if (isPlausiblePegUsdPrice(pegAsset, collateral)) {
      return collateral;
    }
  }

  return NaN;
}

function buildResampledByAsset(
  timestamps: number[],
  chainlinkHistories: Partial<Record<PegAssetKey, ChainlinkPricePoint[]>>,
  config?: SailMarketChartConfig
): Partial<Record<PegAssetKey, number[]>> {
  const result: Partial<Record<PegAssetKey, number[]>> = {};
  const assetsToResolve = new Set<PegAssetKey>();

  if (config) {
    if (config.longPegAsset !== "USD") assetsToResolve.add(config.longPegAsset);
    if (config.shortPegAsset !== "USD") assetsToResolve.add(config.shortPegAsset);
  }

  for (const asset of assetsToResolve) {
    if (asset === "USD") continue;

    const history = chainlinkHistories[asset];
    const resampled = history?.length
      ? resamplePriceSeries(timestamps, history)
      : timestamps.map(() => NaN);

    if (resampled.some((v) => Number.isFinite(v))) {
      result[asset] = resampled;
    }
  }

  return result;
}

/** Build unified timeline from subgraph, Chainlink rounds, or a recent daily grid. */
export function buildChartTimestamps(
  mergedSubgraph: MergedChartPoint[],
  chainlinkHistories: Partial<Record<PegAssetKey, ChainlinkPricePoint[]>>
): number[] {
  if (mergedSubgraph.length > 0) {
    return mergedSubgraph.map((p) => p.timestamp);
  }

  const tsSet = new Set<number>();
  for (const history of Object.values(chainlinkHistories)) {
    if (!history?.length) continue;
    for (const point of history) {
      if (point.timestamp > 0) tsSet.add(point.timestamp);
    }
  }

  if (tsSet.size > 0) {
    return Array.from(tsSet).sort((a, b) => a - b);
  }

  // Last resort when subgraph is empty and Chainlink hasn't loaded yet.
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: 30 }, (_, i) => now - (29 - i) * 24 * 60 * 60);
}

export function buildSailMarketChartPoints(
  config: SailMarketChartConfig,
  mergedSubgraph: MergedChartPoint[],
  chainlinkHistories: Partial<Record<PegAssetKey, ChainlinkPricePoint[]>>,
  _liveFallback?: LiveSideUsdPrices
): SailMarketChartPoint[] {
  const timestamps = buildChartTimestamps(mergedSubgraph, chainlinkHistories);
  if (timestamps.length === 0) return [];

  const collateralByTimestamp = new Map(
    mergedSubgraph.map((p) => [p.timestamp, p.collateralPriceUSD])
  );
  const hsByTimestamp = new Map(
    mergedSubgraph.map((p) => [p.timestamp, p.priceUSD])
  );

  const collateralPrices = timestamps.map(
    (ts) => collateralByTimestamp.get(ts) ?? NaN
  );
  const hsPrices = timestamps.map((ts) => hsByTimestamp.get(ts) ?? NaN);

  const resampledByAsset = buildResampledByAsset(
    timestamps,
    chainlinkHistories,
    config
  );

  return timestamps.map((timestamp, i) => {
    const longUsd = resolvePegAssetUsd(
      config.longPegAsset,
      i,
      collateralPrices,
      config,
      resampledByAsset
    );
    const shortUsd = resolvePegAssetUsd(
      config.shortPegAsset,
      i,
      collateralPrices,
      config,
      resampledByAsset
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
      hsPriceUsd: Number.isFinite(hsPriceUsd) && hsPriceUsd > 0 ? hsPriceUsd : NaN,
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

/** Forward-fill Chainlink prices onto chart timestamps. */
export function resamplePriceSeries(
  masterTimestamps: number[],
  chainlinkSeries: ChainlinkPricePoint[]
): number[] {
  if (masterTimestamps.length === 0) return [];
  if (chainlinkSeries.length === 0) {
    return masterTimestamps.map(() => NaN);
  }

  const sorted = [...chainlinkSeries].sort((a, b) => a.timestamp - b.timestamp);
  const result: number[] = [];
  let chainIdx = 0;

  for (const ts of masterTimestamps) {
    while (
      chainIdx + 1 < sorted.length &&
      sorted[chainIdx + 1].timestamp <= ts
    ) {
      chainIdx++;
    }

    let price = NaN;
    if (sorted[chainIdx].timestamp <= ts) {
      price = sorted[chainIdx].priceUsd;
    }

    result.push(Number.isFinite(price) && price > 0 ? price : NaN);
  }

  return result;
}
