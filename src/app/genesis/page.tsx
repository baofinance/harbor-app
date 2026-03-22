"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  useAccount,
  useContractReads,
  useContractRead,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { formatEther } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { isMarketInMaintenance } from "../../config/markets";
import { MarketMaintenanceTag } from "@/components/MarketMaintenanceTag";
import { GenesisManageModal } from "@/components/GenesisManageModal";
import { CHAINLINK_FEEDS } from "@/config/chainlink";
import { GENESIS_ABI, ERC20_ABI, CHAINLINK_ORACLE_ABI } from "@/abis/shared";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import SimpleTooltip from "@/components/SimpleTooltip";
import Image from "next/image";
import {
  formatUSD,
  formatToken,
  formatTimeRemaining,
} from "@/utils/formatters";
import { getLogoPath, TokenLogo } from "@/components/shared";
import { useCoinGeckoPrices } from "@/hooks/useCoinGeckoPrice";
import { useMultipleTokenPrices } from "@/hooks/useTokenPrices";
import { useMultipleCollateralPrices } from "@/hooks/useCollateralPrice";
import { useWstETHAPR } from "@/hooks/useWstETHAPR";
import { useFxSAVEAPR } from "@/hooks/useFxSAVEAPR";
import { useTotalGenesisTVL } from "@/hooks/useTotalGenesisTVL";
import { useTotalMaidenVoyageMarks } from "@/hooks/useTotalMaidenVoyageMarks";
import { getAcceptedDepositAssets } from "@/utils/markets";
import { getDepositMode } from "@/utils/depositMode";
import { GenesisMarketExpandedView } from "@/components/GenesisMarketExpandedView";
import { FILTER_NONE_SENTINEL } from "@/components/FilterMultiselectDropdown";
import NetworkIconCell from "@/components/NetworkIconCell";
import { useSortedGenesisMarkets } from "@/hooks/useSortedGenesisMarkets";
import {
  GenesisCampaignStats,
  GenesisMarketsSections,
  GenesisPageHero,
} from "@/components/genesis";
import {
  calculateMarksForAPR,
  calculateMarksBreakdown,
  calculateTideAPRBreakdown,
} from "@/utils/tideAPR";
import { DEFAULT_FDV } from "@/utils/tokenAllocation";
import { formatGenesisMarketDisplayName } from "@/utils/genesisDisplay";
import { useGenesisPageData } from "@/hooks/useGenesisPageData";
import { computeGenesisRowUsdPricing } from "@/utils/genesisRowPricing";

