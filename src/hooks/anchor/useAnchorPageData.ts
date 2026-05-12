import { useMemo } from "react";
import { formatEther } from "viem";
import { markets, isAnchorActiveForBasicUi } from "@/config/markets";
import { FILTER_NONE_SENTINEL } from "@/components/FilterMultiselectDropdown";
import { useStaggeredReady } from "@/hooks/useStaggeredReady";
import { useMultipleVolatilityProtection } from "@/hooks/useVolatilityProtection";
import { useProjectedAPR } from "@/hooks/useProjectedAPR";
import { useFxSAVEAPR } from "@/hooks/useFxSAVEAPR";
import { useWstETHAPR } from "@/hooks/useWstETHAPR";
import { useWithdrawalRequests } from "@/hooks/useWithdrawalRequests";
import { useCoinGeckoPrices } from "@/hooks/useCoinGeckoPrice";
import { useMarketPositions } from "@/hooks/useMarketPositions";
import { useMultipleTokenPrices } from "@/hooks/useTokenPrices";
import { useAnchorPrices } from "@/hooks/anchor/useAnchorPrices";
import { useGroupedMarkets } from "@/hooks/anchor/useGroupedMarkets";
import { useAnchorMarketData } from "@/hooks/anchor/useAnchorMarketData";
import { useAnchorContractReads } from "@/hooks/anchor/useAnchorContractReads";
import { useAnchorRewards } from "@/hooks/anchor/useAnchorRewards";
import { useAnchorMarks } from "@/hooks/anchor/useAnchorMarks";
import { useAnchorLedgerMarks } from "@/hooks/useAnchorLedgerMarks";
import { useAnchorUserDeposits } from "@/hooks/anchor/useAnchorUserDeposits";
import { useAnchorTokenMetadata } from "@/hooks/anchor/useAnchorTokenMetadata";
import { calculateReadOffset } from "@/utils/anchor/calculateReadOffset";
import type { AnchorMarketTuple } from "@/types/anchor";
import {
  buildNetworkFilterOptions,
  filterBySelectedNetworks,
} from "@/utils/networkFilter";
/**
 * Composes Anchor index data reads + derived market state (Phase 2–3 refactor).
 * Includes protocol-level `anchorStats` for the strip; keeps [`page.tsx`](../../app/anchor/page.tsx) thinner over time.
 */
