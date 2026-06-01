"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useAccount, useChainId, useContractRead, useSwitchChain } from "wagmi";
import { formatEther } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { GenesisManageModal } from "@/components/GenesisManageModal";
import { CHAINLINK_FEEDS } from "@/config/chainlink";
import { GENESIS_ABI, ERC20_ABI, CHAINLINK_ORACLE_ABI } from "@/abis/shared";
import { useCoinGeckoPrices } from "@/hooks/useCoinGeckoPrice";
import { useMultipleTokenPrices } from "@/hooks/useTokenPrices";
import { useMultipleCollateralPrices } from "@/hooks/useCollateralPrice";
import { useWstETHAPR } from "@/hooks/useWstETHAPR";
import { useFxSAVEAPR } from "@/hooks/useFxSAVEAPR";
import { useTotalGenesisTVL } from "@/hooks/useTotalGenesisTVL";
import { useTotalMaidenVoyageMarks } from "@/hooks/useTotalMaidenVoyageMarks";
import { FILTER_NONE_SENTINEL } from "@/components/FilterMultiselectDropdown";
import { useSortedGenesisMarkets } from "@/hooks/useSortedGenesisMarkets";
import {
  GenesisActiveMarketsSection,
  GenesisCampaignStats,
  GenesisComingNextMarketsSection,
  GenesisCompletedMarketsSection,
  GenesisArchivedMarketsSection,
  GenesisMaidenVoyageComingSoon,
  GenesisHeroIntroCards,
  GenesisMarketsSections,
  GenesisPageTitleSection,
} from "@/components/genesis";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import { useGenesisClaimMarket } from "@/hooks/useGenesisClaimMarket";
import { DEFAULT_FDV } from "@/utils/tokenAllocation";
import { useGenesisPageData } from "@/hooks/useGenesisPageData";
import { usePageLayoutPreference } from "@/contexts/PageLayoutPreferenceContext";
import { useExpandedMarketIds } from "@/hooks/useExpandedMarketIds";
import { useOpenMarketManageModal } from "@/hooks/useOpenMarketManageModal";
import { useGenesisContractReads } from "@/hooks/useGenesisContractReads";
import { useGenesisManageRefetch } from "@/hooks/useGenesisManageRefetch";
import { GenesisClaimProgressModal } from "@/components/genesis/GenesisClaimProgressModal";
import { formatCompactUSD } from "@/utils/anchor";
import {
  genesisParticipatesInMaidenVoyageTotals,
  isMarketArchived,
} from "@/config/markets";

const SHOW_MAIDEN_VOYAGE_COMING_SOON =
  process.env.NEXT_PUBLIC_SHOW_MAIDEN_VOYAGE_COMING_SOON === "true";

