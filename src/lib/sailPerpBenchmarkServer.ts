import { getAddress, type PublicClient } from "viem";
import { minterABI } from "@/abis/minter";
import { getGraphHeaders, getSailPriceGraphUrl } from "@/config/graph";
import { markets } from "@/config/markets";
import { bandsFromConfig, getCurrentFee } from "@/utils/sailFeeBands";
import {
  isHip3PerpCoin,
  isSailFeeDisallowBps,
  dropPreLiveSailStates,
  PERP_COIN_API_SYMBOL,
  repriceSailStatesWithPegUsd,
  resolveSailPerpExposureFromSymbols,
  runSailPerpBenchmark,
  type PerpCandle,
  type PerpCoin,
  type PerpFundingPoint,
  type SailPerpBenchmarkAssumptions,
  type SailPerpBenchmarkResult,
  type SailPerpExposure,
  type SailStateObservation,
} from "@/utils/sailPerpBenchmark";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const MAX_STATE_POINTS = 120;
const GRAPH_PAGE_SIZE = 1_000;
const MAX_GRAPH_PAGES = 20;
const RPC_CONCURRENCY = 10;
/** HIP-3 (trade.xyz) base taker fee — higher than native crypto perps. */
const HIP3_TAKER_FEE_BPS = 9;
const NATIVE_TAKER_FEE_BPS = 4.5;

type GraphStateReference = {
  timestamp: number;
  blockNumber: number;
  sailPriceUsd: number;
};

type IncentiveConfig = {
  collateralRatioBandUpperBounds: readonly bigint[];
  incentiveRatios: readonly bigint[];
};

type MinterConfig = {
  mintLeveragedIncentiveConfig: IncentiveConfig;
  redeemLeveragedIncentiveConfig: IncentiveConfig;
};

export type SailPerpBenchmarkApiResponse = {
  marketId: string;
  venue: "Hyperliquid";
  exposure: SailPerpExposure;
  stateObservations: SailStateObservation[];
  feeConfigChangeBlocks: number[];
  assumptions: SailPerpBenchmarkAssumptions & {
    stateObservationCount: number;
    candleInterval: "1h";
    executionModel: "base-tier taker" | "hip-3 taker";
    positionModel: "fixed-at-open";
  };
  benchmark: SailPerpBenchmarkResult;
  warnings: string[];
  generatedAt: string;
};

const STATE_REFERENCES_QUERY = `
  query SailBenchmarkStateReferences(
    $tokenAddress: Bytes!
    $since: BigInt!
    $until: BigInt!
    $cursor: BigInt!
  ) {
    hourlyPriceSnapshots(
      where: {
        tokenAddress: $tokenAddress
        hourTimestamp_gte: $since
        hourTimestamp_lte: $until
        hourTimestamp_gt: $cursor
      }
      orderBy: hourTimestamp
      orderDirection: asc
      first: ${GRAPH_PAGE_SIZE}
    ) {
      hourTimestamp
      blockNumber
      tokenPriceUSD
    }
  }
`;