export function useAnchorPageData(
  chainFilterSelected: string[],
  address: `0x${string}` | undefined,
  layoutIsBasic: boolean
) {
  const anchorMarkets = useMemo(
    () =>
      Object.entries(markets).filter(([_, m]) => m.peggedToken) as AnchorMarketTuple[],
    []
  );

  const displayedAnchorMarkets = useMemo(() => {
    const byChain =
      chainFilterSelected.includes(FILTER_NONE_SENTINEL)
        ? []
        : chainFilterSelected.length === 0
          ? anchorMarkets
          : filterBySelectedNetworks(anchorMarkets, chainFilterSelected, ([, m]) => m);
    if (!layoutIsBasic) return byChain;
    return byChain.filter(([, m]) => isAnchorActiveForBasicUi(m));
  }, [anchorMarkets, chainFilterSelected, layoutIsBasic]);

  const anchorChainOptions = useMemo(
    () => buildNetworkFilterOptions(anchorMarkets, ([, m]) => m),
    [anchorMarkets]
  );

  const volProtectionMarketsConfig = useMemo(
    () =>
      anchorMarkets.map(([_, m]) => ({
        minterAddress: (m as any).addresses?.minter as
          | `0x${string}`
          | undefined,
        collateralPoolAddress: (m as any).addresses?.stabilityPoolCollateral as
          | `0x${string}`
          | undefined,
        sailPoolAddress: (m as any).addresses?.stabilityPoolLeveraged as
          | `0x${string}`
          | undefined,
      })),
    [anchorMarkets]
  );

  const useAnvil = false;

  const stagger = useStaggeredReady(6, 50);

  const { data: volProtectionData } = useMultipleVolatilityProtection(
    volProtectionMarketsConfig,
    { refetchInterval: 60_000, enabled: stagger[3] }
  );

  const projectedAPR = useProjectedAPR("pb-steth");

  const { data: fxSAVEApy } = useFxSAVEAPR(true);
  const { data: wstETHApy } = useWstETHAPR(true);

  const allPoolAddresses = useMemo(() => {
    const addresses: `0x${string}`[] = [];
    anchorMarkets.forEach(([_, market]) => {
      if ((market as any).addresses?.stabilityPoolCollateral) {
        addresses.push(
          (market as any).addresses.stabilityPoolCollateral as `0x${string}`
        );
      }
      if ((market as any).addresses?.stabilityPoolLeveraged) {
        addresses.push(
          (market as any).addresses.stabilityPoolLeveraged as `0x${string}`
        );
      }
    });
    return addresses;
  }, [anchorMarkets]);

  const { data: withdrawalRequests = [] } =
    useWithdrawalRequests(allPoolAddresses);

  const poolToRewardTokens = useMemo(() => {
    const map = new Map<`0x${string}`, string[]>();
    anchorMarkets.forEach(([_, market]) => {
      const collateralPool = (market as any).addresses
        ?.stabilityPoolCollateral as `0x${string}` | undefined;
      const sailPool = (market as any).addresses?.stabilityPoolLeveraged as
        | `0x${string}`
        | undefined;
      if (collateralPool) map.set(collateralPool, []);
      if (sailPool) map.set(sailPool, []);
    });
    return map;
  }, [anchorMarkets]);

  const allMarketContracts = undefined;

  useAnchorTokenMetadata(anchorMarkets, { enabled: stagger[5] });

  const {
    reads,
    refetchReads,
    isLoading: isLoadingReads,
    isError: isReadsError,
    error: readsError,
  } = useAnchorContractReads(anchorMarkets, useAnvil, { enabled: stagger[0] });

  const peggedPricesFromReads = useMemo(() => {
    const map: Record<string, bigint | undefined> = {};
    if (!reads) return map;

    anchorMarkets.forEach(([id, m], mi) => {
      const baseOffset = calculateReadOffset(anchorMarkets, mi);
      const priceRead = reads?.[baseOffset + 3];
      if (
        priceRead &&
        priceRead.result !== undefined &&
        priceRead.result !== null
      ) {
        map[id] = priceRead.result as bigint;
      }
    });

    return map;
  }, [anchorMarkets, reads]);

  const coinGeckoIds = useMemo(() => {
    const ids = new Set<string>();
    anchorMarkets.forEach(([id, m]) => {
      const underlyingCoinGeckoId = (m as any).underlyingCoinGeckoId as
        | string
        | undefined;
      if (underlyingCoinGeckoId) {
        ids.add(underlyingCoinGeckoId);
      }
      const coinGeckoId = (m as any).coinGeckoId as string | undefined;
      if (coinGeckoId) {
        ids.add(coinGeckoId);
      }
    });
    ids.add("wrapped-steth");
    ids.add("lido-staked-ethereum-steth");
    ids.add("bitcoin");
    ids.add("ethereum");
    return Array.from(ids);
  }, [anchorMarkets]);

  const {
    prices: coinGeckoPrices,
    isLoading: coinGeckoLoading,
    error: coinGeckoError,
  } = useCoinGeckoPrices(coinGeckoIds);

  const {
    peggedPriceUSDMap,
    mergedPeggedPriceMap,
    ethPrice,
    btcPrice,
    eurPrice,
    goldPrice,
    silverPrice,
    fxUSDPrice,
    fxSAVEPrice,
    usdcPrice,
  } = useAnchorPrices(anchorMarkets, reads, peggedPricesFromReads);

  const {
    totalAnchorMarks,
    totalAnchorMarksPerDay,
    totalMarksPerDay,
    sailMarksPerDay,
    maidenVoyageMarksPerDay: maidenVoyageMarksPerDayFromHook,
    haBalances,
    poolDeposits,
    sailBalances,
    isLoading: isLoadingAnchorMarks,
    error: anchorMarksError,
  } = useAnchorMarks(anchorMarkets, allMarketContracts, reads);

  const {
    haBalances: haLedgerBalances,
    poolDeposits: poolLedgerDeposits,
    loading: isLoadingLedgerMarks,
    error: ledgerMarksError,
  } = useAnchorLedgerMarks({ enabled: true });

  const { totalAnchorLedgerMarks, totalAnchorLedgerMarksPerDay } = useMemo(
    () => {
      const totalMarks =
        (haLedgerBalances ?? []).reduce(
          (sum: number, b: any) => sum + (b.estimatedMarks ?? 0),
          0
        ) +
        (poolLedgerDeposits ?? []).reduce(
          (sum: number, d: any) => sum + (d.estimatedMarks ?? 0),
          0
        );

      const totalPerDay =
        (haLedgerBalances ?? []).reduce(
          (sum: number, b: any) => sum + (b.marksPerDay ?? 0),
          0
        ) +
        (poolLedgerDeposits ?? []).reduce(
          (sum: number, d: any) => sum + (d.marksPerDay ?? 0),
          0
        );

      return {
        totalAnchorLedgerMarks: totalMarks,
        totalAnchorLedgerMarksPerDay: totalPerDay,
      };
    },
    [haLedgerBalances, poolLedgerDeposits]
  );

  const maidenVoyageMarksPerDay = maidenVoyageMarksPerDayFromHook;

  const { userDepositMap, refetchUserDeposits } = useAnchorUserDeposits(
    anchorMarkets,
    useAnvil,
    { enabled: stagger[1] }
  );

  const {
    allPoolRewards,
    poolRewardsMap,
    isLoadingAllRewards,
    isFetchingAllRewards,
    isErrorAllRewards,
  } = useAnchorRewards(
    anchorMarkets,
    reads,
    ethPrice,
    btcPrice,
    peggedPriceUSDMap
  );

  const showLiveAprLoading =
    isLoadingAllRewards || (isFetchingAllRewards && poolRewardsMap.size === 0);

  const marketPositionConfigs = useMemo(() => {
    return anchorMarkets.map(([id, m]) => {
      const hasCollateralPool = !!(m as any).addresses?.stabilityPoolCollateral;
      const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;
      const peggedTokenAddress = (m as any)?.addresses?.peggedToken as
        | `0x${string}`
        | undefined;

      return {
        marketId: id,
        peggedTokenAddress,
        collateralPoolAddress: hasCollateralPool
          ? ((m as any).addresses?.stabilityPoolCollateral as `0x${string}`)
          : undefined,
        sailPoolAddress: hasSailPool
          ? ((m as any).addresses?.stabilityPoolLeveraged as `0x${string}`)
          : undefined,
        minterAddress: (m as any).addresses?.minter as
          | `0x${string}`
          | undefined,
      };
    });
  }, [anchorMarkets]);

  const tokenPriceInputs = useMemo(() => {
    return marketPositionConfigs
      .map((c) => {
        const market = anchorMarkets.find(([id]) => id === c.marketId)?.[1];
        return {
          marketId: c.marketId,
          minterAddress: c.minterAddress!,
          pegTarget: (market as any)?.pegTarget || "USD",
        };
      })
      .filter((c) => c.minterAddress);
  }, [marketPositionConfigs, anchorMarkets]);

  const tokenPricesByMarket = useMultipleTokenPrices(tokenPriceInputs);

  const {
    positionsMap: marketPositions,
    totalPositionUSD: allMarketsTotalPositionUSD,
    hasPositions: userHasPositions,
    refetch: refetchPositions,
  } = useMarketPositions(marketPositionConfigs, address, mergedPeggedPriceMap, {
    enabled: stagger[2],
  });

  const groupedMarkets = useGroupedMarkets(
    anchorMarkets,
    reads,
    marketPositions
  );

  const allMarketsData = useAnchorMarketData(
    anchorMarkets,
    reads,
    marketPositions,
    poolRewardsMap,
    poolDeposits,
    projectedAPR,
    { fxSAVEApy: fxSAVEApy ?? null, wstETHApy: wstETHApy ?? null },
    peggedPriceUSDMap,
    ethPrice
  );

  /** Protocol-level stats for the Anchor index strip (same logic as previous inline `page.tsx` memo). */
  const anchorStats = useMemo(() => {
    const safeEthPrice = ethPrice && ethPrice > 0 ? ethPrice : null;

    let yieldGeneratingTVLUSD = 0;
    let stabilityPoolTVLUSD = 0;

    let bestApr = 0;
    let bestAprLabel: string | null = null;

    for (const md of allMarketsData) {
      const collateralSymbol =
        md.market?.collateral?.symbol?.toLowerCase?.() || "";
      const isFxUSDMarket =
        collateralSymbol === "fxusd" || collateralSymbol === "fxsave";
      const isWstETHMarket =
        collateralSymbol === "wsteth" || collateralSymbol === "steth";

      if (md.collateralValue) {
        if (isFxUSDMarket) {
          yieldGeneratingTVLUSD += Number(md.collateralValue) / 1e18;
        } else if (isWstETHMarket && md.wrappedRate) {
          const wrappedRateNum = Number(md.wrappedRate) / 1e18;
          const stETHAmount = Number(md.collateralValue) / 1e18;
          const wstETHAmount =
            wrappedRateNum > 0 ? stETHAmount / wrappedRateNum : stETHAmount;
          const wstETHPriceUSD =
            safeEthPrice !== null ? safeEthPrice * wrappedRateNum : 0;
          if (wstETHPriceUSD > 0) {
            yieldGeneratingTVLUSD += wstETHAmount * wstETHPriceUSD;
          }
        } else if (md.collateralPrice) {
          const priceUSD = Number(md.collateralPrice) / 1e18;
          const amount = Number(md.collateralValue) / 1e18;
          if (priceUSD > 0 && Number.isFinite(priceUSD)) {
            yieldGeneratingTVLUSD += amount * priceUSD;
          }
        }
      }

      const peggedUSD =
        peggedPriceUSDMap && peggedPriceUSDMap[md.marketId]
          ? Number(peggedPriceUSDMap[md.marketId]) / 1e18
          : 0;

      if (peggedUSD > 0) {
        if (md.collateralPoolTVL) {
          stabilityPoolTVLUSD +=
            (Number(md.collateralPoolTVL) / 1e18) * peggedUSD;
        }
        if (md.sailPoolTVL) {
          stabilityPoolTVLUSD += (Number(md.sailPoolTVL) / 1e18) * peggedUSD;
        }
      }

      const collateralApr = md.collateralPoolAPR
        ? (md.collateralPoolAPR.collateral || 0) +
          (md.collateralPoolAPR.steam || 0)
        : 0;
      const sailApr = md.sailPoolAPR
        ? (md.sailPoolAPR.collateral || 0) + (md.sailPoolAPR.steam || 0)
        : 0;

      const symbol = md.market?.peggedToken?.symbol || md.marketId;
      if (collateralApr > bestApr) {
        bestApr = collateralApr;
        bestAprLabel = `${symbol} Collateral SP`;
      }
      if (sailApr > bestApr) {
        bestApr = sailApr;
        bestAprLabel = `${symbol} Sail SP`;
      }
    }

    const yieldConcentration =
      stabilityPoolTVLUSD > 0 ? yieldGeneratingTVLUSD / stabilityPoolTVLUSD : 0;

    return {
      yieldGeneratingTVLUSD,
      stabilityPoolTVLUSD,
      yieldConcentration,
      bestApr,
      bestAprLabel,
    };
  }, [allMarketsData, peggedPriceUSDMap, ethPrice]);

  /** Positions with claimable rewards for “claim all” / compound flows (moved from `page.tsx`). */
  const claimAllPositions = useMemo(() => {
    const positions: Array<{
      marketId: string;
      market: any;
      poolType: "collateral" | "sail";
      rewards: bigint;
      rewardsUSD: number;
      deposit: bigint;
      depositUSD: number;
      rewardTokens: Array<{
        symbol: string;
        claimable: bigint;
        claimableFormatted: string;
      }>;
    }> = [];

    if (reads && anchorMarkets && allPoolRewards) {
      anchorMarkets.forEach(([id, m], mi) => {
        const hasCollateralPool = !!(m as any).addresses
          ?.stabilityPoolCollateral;
        const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;

        let offset = 0;
        for (let i = 0; i < mi; i++) {
          const prevMarket = anchorMarkets[i][1];
          const prevHasCollateral = !!(prevMarket as any).addresses
            ?.stabilityPoolCollateral;
          const prevHasSail = !!(prevMarket as any).addresses
            ?.stabilityPoolLeveraged;
          const prevHasPriceOracle = !!(prevMarket as any).addresses
            ?.collateralPrice;
          offset += 4;
          if (prevHasCollateral) offset += 3;
          if (prevHasSail) offset += 3;
          if (prevHasPriceOracle) offset += 1;
        }

        const baseOffset = offset;
        const peggedTokenPrice = reads?.[baseOffset + 3]?.result as
          | bigint
          | undefined;
        let currentOffset = baseOffset + 4;

        const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
        const collateralPriceDecimals = 18;
        let collateralPrice: bigint | undefined;
        let priceOffset = currentOffset;
        if (hasCollateralPool) priceOffset += 3;
        if (hasSailPool) priceOffset += 3;
        if (hasPriceOracle) {
          const latestAnswerResult = reads?.[priceOffset]?.result;
          if (latestAnswerResult !== undefined && latestAnswerResult !== null) {
            if (Array.isArray(latestAnswerResult)) {
              collateralPrice = latestAnswerResult[1] as bigint;
            } else if (typeof latestAnswerResult === "object") {
              const obj = latestAnswerResult as { maxUnderlyingPrice?: bigint };
              collateralPrice = obj.maxUnderlyingPrice;
            } else if (typeof latestAnswerResult === "bigint") {
              collateralPrice = latestAnswerResult;
            }
          }
        }

        if (hasCollateralPool) {
          const collateralPoolAddress = (m as any).addresses
            ?.stabilityPoolCollateral as `0x${string}`;
          const collateralPoolDeposit = reads?.[currentOffset]?.result as
            | bigint
            | undefined;

          const poolReward = allPoolRewards.find(
            (pr) =>
              pr.poolAddress.toLowerCase() ===
              collateralPoolAddress.toLowerCase()
          );

          let depositUSD = 0;
          const rewardsUSD = poolReward?.claimableValue || 0;

          const totalRewards =
            poolReward?.rewardTokens.reduce(
              (sum, token) => sum + token.claimable,
              0n
            ) || 0n;

          if (
            collateralPoolDeposit &&
            collateralPrice &&
            collateralPriceDecimals !== undefined
          ) {
            const price =
              Number(collateralPrice) /
              10 ** (Number(collateralPriceDecimals) || 8);
            const depositAmount = Number(collateralPoolDeposit) / 1e18;
            depositUSD = depositAmount * price;
          }

          if (poolReward && poolReward.claimableValue > 0) {
            positions.push({
              marketId: id,
              market: m,
              poolType: "collateral",
              rewards: totalRewards,
              rewardsUSD,
              deposit: collateralPoolDeposit || 0n,
              depositUSD,
              rewardTokens: poolReward.rewardTokens.map((token) => ({
                symbol: token.symbol,
                claimable: token.claimable,
                claimableFormatted: formatEther(token.claimable),
              })),
            });
          }

          currentOffset += 3;
        }

        if (hasSailPool) {
          const sailPoolAddress = (m as any).addresses
            ?.stabilityPoolLeveraged as `0x${string}`;
          const sailPoolDeposit = reads?.[currentOffset]?.result as
            | bigint
            | undefined;

          const poolReward = allPoolRewards.find(
            (pr) =>
              pr.poolAddress.toLowerCase() === sailPoolAddress.toLowerCase()
          );

          let depositUSD = 0;
          const rewardsUSD = poolReward?.claimableValue || 0;

          const totalRewards =
            poolReward?.rewardTokens.reduce(
              (sum, token) => sum + token.claimable,
              0n
            ) || 0n;

          if (
            sailPoolDeposit &&
            peggedTokenPrice &&
            collateralPrice &&
            collateralPriceDecimals !== undefined
          ) {
            const peggedPrice = Number(peggedTokenPrice) / 1e18;
            const collateralPriceNum =
              Number(collateralPrice) /
              10 ** (Number(collateralPriceDecimals) || 8);
            const depositAmount = Number(sailPoolDeposit) / 1e18;
            depositUSD = depositAmount * (peggedPrice * collateralPriceNum);
          }

          if (poolReward && poolReward.claimableValue > 0) {
            positions.push({
              marketId: id,
              market: m,
              poolType: "sail",
              rewards: totalRewards,
              rewardsUSD,
              deposit: sailPoolDeposit || 0n,
              depositUSD,
              rewardTokens: poolReward.rewardTokens.map((token) => ({
                symbol: token.symbol,
                claimable: token.claimable,
                claimableFormatted: formatEther(token.claimable),
              })),
            });
          }
        }
      });
    }

    return positions;
  }, [reads, anchorMarkets, allPoolRewards]);

  return {
    anchorMarkets,
    displayedAnchorMarkets,
    anchorChainOptions,
    volProtectionMarketsConfig,
    stagger,
    volProtectionData,
    projectedAPR,
    fxSAVEApy,
    wstETHApy,
    allPoolAddresses,
    withdrawalRequests,
    poolToRewardTokens,
    reads,
    refetchReads,
    isLoadingReads,
    isReadsError,
    readsError,
    peggedPricesFromReads,
    coinGeckoIds,
    coinGeckoPrices,
    coinGeckoLoading,
    coinGeckoError,
    peggedPriceUSDMap,
    mergedPeggedPriceMap,
    ethPrice,
    btcPrice,
    eurPrice,
    goldPrice,
    silverPrice,
    fxUSDPrice,
    fxSAVEPrice,
    usdcPrice,
    totalAnchorMarks,
    totalAnchorMarksPerDay,
    totalMarksPerDay,
    sailMarksPerDay,
    maidenVoyageMarksPerDayFromHook,
    maidenVoyageMarksPerDay,
    haBalances,
    poolDeposits,
    sailBalances,
    isLoadingAnchorMarks,
    anchorMarksError,
    haLedgerBalances,
    poolLedgerDeposits,
    isLoadingLedgerMarks,
    ledgerMarksError,
    totalAnchorLedgerMarks,
    totalAnchorLedgerMarksPerDay,
    userDepositMap,
    refetchUserDeposits,
    allPoolRewards,
    poolRewardsMap,
    isLoadingAllRewards,
    isFetchingAllRewards,
    isErrorAllRewards,
    showLiveAprLoading,
    marketPositionConfigs,
    tokenPriceInputs,
    tokenPricesByMarket,
    marketPositions,
    allMarketsTotalPositionUSD,
    userHasPositions,
    refetchPositions,
    groupedMarkets,
    allMarketsData,
    anchorStats,
    claimAllPositions,
  };
}