export default function GenesisIndexPage() {
  const { address, isConnected } = useAccount();
  const connectedChainId = useChainId();
  const { switchChain } = useSwitchChain();
  /** Header toggle: Basic = toolbar + tables only (no hero + Ledger Marks strip). Persists across routes. */
  const { isBasic: genesisViewBasic } = usePageLayoutPreference();
  const [manageModal, setManageModal] = useState<{
    marketId: string;
    market: any;
    initialTab?: "deposit" | "withdraw";
  } | null>(null);
  const [now, setNow] = useState(new Date());
  const { expandedMarkets, setExpandedMarkets } = useExpandedMarketIds();
  const [mounted, setMounted] = useState(false);
  const [claimingMarket, setClaimingMarket] = useState<string | null>(null);
  const [claimModal, setClaimModal] = useState<{
    open: boolean;
    status: "pending" | "success" | "error";
    marketId?: string | null;
    errorMessage?: string;
  }>({ open: false, status: "pending", marketId: null });
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    marketName?: string;
    peggedSymbol?: string;
  }>({ open: false });
  const [fdv, setFdv] = useState<number>(DEFAULT_FDV);
  // Hide completed genesis sections by default; filter to show "Ongoing" only or "All" (ongoing + completed)
  const [showCompletedGenesis, setShowCompletedGenesis] = useState(false);
  const [showArchivedGenesis, setShowArchivedGenesis] = useState(false);

  const openManageModalBase = useOpenMarketManageModal<{
    marketId: string;
    market: GenesisMarketConfig;
    initialTab?: "deposit" | "withdraw";
  }>({
    isConnected,
    connectedChainId,
    switchChain,
    setManageModal,
    logLabel: "Genesis",
  });

  const openManageModal = useCallback(
    async (
      marketId: string,
      market: GenesisMarketConfig,
      initialTab: "deposit" | "withdraw" = "deposit",
    ) => {
      const resolvedTab =
        isMarketArchived(market) && initialTab === "deposit"
          ? "withdraw"
          : initialTab;
      await openManageModalBase({
        marketId,
        market,
        initialTab: resolvedTab,
      });
    },
    [openManageModalBase],
  );

  // Prevent hydration mismatch by only rendering dynamic content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update time every minute to refresh status display
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const {
    chainFilterSelected,
    setChainFilterSelected,
    genesisMarkets,
    displayedGenesisMarkets,
    genesisChainOptions,
    comingSoonMarkets,
    genesisAddresses,
    marksResults,
    isLoadingMarks,
    refetchMarks,
    marksError,
    maidenVoyageCampaignResults,
    isLoadingMaidenVoyageIndex,
    combinedHasIndexerErrors,
    combinedMarketsWithIndexerErrors,
    combinedHasAnyErrors,
    combinedMarketsWithOtherErrors,
    hasOraclePricingError,
    marketsWithOraclePricingError,
    getMarketName,
  } = useGenesisPageData();

  const queryClient = useQueryClient();

  const {
    reads,
    refetchReads,
    refetchCollateralTokens,
    refetchTotalDeposits,
    totalDepositsReads,
  } = useGenesisContractReads(
    genesisMarkets as Array<[string, GenesisMarketConfig]>,
    isConnected,
    address,
  );

  const onGenesisManageSuccess = useGenesisManageRefetch({
    refetchCollateralTokens,
    refetchReads,
    refetchTotalDeposits,
    refetchMarks,
  });

  // Calculate completed markets grouped by campaign (after reads is defined)
  const completedByCampaign = useMemo(() => {
    const completedMarkets: Array<[string, any, any]> = [];

    genesisMarkets.forEach(([id, mkt]) => {
      const mi = genesisMarkets.findIndex((m) => m[0] === id);
      const baseOffset = mi * (isConnected ? 3 : 1);
      const contractReadResult = reads?.[baseOffset];
      const contractSaysEnded =
        contractReadResult?.status === "success"
          ? (contractReadResult.result as boolean)
          : undefined;

      const marksForMarket = marksResults?.find(
        (marks: {
          genesisAddress?: string;
          data?: { userHarborMarks?: unknown };
        }) =>
          marks.genesisAddress?.toLowerCase() ===
          (mkt as GenesisMarketConfig).addresses?.genesis?.toLowerCase(),
      );
      const userMarksData = marksForMarket?.data?.userHarborMarks;
      const marks = Array.isArray(userMarksData)
        ? userMarksData[0]
        : userMarksData;
      const subgraphSaysEnded = marks?.genesisEnded;

      const isEnded =
        contractSaysEnded !== undefined
          ? contractSaysEnded
          : (subgraphSaysEnded ?? false);

      if (isEnded && !isMarketArchived(mkt)) {
        completedMarkets.push([id, mkt, marks]);
      }
    });

    // Group by campaign from config (not subgraph)
    const grouped = new Map<string, Array<[string, any, any]>>();
    completedMarkets.forEach(([id, mkt, marks]) => {
      // Use campaign from market config, fallback to subgraph, then "Other"
      const marketConfig = mkt as GenesisMarketConfig;
      const campaignLabel =
        marketConfig?.marksCampaign?.label || marks?.campaignLabel || "Other";
      if (!grouped.has(campaignLabel)) {
        grouped.set(campaignLabel, []);
      }
      grouped.get(campaignLabel)!.push([id, mkt, marks]);
    });

    return grouped;
  }, [genesisMarkets, reads, isConnected, marksResults]);

  const { claimMarket } = useGenesisClaimMarket({
    setClaimingMarket,
    setClaimModal,
    setShareModal,
    refetchReads,
    refetchTotalDeposits,
  });

  // Fetch token prices using the dedicated hook
  // This hook reads peggedTokenPrice() and leveragedTokenPrice() from minter contracts
  // and multiplies by peg target USD prices to get final USD prices
  const marketTokenPriceInputs = useMemo(() => {
    return genesisMarkets.map(([id, mkt]) => ({
      marketId: id,
      minterAddress: (mkt as GenesisMarketConfig).addresses
        ?.minter as `0x${string}`,
      pegTarget: (mkt as GenesisMarketConfig).pegTarget || "USD",
    }));
  }, [genesisMarkets]);

  const tokenPricesByMarket = useMultipleTokenPrices(marketTokenPriceInputs);

  const buildShareMessage = (
    marketName: string,
    peggedSymbolNoPrefix: string,
  ) => {
    return `The ${marketName} market is live on @0xharborfi — Maiden voyage 2.0. Become a shareholder: ${peggedSymbolNoPrefix} and leveraged ${marketName} at harborfinance.io\n\n$TIDE airdrop and ledger marks for early Harbor liquidity.`;
  };

  const openShareIntent = (marketName: string, peggedSymbol: string) => {
    const msg = buildShareMessage(marketName, peggedSymbol);
    const encoded = encodeURIComponent(msg);
    const url = `https://x.com/intent/tweet?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleOpenManageModal = useCallback(
    async (
      marketId: string,
      market: GenesisMarketConfig,
      initialTab: "deposit" | "withdraw" = "deposit",
    ) => {
      await openManageModal({ marketId, market, initialTab });
    },
    [openManageModal],
  );

  // Fetch collateral price oracles using the dedicated hook
  // This hook properly handles the Harbor oracle format (tuple with wrapped rates)
  const collateralOracleAddresses = useMemo(() => {
    return genesisMarkets.map(
      ([_, mkt]) =>
        (mkt as GenesisMarketConfig).addresses?.collateralPrice as
          | `0x${string}`
          | undefined,
    );
  }, [genesisMarkets]);

  const {
    prices: collateralPricesMap,
    isLoading: collateralPricesLoading,
    error: collateralPricesError,
  } = useMultipleCollateralPrices(collateralOracleAddresses, {
    refetchInterval: 120000, // 2 minutes
    enabled: true, // Always fetch oracle data (we'll use it as fallback)
  });

  // Fetch CoinGecko prices for markets that have coinGeckoId
  const coinGeckoIds = useMemo(() => {
    const ids = genesisMarkets
      .map(([_, mkt]) => (mkt as GenesisMarketConfig)?.coinGeckoId)
      .filter((id): id is string => !!id);
    // Add steth as fallback for wstETH markets
    const hasWstETH = genesisMarkets.some(
      ([_, mkt]) =>
        (mkt as GenesisMarketConfig)?.collateral?.symbol?.toLowerCase() ===
        "wsteth",
    );
    if (hasWstETH && !ids.includes("lido-staked-ethereum-steth")) {
      ids.push("lido-staked-ethereum-steth");
    }
    return ids;
  }, [genesisMarkets]);
  // Refresh interval set to 2 minutes to balance API calls and price freshness
  const {
    prices: coinGeckoPrices,
    isLoading: coinGeckoLoading,
    error: coinGeckoError,
  } = useCoinGeckoPrices(coinGeckoIds, 120000); // 2 minutes

  // Fetch APY data for wstETH and fxSAVE
  const {
    data: wstETHAPR,
    isLoading: isLoadingWstETHAPR,
    error: wstETHAPRError,
  } = useWstETHAPR();
  const {
    data: fxSAVEAPR,
    isLoading: isLoadingFxSAVEAPR,
    error: fxSAVEAPRError,
  } = useFxSAVEAPR();

  // Fetch total genesis TVL and total maiden voyage marks for $TIDE APR calculation
  // Only fetch when mounted (client-side only) to avoid SSR issues
  const { totalTVL: totalGenesisTVL, isLoading: isLoadingTotalTVL } =
    useTotalGenesisTVL();
  const { totalMarks: totalMaidenVoyageMarks, isLoading: isLoadingTotalMarks } =
    useTotalMaidenVoyageMarks();

  // Use fallback values during SSR or when data is loading
  const safeTotalGenesisTVL = mounted ? totalGenesisTVL : 0;
  const safeTotalMaidenVoyageMarks = mounted ? totalMaidenVoyageMarks : 0;
  const safeIsLoadingTotalTVL = mounted ? isLoadingTotalTVL : true;
  const safeIsLoadingTotalMarks = mounted ? isLoadingTotalMarks : true;

  // Chainlink BTC/USD (mainnet feed from @/config/chainlink — fallback when CoinGecko fails)
  const { data: chainlinkBtcPriceData } = useContractRead({
    address: CHAINLINK_FEEDS.BTC_USD,
    abi: CHAINLINK_ORACLE_ABI,
    functionName: "latestAnswer",
    query: {
      enabled: true,
      staleTime: 60_000, // 1 minute - Chainlink updates less frequently
      gcTime: 300_000, // 5 minutes
    },
  });

  // Calculate Chainlink BTC price in USD (8 decimals)
  const chainlinkBtcPrice = useMemo(() => {
    if (!chainlinkBtcPriceData) return null;
    // Chainlink BTC/USD uses 8 decimals
    const price = Number(chainlinkBtcPriceData as bigint) / 1e8;
    return price > 0 ? price : null;
  }, [chainlinkBtcPriceData]);

  // Refetch marks when genesis ends to get bonus marks
  useEffect(() => {
    if (!reads || !isConnected) return;

    // Check if any genesis has ended
    const anyEnded = genesisMarkets.some(([_, mkt], mi) => {
      const baseOffset = mi * (isConnected ? 3 : 1);
      const isEnded = (reads?.[baseOffset]?.result as boolean) ?? false;
      return isEnded;
    });

    if (anyEnded) {
      // Refetch marks to get updated bonus marks from subgraph
      // The subgraph updates bonus marks when users interact after genesis ends
      // We'll refetch periodically to catch updates
      const marksInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["allHarborMarks"] });
        refetchMarks();
      }, 30000); // Refetch every 30 seconds when genesis has ended

      return () => clearInterval(marksInterval);
    }
  }, [reads, isConnected, genesisMarkets, queryClient, refetchMarks]);

  // Check if there are any active or pending maiden voyages, or ended markets
  // Show all ended markets regardless of claimable tokens (they may have been claimed already)
  // Only used to conditionally show/hide the market table section
  const hasActiveOrPendingMarkets = useMemo(() => {
    if (genesisMarkets.length === 0) return false;
    if (!reads) return false; // Wait for reads to load

    return genesisMarkets.some(([_, mkt], mi) => {
      const baseOffset = mi * (isConnected ? 3 : 1);
      const contractSaysEnded = reads?.[baseOffset]?.result as
        | boolean
        | undefined;

      // Market is active if contract hasn't ended
      // Market is pending if time expired but contract not ended (processing state)
      if (contractSaysEnded !== true) {
        return true;
      }

      // Show all ended markets regardless of claimable tokens
      // (markets may have ended and tokens may have been claimed already)
      if (contractSaysEnded === true) {
        return true;
      }

      return false;
    });
  }, [reads, isConnected, genesisMarkets]);

  const {
    activeMarkets,
    archivedLiveMarkets,
    archivedCompletedMarkets,
    showHeaders,
    activeCampaignNames,
  } = useSortedGenesisMarkets({
    genesisMarkets,
    reads,
    isConnected,
    marksResults,
  });

  const hasArchivedUserDeposit = useMemo(() => {
    if (!reads || !isConnected) return false;
    const archivedIds = new Set([
      ...archivedLiveMarkets.map(([id]) => id),
      ...archivedCompletedMarkets.map(([id]) => id),
    ]);
    return genesisMarkets.some(([id, mkt], marketIndex) => {
      if (!archivedIds.has(id)) return false;
      const baseOffset = marketIndex * 3;
      const userDeposit = reads?.[baseOffset + 1]?.result as bigint | undefined;
      return userDeposit != null && userDeposit > 0n;
    });
  }, [
    reads,
    isConnected,
    genesisMarkets,
    archivedLiveMarkets,
    archivedCompletedMarkets,
  ]);

  useEffect(() => {
    if (hasArchivedUserDeposit) {
      setShowArchivedGenesis(true);
    }
  }, [hasArchivedUserDeposit]);

  const displayedActiveMarkets = useMemo(() => {
    if (chainFilterSelected.includes(FILTER_NONE_SENTINEL)) return [];
    if (chainFilterSelected.length === 0) return activeMarkets;
    return activeMarkets.filter(([, m]) => {
      const chainName = (m as any).chain?.name || "Ethereum";
      return chainFilterSelected.includes(chainName);
    });
  }, [activeMarkets, chainFilterSelected]);

  const displayedCompletedByCampaign = useMemo(() => {
    if (chainFilterSelected.includes(FILTER_NONE_SENTINEL))
      return new Map<string, Array<[string, any, any]>>();
    if (chainFilterSelected.length === 0) return completedByCampaign;
    const next = new Map<string, Array<[string, any, any]>>();
    completedByCampaign.forEach((markets, campaign) => {
      const filtered = markets.filter(([, m]) => {
        const chainName = (m as any).chain?.name || "Ethereum";
        return chainFilterSelected.includes(chainName);
      });
      if (filtered.length > 0) next.set(campaign, filtered);
    });
    return next;
  }, [completedByCampaign, chainFilterSelected]);

  const filterGenesisPairs = <T,>(entries: Array<[string, T]>) => {
    if (chainFilterSelected.includes(FILTER_NONE_SENTINEL)) return [];
    if (chainFilterSelected.length === 0) return entries;
    return entries.filter(([, m]) => {
      const chainName =
        (m as { chain?: { name?: string } }).chain?.name || "Ethereum";
      return chainFilterSelected.includes(chainName);
    });
  };

  const filterGenesisTriples = <T, U>(entries: Array<[string, T, U]>) => {
    if (chainFilterSelected.includes(FILTER_NONE_SENTINEL)) return [];
    if (chainFilterSelected.length === 0) return entries;
    return entries.filter(([, m]) => {
      const chainName =
        (m as { chain?: { name?: string } }).chain?.name || "Ethereum";
      return chainFilterSelected.includes(chainName);
    });
  };

  const displayedArchivedLiveMarkets = useMemo(
    () => filterGenesisPairs(archivedLiveMarkets),
    [archivedLiveMarkets, chainFilterSelected],
  );

  const displayedArchivedCompletedMarkets = useMemo(
    () => filterGenesisTriples(archivedCompletedMarkets),
    [archivedCompletedMarkets, chainFilterSelected],
  );

  const archivedGenesisCount =
    displayedArchivedLiveMarkets.length +
    displayedArchivedCompletedMarkets.length;

  const activeGenesisTvlUsd = useMemo(() => {
    if (!totalDepositsReads || !collateralPricesMap) return 0;
    const activeIds = new Set(activeMarkets.map(([id]) => id));
    let total = 0;

    genesisMarkets.forEach(([id, mkt], marketIndex) => {
      if (!activeIds.has(id)) return;
      if (!genesisParticipatesInMaidenVoyageTotals(mkt)) return;
      const totalDeposits = totalDepositsReads?.[marketIndex]?.result as
        | bigint
        | undefined;
      if (!totalDeposits || totalDeposits <= 0n) return;

      const oracleAddress = (mkt as GenesisMarketConfig).addresses
        ?.collateralPrice as `0x${string}` | undefined;
      if (!oracleAddress) return;
      const priceData = collateralPricesMap.get(oracleAddress.toLowerCase());
      const collateralPriceUsd = priceData?.priceUSD || 0;
      if (collateralPriceUsd <= 0) return;

      total += Number(formatEther(totalDeposits)) * collateralPriceUsd;
    });

    return total;
  }, [activeMarkets, totalDepositsReads, collateralPricesMap, genesisMarkets]);

  const activeGenesisYourDepositsUsd = useMemo(() => {
    if (!reads || !isConnected) return 0;
    const activeIds = new Set(activeMarkets.map(([id]) => id));
    let total = 0;

    genesisMarkets.forEach(([id, mkt], marketIndex) => {
      if (!activeIds.has(id)) return;
      if (!genesisParticipatesInMaidenVoyageTotals(mkt)) return;
      const baseOffset = marketIndex * (isConnected ? 3 : 1);
      const userDeposit = reads?.[baseOffset + 1]?.result as bigint | undefined;
      if (!userDeposit || userDeposit <= 0n) return;

      const oracleAddress = (mkt as GenesisMarketConfig).addresses
        ?.collateralPrice as `0x${string}` | undefined;
      if (!oracleAddress) return;
      const priceData = collateralPricesMap.get(oracleAddress.toLowerCase());
      const collateralPriceUsd = priceData?.priceUSD || 0;
      if (collateralPriceUsd <= 0) return;

      total += Number(formatEther(userDeposit)) * collateralPriceUsd;
    });

    return total;
  }, [activeMarkets, reads, isConnected, genesisMarkets, collateralPricesMap]);

  if (SHOW_MAIDEN_VOYAGE_COMING_SOON) {
    return <GenesisMaidenVoyageComingSoon />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col text-white max-w-[1300px] mx-auto font-sans relative w-full">
      <main className="container mx-auto px-4 sm:px-10 pb-6 pt-2 sm:pt-4">
        <GenesisPageTitleSection />

        {!genesisViewBasic && (
          <>
            <GenesisHeroIntroCards />

            <GenesisCampaignStats
              marksError={marksError}
              marksResults={marksResults}
              genesisAddresses={genesisAddresses}
              genesisMarkets={genesisMarkets}
              reads={reads}
              isConnected={isConnected}
              isLoadingMarks={isLoadingMarks}
              mounted={mounted}
              combinedHasIndexerErrors={combinedHasIndexerErrors}
              combinedMarketsWithIndexerErrors={
                combinedMarketsWithIndexerErrors
              }
              combinedHasAnyErrors={combinedHasAnyErrors}
              combinedMarketsWithOtherErrors={combinedMarketsWithOtherErrors}
              hasOraclePricingError={hasOraclePricingError}
              marketsWithOraclePricingError={marketsWithOraclePricingError}
              getMarketName={getMarketName}
            />
          </>
        )}

        {/* Only show market rows section if there are active/pending markets or ended markets with claimable tokens */}
        {hasActiveOrPendingMarkets && (
          <GenesisMarketsSections
            toolbarProps={{
              activeCampaignNames,
              genesisChainOptions,
              chainFilterSelected,
              setChainFilterSelected,
              setShowCompletedGenesis,
              showCompletedGenesis,
              metrics: [
                {
                  label: "TVL",
                  value: formatCompactUSD(activeGenesisTvlUsd),
                },
                {
                  label: "Your Deposits",
                  value: formatCompactUSD(activeGenesisYourDepositsUsd),
                },
              ],
            }}
          >
            {/* Market Rows - sorted with running markets first, then completed markets */}
            {/* Within each section, markets with deposits are sorted to the top */}
            <GenesisActiveMarketsSection
              showHeaders={showHeaders}
              genesisViewBasic={genesisViewBasic}
              displayedActiveMarkets={displayedActiveMarkets}
              genesisMarkets={genesisMarkets}
              reads={reads}
              totalDepositsReads={totalDepositsReads}
              isConnected={isConnected}
              address={address}
              expandedMarkets={expandedMarkets}
              setExpandedMarkets={setExpandedMarkets}
              claimingMarket={claimingMarket}
              claimMarket={claimMarket}
              openManageModal={handleOpenManageModal}
              now={now}
              marksResults={marksResults}
              isLoadingMarks={isLoadingMarks}
              maidenVoyageCampaignResults={maidenVoyageCampaignResults || []}
              isLoadingMaidenVoyageIndex={isLoadingMaidenVoyageIndex}
              wstETHAPR={wstETHAPR}
              fxSAVEAPR={fxSAVEAPR}
              isLoadingWstETHAPR={isLoadingWstETHAPR}
              isLoadingFxSAVEAPR={isLoadingFxSAVEAPR}
              mounted={mounted}
              safeTotalGenesisTVL={safeTotalGenesisTVL}
              safeIsLoadingTotalTVL={safeIsLoadingTotalTVL}
              safeTotalMaidenVoyageMarks={safeTotalMaidenVoyageMarks}
              fdv={fdv}
              tokenPricesByMarket={tokenPricesByMarket}
              collateralPricesMap={collateralPricesMap}
              coinGeckoPrices={coinGeckoPrices}
              coinGeckoLoading={coinGeckoLoading}
              chainlinkBtcPrice={chainlinkBtcPrice}
            />
          </GenesisMarketsSections>
        )}

        <GenesisComingNextMarketsSection
          markets={comingSoonMarkets as Array<[string, GenesisMarketConfig]>}
          wstETHAPR={wstETHAPR}
          fxSAVEAPR={fxSAVEAPR}
        />

        {displayedCompletedByCampaign.size > 0 && showCompletedGenesis && (
          <GenesisCompletedMarketsSection
            displayedCompletedByCampaign={displayedCompletedByCampaign}
            genesisMarkets={genesisMarkets}
            reads={reads}
            isConnected={isConnected}
            collateralPricesMap={collateralPricesMap}
            coinGeckoPrices={coinGeckoPrices}
            coinGeckoLoading={coinGeckoLoading}
            chainlinkBtcPrice={chainlinkBtcPrice}
            address={address}
            claimingMarket={claimingMarket}
            onClaim={claimMarket}
          />
        )}

        {archivedGenesisCount > 0 && (
          <GenesisArchivedMarketsSection
            showSection={showArchivedGenesis}
            onToggleShow={() => setShowArchivedGenesis((v) => !v)}
            displayedLiveMarkets={displayedArchivedLiveMarkets}
            displayedCompletedMarkets={displayedArchivedCompletedMarkets}
            genesisMarkets={genesisMarkets}
            reads={reads}
            isConnected={isConnected}
            collateralPricesMap={collateralPricesMap}
            coinGeckoPrices={coinGeckoPrices}
            coinGeckoLoading={coinGeckoLoading}
            chainlinkBtcPrice={chainlinkBtcPrice}
            address={address}
            claimingMarket={claimingMarket}
            onClaim={claimMarket}
            openManageModal={openManageModal}
          />
        )}
      </main>

      {manageModal && (
        <GenesisManageModal
          isOpen={!!manageModal}
          onClose={() => setManageModal(null)}
          marketId={manageModal.marketId}
          market={manageModal.market}
          initialTab={manageModal.initialTab}
          onSuccess={onGenesisManageSuccess}
        />
      )}

      <GenesisClaimProgressModal
        open={claimModal.open}
        status={claimModal.status}
        errorMessage={claimModal.errorMessage}
        marketName={shareModal.marketName}
        peggedSymbolNoPrefix={shareModal.peggedSymbol}
        onClose={() =>
          setClaimModal({ open: false, status: "pending", marketId: null })
        }
        onShare={
          shareModal.marketName && shareModal.peggedSymbol
            ? () =>
                openShareIntent(
                  shareModal.marketName || "Market",
                  shareModal.peggedSymbol || "token",
                )
            : undefined
        }
      />
    </div>
  );
}
