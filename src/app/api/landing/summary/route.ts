import { NextResponse } from "next/server";
import { markets } from "@/config/markets";
import { getRpcClient } from "@/config/rpc";
import { ERC20_ABI, CHAINLINK_ORACLE_ABI } from "@/abis/shared";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { minterABI } from "@/abis/minter";
import { getPriceFeedAddress, queryChainlinkPrice } from "@/utils/priceFeeds";

export const runtime = "nodejs";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3/simple/price";
const COINGECKO_IDS = [
  "ethereum",
  "bitcoin",
  "fx-usd-saving",
  "wrapped-steth",
  "lido-staked-ethereum-steth",
  "stasis-euro",
];

const CHAINLINK_ETH_USD = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" as const;
const CHAINLINK_BTC_USD = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c" as const;
const CHAINLINK_EUR_USD = "0xb49f677943BC038e9857d61E7d053CaA2C1734C1" as const; // USD per EUR, 8 decimals
const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";
const FXSAVE_POOL_ID = "ee0b7069-f8f3-4aa2-a415-728f13e6cc3d";

type CacheEntry = { timestampMs: number; data: unknown };
const CACHE_TTL_MS = 30_000;
const MAX_CACHE_KEYS = 10;
const ALLOWED_ORIGINS = new Set([
  "https://harborfinance.io",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://localhost:3005",
]);

function getAllowedOrigin(request: Request): string | undefined {
  const origin = request.headers.get("origin") || "";
  return ALLOWED_ORIGINS.has(origin) ? origin : undefined;
}

function getCache(): Map<string, CacheEntry> {
  const g = globalThis as unknown as { __harborLandingCache?: Map<string, CacheEntry> };
  if (!g.__harborLandingCache) g.__harborLandingCache = new Map();
  return g.__harborLandingCache;
}

function trimCache(cache: Map<string, CacheEntry>) {
  if (cache.size <= MAX_CACHE_KEYS) return;
  const entries = Array.from(cache.entries()).sort(
    (a, b) => a[1].timestampMs - b[1].timestampMs
  );
  const toDelete = entries.slice(0, cache.size - MAX_CACHE_KEYS);
  toDelete.forEach(([k]) => cache.delete(k));
}

function parseLongSide(market: any): string {
  const desc = market.leveragedToken?.description || "";
  const name = market.leveragedToken?.name || "";
  const symbol = market.leveragedToken?.symbol || "";
  const descMatch = desc.match(/Long\s+(\w+)/i);
  if (descMatch) return descMatch[1];
  const versusMatch = name.match(/versus\s+(\w+)/i);
  if (versusMatch) return versusMatch[1];
  const symbolMatch = symbol.match(/^hs([A-Z]+)-/i);
  if (symbolMatch) return symbolMatch[1];
  return "Other";
}

function parseShortSide(market: any): string {
  const desc = market.leveragedToken?.description || "";
  const name = market.leveragedToken?.name || "";
  const symbol = market.leveragedToken?.symbol || "";
  const descMatch = desc.match(/short\s+(\w+)/i);
  if (descMatch) return descMatch[1];
  const nameMatch = name.match(/Short\s+(\w+)/i);
  if (nameMatch) return nameMatch[1];
  const longMatch = desc.match(/Long\s+\w+\s+vs\s+(\w+)/i);
  if (longMatch) return longMatch[1];
  const symbolMatch = symbol.match(/^hs[A-Z]+-(.+)$/i);
  if (symbolMatch) return symbolMatch[1];
  return "Other";
}