export default function GenesisIndexPage() {
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const isAprRevealed =
    process.env.NEXT_PUBLIC_MAIDEN_VOYAGE_APR_REVEALED === "true" ||
    searchParams.get("apr") === "revealed";
  const [manageModal, setManageModal] = useState<{
    marketId: string;
    market: any;
    initialTab?: "deposit" | "withdraw";
  } | null>(null);
  const [now, setNow] = useState(new Date());
  const [expandedMarkets, setExpandedMarkets] = useState<string[]>([]);
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
  const [chainFilterSelected, setChainFilterSelected] = useState<string[]>([]);
  // Hide completed genesis sections by default; filter to show "Ongoing" only or "All" (ongoing + completed)
  const [showCompletedGenesis, setShowCompletedGenesis] = useState(false);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

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
    genesisMarkets,
    genesisChainOptions,
    comingSoonMarkets,
    genesisAddresses,
    marksResults,
    isLoadingMarks,
    refetchMarks,
    marksError,
    bonusStatusResults,
    isLoadingBonusStatus,
    combinedHasIndexerErrors,
    combinedMarketsWithIndexerErrors,
    combinedHasAnyErrors,
    combinedMarketsWithOtherErrors,
    hasOraclePricingError,
    marketsWithOraclePricingError,
    getMarketName,
  } = useGenesisPageData();

  const queryClient = useQueryClient();

  // Index layout per market: [isEnded, balanceOf?, claimable?]
  // Note: totalDeposits() doesn't exist in IGenesis interface
  // We'll get total deposits by checking the collateral token balance of the genesis contract
  // Use Anvil-specific hook to ensure reads go to Anvil network
  const genesisReadContracts = useMemo(() => {
    return genesisMarkets.flatMap(([_, mkt]) => {
      const g = (mkt as any).addresses?.genesis as `0x${string}` | undefined;
      const mktChainId = (mkt as any)?.chainId ?? 1;
      if (!g || typeof g !== "string" || !g.startsWith("0x") || g.length !== 42)
        return [];
      const base = [
        {
          address: g,
          abi: GENESIS_ABI,
          functionName: "genesisIsEnded" as const,
          chainId: mktChainId,
        },
      ];
      const user =
        isConnected && address
          ? [
              {
                address: g,
                abi: GENESIS_ABI,
                functionName: "balanceOf" as const,
                args: [address as `0x${string}`],
                chainId: mktChainId,
              },
              {
                address: g,
                abi: GENESIS_ABI,
                functionName: "claimable" as const,
                args: [address as `0x${string}`],
                chainId: mktChainId,
              },
            ]
          : [];
      return [...base, ...user];
    });
  }, [genesisMarkets, isConnected, address]);

  const { data: reads, refetch: refetchReads } = useContractReads({
    contracts: genesisReadContracts,
    enabled: genesisMarkets.length > 0,
    refetchInterval: 60000, // Refetch every 60 seconds - genesis doesn't end minute-to-minute
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
        (marks) =>
          marks.genesisAddress?.toLowerCase() ===
          (mkt as any).addresses?.genesis?.toLowerCase()
      );
      const userMarksData = marksForMarket?.data?.userHarborMarks;
      const marks = Array.isArray(userMarksData)
        ? userMarksData[0]
        : userMarksData;
      const subgraphSaysEnded = marks?.genesisEnded;

      const isEnded =
        contractSaysEnded !== undefined
          ? contractSaysEnded
          : subgraphSaysEnded ?? false;

      if (isEnded) {
        completedMarkets.push([id, mkt, marks]);
      }
    });

    // Group by campaign from config (not subgraph)
    const grouped = new Map<string, Array<[string, any, any]>>();
    completedMarkets.forEach(([id, mkt, marks]) => {
      // Use campaign from market config, fallback to subgraph, then "Other"
      const marketConfig = (mkt as any);
      const campaignLabel = marketConfig?.marksCampaign?.label || marks?.campaignLabel || "Other";
      if (!grouped.has(campaignLabel)) {
        grouped.set(campaignLabel, []);
      }
      grouped.get(campaignLabel)!.push([id, mkt, marks]);
    });

    return grouped;
  }, [genesisMarkets, reads, isConnected, marksResults]);

  // Fetch collateral token addresses from genesis contracts
  const collateralTokenContracts = useMemo(() => {
    return genesisMarkets
      .map(([_, mkt]) => {
        const g = (mkt as any).addresses?.genesis as `0x${string}` | undefined;
        const mktChainId = (mkt as any)?.chainId ?? 1;
        if (
          !g ||
          typeof g !== "string" ||
          !g.startsWith("0x") ||
          g.length !== 42
        )
          return null;
        return {
          address: g,
          abi: GENESIS_ABI,
          functionName: "WRAPPED_COLLATERAL_TOKEN" as const,
          chainId: mktChainId,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [genesisMarkets]);

  const { data: collateralTokenReads, refetch: refetchCollateralTokens } =
    useContractReads({
      contracts: collateralTokenContracts,
      enabled: genesisMarkets.length > 0,
    });

  const totalDepositsContracts = useMemo(() => {
    return genesisMarkets.flatMap(([_, mkt], mi) => {
      const g = (mkt as any).addresses?.genesis as `0x${string}` | undefined;
      const mktChainId = (mkt as any)?.chainId ?? 1;
      const wrappedCollateralAddress = collateralTokenReads?.[mi]?.result as
        | `0x${string}`
        | undefined;
      if (
        !g ||
        !wrappedCollateralAddress ||
        typeof g !== "string" ||
        !g.startsWith("0x") ||
        g.length !== 42 ||
        typeof wrappedCollateralAddress !== "string" ||
        !wrappedCollateralAddress.startsWith("0x") ||
        wrappedCollateralAddress.length !== 42
      )
        return [];
      return [
        {
          address: wrappedCollateralAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf" as const,
          args: [g],
          chainId: mktChainId,
        },
      ];
    });
  }, [genesisMarkets, collateralTokenReads]);

  const { data: totalDepositsReads, refetch: refetchTotalDeposits } =
    useContractReads({
      contracts: totalDepositsContracts,
      enabled:
        genesisMarkets.length > 0 &&
        collateralTokenReads &&
        collateralTokenReads.length > 0,
    });

  // Fetch token prices using the dedicated hook
  // This hook reads peggedTokenPrice() and leveragedTokenPrice() from minter contracts
  // and multiplies by peg target USD prices to get final USD prices
  const marketTokenPriceInputs = useMemo(() => {
    return genesisMarkets.map(([id, mkt]) => ({
      marketId: id,
      minterAddress: (mkt as any).addresses?.minter as `0x${string}`,
      pegTarget: (mkt as any).pegTarget || "USD",
    }));
  }, [genesisMarkets]);

  const tokenPricesByMarket = useMultipleTokenPrices(marketTokenPriceInputs);

  const buildShareMessage = (
    marketName: string,
    peggedSymbolNoPrefix: string
  ) => {
    return `The ${marketName} market is now live! Earn unbeatable yields on ${peggedSymbolNoPrefix} or get liquidation protected, funding free leverage on ${marketName} on @0xharborfi at harborfinance.io\n\nParticipate for your share of the $TIDE airdrop`;
  };

  const openShareIntent = (marketName: string, peggedSymbol: string) => {
    const msg = buildShareMessage(marketName, peggedSymbol);
    const encoded = encodeURIComponent(msg);
    const url = `https://x.com/intent/tweet?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const ClaimProgressModal = ({
    open,
    status,
    errorMessage,
    onClose,
    onShare,
    marketName,
    peggedSymbolNoPrefix,
  }: {
    open: boolean;
    status: "pending" | "success" | "error";
    errorMessage?: string;
    onClose: () => void;
    onShare?: () => void;
    marketName?: string;
    peggedSymbolNoPrefix?: string;
  }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={status === "pending" ? undefined : onClose}
        />
        <div className="relative bg-white shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 scale-in-95 duration-200  overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E4775]/10">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#1E4775]/60">
                Claim Progress
              </p>
              <h3 className="text-sm font-semibold text-[#1E4775]">
                {status === "pending"
                  ? "Processing claim"
                  : status === "success"
                  ? "Claim successful"
                  : "Claim failed"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-xs text-[#1E4775]/60 hover:text-[#1E4775]"
              disabled={status === "pending"}
            >
              Close
            </button>
          </div>

          <div className="p-4 space-y-4">
            {status === "pending" && (
              <div className="space-y-3">
                <p className="text-sm text-[#1E4775]/80">
                  Waiting for transaction confirmation...
                </p>
                <div className="w-full bg-[#1E4775]/10 h-2 rounded-full overflow-hidden">
                  <div className="h-2 bg-[#1E4775] animate-pulse w-1/2 rounded-full" />
                </div>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-4">
                <div className="p-4 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]  text-center">
                  <p className="text-sm text-[#1E4775]/80">
                    Tokens claimed{marketName ? ` for ${marketName}` : ""}.
                  </p>
                </div>

                <div className="space-y-2 bg-[#17395F]/5 border border-[#1E4775]/15  p-4">
                  <div className="text-base font-semibold text-[#1E4775]">
                    Boost your airdrop
                  </div>
                  <p className="text-sm text-[#1E4775]/80">
                    Share that {marketName || "this market"} is live and invite
                    others to earn unbeatable yields on {peggedSymbolNoPrefix}{" "}
                    or get liquidation-protected, funding-free leverage.
                  </p>
                  {onShare && (
                    <button
                      onClick={onShare}
                      className="w-full py-3 px-4 bg-black hover:bg-gray-800 text-white font-medium rounded-full transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-5 h-5 fill-current"
                        aria-hidden="true"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span>Share on X</span>
                    </button>
                  )}
                  <p className="text-xs text-[#1E4775]/60 mt-2">
                    Share your post in the{" "}
                    <span className="font-semibold">#boosters</span> channel on
                    Discord to be included in the community marketing airdrop.
                  </p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <div className="p-4 bg-red-50 border border-red-100 ">
                  <p className="text-sm text-red-700 font-semibold">
                    Claim failed
                  </p>
                  <p className="text-xs text-[#1E4775]/80 break-words mt-1">
                    {errorMessage || "Something went wrong. Please try again."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Fetch collateral price oracles using the dedicated hook
  // This hook properly handles the Harbor oracle format (tuple with wrapped rates)
  const collateralOracleAddresses = useMemo(() => {
    return genesisMarkets.map(
      ([_, mkt]) =>
        (mkt as any).addresses?.collateralPrice as `0x${string}` | undefined
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
      .map(([_, mkt]) => (mkt as any)?.coinGeckoId)
      .filter((id): id is string => !!id);
    // Add steth as fallback for wstETH markets
    const hasWstETH = genesisMarkets.some(
      ([_, mkt]) => (mkt as any)?.collateral?.symbol?.toLowerCase() === "wsteth"
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

  const { activeMarkets, showHeaders, activeCampaignName } =
    useSortedGenesisMarkets({
      genesisMarkets,
      reads,
      isConnected,
      marksResults,
    });

  const displayedActiveMarkets = useMemo(() => {
    if (chainFilterSelected.includes(FILTER_NONE_SENTINEL)) return [];
    if (chainFilterSelected.length === 0) return activeMarkets;
    return activeMarkets.filter(([, m]) => {
      const chainName = (m as any).chain?.name || "Ethereum";
      return chainFilterSelected.includes(chainName);
    });
  }, [activeMarkets, chainFilterSelected]);

  const displayedCompletedByCampaign = useMemo(() => {
    if (chainFilterSelected.includes(FILTER_NONE_SENTINEL)) return new Map<string, Array<[string, any, any]>>();
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

  return (
    <div className="flex min-h-0 flex-1 flex-col text-white max-w-[1300px] mx-auto font-sans relative w-full">
      <main className="container mx-auto px-4 sm:px-10 pb-6">
        <GenesisPageHero />

        {/* Divider */}
        <div className="border-t border-white/10 my-2"></div>

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
          combinedMarketsWithIndexerErrors={combinedMarketsWithIndexerErrors}
          combinedHasAnyErrors={combinedHasAnyErrors}
          combinedMarketsWithOtherErrors={combinedMarketsWithOtherErrors}
          hasOraclePricingError={hasOraclePricingError}
          marketsWithOraclePricingError={marketsWithOraclePricingError}
          getMarketName={getMarketName}
        />

        {/* Divider */}
        <div className="border-t border-white/10 mt-2 mb-1"></div>

        {/* Only show market rows section if there are active/pending markets or ended markets with claimable tokens */}
        {hasActiveOrPendingMarkets && (
          <GenesisMarketsSections
            toolbarProps={{
              activeCampaignName,
              displayedCompletedByCampaignSize: displayedCompletedByCampaign.size,
              genesisChainOptions,
              chainFilterSelected,
              setChainFilterSelected,
              setShowCompletedGenesis,
              showCompletedGenesis,
            }}
          >
            {/* Market Rows - sorted with running markets first, then completed markets */}
            {/* Within each section, markets with deposits are sorted to the top */}
            {(() => {
              // Table header bar: always show when showHeaders, even when "deselect all" (0 markets)
              const activeSectionHeader = showHeaders ? (
                <div
                  key="header-active"
                        className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto mb-0"
                      >
                  <div className="grid lg:grid-cols-[32px_1.5fr_80px_0.9fr_0.9fr_0.9fr_0.7fr_0.9fr] md:grid-cols-[32px_120px_80px_100px_1fr_1fr_90px_80px] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
                    <div className="min-w-0" aria-label="Network" />
                          <div className="min-w-0 text-center">Market</div>
                          <div className="text-center min-w-0">Marks</div>
                          <div className="text-center min-w-0 flex items-center justify-center gap-1.5">
                            <span>Deposit Assets</span>
                            <SimpleTooltip
                              label={
                                <div>
                                  <div className="font-semibold mb-1">
                                    Multi-Token Support
                                  </div>
                                  <div className="text-xs opacity-90 mb-2">
                                    Zapper-supported assets are zapped in with
                                    no slippage. Any other ERC20s are swapped
                                    with Velora.
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] opacity-75">
                                        wstETH markets:
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <Image
                                          src={getLogoPath("ETH")}
                                          alt="ETH"
                                          width={16}
                                          height={16}
                                          className="rounded-full"
                                        />
                                        <span className="text-[10px]">ETH</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Image
                                          src={getLogoPath("stETH")}
                                          alt="stETH"
                                          width={16}
                                          height={16}
                                          className="rounded-full"
                                        />
                                        <span className="text-[10px]">
                                          stETH
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] opacity-75">
                                        fxSAVE markets:
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <Image
                                          src={getLogoPath("USDC")}
                                          alt="USDC"
                                          width={16}
                                          height={16}
                                          className="rounded-full"
                                        />
                                        <span className="text-[10px]">
                                          USDC
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Image
                                          src={getLogoPath("fxUSD")}
                                          alt="fxUSD"
                                          width={16}
                                          height={16}
                                          className="rounded-full"
                                        />
                                        <span className="text-[10px]">
                                          fxUSD
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              }
                            >
                              <ArrowPathIcon className="w-3.5 h-3.5 text-[#1E4775] cursor-help" />
                            </SimpleTooltip>
                          </div>
                          <div className="text-center min-w-0">
                            Total
                            <span className="hidden lg:inline"> Deposits</span>
                          </div>
                          <div className="text-center min-w-0">
                            Your Deposit
                          </div>
                          <div className="text-center min-w-0">Status</div>
                          <div className="text-center min-w-0">Action</div>
                        </div>
                      </div>
                  ) : null;

              const marketRows = displayedActiveMarkets.map(([id, mkt], idx) => {
                const mi = genesisMarkets.findIndex((m) => m[0] === id);
                const depositModeRow = getDepositMode(mkt);
                const isCollateralOnlyRow = depositModeRow.collateralOnly;
                const isMegaEthRow = depositModeRow.isMegaEth;
                // Updated offset: [isEnded, balanceOf?, claimable?] - no totalDeposits anymore
                const baseOffset = mi * (isConnected ? 3 : 1);
                const contractReadResult = reads?.[baseOffset];
                const contractSaysEnded =
                  contractReadResult?.status === "success"
                    ? (contractReadResult.result as boolean)
                    : undefined;

                // Fallback to subgraph data if contract read fails
                const marksForMarket = marksResults?.find(
                  (marks) =>
                    marks.genesisAddress?.toLowerCase() ===
                    (mkt as any).addresses?.genesis?.toLowerCase()
                );
                // Extract genesisEnded from subgraph data (handle both array and single object responses)
                const userMarksData = marksForMarket?.data?.userHarborMarks;
                const marks = Array.isArray(userMarksData)
                  ? userMarksData[0]
                  : userMarksData;
                const subgraphSaysEnded = marks?.genesisEnded;

                // All markets in activeMarkets are active (not ended)
                const isEnded = false;

                // Check claimable tokens early to determine if market will be skipped
                const claimableResult = isConnected
                  ? (reads?.[baseOffset + 2]?.result as
                      | [bigint, bigint]
                      | undefined)
                  : undefined;
                const claimablePegged = claimableResult?.[0] || 0n;
                const claimableLeveraged = claimableResult?.[1] || 0n;
                const hasClaimable =
                  claimablePegged > 0n || claimableLeveraged > 0n;

                const userDeposit = isConnected
                  ? (reads?.[baseOffset + 1]?.result as bigint | undefined)
                  : undefined;

                // Get token symbols from market configuration
                const rowPeggedSymbol =
                  (mkt as any).peggedToken?.symbol || "ha";
                const rowLeveragedSymbol =
                  (mkt as any).leveragedToken?.symbol || "hs";
                const rawDisplayMarketName =
                  rowLeveragedSymbol &&
                  rowLeveragedSymbol.toLowerCase().startsWith("hs")
                    ? rowLeveragedSymbol.slice(2)
                    : rowLeveragedSymbol || (mkt as any).name || "Market";
                const displayMarketName = formatGenesisMarketDisplayName(rawDisplayMarketName);
                const showMaintenanceTag = isMarketInMaintenance(mkt);
                const peggedNoPrefix =
                  rowPeggedSymbol &&
                  rowPeggedSymbol.toLowerCase().startsWith("ha")
                    ? rowPeggedSymbol.slice(2)
                    : rowPeggedSymbol || "pegged token";

                // Get total deposits from the collateral token balance of the genesis contract
                const totalDeposits = totalDepositsReads?.[mi]?.result as
                  | bigint
                  | undefined;

                const genesisAddress = (mkt as any).addresses?.genesis;
                // Use on-chain collateral token address from genesis contract, fallback to config
                const onChainCollateralAddress = collateralTokenReads?.[mi]
                  ?.result as `0x${string}` | undefined;
                const collateralAddress =
                  onChainCollateralAddress ||
                  (mkt as any).addresses?.wrappedCollateralToken;
                const collateralSymbol =
                  (mkt as any).collateral?.symbol || "ETH"; // What's deposited (wrapped collateral)
                const underlyingSymbol =
                  (mkt as any).collateral?.underlyingSymbol || collateralSymbol; // The underlying/base token

                const endDate = (mkt as any).genesis?.endDate;

                // Get price data from the collateral prices hook
                const oracleAddress = (mkt as any).addresses
                  ?.collateralPrice as `0x${string}` | undefined;
                const collateralPriceData = oracleAddress
                  ? collateralPricesMap.get(oracleAddress.toLowerCase())
                  : undefined;

                const marketCoinGeckoId = (mkt as any)?.coinGeckoId as
                  | string
                  | undefined;

                const {
                  underlyingPriceUSD,
                  priceError,
                  collateralPriceUSD,
                } = computeGenesisRowUsdPricing({
                  underlyingSymbol,
                  pegTarget: (mkt as any)?.pegTarget,
                  marketCoinGeckoId,
                  coinGeckoPrices,
                  collateralPriceData,
                  chainlinkBtcPrice,
                  coinGeckoLoading,
                  collateralSymbol,
                });

                // Calculate USD values using wrapped token price
                // Note: totalDeposits is the balance of wrapped collateral token in the genesis contract
                const totalDepositsAmount = totalDeposits
                  ? Number(formatEther(totalDeposits))
                  : 0;
                const totalDepositsUSD =
                  totalDepositsAmount * collateralPriceUSD;

                // balanceOf returns wrapped collateral tokens (fxSAVE, wstETH) - confirmed from contract
                // In the Genesis contract, shares are stored in WRAPPED_COLLATERAL_TOKEN units
                // So balanceOf returns the amount in wrapped tokens, not underlying tokens
                // We just need to multiply by the wrapped token price to get USD value
                const userDepositAmount = userDeposit
                  ? Number(formatEther(userDeposit))
                  : 0;
                // userDepositAmount is already in wrapped tokens, so just multiply by wrapped token price
                const userDepositUSD = userDepositAmount * collateralPriceUSD;

                // Get anchor and sail token prices from the hook
                const tokenPrices = tokenPricesByMarket[id];
                const anchorTokenPriceUSD = tokenPrices?.peggedPriceUSD || 0;
                const sailTokenPriceUSD = tokenPrices?.leveragedPriceUSD || 0;

                // Calculate status
                // IMPORTANT: Contract's genesisIsEnded() takes precedence over time-based calculation
                // isEnded is already calculated above using contract read (with subgraph fallback)
                // claimablePegged, claimableLeveraged, and hasClaimable are already calculated above
                let statusText = "";

                // Check if time has expired but contract hasn't finalized genesis yet
                const timeHasExpired = endDate
                  ? new Date(endDate).getTime() <= now.getTime()
                  : false;
                const isProcessing = timeHasExpired && !isEnded;

                if (isEnded) {
                  statusText = showMaintenanceTag
                    ? "Maintenance"
                    : hasClaimable
                      ? "Claim available"
                      : "Ended";
                } else if (isProcessing) {
                  statusText = "Processing";
                } else {
                  // Show time remaining only if genesis is still active
                  if (endDate) {
                    statusText = formatTimeRemaining(endDate, now);
                  } else {
                    statusText = "Active";
                  }
                }

                const isExpanded = expandedMarkets.includes(id);
                const acceptedAssets = getAcceptedDepositAssets(mkt);

                // Show all markets (no skipping)
                return (
                  <React.Fragment key={id}>
                    <div
                      className={`py-2.5 px-2 overflow-x-auto overflow-y-visible transition cursor-pointer ${
                        isExpanded
                          ? "bg-[rgb(var(--surface-selected-rgb))]"
                          : "bg-white hover:bg-[rgb(var(--surface-selected-rgb))]"
                      }`}
                      onClick={() =>
                        setExpandedMarkets((prev) =>
                          prev.includes(id)
                            ? prev.filter((x) => x !== id)
                            : [...prev, id]
                        )
                      }
                    >
                      {/* Mobile Card Layout (< md) */}
                      <div className="md:hidden space-y-1.5">
                        <div className="flex items-center justify-between gap-2 pl-1">
                          <div className="flex items-center justify-start gap-1.5 flex-1 min-w-0 flex-wrap">
                            <span className="text-[#1E4775] font-medium text-sm">
                              {displayMarketName}
                            </span>
                            <div className="hidden md:flex items-center gap-0.5">
                              <span className="text-[#1E4775]/60">:</span>
                              <SimpleTooltip label={underlyingSymbol}>
                                <Image
                                  src={getLogoPath(underlyingSymbol)}
                                  alt={underlyingSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                              <span className="text-[#1E4775]/60 text-xs">
                                =
                              </span>
                              <SimpleTooltip label={rowPeggedSymbol}>
                                <Image
                                  src={getLogoPath(rowPeggedSymbol)}
                                  alt={rowPeggedSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                              <span className="text-[#1E4775]/60 text-xs">
                                +
                              </span>
                              <SimpleTooltip label={rowLeveragedSymbol}>
                                <Image
                                  src={getLogoPath(rowLeveragedSymbol)}
                                  alt={rowLeveragedSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                            </div>
                            {isExpanded ? (
                              <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0 ml-1" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0 ml-1" />
                            )}
                          </div>
                          {/* Combined APR for mobile - next to market title */}
                          {(() => {
                            const isWstETH =
                              collateralSymbol.toLowerCase() === "wsteth";
                            const isFxSAVE =
                              collateralSymbol.toLowerCase() === "fxsave";
                            const underlyingAPR = isWstETH
                              ? wstETHAPR
                              : isFxSAVE
                              ? fxSAVEAPR
                              : null;
                            const isLoadingAPR = isWstETH
                              ? isLoadingWstETHAPR
                              : isFxSAVE
                              ? isLoadingFxSAVEAPR
                              : false;

                            const isValidAPR =
                              underlyingAPR !== null &&
                              typeof underlyingAPR === "number" &&
                              !isNaN(underlyingAPR) &&
                              isFinite(underlyingAPR) &&
                              underlyingAPR >= 0;

                            // Get user marks for this market
                            const userMarksForMarket = marks
                              ? parseFloat(marks.currentMarks || "0")
                              : 0;

                            // Calculate genesis days - use market config endDate as primary source
                            const marketEndDate = endDate
                              ? new Date(endDate).getTime()
                              : 0;
                            const genesisStartDate = marks
                              ? parseInt(marks.genesisStartDate || "0")
                              : 0;
                            const genesisEndDateFromMarks = marks
                              ? parseInt(marks.genesisEndDate || "0")
                              : 0;
                            // Prefer market config endDate, fall back to marks data
                            const genesisEndDate =
                              marketEndDate > 0
                                ? marketEndDate
                                : genesisEndDateFromMarks;
                            const genesisDays =
                              genesisEndDate > genesisStartDate &&
                              genesisStartDate > 0
                                ? (genesisEndDate - genesisStartDate) /
                                  (1000 * 60 * 60 * 24)
                                : 7; // Default to 7 days if not available

                            // Calculate days left in genesis
                            const now = Date.now();
                            const daysLeftInGenesis =
                              genesisEndDate > now
                                ? (genesisEndDate - now) / (1000 * 60 * 60 * 24)
                                : genesisDays; // Fall back to full genesis period if end date not available

                            // Calculate values for APR - use $1 for estimation when no wallet connected or no deposit
                            // This shows "what would I earn if I deposit $1"
                            const currentDepositUSD = marks
                              ? parseFloat(marks.currentDepositUSD || "0")
                              : 0;
                            const hasUserDeposit =
                              userDepositUSD > 0 || currentDepositUSD > 0;
                            // Use $1 for APR estimation when user has no deposit
                            const depositForAPR = hasUserDeposit
                              ? userDepositUSD > 0
                                ? userDepositUSD
                                : currentDepositUSD
                              : 1; // Use $1 for estimation

                            // Get early bonus status for this market to check if cap is filled
                            const marketBonusData = bonusStatusResults?.find(
                              (status) =>
                                status.genesisAddress?.toLowerCase() ===
                                genesisAddress?.toLowerCase()
                            );
                            const marketBonusStatus = marketBonusData?.data;
                            const earlyBonusCapFilled = marketBonusStatus
                              ? Number(marketBonusStatus.cumulativeDeposits) >=
                                Number(marketBonusStatus.thresholdAmount)
                              : false;
                            const earlyBonusAvailable = !earlyBonusCapFilled;

                            // Calculate marks for APR calculation including estimated bonus marks
                            const earlyBonusEligibleDepositUSDFromMarks = marks
                              ? parseFloat(
                                  marks.earlyBonusEligibleDepositUSD || "0"
                                )
                              : 0;
                            const genesisEnded = marks
                              ? marks.genesisEnded
                              : false;
                            const qualifiesForEarlyBonusFromMarks = marks
                              ? marks.qualifiesForEarlyBonus || false
                              : false;

                            // If early bonus cap is not filled and user has a deposit, all deposits qualify for early bonus
                            // So earlyBonusEligibleDepositUSD should equal currentDepositUSD
                            const earlyBonusEligibleDepositUSD =
                              hasUserDeposit && earlyBonusAvailable
                                ? depositForAPR
                                : earlyBonusEligibleDepositUSDFromMarks;
                            const qualifiesForEarlyBonus =
                              hasUserDeposit && earlyBonusAvailable
                                ? true
                                : qualifiesForEarlyBonusFromMarks;

                            // For estimation, only include early bonus if cap is not filled
                            const estimatedEarlyBonusEligible =
                              earlyBonusAvailable ? 1 : 0;
                            const estimatedQualifiesForEarlyBonus =
                              earlyBonusAvailable;

                            // For APR estimation, use depositForAPR (either user's deposit or $1)
                            const marksForAPR = calculateMarksForAPR(
                              userMarksForMarket,
                              depositForAPR,
                              hasUserDeposit
                                ? earlyBonusEligibleDepositUSD
                                : estimatedEarlyBonusEligible,
                              genesisEnded,
                              hasUserDeposit
                                ? qualifiesForEarlyBonus
                                : estimatedQualifiesForEarlyBonus,
                              daysLeftInGenesis
                            );

                            // Calculate marks breakdown for APR breakdown
                            const marksBreakdown = calculateMarksBreakdown(
                              userMarksForMarket,
                              depositForAPR,
                              hasUserDeposit
                                ? earlyBonusEligibleDepositUSD
                                : estimatedEarlyBonusEligible,
                              genesisEnded,
                              hasUserDeposit
                                ? qualifiesForEarlyBonus
                                : estimatedQualifiesForEarlyBonus,
                              daysLeftInGenesis
                            );

                            // Use safe values (with mounted check) or fallback values if data not loaded yet
                            const tvlForAPR =
                              safeTotalGenesisTVL > 0
                                ? safeTotalGenesisTVL
                                : totalDepositsUSD > 0
                                ? totalDepositsUSD
                                : 1000000; // Default $1M

                            // Only use real total marks - don't estimate (estimation causes calculation errors)
                            const marksForAPRTotal = safeTotalMaidenVoyageMarks;

                            // Show combined APR if we have underlying APR and TVL
                            // Allow showing even if marks are 0 (will show 0% for $TIDE APR)
                            // This gives users visibility into the breakdown even before marks data loads
                            const canShowCombinedAPR =
                              mounted &&
                              isValidAPR &&
                              depositForAPR > 0 &&
                              tvlForAPR > 0 &&
                              !safeIsLoadingTotalTVL; // Wait for TVL, but marks can be 0

                            // Calculate APR breakdown - show if we have valid data for APR calculation
                            // Calculate breakdown whenever we have the data needed
                            const aprBreakdown =
                              canShowCombinedAPR &&
                              depositForAPR > 0 &&
                              tvlForAPR > 0 &&
                              genesisDays > 0 &&
                              marksForAPRTotal > 0
                                ? (() => {
                                    try {
                                      const breakdown =
                                        calculateTideAPRBreakdown(
                                          marksBreakdown,
                                          marksForAPRTotal,
                                          depositForAPR,
                                          tvlForAPR,
                                          daysLeftInGenesis,
                                          fdv
                                        );
                                      // Always return the breakdown if calculation succeeded, even if values are 0
                                      return breakdown;
                                    } catch {
                                      return undefined;
                                    }
                                  })()
                                : undefined;

                            // Display marks accumulated for this market (include accumulation since last update)
                            const lastUpdated = marks
                              ? parseInt(marks.lastUpdated || "0", 10)
                              : 0;
                            const daysElapsed =
                              lastUpdated > 0
                                ? (Date.now() / 1000 - lastUpdated) /
                                  (24 * 60 * 60)
                                : 0;
                            const displayMarks = genesisEnded
                              ? userMarksForMarket
                              : userMarksForMarket +
                                daysElapsed * currentDepositUSD * 10;

                            return (
                              <div className="flex-shrink-0 text-right mr-8">
                                <div className="text-[#1E4775]/70 text-[10px]">
                                  Marks
                                </div>
                                <span className="text-[#1E4775] font-semibold text-xs flex items-center justify-end gap-1">
                                  {isLoadingMarks ? (
                                    "..."
                                  ) : (
                                    <>
                                      {displayMarks >= 0
                                        ? displayMarks.toLocaleString(
                                            undefined,
                                            {
                                              maximumFractionDigits: 1,
                                              minimumFractionDigits: 0,
                                            }
                                          )
                                        : "-"}
                                      <Image
                                        src="/icons/marks.png"
                                        alt="Marks"
                                        width={16}
                                        height={16}
                                        className="inline-block"
                                      />
                                    </>
                                  )}
                                </span>
                              </div>
                            );
                          })()}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0"
                          >
                            {isEnded ? (
                              showMaintenanceTag ? (
                                <MarketMaintenanceTag />
                              ) : hasClaimable ? (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (
                                      genesisAddress &&
                                      address &&
                                      hasClaimable
                                    ) {
                                      try {
                                        setClaimingMarket(id);
                                        setClaimModal({
                                          open: true,
                                          status: "pending",
                                          marketId: id,
                                        });
                                        const tx = await writeContractAsync({
                                          address:
                                            genesisAddress as `0x${string}`,
                                          abi: GENESIS_ABI,
                                          functionName: "claim",
                                          args: [address as `0x${string}`],
                                        });
                                        await publicClient?.waitForTransactionReceipt(
                                          { hash: tx }
                                        );
                                        await refetchReads();
                                        await refetchTotalDeposits();
                                        queryClient.invalidateQueries({
                                          queryKey: ["allHarborMarks"],
                                        });
                                        setClaimModal((prev) => ({
                                          ...prev,
                                          status: "success",
                                        }));
                                        setShareModal({
                                          open: true,
                                          marketName: displayMarketName,
                                          peggedSymbol: peggedNoPrefix,
                                        });
                                      } catch (error) {
                                        setClaimModal({
                                          open: true,
                                          status: "error",
                                          marketId: id,
                                          errorMessage:
                                            (error as any)?.shortMessage ||
                                            (error as any)?.message ||
                                            "Claim failed",
                                        });
                                      } finally {
                                        setClaimingMarket(null);
                                      }
                                    }
                                  }}
                                  disabled={
                                    !genesisAddress ||
                                    !address ||
                                    !hasClaimable ||
                                    claimingMarket === id
                                  }
                                  className="px-3 py-1.5 text-[10px] font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full whitespace-nowrap"
                                >
                                  {claimingMarket === id
                                    ? "Claiming..."
                                    : "Claim"}
                                </button>
                              ) : null
                            ) : showMaintenanceTag ? (
                              <MarketMaintenanceTag />
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setManageModal({
                                    marketId: id,
                                    market: mkt,
                                    initialTab: "deposit",
                                  });
                                }}
                                className="px-3 py-1.5 text-[10px] font-medium bg-[#1E4775] text-white hover:bg-[#17395F] transition-colors rounded-full whitespace-nowrap"
                              >
                                Manage
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isEnded && (
                            <div className="hidden md:block">
                              <div className="text-[#1E4775]/70 text-[10px]">
                                Deposit Assets
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Image
                                  src={getLogoPath(collateralSymbol)}
                                  alt={collateralSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 rounded-full"
                                />
                                <div className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap ${isCollateralOnlyRow ? "bg-[#1E4775]/10 text-[#1E4775]" : "bg-blue-100 text-blue-700"}`}>
                                  {!isCollateralOnlyRow && <ArrowPathIcon className="w-2.5 h-2.5" />}
                                  <span>{isCollateralOnlyRow ? "Collateral" : "Any Token"}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="flex-1 flex items-center justify-between text-xs">
                            {isEnded ? (
                              <>
                                <div>
                                  <div className="text-[#1E4775]/70">
                                    Anchor
                                  </div>
                                  <SimpleTooltip
                                    label={
                                      claimablePegged > 0n &&
                                      anchorTokenPriceUSD > 0
                                        ? formatUSD(
                                            Number(
                                              formatEther(claimablePegged)
                                            ) * anchorTokenPriceUSD
                                          )
                                        : claimablePegged > 0n
                                        ? `${formatToken(claimablePegged)} ${
                                            rowPeggedSymbol || "tokens"
                                          }`
                                        : ""
                                    }
                                  >
                                    <div className="text-[#1E4775] font-semibold cursor-help">
                                      {claimablePegged > 0n
                                        ? formatToken(claimablePegged)
                                        : "-"}
                                    </div>
                                  </SimpleTooltip>
                                </div>
                                <div>
                                  <div className="text-[#1E4775]/70">Sail</div>
                                  <SimpleTooltip
                                    label={
                                      claimableLeveraged > 0n &&
                                      sailTokenPriceUSD > 0
                                        ? formatUSD(
                                            Number(
                                              formatEther(claimableLeveraged)
                                            ) * sailTokenPriceUSD
                                          )
                                        : claimableLeveraged > 0n
                                        ? `${formatToken(claimableLeveraged)} ${
                                            rowLeveragedSymbol || "tokens"
                                          }`
                                        : ""
                                    }
                                  >
                                    <div className="text-[#1E4775] font-semibold cursor-help">
                                      {claimableLeveraged > 0n
                                        ? formatToken(claimableLeveraged)
                                        : "-"}
                                    </div>
                                  </SimpleTooltip>
                                </div>
                                <div>
                                  <div className="text-[#1E4775]/70 flex items-center justify-center gap-1">
                                    <Image
                                      src={getLogoPath(collateralSymbol)}
                                      alt={collateralSymbol}
                                      width={14}
                                      height={14}
                                      className="flex-shrink-0 rounded-full"
                                    />
                                    <span>Your Deposit</span>
                                  </div>
                                  <div className="text-[#1E4775] font-semibold">
                                    {userDeposit && userDeposit > 0n
                                      ? collateralPriceUSD > 0
                                        ? formatUSD(userDepositUSD)
                                        : `${formatToken(
                                            userDeposit
                                          )} ${collateralSymbol}`
                                      : "$0"}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <div className="text-[#1E4775]/70">Total</div>
                                  <div className="text-[#1E4775] font-semibold">
                                    {totalDeposits && totalDeposits > 0n
                                      ? collateralPriceUSD > 0
                                        ? formatUSD(totalDepositsUSD)
                                        : `${formatToken(
                                            totalDeposits
                                          )} ${collateralSymbol}`
                                      : "$0"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[#1E4775]/70 flex items-center justify-center gap-1">
                                    <Image
                                      src={getLogoPath(collateralSymbol)}
                                      alt={collateralSymbol}
                                      width={14}
                                      height={14}
                                      className="flex-shrink-0 rounded-full"
                                    />
                                    <span>Your Deposit</span>
                                  </div>
                                  <div className="text-[#1E4775] font-semibold">
                                    {userDeposit && userDeposit > 0n
                                      ? collateralPriceUSD > 0
                                        ? formatUSD(userDepositUSD)
                                        : `${formatToken(
                                            userDeposit
                                          )} ${collateralSymbol}`
                                      : "$0"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[#1E4775]/70">
                                    Status
                                  </div>
                                  <div>
                                    {isProcessing ? (
                                      <span className="text-[10px] uppercase px-2 py-1 bg-yellow-100 text-yellow-800 whitespace-nowrap">
                                        {statusText}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] uppercase px-2 py-1 bg-[#1E4775]/10 text-[#1E4775] whitespace-nowrap">
                                        {statusText}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Medium Screen Layout (md to lg) */}
                      <div
                        className={`hidden md:grid lg:hidden items-center gap-4 text-xs ${
                          isEnded
                            ? "grid-cols-[32px_120px_60px_60px_1fr_80px]"
                            : "grid-cols-[32px_120px_80px_100px_1fr_1fr_90px_80px]"
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          <NetworkIconCell
                            chainName={(mkt as any).chain?.name || "Ethereum"}
                            chainLogo={(mkt as any).chain?.logo || "icons/eth.png"}
                            size={18}
                          />
                        </div>
                        {/* Market Title */}
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span className="text-[#1E4775] font-medium text-sm">
                            {displayMarketName}
                          </span>
                          {isExpanded ? (
                            <ChevronUpIcon className="w-4 h-4 text-[#1E4775] flex-shrink-0" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4 text-[#1E4775] flex-shrink-0" />
                          )}
                        </div>

                        {/* Combined APR Column - Only show for active markets */}
                        {!isEnded
                          ? (() => {
                              const isWstETH =
                                collateralSymbol.toLowerCase() === "wsteth";
                              const isFxSAVE =
                                collateralSymbol.toLowerCase() === "fxsave";
                              const underlyingAPR = isWstETH
                                ? wstETHAPR
                                : isFxSAVE
                                ? fxSAVEAPR
                                : null;
                              const isLoadingAPR = isWstETH
                                ? isLoadingWstETHAPR
                                : isFxSAVE
                                ? isLoadingFxSAVEAPR
                                : false;

                              const isValidAPR =
                                underlyingAPR !== null &&
                                typeof underlyingAPR === "number" &&
                                !isNaN(underlyingAPR) &&
                                isFinite(underlyingAPR) &&
                                underlyingAPR >= 0;

                              // Get user marks for this market
                              const userMarksForMarket = marks
                                ? parseFloat(marks.currentMarks || "0")
                                : 0;

                              // Calculate genesis days - use market config endDate as primary source
                              const marketEndDateMd = endDate
                                ? new Date(endDate).getTime()
                                : 0;
                              const genesisStartDate = marks
                                ? parseInt(marks.genesisStartDate || "0")
                                : 0;
                              const genesisEndDateFromMarks = marks
                                ? parseInt(marks.genesisEndDate || "0")
                                : 0;
                              // Prefer market config endDate, fall back to marks data
                              const genesisEndDate =
                                marketEndDateMd > 0
                                  ? marketEndDateMd
                                  : genesisEndDateFromMarks;
                              const genesisDays =
                                genesisEndDate > genesisStartDate &&
                                genesisStartDate > 0
                                  ? (genesisEndDate - genesisStartDate) /
                                    (1000 * 60 * 60 * 24)
                                  : 7; // Default to 7 days if not available

                              // Calculate days left in genesis
                              const nowMd = Date.now();
                              const daysLeftInGenesisMd =
                                genesisEndDate > nowMd
                                  ? (genesisEndDate - nowMd) /
                                    (1000 * 60 * 60 * 24)
                                  : genesisDays; // Fall back to full genesis period if end date not available

                              // Calculate values for APR - use $1 for estimation when no wallet connected or no deposit
                              const currentDepositUSD = marks
                                ? parseFloat(marks.currentDepositUSD || "0")
                                : 0;
                              const hasUserDeposit =
                                userDepositUSD > 0 || currentDepositUSD > 0;
                              const depositForAPR = hasUserDeposit
                                ? userDepositUSD > 0
                                  ? userDepositUSD
                                  : currentDepositUSD
                                : 1; // Use $1 for estimation

                              // Get early bonus status for this market to check if cap is filled
                              const marketBonusDataMd =
                                bonusStatusResults?.find(
                                  (status) =>
                                    status.genesisAddress?.toLowerCase() ===
                                    genesisAddress?.toLowerCase()
                                );
                              const marketBonusStatusMd =
                                marketBonusDataMd?.data;
                              const earlyBonusCapFilledMd = marketBonusStatusMd
                                ? Number(
                                    marketBonusStatusMd.cumulativeDeposits
                                  ) >=
                                  Number(marketBonusStatusMd.thresholdAmount)
                                : false;
                              const earlyBonusAvailableMd =
                                !earlyBonusCapFilledMd;

                              // Calculate marks for APR calculation including estimated bonus marks
                              const earlyBonusEligibleDepositUSDFromMarksMd =
                                marks
                                  ? parseFloat(
                                      marks.earlyBonusEligibleDepositUSD || "0"
                                    )
                                  : 0;
                              const genesisEnded = marks
                                ? marks.genesisEnded
                                : false;
                              const qualifiesForEarlyBonusFromMarksMd = marks
                                ? marks.qualifiesForEarlyBonus || false
                                : false;

                              // If early bonus cap is not filled and user has a deposit, all deposits qualify for early bonus
                              // So earlyBonusEligibleDepositUSD should equal currentDepositUSD
                              const earlyBonusEligibleDepositUSD =
                                hasUserDeposit && earlyBonusAvailableMd
                                  ? depositForAPR
                                  : earlyBonusEligibleDepositUSDFromMarksMd;
                              const qualifiesForEarlyBonus =
                                hasUserDeposit && earlyBonusAvailableMd
                                  ? true
                                  : qualifiesForEarlyBonusFromMarksMd;

                              // For estimation, only include early bonus if cap is not filled
                              const estimatedEarlyBonusEligibleMd =
                                earlyBonusAvailableMd ? 1 : 0;
                              const estimatedQualifiesForEarlyBonusMd =
                                earlyBonusAvailableMd;

                              const marksForAPR = calculateMarksForAPR(
                                userMarksForMarket,
                                depositForAPR,
                                hasUserDeposit
                                  ? earlyBonusEligibleDepositUSD
                                  : estimatedEarlyBonusEligibleMd,
                                genesisEnded,
                                hasUserDeposit
                                  ? qualifiesForEarlyBonus
                                  : estimatedQualifiesForEarlyBonusMd,
                                daysLeftInGenesisMd
                              );

                              const tvlForAPR =
                                safeTotalGenesisTVL > 0
                                  ? safeTotalGenesisTVL
                                  : totalDepositsUSD > 0
                                  ? totalDepositsUSD
                                  : 1000000;
                              const marksForAPRTotal =
                                safeTotalMaidenVoyageMarks;

                              // Show combined APR if we have underlying APR and TVL
                              // Allow showing even if marks are 0 (will show 0% for $TIDE APR)
                              const canShowCombinedAPR =
                                mounted &&
                                isValidAPR &&
                                depositForAPR > 0 &&
                                tvlForAPR > 0 &&
                                !safeIsLoadingTotalTVL;

                              // Calculate marks breakdown for APR breakdown (md view)
                              const marksBreakdownMd = calculateMarksBreakdown(
                                userMarksForMarket,
                                depositForAPR,
                                hasUserDeposit
                                  ? earlyBonusEligibleDepositUSD
                                  : estimatedEarlyBonusEligibleMd,
                                genesisEnded,
                                hasUserDeposit
                                  ? qualifiesForEarlyBonus
                                  : estimatedQualifiesForEarlyBonusMd,
                                daysLeftInGenesisMd
                              );

                              // Calculate APR breakdown (md view)
                              const aprBreakdownMd =
                                canShowCombinedAPR &&
                                depositForAPR > 0 &&
                                tvlForAPR > 0 &&
                                genesisDays > 0 &&
                                marksForAPRTotal > 0
                                  ? (() => {
                                      try {
                                        return calculateTideAPRBreakdown(
                                          marksBreakdownMd,
                                          marksForAPRTotal,
                                          depositForAPR,
                                          tvlForAPR,
                                          daysLeftInGenesisMd,
                                          fdv
                                        );
                                      } catch (error) {
                                        return undefined;
                                      }
                                    })()
                                  : undefined;

                              // Display marks accumulated for this market
                              const lastUpdatedMd = marks
                                ? parseInt(marks.lastUpdated || "0", 10)
                                : 0;
                              const daysElapsedMd =
                                lastUpdatedMd > 0
                                  ? (Date.now() / 1000 - lastUpdatedMd) /
                                    (24 * 60 * 60)
                                  : 0;
                              const displayMarksMd = genesisEnded
                                ? userMarksForMarket
                                : userMarksForMarket +
                                  daysElapsedMd * currentDepositUSD * 10;

                              return (
                                <div className="text-center">
                                  <span className="text-[#1E4775] font-semibold text-xs flex items-center justify-center gap-1">
                                    {isLoadingMarks ? (
                                      "..."
                                    ) : (
                                      <>
                                        {displayMarksMd >= 0
                                          ? displayMarksMd.toLocaleString(
                                              undefined,
                                              {
                                                maximumFractionDigits: 1,
                                                minimumFractionDigits: 0,
                                              }
                                            )
                                          : "-"}
                                        <Image
                                          src="/icons/marks.png"
                                          alt="Marks"
                                          width={16}
                                          height={16}
                                          className="inline-block"
                                        />
                                      </>
                                    )}
                                  </span>
                                </div>
                              );
                            })()
                          : null}

                        {/* Deposit Assets (if not ended) */}
                        {!isEnded && (
                          <div className="flex items-center justify-center gap-1.5">
                            <Image
                              src={getLogoPath(collateralSymbol)}
                              alt={collateralSymbol}
                              width={20}
                              height={20}
                              className="flex-shrink-0 rounded-full"
                            />
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap ${isCollateralOnlyRow ? "bg-[#1E4775]/10 text-[#1E4775]" : "bg-blue-100 text-blue-700"}`}>
                              {!isCollateralOnlyRow && <ArrowPathIcon className="w-2.5 h-2.5" />}
                              <span>{isCollateralOnlyRow ? "Collateral" : "Any Token"}</span>
                            </div>
                          </div>
                        )}

                        {/* Stats Columns */}
                        {isEnded ? (
                          <>
                            {/* Anchor Tokens Column */}
                            <div className="text-center">
                              {claimablePegged > 0n ? (
                                <SimpleTooltip
                                  label={
                                    anchorTokenPriceUSD > 0
                                      ? formatUSD(
                                          Number(formatEther(claimablePegged)) *
                                            anchorTokenPriceUSD
                                        )
                                      : `${formatToken(claimablePegged)} ${
                                          rowPeggedSymbol || "tokens"
                                        }`
                                  }
                                >
                                  <div className="flex items-center justify-center gap-1 cursor-help">
                                    <span className="font-mono text-[#1E4775] font-semibold text-xs">
                                      {formatToken(claimablePegged)}
                                    </span>
                                    <Image
                                      src={getLogoPath(
                                        rowPeggedSymbol ||
                                          (mkt as any).peggedToken?.symbol ||
                                          "haPB"
                                      )}
                                      alt={
                                        rowPeggedSymbol ||
                                        (mkt as any).peggedToken?.symbol ||
                                        "haPB"
                                      }
                                      width={20}
                                      height={20}
                                      className="flex-shrink-0"
                                    />
                                  </div>
                                </SimpleTooltip>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[#1E4775] font-semibold text-xs">
                                    {rowPeggedSymbol ||
                                      (mkt as any).peggedToken?.symbol ||
                                      "haTOKEN"}
                                  </span>
                                  <Image
                                    src={getLogoPath(
                                      rowPeggedSymbol ||
                                        (mkt as any).peggedToken?.symbol ||
                                        "haPB"
                                    )}
                                    alt={
                                      rowPeggedSymbol ||
                                      (mkt as any).peggedToken?.symbol ||
                                      "haPB"
                                    }
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0"
                                  />
                                </div>
                              )}
                            </div>
                            {/* Sail Tokens Column */}
                            <div className="text-center">
                              {claimableLeveraged > 0n ? (
                                <SimpleTooltip
                                  label={
                                    sailTokenPriceUSD > 0
                                      ? formatUSD(
                                          Number(
                                            formatEther(claimableLeveraged)
                                          ) * sailTokenPriceUSD
                                        )
                                      : `${formatToken(claimableLeveraged)} ${
                                          rowLeveragedSymbol || "tokens"
                                        }`
                                  }
                                >
                                  <div className="flex items-center justify-center gap-1 cursor-help">
                                    <span className="font-mono text-[#1E4775] font-semibold text-xs">
                                      {formatToken(claimableLeveraged)}
                                    </span>
                                    <Image
                                      src={getLogoPath(
                                        rowLeveragedSymbol ||
                                          (mkt as any).leveragedToken?.symbol ||
                                          "hsPB"
                                      )}
                                      alt={
                                        rowLeveragedSymbol ||
                                        (mkt as any).leveragedToken?.symbol ||
                                        "hsPB"
                                      }
                                      width={20}
                                      height={20}
                                      className="flex-shrink-0"
                                    />
                                  </div>
                                </SimpleTooltip>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[#1E4775] font-semibold text-xs">
                                    {rowLeveragedSymbol ||
                                      (mkt as any).leveragedToken?.symbol ||
                                      "hsTOKEN"}
                                  </span>
                                  <Image
                                    src={getLogoPath(
                                      rowLeveragedSymbol ||
                                        (mkt as any).leveragedToken?.symbol ||
                                        "hsPB"
                                    )}
                                    alt={
                                      rowLeveragedSymbol ||
                                      (mkt as any).leveragedToken?.symbol ||
                                      "hsPB"
                                    }
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <div className="text-[#1E4775] font-semibold">
                                {userDeposit && userDeposit > 0n
                                  ? collateralPriceUSD > 0
                                    ? formatUSD(userDepositUSD)
                                    : `${formatToken(
                                        userDeposit
                                      )} ${collateralSymbol}`
                                  : "$0"}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-center">
                              <div className="text-[#1E4775] font-semibold">
                                {totalDeposits && totalDeposits > 0n
                                  ? collateralPriceUSD > 0
                                    ? formatUSD(totalDepositsUSD)
                                    : `${formatToken(
                                        totalDeposits
                                      )} ${collateralSymbol}`
                                  : "$0"}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-[#1E4775] font-semibold">
                                {userDeposit && userDeposit > 0n
                                  ? collateralPriceUSD > 0
                                    ? formatUSD(userDepositUSD)
                                    : `${formatToken(
                                        userDeposit
                                      )} ${collateralSymbol}`
                                  : "$0"}
                              </div>
                            </div>
                            <div className="text-center">
                              <div>
                                {isProcessing ? (
                                  <span className="text-[10px] uppercase px-2 py-1 bg-yellow-100 text-yellow-800 whitespace-nowrap">
                                    {statusText}
                                  </span>
                                ) : (
                                  <span className="text-[10px] uppercase px-2 py-1 bg-[#1E4775]/10 text-[#1E4775] whitespace-nowrap">
                                    {statusText}
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Action Button */}
                        <div className="text-center">
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0"
                          >
                            {isEnded ? (
                              showMaintenanceTag ? (
                                <MarketMaintenanceTag />
                              ) : hasClaimable ? (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (
                                      genesisAddress &&
                                      address &&
                                      hasClaimable
                                    ) {
                                      try {
                                        setClaimingMarket(id);
                                        setClaimModal({
                                          open: true,
                                          status: "pending",
                                          marketId: id,
                                        });
                                        const tx = await writeContractAsync({
                                          address:
                                            genesisAddress as `0x${string}`,
                                          abi: GENESIS_ABI,
                                          functionName: "claim",
                                          args: [address as `0x${string}`],
                                        });
                                        await publicClient?.waitForTransactionReceipt(
                                          { hash: tx }
                                        );
                                        await refetchReads();
                                        await refetchTotalDeposits();
                                        queryClient.invalidateQueries({
                                          queryKey: ["allHarborMarks"],
                                        });
                                        setClaimModal((prev) => ({
                                          ...prev,
                                          status: "success",
                                        }));
                                        setShareModal({
                                          open: true,
                                          marketName: displayMarketName,
                                          peggedSymbol: peggedNoPrefix,
                                        });
                                      } catch (error) {
                                        setClaimModal({
                                          open: true,
                                          status: "error",
                                          marketId: id,
                                          errorMessage:
                                            (error as any)?.shortMessage ||
                                            (error as any)?.message ||
                                            "Claim failed",
                                        });
                                      } finally {
                                        setClaimingMarket(null);
                                      }
                                    }
                                  }}
                                  disabled={
                                    !genesisAddress ||
                                    !address ||
                                    !hasClaimable ||
                                    claimingMarket === id
                                  }
                                  className="px-3 py-1.5 text-[10px] font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full whitespace-nowrap"
                                >
                                  {claimingMarket === id
                                    ? "Claiming..."
                                    : "Claim"}
                                </button>
                              ) : null
                            ) : showMaintenanceTag ? (
                              <MarketMaintenanceTag />
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setManageModal({
                                    marketId: id,
                                    market: mkt,
                                    initialTab: "deposit",
                                  });
                                }}
                                className="px-3 py-1.5 text-[10px] font-medium bg-[#1E4775] text-white hover:bg-[#17395F] transition-colors rounded-full whitespace-nowrap"
                              >
                                Manage
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Desktop Table Layout */}
                      <div
                        className={`hidden lg:grid gap-4 items-center text-sm ${
                          isEnded
                            ? "grid-cols-[32px_1.5fr_1fr_1fr_1.5fr_1fr]"
                            : "grid-cols-[32px_1.5fr_80px_0.9fr_0.9fr_0.9fr_0.7fr_0.9fr]"
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          <NetworkIconCell
                            chainName={(mkt as any).chain?.name || "Ethereum"}
                            chainLogo={(mkt as any).chain?.logo || "icons/eth.png"}
                            size={20}
                          />
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="text-[#1E4775] font-medium text-sm lg:text-base">
                              {displayMarketName}
                            </span>
                            <span className="text-[#1E4775]/60 hidden xl:inline">
                              :
                            </span>
                            <div className="flex items-center gap-0.5 hidden xl:flex">
                              <SimpleTooltip label={underlyingSymbol}>
                                <Image
                                  src={getLogoPath(underlyingSymbol)}
                                  alt={underlyingSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                              <span className="text-[#1E4775]/60 text-xs">
                                =
                              </span>
                              <SimpleTooltip label={rowPeggedSymbol}>
                                <Image
                                  src={getLogoPath(rowPeggedSymbol)}
                                  alt={rowPeggedSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                              <span className="text-[#1E4775]/60 text-xs">
                                +
                              </span>
                              <SimpleTooltip label={rowLeveragedSymbol}>
                                <Image
                                  src={getLogoPath(rowLeveragedSymbol)}
                                  alt={rowLeveragedSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                            </div>
                            {isExpanded ? (
                              <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0 ml-1" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0 ml-1" />
                            )}
                          </div>
                        </div>
                        {/* Combined APR Column - Only show for active markets */}
                        {!isEnded
                          ? (() => {
                              const isWstETH =
                                collateralSymbol.toLowerCase() === "wsteth";
                              const isFxSAVE =
                                collateralSymbol.toLowerCase() === "fxsave";
                              const underlyingAPR = isWstETH
                                ? wstETHAPR
                                : isFxSAVE
                                ? fxSAVEAPR
                                : null;
                              const isLoadingAPR = isWstETH
                                ? isLoadingWstETHAPR
                                : isFxSAVE
                                ? isLoadingFxSAVEAPR
                                : false;

                              const isValidAPR =
                                underlyingAPR !== null &&
                                typeof underlyingAPR === "number" &&
                                !isNaN(underlyingAPR) &&
                                isFinite(underlyingAPR) &&
                                underlyingAPR >= 0;

                              // Get user marks for this market
                              const userMarksForMarket = marks
                                ? parseFloat(marks.currentMarks || "0")
                                : 0;

                              // Calculate genesis days - use market config endDate as primary source
                              const marketEndDateLg = endDate
                                ? new Date(endDate).getTime()
                                : 0;
                              const genesisStartDate = marks
                                ? parseInt(marks.genesisStartDate || "0")
                                : 0;
                              const genesisEndDateFromMarks = marks
                                ? parseInt(marks.genesisEndDate || "0")
                                : 0;
                              // Prefer market config endDate, fall back to marks data
                              const genesisEndDate =
                                marketEndDateLg > 0
                                  ? marketEndDateLg
                                  : genesisEndDateFromMarks;
                              const genesisDays =
                                genesisEndDate > genesisStartDate &&
                                genesisStartDate > 0
                                  ? (genesisEndDate - genesisStartDate) /
                                    (1000 * 60 * 60 * 24)
                                  : 7; // Default to 7 days if not available

                              // Calculate days left in genesis
                              const nowLg = Date.now();
                              const daysLeftInGenesisLg =
                                genesisEndDate > nowLg
                                  ? (genesisEndDate - nowLg) /
                                    (1000 * 60 * 60 * 24)
                                  : genesisDays; // Fall back to full genesis period if end date not available

                              // Calculate values for APR - use $1 for estimation when no wallet connected or no deposit
                              const currentDepositUSD = marks
                                ? parseFloat(marks.currentDepositUSD || "0")
                                : 0;
                              const hasUserDeposit =
                                userDepositUSD > 0 || currentDepositUSD > 0;
                              const depositForAPR = hasUserDeposit
                                ? userDepositUSD > 0
                                  ? userDepositUSD
                                  : currentDepositUSD
                                : 1; // Use $1 for estimation

                              // Get early bonus status for this market to check if cap is filled
                              const marketBonusDataLg =
                                bonusStatusResults?.find(
                                  (status) =>
                                    status.genesisAddress?.toLowerCase() ===
                                    genesisAddress?.toLowerCase()
                                );
                              const marketBonusStatusLg =
                                marketBonusDataLg?.data;
                              const earlyBonusCapFilledLg = marketBonusStatusLg
                                ? Number(
                                    marketBonusStatusLg.cumulativeDeposits
                                  ) >=
                                  Number(marketBonusStatusLg.thresholdAmount)
                                : false;
                              const earlyBonusAvailableLg =
                                !earlyBonusCapFilledLg;

                              // Calculate marks for APR calculation including estimated bonus marks
                              const earlyBonusEligibleDepositUSD = marks
                                ? parseFloat(
                                    marks.earlyBonusEligibleDepositUSD || "0"
                                  )
                                : 0;
                              const genesisEnded = marks
                                ? marks.genesisEnded
                                : false;
                              const qualifiesForEarlyBonus = marks
                                ? marks.qualifiesForEarlyBonus || false
                                : false;

                              // For estimation, only include early bonus if cap is not filled
                              const estimatedEarlyBonusEligibleLg =
                                earlyBonusAvailableLg ? 1 : 0;
                              const estimatedQualifiesForEarlyBonusLg =
                                earlyBonusAvailableLg;

                              const marksForAPR = calculateMarksForAPR(
                                userMarksForMarket,
                                depositForAPR,
                                hasUserDeposit
                                  ? earlyBonusEligibleDepositUSD
                                  : estimatedEarlyBonusEligibleLg,
                                genesisEnded,
                                hasUserDeposit
                                  ? qualifiesForEarlyBonus
                                  : estimatedQualifiesForEarlyBonusLg,
                                daysLeftInGenesisLg
                              );

                              const tvlForAPR =
                                safeTotalGenesisTVL > 0
                                  ? safeTotalGenesisTVL
                                  : totalDepositsUSD > 0
                                  ? totalDepositsUSD
                                  : 1000000;
                              const marksForAPRTotal =
                                safeTotalMaidenVoyageMarks;

                              // Show combined APR if we have underlying APR and TVL
                              // Allow showing even if marks are 0 (will show 0% for $TIDE APR)
                              const canShowCombinedAPR =
                                mounted &&
                                isValidAPR &&
                                depositForAPR > 0 &&
                                tvlForAPR > 0 &&
                                !safeIsLoadingTotalTVL;

                              // Calculate marks breakdown for APR breakdown (lg view)
                              const marksBreakdownLg = calculateMarksBreakdown(
                                userMarksForMarket,
                                depositForAPR,
                                hasUserDeposit
                                  ? earlyBonusEligibleDepositUSD
                                  : estimatedEarlyBonusEligibleLg,
                                genesisEnded,
                                hasUserDeposit
                                  ? qualifiesForEarlyBonus
                                  : estimatedQualifiesForEarlyBonusLg,
                                daysLeftInGenesisLg
                              );

                              // Calculate APR breakdown (lg view)
                              const aprBreakdownLg =
                                canShowCombinedAPR &&
                                depositForAPR > 0 &&
                                tvlForAPR > 0 &&
                                genesisDays > 0 &&
                                marksForAPRTotal > 0
                                  ? (() => {
                                      try {
                                        return calculateTideAPRBreakdown(
                                          marksBreakdownLg,
                                          marksForAPRTotal,
                                          depositForAPR,
                                          tvlForAPR,
                                          daysLeftInGenesisLg,
                                          fdv
                                        );
                                      } catch (error) {
                                        return undefined;
                                      }
                                    })()
                                  : undefined;

                              // Display marks accumulated for this market
                              const lastUpdatedLg = marks
                                ? parseInt(marks.lastUpdated || "0", 10)
                                : 0;
                              const daysElapsedLg =
                                lastUpdatedLg > 0
                                  ? (Date.now() / 1000 - lastUpdatedLg) /
                                    (24 * 60 * 60)
                                  : 0;
                              const displayMarksLg = genesisEnded
                                ? userMarksForMarket
                                : userMarksForMarket +
                                  daysElapsedLg * currentDepositUSD * 10;

                              return (
                                <div className="text-center min-w-0">
                                  <span className="text-[#1E4775] font-semibold text-xs flex items-center justify-center gap-1">
                                    {isLoadingMarks ? (
                                      "..."
                                    ) : (
                                      <>
                                        {displayMarksLg >= 0
                                          ? displayMarksLg.toLocaleString(
                                              undefined,
                                              {
                                                maximumFractionDigits: 1,
                                                minimumFractionDigits: 0,
                                              }
                                            )
                                          : "-"}
                                        <Image
                                          src="/icons/marks.png"
                                          alt="Marks"
                                          width={16}
                                          height={16}
                                          className="inline-block"
                                        />
                                      </>
                                    )}
                                  </span>
                                </div>
                              );
                            })()
                          : null}
                        {!isEnded ? (
                          <div
                            className="flex items-center justify-center gap-1.5 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SimpleTooltip
                              label={
                                <div>
                                  <div className="font-semibold mb-1">
                                    {collateralSymbol}
                                  </div>
                                  <div className="text-xs opacity-90">
                                    Wrapped collateral token
                                  </div>
                                </div>
                              }
                            >
                              <Image
                                src={getLogoPath(collateralSymbol)}
                                alt={collateralSymbol}
                                width={20}
                                height={20}
                                className="flex-shrink-0 cursor-help rounded-full"
                              />
                            </SimpleTooltip>
                            <SimpleTooltip
                              label={
                                isCollateralOnlyRow ? (
                                  <div>
                                    <div className="font-semibold mb-1">
                                      {isMegaEthRow ? "Collateral only (MegaETH)" : "Collateral only"}
                                    </div>
                                    <div className="text-xs opacity-90">
                                      Deposit accepted collateral assets only.
                                      No token swap on this chain.
                                    </div>
                                  </div>
                                ) : (
                                <div>
                                  <div className="font-semibold mb-1">
                                    Any Token Supported
                                  </div>
                                  <div className="text-xs opacity-90 mb-2">
                                    Zapper-supported assets are zapped in with
                                    no slippage. Any other ERC20s are swapped
                                    with Velora.
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] opacity-75">
                                      Zapper-supported:
                                    </span>
                                    {(() => {
                                      const isWstETHMarket =
                                        collateralSymbol.toLowerCase() ===
                                        "wsteth";

                                      if (isWstETHMarket) {
                                        return (
                                          <>
                                            <div className="flex items-center gap-1">
                                              <Image
                                                src={getLogoPath("ETH")}
                                                alt="ETH"
                                                width={16}
                                                height={16}
                                                className="rounded-full"
                                              />
                                              <span className="text-[10px]">
                                                ETH
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Image
                                                src={getLogoPath("stETH")}
                                                alt="stETH"
                                                width={16}
                                                height={16}
                                                className="rounded-full"
                                              />
                                              <span className="text-[10px]">
                                                stETH
                                              </span>
                                            </div>
                                          </>
                                        );
                                      } else {
                                        return (
                                          <>
                                            <div className="flex items-center gap-1">
                                              <Image
                                                src={getLogoPath("USDC")}
                                                alt="USDC"
                                                width={16}
                                                height={16}
                                                className="rounded-full"
                                              />
                                              <span className="text-[10px]">
                                                USDC
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Image
                                                src={getLogoPath("fxUSD")}
                                                alt="fxUSD"
                                                width={16}
                                                height={16}
                                                className="rounded-full"
                                              />
                                              <span className="text-[10px]">
                                                fxUSD
                                              </span>
                                            </div>
                                          </>
                                        );
                                      }
                                    })()}
                                  </div>
                                </div>
                                )
                              }
                            >
                              <div className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide cursor-help whitespace-nowrap ${isCollateralOnlyRow ? "bg-[#1E4775]/10 text-[#1E4775]" : "bg-blue-100 text-blue-700"}`}>
                                {!isCollateralOnlyRow && <ArrowPathIcon className="w-3 h-3" />}
                                <span>{isCollateralOnlyRow ? "Collateral" : "Any Token"}</span>
                              </div>
                            </SimpleTooltip>
                          </div>
                        ) : null}
                        {isEnded ? (
                          <>
                            {/* Anchor Tokens Column */}
                            <div className="min-w-0 flex items-center justify-center">
                              {claimablePegged > 0n ? (
                                <SimpleTooltip
                                  label={
                                    anchorTokenPriceUSD > 0
                                      ? formatUSD(
                                          Number(formatEther(claimablePegged)) *
                                            anchorTokenPriceUSD
                                        )
                                      : `${formatToken(claimablePegged)} ${
                                          rowPeggedSymbol || "tokens"
                                        }`
                                  }
                                >
                                  <div className="flex items-center justify-center gap-1 cursor-help">
                                    <span className="font-mono text-[#1E4775] font-semibold text-xs">
                                      {formatToken(claimablePegged)}
                                    </span>
                                    <Image
                                      src={getLogoPath(
                                        rowPeggedSymbol ||
                                          (mkt as any).peggedToken?.symbol ||
                                          "haPB"
                                      )}
                                      alt={
                                        rowPeggedSymbol ||
                                        (mkt as any).peggedToken?.symbol ||
                                        "haPB"
                                      }
                                      width={20}
                                      height={20}
                                      className="flex-shrink-0"
                                    />
                                  </div>
                                </SimpleTooltip>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[#1E4775] font-semibold text-xs">
                                    {rowPeggedSymbol ||
                                      (mkt as any).peggedToken?.symbol ||
                                      "haTOKEN"}
                                  </span>
                                  <Image
                                    src={getLogoPath(
                                      rowPeggedSymbol ||
                                        (mkt as any).peggedToken?.symbol ||
                                        "haPB"
                                    )}
                                    alt={
                                      rowPeggedSymbol ||
                                      (mkt as any).peggedToken?.symbol ||
                                      "haPB"
                                    }
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0"
                                  />
                                </div>
                              )}
                            </div>
                            {/* Sail Tokens Column */}
                            <div className="min-w-0 flex items-center justify-center">
                              {claimableLeveraged > 0n ? (
                                <SimpleTooltip
                                  label={
                                    sailTokenPriceUSD > 0
                                      ? formatUSD(
                                          Number(
                                            formatEther(claimableLeveraged)
                                          ) * sailTokenPriceUSD
                                        )
                                      : `${formatToken(claimableLeveraged)} ${
                                          rowLeveragedSymbol || "tokens"
                                        }`
                                  }
                                >
                                  <div className="flex items-center justify-center gap-1 cursor-help">
                                    <span className="font-mono text-[#1E4775] font-semibold text-xs">
                                      {formatToken(claimableLeveraged)}
                                    </span>
                                    <Image
                                      src={getLogoPath(
                                        rowLeveragedSymbol ||
                                          (mkt as any).leveragedToken?.symbol ||
                                          "hsPB"
                                      )}
                                      alt={
                                        rowLeveragedSymbol ||
                                        (mkt as any).leveragedToken?.symbol ||
                                        "hsPB"
                                      }
                                      width={20}
                                      height={20}
                                      className="flex-shrink-0"
                                    />
                                  </div>
                                </SimpleTooltip>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[#1E4775] font-semibold text-xs">
                                    {rowLeveragedSymbol ||
                                      (mkt as any).leveragedToken?.symbol ||
                                      "hsTOKEN"}
                                  </span>
                                  <Image
                                    src={getLogoPath(
                                      rowLeveragedSymbol ||
                                        (mkt as any).leveragedToken?.symbol ||
                                        "hsPB"
                                    )}
                                    alt={
                                      rowLeveragedSymbol ||
                                      (mkt as any).leveragedToken?.symbol ||
                                      "hsPB"
                                    }
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0"
                                  />
                                </div>
                              )}
                            </div>
                            {/* Your Deposit Column for completed markets */}
                            <div className="min-w-0 flex items-center justify-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <SimpleTooltip
                                  label={
                                    userDeposit && userDeposit > 0n
                                      ? priceError
                                        ? `${formatToken(
                                            userDeposit
                                          )} ${collateralSymbol}\n\nPrice Error: ${priceError}`
                                        : `${formatToken(
                                            userDeposit
                                          )} ${collateralSymbol}`
                                      : priceError
                                      ? `No deposit\n\nPrice Error: ${priceError}`
                                      : "No deposit"
                                  }
                                >
                                  <div className="font-mono text-[#1E4775] font-semibold cursor-help text-xs">
                                    {userDeposit && userDeposit > 0n ? (
                                      collateralPriceUSD > 0 ? (
                                        formatUSD(userDepositUSD)
                                      ) : priceError ? (
                                        <span className="text-red-500">
                                          Price Error
                                        </span>
                                      ) : (
                                        `${formatToken(
                                          userDeposit
                                        )} ${collateralSymbol}`
                                      )
                                    ) : collateralPriceUSD > 0 ? (
                                      "$0"
                                    ) : priceError ? (
                                      <span className="text-red-500 text-xs">
                                        Error
                                      </span>
                                    ) : (
                                      "0"
                                    )}
                                  </div>
                                </SimpleTooltip>
                                <SimpleTooltip label={collateralSymbol}>
                                  <Image
                                    src={getLogoPath(collateralSymbol)}
                                    alt={collateralSymbol}
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0 cursor-help rounded-full"
                                  />
                                </SimpleTooltip>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center min-w-0 flex items-center justify-center gap-1.5">
                            <SimpleTooltip
                              label={
                                totalDeposits && totalDeposits > 0n
                                  ? priceError
                                    ? `${formatToken(
                                        totalDeposits
                                      )} ${collateralSymbol}\n\nPrice Error: ${priceError}`
                                    : `${formatToken(
                                        totalDeposits
                                      )} ${collateralSymbol}`
                                  : priceError
                                  ? `No deposits\n\nPrice Error: ${priceError}`
                                  : "No deposits"
                              }
                            >
                              <div className="font-mono text-[#1E4775] font-semibold cursor-help text-xs">
                                {totalDeposits && totalDeposits > 0n ? (
                                  collateralPriceUSD > 0 ? (
                                    formatUSD(totalDepositsUSD)
                                  ) : priceError ? (
                                    <span className="text-red-500">
                                      Price Error
                                    </span>
                                  ) : (
                                    `${formatToken(
                                      totalDeposits
                                    )} ${collateralSymbol}`
                                  )
                                ) : collateralPriceUSD > 0 ? (
                                  "$0"
                                ) : priceError ? (
                                  <span className="text-red-500 text-xs">
                                    Error
                                  </span>
                                ) : (
                                  "0"
                                )}
                              </div>
                            </SimpleTooltip>
                            <SimpleTooltip label={collateralSymbol}>
                              <Image
                                src={getLogoPath(collateralSymbol)}
                                alt={collateralSymbol}
                                width={20}
                                height={20}
                                className="flex-shrink-0 cursor-help rounded-full"
                              />
                            </SimpleTooltip>
                          </div>
                        )}
                        {!isEnded && (
                          <div className="text-center min-w-0 flex items-center justify-center gap-1.5">
                            <SimpleTooltip
                              label={
                                userDeposit && userDeposit > 0n
                                  ? priceError
                                    ? `${formatToken(
                                        userDeposit
                                      )} ${collateralSymbol}\n\nPrice Error: ${priceError}`
                                    : `${formatToken(
                                        userDeposit
                                      )} ${collateralSymbol}`
                                  : priceError
                                  ? `No deposit\n\nPrice Error: ${priceError}`
                                  : "No deposit"
                              }
                            >
                              <div className="font-mono text-[#1E4775] font-semibold cursor-help text-xs">
                                {userDeposit && userDeposit > 0n ? (
                                  collateralPriceUSD > 0 ? (
                                    formatUSD(userDepositUSD)
                                  ) : priceError ? (
                                    <span className="text-red-500">
                                      Price Error
                                    </span>
                                  ) : (
                                    `${formatToken(
                                      userDeposit
                                    )} ${collateralSymbol}`
                                  )
                                ) : collateralPriceUSD > 0 ? (
                                  "$0"
                                ) : priceError ? (
                                  <span className="text-red-500 text-xs">
                                    Error
                                  </span>
                                ) : (
                                  "0"
                                )}
                              </div>
                            </SimpleTooltip>
                            <SimpleTooltip label={collateralSymbol}>
                              <Image
                                src={getLogoPath(collateralSymbol)}
                                alt={collateralSymbol}
                                width={20}
                                height={20}
                                className="flex-shrink-0 cursor-help rounded-full"
                              />
                            </SimpleTooltip>
                          </div>
                        )}
                        {!isEnded && (
                          <div className="text-center min-w-0">
                            {isProcessing ? (
                              <SimpleTooltip
                                label={
                                  <div className="text-left max-w-xs">
                                    <div className="font-semibold mb-1">
                                      Processing Genesis
                                    </div>
                                    <div className="text-xs space-y-1">
                                      <p>
                                        The Harbor team will transfer collateral
                                        and make anchor + sail tokens claimable
                                        imminently.
                                      </p>
                                      <p className="mt-2">
                                        <strong>Deposits:</strong> Still
                                        possible until claiming opens. Complete
                                        your deposit before the processing ends.
                                      </p>
                                      <p>
                                        <strong>Marks:</strong> Still being
                                        earned during processing. Bonus marks
                                        will be applied at the end of
                                        processing.
                                      </p>
                                    </div>
                                  </div>
                                }
                              >
                                <span className="text-[10px] uppercase px-2 py-1 bg-yellow-100 text-yellow-800 cursor-help flex items-center gap-1 justify-center whitespace-nowrap">
                                  <ClockIcon className="w-3 h-3" />
                                  {statusText}
                                </span>
                              </SimpleTooltip>
                            ) : (
                              <span className="text-[10px] uppercase px-2 py-1 bg-[#1E4775]/10 text-[#1E4775] whitespace-nowrap">
                                {statusText}
                              </span>
                            )}
                          </div>
                        )}
                        <div
                          className="text-center min-w-0 flex items-center justify-center pb-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isEnded ? (
                            // After genesis ends: maintenance blocks all minter interaction (no claim)
                            <div className="flex items-center justify-center">
                              {showMaintenanceTag ? (
                                <MarketMaintenanceTag />
                              ) : hasClaimable ? (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (
                                      genesisAddress &&
                                      address &&
                                      hasClaimable
                                    ) {
                                      try {
                                        setClaimingMarket(id);
                                        setClaimModal({
                                          open: true,
                                          status: "pending",
                                          marketId: id,
                                        });
                                        const tx = await writeContractAsync({
                                          address:
                                            genesisAddress as `0x${string}`,
                                          abi: GENESIS_ABI,
                                          functionName: "claim",
                                          args: [address as `0x${string}`],
                                        });
                                        await publicClient?.waitForTransactionReceipt(
                                          { hash: tx }
                                        );
                                        // Refetch data after successful claim
                                        await refetchReads();
                                        await refetchTotalDeposits();
                                        queryClient.invalidateQueries({
                                          queryKey: ["allHarborMarks"],
                                        });
                                        setClaimModal((prev) => ({
                                          ...prev,
                                          status: "success",
                                        }));
                                        setShareModal({
                                          open: true,
                                          marketName: displayMarketName,
                                          peggedSymbol: peggedNoPrefix,
                                        });
                                      } catch (error) {
                                        setClaimModal({
                                          open: true,
                                          status: "error",
                                          marketId: id,
                                          errorMessage:
                                            (error as any)?.shortMessage ||
                                            (error as any)?.message ||
                                            "Claim failed",
                                        });
                                      } finally {
                                        setClaimingMarket(null);
                                      }
                                    }
                                  }}
                                  disabled={
                                    !genesisAddress ||
                                    !address ||
                                    !hasClaimable ||
                                    claimingMarket === id
                                  }
                                  className="px-4 py-2 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full whitespace-nowrap"
                                >
                                  {claimingMarket === id
                                    ? "Claiming..."
                                    : "Claim"}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-500">
                                  No tokens to claim
                                </span>
                              )}
                            </div>
                          ) : showMaintenanceTag ? (
                            <div className="flex items-center justify-center">
                              <MarketMaintenanceTag />
                            </div>
                          ) : (
                            // Before genesis ends, show manage button
                            <div className="flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setManageModal({
                                    marketId: id,
                                    market: mkt,
                                    initialTab: "deposit",
                                  });
                                }}
                                disabled={isEnded || !genesisAddress}
                                className="px-4 py-2 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full whitespace-nowrap"
                              >
                                Manage
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Early Deposit Bonus Progress Bar - inside main market row */}
                      {!isEnded && !isProcessing && (() => {
                          // Get market bonus status from the hook called at top level
                          const marketBonusData = bonusStatusResults?.find(
                            (status) =>
                              status.genesisAddress?.toLowerCase() ===
                              genesisAddress?.toLowerCase()
                          );
                          const marketBonusStatus = marketBonusData?.data;

                          const collateralSymbolNormalized =
                            collateralSymbol.toLowerCase();
                          const isFxSAVE = collateralSymbolNormalized === "fxsave";
                          const isEurMarket =
                            id === "steth-eur" || id === "fxusd-eur";
                          const isLaunchMarket =
                            id === "eth-fxusd" || id === "btc-fxusd" || id === "btc-steth";
                          // Metals and all future campaigns use 25k fxSAVE / 15 wstETH
                          const isMetalsOrFuture = !isLaunchMarket && !isEurMarket;
                          const thresholdAmount = isEurMarket
                            ? isFxSAVE
                              ? 50000
                              : 15
                            : isMetalsOrFuture
                            ? isFxSAVE
                              ? 25000
                              : 15
                            : isFxSAVE
                            ? 250000
                            : 70;
                          const fallbackBonusStatus = {
                            cumulativeDeposits: "0",
                            thresholdAmount: String(thresholdAmount),
                            thresholdToken: isFxSAVE ? "fxSAVE" : "wstETH",
                            thresholdReached: false,
                          };
                          // Use marketBonusStatus if available, but ensure thresholdToken is set correctly
                          const effectiveBonusStatus = marketBonusStatus
                            ? {
                                ...marketBonusStatus,
                                thresholdToken: marketBonusStatus.thresholdToken || (isFxSAVE ? "fxSAVE" : "wstETH"),
                                thresholdAmount: marketBonusStatus.thresholdAmount || String(thresholdAmount),
                              }
                            : fallbackBonusStatus;

                          if (isLoadingBonusStatus) return null;

                          const bonusProgress = Math.min(
                            100,
                            (Number(effectiveBonusStatus.cumulativeDeposits) /
                              Number(effectiveBonusStatus.thresholdAmount)) *
                              100
                          );

                          // Get user's marks for this market
                          const marksForMarket = marksResults?.find(
                            (marks) =>
                              marks.genesisAddress?.toLowerCase() ===
                              genesisAddress?.toLowerCase()
                          );
                          const userMarksData =
                            marksForMarket?.data?.userHarborMarks;
                          const marks = Array.isArray(userMarksData)
                            ? userMarksData[0]
                            : userMarksData;

                          const userQualifies =
                            marks?.qualifiesForEarlyBonus || false;
                          // Calculate qualified deposit USD:
                          // - If user has a current deposit, use current deposit USD (calculated with current price)
                          // - If user has no current deposit (e.g., claimed after genesis ended), use subgraph value
                          //   (historical data, price at deposit time is fine for display purposes)
                          const earlyBonusEligibleDepositUSDFromSubgraph =
                            parseFloat(
                              marks?.earlyBonusEligibleDepositUSD || "0"
                            );
                          const earlyBonusEligibleUSD =
                            userDepositUSD > 0
                              ? userDepositUSD // Use current deposit USD (calculated with current price)
                              : earlyBonusEligibleDepositUSDFromSubgraph; // Use subgraph value if no current deposit

                          return (
                            <div className="px-2 pt-2.5 pb-0.5 border-t border-[#1E4775]/10 -mb-1 mt-1">
                              <div className="mb-0 -mt-1">
                                {/* Progress Bar - label, bar, amounts, and qualification on one line */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] text-[#1E4775] font-semibold whitespace-nowrap">
                                    Early Deposit Bonus
                                  </span>
                                  <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-[100px]">
                                    <div
                                      className={`h-1.5 rounded-full transition-all ${
                                        effectiveBonusStatus.thresholdReached
                                          ? "bg-gray-400"
                                          : "bg-[#FF8A7A]"
                                      }`}
                                      style={{ width: `${bonusProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-[#1E4775]/70 whitespace-nowrap">
                                    {`${Number(
                                      effectiveBonusStatus.cumulativeDeposits
                                    ).toLocaleString(undefined, {
                                      maximumFractionDigits: 0,
                                    })} / ${Number(
                                      effectiveBonusStatus.thresholdAmount
                                    ).toLocaleString(undefined, {
                                      maximumFractionDigits: 0,
                                    })} ${effectiveBonusStatus.thresholdToken === "wstETH" ? "stETH" : effectiveBonusStatus.thresholdToken}`}
                                  </span>

                                  {/* User Qualification Status - on same line */}
                                  {userQualifies &&
                                    earlyBonusEligibleUSD > 0 && (
                                      <span className="text-[10px] text-[#1E4775] font-semibold leading-none whitespace-nowrap">
                                        ✓ {formatUSD(earlyBonusEligibleUSD)}{" "}
                                        qualified
                                      </span>
                                    )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                    </div>

                    {/* Expanded View */}
                    {isExpanded &&
                      (() => {
                        const isWstETH =
                          collateralSymbol.toLowerCase() === "wsteth";
                        const isFxSAVE =
                          collateralSymbol.toLowerCase() === "fxsave";
                        const underlyingAPR = isWstETH
                          ? wstETHAPR
                          : isFxSAVE
                          ? fxSAVEAPR
                          : null;

                        return (
                          <GenesisMarketExpandedView
                            marketId={id}
                            market={mkt}
                            genesisAddress={genesisAddress}
                            totalDeposits={totalDeposits}
                            totalDepositsUSD={totalDepositsUSD}
                            userDeposit={userDeposit}
                            isConnected={isConnected}
                            address={address}
                            endDate={endDate}
                            collateralSymbol={collateralSymbol}
                            collateralPriceUSD={collateralPriceUSD}
                            peggedSymbol={rowPeggedSymbol}
                            leveragedSymbol={rowLeveragedSymbol}
                            underlyingAPR={underlyingAPR}
                          />
                        );
                      })()}
                  </React.Fragment>
                );
              });

              return (
                <>
                  {activeSectionHeader}
                  {marketRows}
                </>
              );
            })()}
          </GenesisMarketsSections>
        )}

        {/* Coming Next Markets Section */}
        {comingSoonMarkets.length > 0 && (
          <section className="space-y-2 overflow-visible mt-8">
            <div className="pt-4 mb-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">
                  Next Campaign:
                </h2>
                <span className="px-2.5 py-0.5 bg-[#E67A6B] hover:bg-[#D66A5B] border border-white text-white text-xs font-semibold uppercase tracking-wider rounded-full transition-colors">
                  Metals
                </span>
              </div>
            </div>
            {/* Header row - hidden on mobile, shown on desktop */}
            <div className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto mb-0">
              <div className="grid lg:grid-cols-[32px_1.5fr_80px_0.9fr_1fr_0.9fr] md:grid-cols-[32px_120px_80px_100px_1fr_90px] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
                <div className="min-w-0" aria-label="Network" />
                <div className="min-w-0 text-center">Market</div>
                <div className="text-center min-w-0 whitespace-nowrap">Proj. SP APR</div>
                <div className="text-center min-w-0">Anchor Token</div>
                <div className="text-center min-w-0">Sail Token</div>
                <div className="text-center min-w-0">Status</div>
              </div>
            </div>
            <div className="space-y-2">
              {comingSoonMarkets.map(([id, mkt]) => {
                const peggedSymbol = mkt.peggedToken?.symbol || "haTOKEN";
                const leveragedSymbol = mkt.leveragedToken?.symbol || "hsTOKEN";
                const collateralSymbol = mkt.collateral?.symbol || "COLLATERAL";

                // Parse long/short sides from market config (similar to sail page)
                const getLongSide = (market: any): string => {
                  const desc = market.leveragedToken?.description || "";
                  const match = desc.match(/Long\s+(\w+)/i);
                  if (match) return match[1];
                  const name = market.leveragedToken?.name || "";
                  const versusMatch = name.match(/versus\s+(\w+)/i);
                  if (versusMatch) return versusMatch[1];
                  const symbol = market.leveragedToken?.symbol || "";
                  const symbolMatch = symbol.match(/^hs([A-Z]+)-/i);
                  if (symbolMatch) return symbolMatch[1];
                  return "Other";
                };

                const getShortSide = (market: any): string => {
                  const desc = market.leveragedToken?.description || "";
                  const shortMatch = desc.match(/short\s+(\w+)/i);
                  if (shortMatch) return shortMatch[1];
                  const name = market.leveragedToken?.name || "";
                  const nameShortMatch = name.match(/Short\s+(\w+)/i);
                  if (nameShortMatch) return nameShortMatch[1];
                  const longMatch = desc.match(/Long\s+\w+\s+vs\s+(\w+)/i);
                  if (longMatch) return longMatch[1];
                  const symbol = market.leveragedToken?.symbol || "";
                  const symbolMatch = symbol.match(/^hs[A-Z]+-(.+)$/i);
                  if (symbolMatch) return symbolMatch[1];
                  return "Other";
                };

                const longSide = getLongSide(mkt);
                const shortSide = getShortSide(mkt);
                const sailDescription = longSide && shortSide 
                  ? `Long ${longSide} / Short ${shortSide}`
                  : leveragedSymbol;

                // Calculate underlying APR for coming soon markets
                const isWstETH = collateralSymbol.toLowerCase() === "wsteth";
                const isFxSAVE = collateralSymbol.toLowerCase() === "fxsave";
                const underlyingAPR = isWstETH
                  ? wstETHAPR
                  : isFxSAVE
                  ? fxSAVEAPR
                  : null;

                // Format market name
                const marketName = `${collateralSymbol}-${mkt.pegTarget?.toUpperCase() || "TOKEN"}`;

                return (
                  <div
                    key={id}
                    className="bg-white py-2.5 px-2 rounded-none border border-white/10"
                  >
                    {/* Desktop layout - grid matching active events */}
                    <div className="hidden md:grid lg:grid-cols-[32px_1.5fr_80px_0.9fr_1fr_0.9fr] md:grid-cols-[32px_120px_80px_100px_1fr_110px] gap-4 items-center">
                      <div className="flex items-center justify-center">
                        <NetworkIconCell
                          chainName={(mkt as any).chain?.name || "Ethereum"}
                          chainLogo={(mkt as any).chain?.logo || "icons/eth.png"}
                          size={20}
                        />
                      </div>
                      {/* Market Column */}
                      <div className="flex items-center gap-2 min-w-0 pl-4">
                        <div className="text-[#1E4775] font-medium text-sm">
                          {marketName}
                        </div>
                        <div className="flex items-center gap-1">
                          <TokenLogo
                            symbol={collateralSymbol}
                            size={20}
                            className="flex-shrink-0"
                          />
                          <span className="text-[#1E4775]/60 text-xs">=</span>
                          <TokenLogo
                            symbol={peggedSymbol}
                            size={20}
                            className="flex-shrink-0"
                          />
                          <span className="text-[#1E4775]/60 text-xs">+</span>
                          <TokenLogo
                            symbol={leveragedSymbol}
                            size={20}
                            className="flex-shrink-0"
                          />
                        </div>
                      </div>

                      {/* APR Column */}
                      <div className="flex-shrink-0 text-center">
                        {underlyingAPR !== null && underlyingAPR !== undefined ? (
                          <div className="text-[#1E4775] font-semibold text-xs">
                            {(underlyingAPR * 2 * 100).toFixed(2)}% +
                            <Image
                              src="/icons/marks.png"
                              alt="Marks"
                              width={20}
                              height={20}
                              className="inline-block ml-1 align-middle"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>

                      {/* Anchor Token Column */}
                      <div className="flex items-center justify-center gap-1.5 min-w-0">
                        <TokenLogo
                          symbol={peggedSymbol}
                          size={20}
                          className="flex-shrink-0"
                        />
                        <span className="text-[#1E4775] font-semibold text-xs">
                          {peggedSymbol}
                        </span>
                      </div>

                      {/* Sail Token Column */}
                      <div className="flex flex-col items-center gap-0.5 min-w-0">
                        <div className="flex items-center justify-center gap-1.5">
                          <TokenLogo
                            symbol={leveragedSymbol}
                            size={20}
                            className="flex-shrink-0"
                          />
                          <span className="text-[#1E4775] font-semibold text-xs">
                            {leveragedSymbol}
                          </span>
                        </div>
                        <div className="text-[#1E4775]/60 text-[9px] italic text-center">
                          {sailDescription}
                        </div>
                      </div>

                      {/* Status Column */}
                      <div className="flex-shrink-0 text-center min-w-0 overflow-hidden">
                        <div className="bg-[#FF8A7A] px-2 md:px-3 py-1 rounded-full inline-block max-w-full">
                          <span className="text-white font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">
                            Coming Next
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mobile layout */}
                    <div className="md:hidden space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-[#1E4775] font-medium text-sm">
                            {marketName}
                          </div>
                          <div className="flex items-center gap-1">
                            <TokenLogo
                              symbol={collateralSymbol}
                              size={20}
                              className="flex-shrink-0"
                            />
                            <span className="text-[#1E4775]/60 text-xs">=</span>
                            <TokenLogo
                              symbol={peggedSymbol}
                              size={20}
                              className="flex-shrink-0"
                            />
                            <span className="text-[#1E4775]/60 text-xs">+</span>
                            <TokenLogo
                              symbol={leveragedSymbol}
                              size={20}
                              className="flex-shrink-0"
                            />
                          </div>
                        </div>
                        <div className="bg-[#FF8A7A] px-3 py-1 rounded-full">
                          <span className="text-white font-semibold text-[10px] uppercase tracking-wider">
                            Coming Next
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[#1E4775]/70 text-[10px] mb-1">
                            Anchor Token
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TokenLogo
                              symbol={peggedSymbol}
                              size={16}
                              className="flex-shrink-0"
                            />
                            <span className="text-[#1E4775] font-semibold text-xs">
                              {peggedSymbol}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[#1E4775]/70 text-[10px] mb-1">
                            Sail Token
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <TokenLogo
                                symbol={leveragedSymbol}
                                size={16}
                                className="flex-shrink-0"
                              />
                              <span className="text-[#1E4775] font-semibold text-xs">
                                {leveragedSymbol}
                              </span>
                            </div>
                            <div className="text-[#1E4775]/60 text-[9px] italic">
                              {sailDescription}
                            </div>
                          </div>
                        </div>
                      </div>
                      {underlyingAPR !== null && underlyingAPR !== undefined && (
                        <div className="text-sm text-[#1E4775]">
                          <span className="font-semibold">
                            Projected {peggedSymbol} APR:{" "}
                            {(underlyingAPR * 2 * 100).toFixed(2)}% +
                          </span>
                          <Image
                            src="/icons/marks.png"
                            alt="Marks"
                            width={18}
                            height={18}
                            className="inline-block ml-1 align-middle"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Completed Genesis Events - Grouped by Campaign (hidden by default; toggle via Genesis: Ongoing / All) */}
        {displayedCompletedByCampaign.size > 0 && showCompletedGenesis && (
          <section className="space-y-4 overflow-visible mt-8">
            {Array.from(displayedCompletedByCampaign.entries()).map(([campaignLabel, markets]) => {
              // Extract campaign name from label (e.g., "Launch Maiden Voyage" -> "Launch")
              const campaignName = campaignLabel.replace(/\s+Maiden Voyage.*/i, "").trim() || campaignLabel;
              
              return (
                <div key={campaignLabel} className="space-y-2">
                  <div className="pt-4 mb-1">
                    <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">
                      Completed: {campaignName}
                    </h2>
                  </div>
                  {/* Header row - hidden on mobile, shown on desktop */}
                  <div className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto mb-0">
                    <div className="grid lg:grid-cols-[32px_1.5fr_1fr_1fr_1.5fr_1fr] md:grid-cols-[32px_120px_60px_60px_1fr_80px] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
                      <div className="min-w-0" aria-label="Network" />
                      <div className="min-w-0 text-center">Market</div>
                      <div className="text-center min-w-0">
                        Anchor
                        <span className="hidden lg:inline"> Tokens</span>
                      </div>
                      <div className="text-center min-w-0">
                        Sail
                        <span className="hidden lg:inline"> Tokens</span>
                      </div>
                      <div className="min-w-0 text-center">
                        Your Deposit
                      </div>
                      <div className="text-center min-w-0">Action</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {markets.map(([id, mkt, marks]) => {
                      // Reuse the same rendering logic from the active markets
                      // We need to get all the same data for this market
                      const mi = genesisMarkets.findIndex((m) => m[0] === id);
                      const baseOffset = mi * (isConnected ? 3 : 1);
                      const claimableResult = isConnected
                        ? (reads?.[baseOffset + 2]?.result as [bigint, bigint] | undefined)
                        : undefined;
                      const claimablePegged = claimableResult?.[0] || 0n;
                      const claimableLeveraged = claimableResult?.[1] || 0n;
                      const hasClaimable = claimablePegged > 0n || claimableLeveraged > 0n;
                      const userDeposit = isConnected
                        ? (reads?.[baseOffset + 1]?.result as bigint | undefined)
                        : undefined;

                      // Get all the same market data
                      const genesisAddress = (mkt as any).addresses?.genesis;
                      const onChainCollateralAddress = collateralTokenReads?.[mi]?.result as `0x${string}` | undefined;
                      const collateralAddress = onChainCollateralAddress || (mkt as any).addresses?.wrappedCollateralToken;
                      const collateralSymbol = (mkt as any).collateral?.symbol || "ETH";
                      const endDate = (mkt as any).genesis?.endDate;
                      const oracleAddress = (mkt as any).addresses?.collateralPrice as `0x${string}` | undefined;
                      const collateralPriceData = oracleAddress ? collateralPricesMap.get(oracleAddress.toLowerCase()) : undefined;
                      const marketCoinGeckoId = (mkt as any)?.coinGeckoId as string | undefined;
                      const underlyingSymbol = (mkt as any).collateral?.underlyingSymbol || collateralSymbol;

                      const { collateralPriceUSD } = computeGenesisRowUsdPricing({
                        underlyingSymbol,
                        pegTarget: (mkt as any)?.pegTarget,
                        marketCoinGeckoId,
                        coinGeckoPrices,
                        collateralPriceData,
                        chainlinkBtcPrice,
                        coinGeckoLoading,
                        collateralSymbol,
                      });
                      const totalDeposits = totalDepositsReads?.[mi]?.result as bigint | undefined;
                      const totalDepositsAmount = totalDeposits ? Number(formatEther(totalDeposits)) : 0;
                      const totalDepositsUSD = totalDepositsAmount * collateralPriceUSD;
                      const userDepositUSD = userDeposit && collateralPriceUSD > 0 ? Number(formatEther(userDeposit)) * collateralPriceUSD : 0;
                      const rowPeggedSymbol = (mkt as any).peggedToken?.symbol || "ha";
                      const rowLeveragedSymbol = (mkt as any).leveragedToken?.symbol || "hs";
                      const rawDisplayMarketName = rowLeveragedSymbol && rowLeveragedSymbol.toLowerCase().startsWith("hs")
                        ? rowLeveragedSymbol.slice(2)
                        : rowLeveragedSymbol || (mkt as any).name || "Market";
                      const displayMarketName = formatGenesisMarketDisplayName(rawDisplayMarketName);
                      const completedShowMaintenanceTag = isMarketInMaintenance(mkt);

                      // Get token prices for claimable display
                      const anchorTokenPriceUSD = 1; // Pegged tokens are always $1
                      const sailTokenPriceUSD = collateralPriceUSD; // Leveraged tokens use collateral price

                      return (
                        <div
                          key={id}
                          className="bg-white py-2.5 px-2 rounded-none border border-white/10"
                        >
                          {/* Desktop layout */}
                          <div className="hidden md:grid lg:grid-cols-[32px_1.5fr_1fr_1fr_1.5fr_1fr] md:grid-cols-[32px_120px_60px_60px_1fr_80px] gap-4 items-center">
                            <div className="flex items-center justify-center">
                              <NetworkIconCell
                                chainName={(mkt as any).chain?.name || "Ethereum"}
                                chainLogo={(mkt as any).chain?.logo || "icons/eth.png"}
                                size={20}
                              />
                            </div>
                            {/* Market Column */}
                            <div className="flex items-center gap-2 min-w-0 pl-4 flex-wrap">
                              <div className="text-[#1E4775] font-medium text-sm flex items-center gap-1.5 flex-wrap">
                                {displayMarketName}
                              </div>
                              <div className="flex items-center gap-1">
                                <Image
                                  src={getLogoPath(collateralSymbol)}
                                  alt={collateralSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 rounded-full"
                                />
                                <span className="text-[#1E4775]/60 text-xs">=</span>
                                <Image
                                  src={getLogoPath(rowPeggedSymbol)}
                                  alt={rowPeggedSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 rounded-full"
                                />
                                <span className="text-[#1E4775]/60 text-xs">+</span>
                                <Image
                                  src={getLogoPath(rowLeveragedSymbol)}
                                  alt={rowLeveragedSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 rounded-full"
                                />
                              </div>
                            </div>

                            {/* Anchor Tokens Column */}
                            <div className="flex items-center justify-center gap-1.5 min-w-0">
                              <Image
                                src={getLogoPath(rowPeggedSymbol)}
                                alt={rowPeggedSymbol}
                                width={20}
                                height={20}
                                className="flex-shrink-0 rounded-full"
                              />
                              <SimpleTooltip
                                label={
                                  claimablePegged > 0n && anchorTokenPriceUSD > 0
                                    ? formatUSD(Number(formatEther(claimablePegged)) * anchorTokenPriceUSD)
                                    : claimablePegged > 0n
                                    ? `${formatToken(claimablePegged)} ${rowPeggedSymbol}`
                                    : ""
                                }
                              >
                                <div className="text-[#1E4775] font-semibold text-xs cursor-help">
                                  {claimablePegged > 0n ? formatToken(claimablePegged) : "-"}
                                </div>
                              </SimpleTooltip>
                            </div>

                            {/* Sail Tokens Column */}
                            <div className="flex items-center justify-center gap-1.5 min-w-0">
                              <Image
                                src={getLogoPath(rowLeveragedSymbol)}
                                alt={rowLeveragedSymbol}
                                width={20}
                                height={20}
                                className="flex-shrink-0 rounded-full"
                              />
                              <SimpleTooltip
                                label={
                                  claimableLeveraged > 0n && sailTokenPriceUSD > 0
                                    ? formatUSD(Number(formatEther(claimableLeveraged)) * sailTokenPriceUSD)
                                    : claimableLeveraged > 0n
                                    ? `${formatToken(claimableLeveraged)} ${rowLeveragedSymbol}`
                                    : ""
                                }
                              >
                                <div className="text-[#1E4775] font-semibold text-xs cursor-help">
                                  {claimableLeveraged > 0n ? formatToken(claimableLeveraged) : "-"}
                                </div>
                              </SimpleTooltip>
                            </div>

                            {/* Your Deposit Column */}
                            <div className="flex items-center justify-center gap-1 min-w-0">
                              <Image
                                src={getLogoPath(collateralSymbol)}
                                alt={collateralSymbol}
                                width={14}
                                height={14}
                                className="flex-shrink-0 rounded-full"
                              />
                              <div className="text-[#1E4775] font-semibold text-xs">
                                {userDeposit && userDeposit > 0n
                                  ? collateralPriceUSD > 0
                                    ? formatUSD(userDepositUSD)
                                    : `${formatToken(userDeposit)} ${collateralSymbol}`
                                  : "$0"}
                              </div>
                            </div>

                            {/* Action Column */}
                            <div className="flex-shrink-0 flex items-center justify-center text-center">
                              {completedShowMaintenanceTag ? (
                                <MarketMaintenanceTag />
                              ) : hasClaimable ? (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (genesisAddress && address && hasClaimable) {
                                      try {
                                        setClaimingMarket(id);
                                        setClaimModal({
                                          open: true,
                                          status: "pending",
                                          marketId: id,
                                        });
                                        const tx = await writeContractAsync({
                                          address: genesisAddress as `0x${string}`,
                                          abi: GENESIS_ABI,
                                          functionName: "claim",
                                          args: [address as `0x${string}`],
                                        });
                                        setClaimModal({
                                          open: true,
                                          status: "success",
                                          marketId: id,
                                        });
                                        setShareModal({
                                          open: false,
                                          marketName: displayMarketName,
                                          peggedSymbol: rowPeggedSymbol,
                                        });
                                      } catch (error) {
                                        setClaimModal({
                                          open: true,
                                          status: "error",
                                          marketId: id,
                                          errorMessage: (error as any)?.shortMessage || (error as any)?.message || "Claim failed",
                                        });
                                      } finally {
                                        setClaimingMarket(null);
                                      }
                                    }
                                  }}
                                  disabled={!genesisAddress || !address || !hasClaimable || claimingMarket === id}
                                  className="px-3 py-1.5 text-[10px] font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full whitespace-nowrap"
                                >
                                  {claimingMarket === id ? "Claiming..." : "Claim"}
                                </button>
                              ) : null}
                            </div>
                          </div>

                          {/* Mobile layout */}
                          <div className="md:hidden space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="text-[#1E4775] font-medium text-sm">
                                  {displayMarketName}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Image
                                    src={getLogoPath(collateralSymbol)}
                                    alt={collateralSymbol}
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0 rounded-full"
                                  />
                                  <span className="text-[#1E4775]/60 text-xs">=</span>
                                  <Image
                                    src={getLogoPath(rowPeggedSymbol)}
                                    alt={rowPeggedSymbol}
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0 rounded-full"
                                  />
                                  <span className="text-[#1E4775]/60 text-xs">+</span>
                                  <Image
                                    src={getLogoPath(rowLeveragedSymbol)}
                                    alt={rowLeveragedSymbol}
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0 rounded-full"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-[#1E4775]/70 text-[10px] mb-1">Anchor</div>
                                <div className="flex items-center gap-1.5">
                                  <Image
                                    src={getLogoPath(rowPeggedSymbol)}
                                    alt={rowPeggedSymbol}
                                    width={16}
                                    height={16}
                                    className="flex-shrink-0 rounded-full"
                                  />
                                  <span className="text-[#1E4775] font-semibold text-xs">
                                    {claimablePegged > 0n ? formatToken(claimablePegged) : "-"}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="text-[#1E4775]/70 text-[10px] mb-1">Sail</div>
                                <div className="flex items-center gap-1.5">
                                  <Image
                                    src={getLogoPath(rowLeveragedSymbol)}
                                    alt={rowLeveragedSymbol}
                                    width={16}
                                    height={16}
                                    className="flex-shrink-0 rounded-full"
                                  />
                                  <span className="text-[#1E4775] font-semibold text-xs">
                                    {claimableLeveraged > 0n ? formatToken(claimableLeveraged) : "-"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-[#1E4775]/70 text-[10px] flex items-center gap-1">
                                  <Image
                                    src={getLogoPath(collateralSymbol)}
                                    alt={collateralSymbol}
                                    width={14}
                                    height={14}
                                    className="flex-shrink-0 rounded-full"
                                  />
                                  <span>Your Deposit</span>
                                </div>
                                <div className="text-[#1E4775] font-semibold text-xs">
                                  {userDeposit && userDeposit > 0n
                                    ? collateralPriceUSD > 0
                                      ? formatUSD(userDepositUSD)
                                      : `${formatToken(userDeposit)} ${collateralSymbol}`
                                    : "$0"}
                                </div>
                              </div>
                              {completedShowMaintenanceTag ? (
                                <MarketMaintenanceTag />
                              ) : (
                                hasClaimable && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (genesisAddress && address && hasClaimable) {
                                      try {
                                        setClaimingMarket(id);
                                        setClaimModal({
                                          open: true,
                                          status: "pending",
                                          marketId: id,
                                        });
                                        const tx = await writeContractAsync({
                                          address: genesisAddress as `0x${string}`,
                                          abi: GENESIS_ABI,
                                          functionName: "claim",
                                          args: [address as `0x${string}`],
                                        });
                                        setClaimModal({
                                          open: true,
                                          status: "success",
                                          marketId: id,
                                        });
                                        setShareModal({
                                          open: false,
                                          marketName: displayMarketName,
                                          peggedSymbol: rowPeggedSymbol,
                                        });
                                      } catch (error) {
                                        setClaimModal({
                                          open: true,
                                          status: "error",
                                          marketId: id,
                                          errorMessage: (error as any)?.shortMessage || (error as any)?.message || "Claim failed",
                                        });
                                      } finally {
                                        setClaimingMarket(null);
                                      }
                                    }
                                  }}
                                  disabled={!genesisAddress || !address || !hasClaimable || claimingMarket === id}
                                  className="px-3 py-1.5 text-[10px] font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full whitespace-nowrap"
                                >
                                  {claimingMarket === id ? "Claiming..." : "Claim"}
                                </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>

      {manageModal && (
        <GenesisManageModal
          isOpen={!!manageModal}
          onClose={() => setManageModal(null)}
          marketId={manageModal.marketId}
          market={manageModal.market}
          initialTab={manageModal.initialTab}
          onSuccess={async () => {
            // Wait for blockchain state to update
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Invalidate query cache to force fresh reads
            queryClient.invalidateQueries({
              queryKey: ["anvil-contract-reads"],
            });

            // Refetch contract data in order: collateral tokens first (needed for total deposits)
            await refetchCollateralTokens();
            // Wait longer for collateral token reads to complete and component to re-render
            // This ensures the useMemo for totalDepositsContracts recalculates with new data
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Then refetch everything else
            // Note: Prices refresh automatically via their refetch intervals
            await Promise.all([refetchReads(), refetchTotalDeposits()]);

            // Force another refetch after a short delay to ensure everything is updated
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await Promise.all([
              refetchCollateralTokens(),
              refetchReads(),
              refetchTotalDeposits(),
            ]);

            // Wait longer for subgraph to index the event
            // The subgraph needs time to process the event and update marks
            await new Promise((resolve) => setTimeout(resolve, 5000));

            // Invalidate and refetch harbor marks queries
            queryClient.invalidateQueries({ queryKey: ["allHarborMarks"] });
            queryClient.invalidateQueries({ queryKey: ["harborMarks"] });

            // Force a refetch of marks data
            await refetchMarks();

            // Poll for marks update (subgraph might need more time)
            let attempts = 0;
            const maxAttempts = 6; // Try for up to 30 seconds (6 * 5 seconds)
            const pollInterval = 5000; // 5 seconds

            const pollForMarks = async () => {
              if (attempts >= maxAttempts) return;
              attempts++;
              await new Promise((resolve) => setTimeout(resolve, pollInterval));
              await refetchMarks();
              // Continue polling if we haven't reached max attempts
              if (attempts < maxAttempts) {
                await pollForMarks();
              }
            };

            // Start polling in background (don't await)
            pollForMarks();

            // Don't auto-close modal - let user see success state and close manually
          }}
        />
      )}

      <ClaimProgressModal
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
                  shareModal.peggedSymbol || "token"
                )
            : undefined
        }
      />
    </div>
  );
}