async function graphRequest<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const url = getSailPriceGraphUrl();
  const response = await fetch(url, {
    method: "POST",
    headers: getGraphHeaders(url),
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Sail price subgraph returned ${response.status}`);
  }
  const payload = (await response.json()) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };
  if (payload.errors?.length || !payload.data) {
    throw new Error(payload.errors?.[0]?.message ?? "Sail price subgraph failed");
  }
  return payload.data;
}

async function fetchStateReferences(
  tokenAddress: string,
  startTimestamp: number,
  endTimestamp: number,
): Promise<GraphStateReference[]> {
  const rows: GraphStateReference[] = [];
  let cursor = startTimestamp - 1;

  for (let page = 0; page < MAX_GRAPH_PAGES; page++) {
    const data = await graphRequest<{
      hourlyPriceSnapshots: Array<{
        hourTimestamp: string;
        blockNumber: string;
        tokenPriceUSD: string;
      }>;
    }>(STATE_REFERENCES_QUERY, {
      tokenAddress: tokenAddress.toLowerCase(),
      since: String(startTimestamp),
      until: String(endTimestamp),
      cursor: String(cursor),
    });
    const batch = data.hourlyPriceSnapshots ?? [];
    if (batch.length === 0) break;
    for (const row of batch) {
      rows.push({
        timestamp: Number(row.hourTimestamp),
        blockNumber: Number(row.blockNumber),
        sailPriceUsd: Number(row.tokenPriceUSD),
      });
    }
    cursor = Number(batch[batch.length - 1]!.hourTimestamp);
    if (batch.length < GRAPH_PAGE_SIZE) break;
  }

  return rows;
}

function sampleReferences(
  rows: GraphStateReference[],
  maximum = MAX_STATE_POINTS,
): GraphStateReference[] {
  if (rows.length <= maximum) return rows;
  const sampled: GraphStateReference[] = [];
  const step = (rows.length - 1) / (maximum - 1);
  for (let index = 0; index < maximum; index++) {
    sampled.push(rows[Math.round(index * step)]!);
  }
  return sampled.filter(
    (row, index) => index === 0 || row.blockNumber !== sampled[index - 1]!.blockNumber,
  );
}

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  fn: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await fn(values[index]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return results;
}

async function fetchArchiveStates(
  client: PublicClient,
  minterAddress: `0x${string}`,
  references: GraphStateReference[],
): Promise<SailStateObservation[]> {
  return mapWithConcurrency(references, RPC_CONCURRENCY, async (reference) => {
    const results = await client.multicall({
      blockNumber: BigInt(reference.blockNumber),
      allowFailure: false,
      contracts: [
        {
          address: minterAddress,
          abi: minterABI,
          functionName: "leveragedTokenPrice",
        },
        {
          address: minterAddress,
          abi: minterABI,
          functionName: "leverageRatio",
        },
        {
          address: minterAddress,
          abi: minterABI,
          functionName: "collateralRatio",
        },
      ],
    });
    const [priceRaw, leverageRaw, collateralRatioRaw] = results as readonly [
      bigint,
      bigint,
      bigint,
    ];
    return {
      ...reference,
      navInPeg: Number(priceRaw) / 1e18,
      leverageRatio: Number(leverageRaw) / 1e18,
      collateralRatio: Number(collateralRatioRaw) / 1e18,
    };
  });
}

async function readMinterConfig(
  client: PublicClient,
  minterAddress: `0x${string}`,
  blockNumber: number,
): Promise<MinterConfig> {
  return (await client.readContract({
    address: minterAddress,
    abi: minterABI,
    functionName: "config",
    blockNumber: BigInt(blockNumber),
  })) as MinterConfig;
}

const WAD = 10n ** 18n;

function feeBpsAtCollateralRatio(
  config: MinterConfig,
  collateralRatio: number,
  side: "mint" | "redeem",
): number {
  const incentive =
    side === "mint"
      ? config.mintLeveragedIncentiveConfig
      : config.redeemLeveragedIncentiveConfig;
  const bands = bandsFromConfig(incentive);
  const ratio = getCurrentFee(
    bands,
    BigInt(Math.round(collateralRatio * 1e18)),
  );
  if (ratio == null) return 0;
  // Prefer bigint math: Number(WAD)/1e14 can yield 9999.99-style artifacts.
  if (ratio >= WAD) return 10_000;
  return Number((ratio * 10_000n) / WAD);
}

async function fetchConfigChangeBlocks(
  client: PublicClient,
  minterAddress: `0x${string}`,
  fromBlock: number,
  toBlock: number,
): Promise<number[]> {
  const blocks: number[] = [];
  const chunkSize = 25_000;
  for (let start = fromBlock; start <= toBlock; start += chunkSize) {
    const end = Math.min(toBlock, start + chunkSize - 1);
    const logs = await client.getLogs({
      address: minterAddress,
      event: minterABI.find(
        (item) => item.type === "event" && item.name === "UpdateConfig",
      ) as Extract<(typeof minterABI)[number], { type: "event" }>,
      fromBlock: BigInt(start),
      toBlock: BigInt(end),
    });
    for (const log of logs) blocks.push(Number(log.blockNumber));
  }
  return Array.from(new Set(blocks));
}

function resolveExposure(marketId: string): SailPerpExposure | null {
  const market = markets[marketId as keyof typeof markets] as
    | (typeof markets)[keyof typeof markets]
    | undefined;
  if (!market) return null;
  return resolveSailPerpExposureFromSymbols(
    market.collateral.symbol,
    market.pegTarget,
  );
}

async function hyperliquidRequest<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Hyperliquid returned ${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchFundingHistory(
  coin: PerpCoin,
  startTimestamp: number,
  endTimestamp: number,
): Promise<PerpFundingPoint[]> {
  const apiCoin = PERP_COIN_API_SYMBOL[coin];
  const points: PerpFundingPoint[] = [];
  let cursorMs = startTimestamp * 1_000;
  const endMs = endTimestamp * 1_000;
  for (let page = 0; page < 30 && cursorMs <= endMs; page++) {
    const batch = await hyperliquidRequest<
      Array<{ time: number; fundingRate: string }>
    >({
      type: "fundingHistory",
      coin: apiCoin,
      startTime: cursorMs,
      endTime: endMs,
    });
    if (batch.length === 0) break;
    for (const row of batch) {
      points.push({
        timestamp: Math.floor(row.time / 1_000),
        rate: Number(row.fundingRate),
      });
    }
    const next = batch[batch.length - 1]!.time + 1;
    if (next <= cursorMs || batch.length < 500) break;
    cursorMs = next;
  }
  return points;
}

async function fetchCandles(
  coin: PerpCoin,
  startTimestamp: number,
  endTimestamp: number,
): Promise<PerpCandle[]> {
  const apiCoin = PERP_COIN_API_SYMBOL[coin];
  const candles: PerpCandle[] = [];
  let cursorMs = startTimestamp * 1_000;
  const endMs = endTimestamp * 1_000;
  for (let page = 0; page < 10 && cursorMs <= endMs; page++) {
    const batch = await hyperliquidRequest<
      Array<{ t: number; o: string; h: string; l: string; c: string }>
    >({
      type: "candleSnapshot",
      req: {
        coin: apiCoin,
        interval: "1h",
        startTime: cursorMs,
        endTime: endMs,
      },
    });
    if (batch.length === 0) break;
    for (const row of batch) {
      candles.push({
        timestamp: Math.floor(row.t / 1_000),
        open: Number(row.o),
        high: Number(row.h),
        low: Number(row.l),
        close: Number(row.c),
      });
    }
    const next = batch[batch.length - 1]!.t + 60 * 60 * 1_000;
    if (next <= cursorMs || batch.length < 5_000) break;
    cursorMs = next;
  }
  return candles;
}

export async function buildSailPerpBenchmark(
  client: PublicClient,
  marketId: string,
  startTimestamp: number,
  endTimestamp: number,
): Promise<SailPerpBenchmarkApiResponse> {
  const market = markets[marketId as keyof typeof markets] as
    | (typeof markets)[keyof typeof markets]
    | undefined;
  const exposure = resolveExposure(marketId);
  if (!market || !exposure) {
    throw new Error(
      "This market has no supported Hyperliquid benchmark (unsupported peg)",
    );
  }
  const minterAddress = getAddress(market.addresses.minter);
  const tokenAddress = getAddress(market.addresses.leveragedToken);
  const rawReferences = await fetchStateReferences(
    tokenAddress,
    startTimestamp,
    endTimestamp,
  );
  const references = sampleReferences(rawReferences);
  if (references.length < 2) {
    throw new Error("Not enough Sail history exists for this range");
  }

  const warnings: string[] = [];
  const archiveStates = await fetchArchiveStates(
    client,
    minterAddress,
    references,
  );
  const coins = Array.from(
    new Set(
      [exposure.collateralCoin, exposure.targetCoin].filter(
        (coin): coin is PerpCoin => coin != null,
      ),
    ),
  );
  const usesHip3 = coins.some(isHip3PerpCoin);
  const candleStart = archiveStates[0]!.timestamp;
  const candleEnd = archiveStates[archiveStates.length - 1]!.timestamp;
  const [configChangeResult, marketData] = await Promise.all([
    fetchConfigChangeBlocks(
      client,
      minterAddress,
      archiveStates[0]!.blockNumber,
      archiveStates[archiveStates.length - 1]!.blockNumber,
    )
      .then((blocks) => ({ blocks, error: false }))
      .catch(() => ({ blocks: [] as number[], error: true })),
    Promise.all(
      coins.map(async (coin) => ({
        coin,
        candles: await fetchCandles(coin, candleStart, candleEnd),
        funding: await fetchFundingHistory(coin, candleStart, candleEnd),
      })),
    ),
  ]);
  for (const data of marketData) {
    if (data.candles.length < 2) {
      throw new Error(
        `Not enough Hyperliquid history for ${PERP_COIN_API_SYMBOL[data.coin]} in this range`,
      );
    }
  }
  const candlesByCoin = Object.fromEntries(
    marketData.map((data) => [data.coin, data.candles]),
  ) as Partial<Record<PerpCoin, PerpCandle[]>>;
  const fundingByCoin = Object.fromEntries(
    marketData.map((data) => [data.coin, data.funding]),
  );
  const states = dropPreLiveSailStates(
    repriceSailStatesWithPegUsd(archiveStates, exposure, candlesByCoin),
  );
  if (states.length < 2) {
    throw new Error("Not enough priced Sail history exists for this range");
  }
  if (states[0]!.timestamp > archiveStates[0]!.timestamp) {
    warnings.push(
      "Skipped pre-live / genesis Sail snapshots (CR≈1, NAV pinned) so the Hyperliquid comparison is not opened at sentinel leverage before the market is active.",
    );
  }
  const firstState = states[0]!;
  const lastState = states[states.length - 1]!;
  const [startConfig, endConfig] = await Promise.all([
    readMinterConfig(client, minterAddress, firstState.blockNumber),
    readMinterConfig(client, minterAddress, lastState.blockNumber),
  ]);
  const feeConfigChangeBlocks = configChangeResult.blocks;
  if (configChangeResult.error) {
    warnings.push("Historical fee-config event scan was unavailable.");
  }
  warnings.push(
    "Sail USD prices use on-chain leveragedTokenPrice × peg USD when available (avoids subgraph placeholder prices).",
  );
  const changedConfigs = await mapWithConcurrency(
    feeConfigChangeBlocks.filter(
      (block) =>
        block > firstState.blockNumber && block < lastState.blockNumber,
    ),
    RPC_CONCURRENCY,
    async (blockNumber) => ({
      blockNumber,
      config: await readMinterConfig(client, minterAddress, blockNumber),
    }),
  );
  const feeConfigSchedule = [
    { blockNumber: firstState.blockNumber, config: startConfig },
    ...changedConfigs,
    { blockNumber: lastState.blockNumber, config: endConfig },
  ].sort((a, b) => a.blockNumber - b.blockNumber);
  const sailRedeemFeeBpsByTimestamp = states.map((state) => {
    let config = startConfig;
    for (const observation of feeConfigSchedule) {
      if (observation.blockNumber > state.blockNumber) break;
      config = observation.config;
    }
    return {
      timestamp: state.timestamp,
      feeBps: feeBpsAtCollateralRatio(
        config,
        state.collateralRatio,
        "redeem",
      ),
    };
  });

  const sailMintFeeBps = feeBpsAtCollateralRatio(
    startConfig,
    firstState.collateralRatio,
    "mint",
  );
  const sailRedeemFeeBps = feeBpsAtCollateralRatio(
    endConfig,
    lastState.collateralRatio,
    "redeem",
  );
  const assumptions: SailPerpBenchmarkAssumptions = {
    startingCapitalUsd: 1_000,
    takerFeeBps: usesHip3 ? HIP3_TAKER_FEE_BPS : NATIVE_TAKER_FEE_BPS,
    slippageBps: 1,
    maintenanceMarginRate: 0.03,
    liquidationPenaltyRate: 0.005,
    sailMintFeeBps,
    sailRedeemFeeBps,
  };
  const benchmark = runSailPerpBenchmark({
    states,
    candlesByCoin,
    fundingByCoin,
    exposure,
    assumptions,
    sailRedeemFeeBpsByTimestamp,
  });

  if (benchmark.points.length < 2) {
    throw new Error(
      "Not enough overlapping Hyperliquid candle history for this market and range",
    );
  }

  if (rawReferences.length > states.length) {
    warnings.push(
      `Sail state history was sampled at ${states.length} deterministic blocks from ${rawReferences.length} hourly references.`,
    );
  }
  if (usesHip3) {
    const hip3Coins = coins
      .filter(isHip3PerpCoin)
      .map((coin) => PERP_COIN_API_SYMBOL[coin]);
    warnings.push(
      `Uses Hyperliquid HIP-3 markets (${hip3Coins.join(", ")}) for the peg leg; taker fee modeled at ${HIP3_TAKER_FEE_BPS} bps. History only covers hours where all legs have candles.`,
    );
  }
  if (isSailFeeDisallowBps(sailMintFeeBps)) {
    warnings.push(
      "Sail mint was disallowed at range start (100% fee band); entry fee is treated as 0 so buy-and-hold NAV is not wiped to −100%.",
    );
  }
  if (sailRedeemFeeBpsByTimestamp.some((point) => isSailFeeDisallowBps(point.feeBps))) {
    warnings.push(
      "Some hours hit a 100% redeem-disallow band; those hours use 0 modeled redeem fee instead of a total loss.",
    );
  }
  warnings.push(
    "Liquidation uses hour-close equity and a documented maintenance-margin model; it is not an account-specific execution replay.",
  );
  warnings.push(
    `Perp exposure is sized once at ${benchmark.openingLeverageRatio.toFixed(2)}x current leverage (Sail at range start) and held without rebalancing; effective leverage drifts with PnL.`,
  );

  return {
    marketId,
    venue: "Hyperliquid",
    exposure,
    stateObservations: states,
    feeConfigChangeBlocks,
    assumptions: {
      ...assumptions,
      stateObservationCount: states.length,
      candleInterval: "1h",
      executionModel: usesHip3 ? "hip-3 taker" : "base-tier taker",
      positionModel: "fixed-at-open",
    },
    benchmark,
    warnings,
    generatedAt: new Date().toISOString(),
  };
}