async function fetchCoinGeckoPrices(): Promise<Record<string, number>> {
  const url = new URL(COINGECKO_BASE);
  url.searchParams.set("ids", COINGECKO_IDS.join(","));
  url.searchParams.set("vs_currencies", "usd");
  const res = await fetch(url.toString(), {
    next: { revalidate: 30 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return {};
  const data = (await res.json()) as Record<string, { usd?: number }>;
  const out: Record<string, number> = {};
  for (const id of COINGECKO_IDS) {
    const price = data[id]?.usd;
    if (typeof price === "number" && Number.isFinite(price)) {
      out[id] = price;
    }
  }
  return out;
}

function extractPoolApy(pool: any): number | null {
  const candidate = pool?.apy ?? pool?.apyBase ?? pool?.apyMean30d;
  if (candidate === undefined || candidate === null) return null;
  const value = parseFloat(String(candidate));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

async function fetchDefiLlamaApys(): Promise<{
  fxsaveApyPercent: number | null;
  wstethApyPercent: number | null;
}> {
  try {
    const res = await fetch(DEFILLAMA_POOLS_URL, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return { fxsaveApyPercent: null, wstethApyPercent: null };
    }
    const data = await res.json();
    let pools: any[] = [];
    if (Array.isArray(data)) pools = data;
    else if (Array.isArray(data?.data)) pools = data.data;
    else if (Array.isArray(data?.pools)) pools = data.pools;

    let fxsavePool =
      pools.find(
        (p) =>
          p.pool === FXSAVE_POOL_ID ||
          p.poolId === FXSAVE_POOL_ID ||
          p.id === FXSAVE_POOL_ID
      ) ?? null;

    if (!fxsavePool) {
      fxsavePool = pools.find((p) => {
        const symbol = String(p.symbol || "").toLowerCase();
        const name = String(p.name || "").toLowerCase();
        const project = String(p.project || "").toLowerCase();
        return (
          symbol.includes("fxsave") ||
          name.includes("fxsave") ||
          (project.includes("fx") &&
            (symbol.includes("save") || name.includes("save")))
        );
      });
    }

    let wstethPool =
      pools.find((p) => {
        const symbol = String(p.symbol || "").toLowerCase();
        const project = String(p.project || "").toLowerCase();
        return symbol === "wsteth" && project === "lido";
      }) ??
      pools.find((p) => {
        const symbol = String(p.symbol || "").toLowerCase();
        const project = String(p.project || "").toLowerCase();
        return symbol === "steth" && project === "lido";
      }) ??
      pools.find((p) => String(p.symbol || "").toLowerCase() === "wsteth") ??
      pools.find((p) => String(p.symbol || "").toLowerCase() === "steth") ??
      null;

    return {
      fxsaveApyPercent: fxsavePool ? extractPoolApy(fxsavePool) : null,
      wstethApyPercent: wstethPool ? extractPoolApy(wstethPool) : null,
    };
  } catch {
    return { fxsaveApyPercent: null, wstethApyPercent: null };
  }
}

async function fetchChainlinkPrice(
  publicClient: ReturnType<typeof getRpcClient>,
  address: `0x${string}`
): Promise<number | null> {
  try {
    const [decimals, latestAnswer] = await Promise.all([
      publicClient.readContract({
        address,
        abi: CHAINLINK_ORACLE_ABI,
        functionName: "decimals",
      }),
      publicClient.readContract({
        address,
        abi: CHAINLINK_ORACLE_ABI,
        functionName: "latestAnswer",
      }),
    ]);
    const price = Number(latestAnswer) / 10 ** Number(decimals);
    return price > 0 ? price : null;
  } catch {
    return null;
  }
}

function getPegTargetPriceUSD(
  market: any,
  prices: { eth?: number; btc?: number; eur?: number }
): number | null {
  const pegTarget = (market as any)?.pegTarget?.toLowerCase() || "";
  if (pegTarget === "eth" || pegTarget === "ethereum") return prices.eth ?? null;
  if (pegTarget === "btc" || pegTarget === "bitcoin") return prices.btc ?? null;
  if (pegTarget === "eur" || pegTarget === "euro") return prices.eur ?? null;
  return 1;
}

export async function GET(request: Request) {
  const cache = getCache();
  const cached = cache.get("landing-summary");
  const now = Date.now();
  const allowOrigin = getAllowedOrigin(request);
  if (cached && now - cached.timestampMs < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
        ...(allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin } : {}),
      },
    });
  }

  const publicClient = getRpcClient();
  const marketEntries = Object.entries(markets);

  const anchorMarkets = marketEntries.filter(
    ([, m]) =>
      (m as any).peggedToken &&
      (m as any).status !== "coming-soon" &&
      (m as any).addresses?.stabilityPoolCollateral
  );

  const sailMarkets = marketEntries.filter(
    ([, m]) =>
      (m as any).leveragedToken &&
      (m as any).status !== "coming-soon" &&
      (m as any).addresses?.minter
  );

  const maidenVoyageMarkets = marketEntries.filter(
    ([, m]) => !!(m as any)?.marksCampaign
  );

  const [coinGecko, chainlinkEth, chainlinkBtc, chainlinkEur, defillamaApys] =
    await Promise.all([
    fetchCoinGeckoPrices(),
    fetchChainlinkPrice(publicClient, CHAINLINK_ETH_USD),
    fetchChainlinkPrice(publicClient, CHAINLINK_BTC_USD),
    fetchChainlinkPrice(publicClient, CHAINLINK_EUR_USD),
    fetchDefiLlamaApys(),
  ]);

  const ethPrice = chainlinkEth ?? coinGecko["ethereum"];
  const btcPrice = chainlinkBtc ?? coinGecko["bitcoin"];
  const eurPrice = chainlinkEur ?? coinGecko["stasis-euro"];

  const rewardTokenPriceByAddress = new Map<string, number>();
  anchorMarkets.forEach(([, m]) => {
    const wrappedAddress = (m as any).addresses?.wrappedCollateralToken as
      | `0x${string}`
      | undefined;
    const symbol = m.collateral?.symbol?.toLowerCase();
    let price: number | undefined;
    if (symbol === "fxsave") price = coinGecko["fx-usd-saving"];
    if (symbol === "wsteth") price = coinGecko["wrapped-steth"];
    if (symbol === "steth") price = coinGecko["lido-staked-ethereum-steth"];
    if (wrappedAddress && price) {
      rewardTokenPriceByAddress.set(wrappedAddress.toLowerCase(), price);
    }
  });

  const anchorMarketSummaries = [];
  for (const [marketId, market] of anchorMarkets) {
    const pools: Array<{ poolType: "collateral" | "sail"; address: `0x${string}` }> = [];
    const collateralPool = (market as any).addresses?.stabilityPoolCollateral as
      | `0x${string}`
      | undefined;
    const sailPool = (market as any).addresses?.stabilityPoolLeveraged as
      | `0x${string}`
      | undefined;
    if (collateralPool) pools.push({ poolType: "collateral", address: collateralPool });
    if (sailPool) pools.push({ poolType: "sail", address: sailPool });

    const poolAprs: Array<{ poolType: string; apr: number }> = [];

    for (const pool of pools) {
      let totalRewardAPR = 0;
      try {
        const [rewardTokens, poolTVL] = await Promise.all([
          publicClient.readContract({
            address: pool.address,
            abi: stabilityPoolABI,
            functionName: "activeRewardTokens",
          }) as Promise<`0x${string}`[]>,
          publicClient.readContract({
            address: pool.address,
            abi: stabilityPoolABI,
            functionName: "totalAssetSupply",
          }) as Promise<bigint>,
        ]);

        if (poolTVL > 0n && rewardTokens.length > 0) {
          const depositPriceUSD = getPegTargetPriceUSD(market, {
            eth: ethPrice,
            btc: btcPrice,
            eur: eurPrice,
          });
          const depositValueUSD =
            depositPriceUSD && depositPriceUSD > 0
              ? (Number(poolTVL) / 1e18) * depositPriceUSD
              : 0;

          if (depositValueUSD > 0) {
            const rewardInfos = await Promise.all(
              rewardTokens.map(async (tokenAddress) => {
                const [rewardData, symbol, decimals] = await Promise.all([
                  publicClient.readContract({
                    address: pool.address,
                    abi: stabilityPoolABI,
                    functionName: "rewardData",
                    args: [tokenAddress],
                  }) as Promise<[bigint, bigint, bigint, bigint]>,
                  publicClient
                    .readContract({
                      address: tokenAddress,
                      abi: ERC20_ABI,
                      functionName: "symbol",
                    })
                    .catch(() => "UNKNOWN"),
                  publicClient
                    .readContract({
                      address: tokenAddress,
                      abi: ERC20_ABI,
                      functionName: "decimals",
                    })
                    .catch(() => 18),
                ]);

                const rate = rewardData[2];
                const tokenAddressLower = tokenAddress.toLowerCase();
                let price =
                  rewardTokenPriceByAddress.get(tokenAddressLower) ??
                  undefined;
                if (!price) {
                  const priceFeedAddress = getPriceFeedAddress(tokenAddressLower);
                  if (priceFeedAddress) {
                    const chainlinkPrice = await queryChainlinkPrice(
                      priceFeedAddress,
                      publicClient
                    );
                    if (chainlinkPrice) price = chainlinkPrice.price;
                  }
                }

                return {
                  rate,
                  decimals: Number(decimals),
                  price: price ?? 0,
                  symbol: String(symbol),
                };
              })
            );

            const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
            totalRewardAPR = rewardInfos.reduce((sum, reward) => {
              if (reward.price <= 0 || reward.rate <= 0n) return sum;
              const annualRewardsTokens =
                (Number(reward.rate) * SECONDS_PER_YEAR) / 10 ** reward.decimals;
              const annualRewardsUSD = annualRewardsTokens * reward.price;
              const apr = (annualRewardsUSD / depositValueUSD) * 100;
              return sum + (Number.isFinite(apr) ? apr : 0);
            }, 0);
          }
        }
      } catch {
        totalRewardAPR = 0;
      }

      poolAprs.push({ poolType: pool.poolType, apr: totalRewardAPR });
    }

    const bestApr = poolAprs.reduce((max, pool) => Math.max(max, pool.apr), 0);
    anchorMarketSummaries.push({
      marketId,
      name: market.name,
      symbol: market.peggedToken?.symbol,
      bestApr,
      pools: poolAprs,
    });
  }

  const sailMarketSummaries = await Promise.all(
    sailMarkets.map(async ([marketId, market]) => {
      const minterAddress = (market as any).addresses?.minter as
        | `0x${string}`
        | undefined;
      let leverageRatio: number | null = null;
      if (minterAddress) {
        try {
          const raw = (await publicClient.readContract({
            address: minterAddress,
            abi: minterABI,
            functionName: "leverageRatio",
          })) as bigint;
          leverageRatio = Number(raw) / 1e18;
        } catch {
          leverageRatio = null;
        }
      }
      return {
        marketId,
        name: market.name,
        longSide: parseLongSide(market),
        shortSide: parseShortSide(market),
        leverageRatio,
      };
    })
  );

  const maidenVoyagesMap = new Map<
    string,
    Array<{
      marketId: string;
      name: string;
      symbol?: string;
      collateralSymbol?: string;
      peggedSymbol?: string;
      leveragedSymbol?: string;
      pegTarget?: string;
      campaignId?: string;
      projectedApr: number | null;
      longSide: string;
      shortSide: string;
      phase: "live" | "coming-next" | "planned";
      status?: string;
    }>
  >();

  for (const [marketId, market] of maidenVoyageMarkets) {
    const campaignLabel =
      (market as any)?.marksCampaign?.label ||
      "Maiden Voyage";
    const campaignId = (market as any)?.marksCampaign?.id;
    const collateralSymbol = market.collateral?.symbol;
    const peggedSymbol = market.peggedToken?.symbol;
    const leveragedSymbol = market.leveragedToken?.symbol;
    const pegTarget = (market as any)?.pegTarget;
    const status = (market as any)?.status;
    const collateralSymbolLower = collateralSymbol?.toLowerCase();
    let projectedApr: number | null = null;
    if (collateralSymbolLower === "fxsave") {
      projectedApr = defillamaApys.fxsaveApyPercent;
    } else if (
      collateralSymbolLower === "wsteth" ||
      collateralSymbolLower === "steth"
    ) {
      projectedApr = defillamaApys.wstethApyPercent;
    }

    const startDate = market?.genesis?.startDate
      ? new Date(market.genesis.startDate).getTime()
      : null;
    const endDate = market?.genesis?.endDate
      ? new Date(market.genesis.endDate).getTime()
      : null;
    const now = Date.now();
    let phase: "live" | "coming-next" | "planned" = "planned";
    const isComingSoon = status === "coming-soon";
    const hasEnded = endDate !== null && now > endDate;
    if (hasEnded && !isComingSoon) {
      continue;
    }
    if (isComingSoon) {
      phase = "planned";
    } else if (startDate && now < startDate) {
      phase = "coming-next";
    } else if (endDate && now <= endDate) {
      phase = "live";
    } else if (status === "genesis") {
      phase = "live";
    }

    const entry = {
      marketId,
      name: market.name,
      symbol: market.peggedToken?.symbol,
      collateralSymbol,
      peggedSymbol,
      leveragedSymbol,
      pegTarget,
      campaignId,
      projectedApr,
      longSide: parseLongSide(market),
      shortSide: parseShortSide(market),
      phase,
      status,
    };
    const list = maidenVoyagesMap.get(campaignLabel) || [];
    list.push(entry);
    maidenVoyagesMap.set(campaignLabel, list);
  }

  const maidenVoyages = Array.from(maidenVoyagesMap.entries()).map(
    ([title, markets]) => ({
      title,
      markets,
    })
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    anchorMarkets: anchorMarketSummaries,
    sailMarkets: sailMarketSummaries,
    maidenVoyages,
  };

  cache.set("landing-summary", { timestampMs: now, data: payload });
  trimCache(cache);

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
      ...(allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin } : {}),
    },
  });
}
