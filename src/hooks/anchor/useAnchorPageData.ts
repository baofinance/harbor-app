import { useMemo } from "react";
import { markets } from "@/config/markets";
import { FILTER_NONE_SENTINEL } from "@/components/FilterMultiselectDropdown";
import { getWeb3iconsNetworkId } from "@/config/web3iconsNetworks";
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
/**
 * Composes Anchor index data reads + derived market state (Phase 2 refactor).
 * Keeps [`page.tsx`](../../app/anchor/page.tsx) wiring-only over time; behavior must match inlined calls.
 */
export function useAnchorPageData(
  chainFilterSelected: string[],
  address: `0x${string}` | undefined
) {
  const anchorMarkets = useMemo(
    () => Object.entries(markets).filter(([_, m]) => m.peggedToken),
    []
  );

  const displayedAnchorMarkets = useMemo(
    () =>
      chainFilterSelected.includes(FILTER_NONE_SENTINEL)
        ? []
        : chainFilterSelected.length === 0
          ? anchorMarkets
          : anchorMarkets.filter(([, m]) => {
              const chainName = (m as any).chain?.name || "Ethereum";
              return chainFilterSelected.includes(chainName);
            }),
    [anchorMarkets, chainFilterSelected]
  );

  const anchorChainOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: {
      id: string;
      label: string;
      iconUrl?: string;
      networkId?: string;
    }[] = [];
    anchorMarkets.forEach(([, m]) => {
      const name = (m as any).chain?.name || "Ethereum";
      if (seen.has(name)) return;
      seen.add(name);
      const logo = (m as any).chain?.logo || "icons/eth.png";
      const networkId = getWeb3iconsNetworkId(name);
      options.push({
        id: name,
        label: name,
        iconUrl: networkId ? undefined : logo.startsWith("/") ? logo : `/${logo}`,
        networkId,
      });
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [anchorMarkets]);

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
  };
}
