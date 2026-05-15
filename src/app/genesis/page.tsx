"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  useAccount,
  useChainId,
  useContractReads,
  useContractRead,
  useSwitchChain,
} from "wagmi";
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
import { ensureMarketWalletChain } from "@/utils/ensureMarketWalletChain";
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
  const [showArchivedGenesis, setShowArchivedGenesis] = useState(false);

  const openManageModal = async (
    marketId: string,
    market: GenesisMarketConfig,
    initialTab: "deposit" | "withdraw" = "deposit"
  ) => {
    const resolvedTab =
      isMarketArchived(market) && initialTab === "deposit" ? "withdraw" : initialTab;
    const marketChainId = market?.chainId ?? 1;

    const isReady = await ensureMarketWalletChain({
      isConnected,
      connectedChainId,
      marketChainId,
      switchChain,
      onSwitchRejected: (err) => {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[Genesis] Network switch rejected before opening manage modal:",
            err
          );
        }
      },
    });
    if (!isReady) return;

    setManageModal({
      marketId,
      market,
      initialTab: resolvedTab,
    });
  };

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

  // Index layout per market: [isEnded, balanceOf?, claimable?]
  // Note: totalDeposits() doesn't exist in IGenesis interface
  // We'll get total deposits by checking the collateral token balance of the genesis contract
  // Use Anvil-specific hook to ensure reads go to Anvil network
  const genesisReadContracts = useMemo(() => {
    return genesisMarkets.flatMap(([_, mkt]) => {
      const g = (mkt as GenesisMarketConfig).addresses?.genesis as `0x${string}` | undefined;
      const mktChainId = (mkt as GenesisMarketConfig)?.chainId ?? 1;
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
        (marks: {
          genesisAddress?: string;
          data?: { userHarborMarks?: unknown };
        }) =>
          marks.genesisAddress?.toLowerCase() ===
          (mkt as GenesisMarketConfig).addresses?.genesis?.toLowerCase()
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

      if (isEnded && !isMarketArchived(mkt)) {
        completedMarkets.push([id, mkt, marks]);
      }
    });

    // Group by campaign from config (not subgraph)
    const grouped = new Map<string, Array<[string, any, any]>>();
    completedMarkets.forEach(([id, mkt, marks]) => {
      // Use campaign from market config, fallback to subgraph, then "Other"
      const marketConfig = (mkt as GenesisMarketConfig);
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
        const g = (mkt as GenesisMarketConfig).addresses?.genesis as `0x${string}` | undefined;
        const mktChainId = (mkt as GenesisMarketConfig)?.chainId ?? 1;
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
      const g = (mkt as GenesisMarketConfig).addresses?.genesis as `0x${string}` | undefined;
      const mktChainId = (mkt as GenesisMarketConfig)?.chainId ?? 1;
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
      minterAddress: (mkt as GenesisMarketConfig).addresses?.minter as `0x${string}`,
      pegTarget: (mkt as GenesisMarketConfig).pegTarget || "USD",
    }));
  }, [genesisMarkets]);

  const tokenPricesByMarket = useMultipleTokenPrices(marketTokenPriceInputs);

  const buildShareMessage = (
    marketName: string,
    peggedSymbolNoPrefix: string
  ) => {
    return `The ${marketName} market is live on @0xharborfi — Maiden voyage 2.0. Become a shareholder: ${peggedSymbolNoPrefix} and leveraged ${marketName} at harborfinance.io\n\n$TIDE airdrop and ledger marks for early Harbor liquidity.`;
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
        (mkt as GenesisMarketConfig).addresses?.collateralPrice as `0x${string}` | undefined
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
      ([_, mkt]) => (mkt as GenesisMarketConfig)?.collateral?.symbol?.toLowerCase() === "wsteth"
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
    activeCampaignName,
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

  const filterGenesisPairs = <T,>(entries: Array<[string, T]>) => {
    if (chainFilterSelected.includes(FILTER_NONE_SENTINEL)) return [];
    if (chainFilterSelected.length === 0) return entries;
    return entries.filter(([, m]) => {
      const chainName = (m as { chain?: { name?: string } }).chain?.name || "Ethereum";
      return chainFilterSelected.includes(chainName);
    });
  };

  const filterGenesisTriples = <T, U,>(entries: Array<[string, T, U]>) => {
    if (chainFilterSelected.includes(FILTER_NONE_SENTINEL)) return [];
    if (chainFilterSelected.length === 0) return entries;
    return entries.filter(([, m]) => {
      const chainName = (m as { chain?: { name?: string } }).chain?.name || "Ethereum";
      return chainFilterSelected.includes(chainName);
    });
  };

  const displayedArchivedLiveMarkets = useMemo(
    () => filterGenesisPairs(archivedLiveMarkets),
    [archivedLiveMarkets, chainFilterSelected]
  );

  const displayedArchivedCompletedMarkets = useMemo(
    () => filterGenesisTriples(archivedCompletedMarkets),
    [archivedCompletedMarkets, chainFilterSelected]
  );

  const archivedGenesisCount =
    displayedArchivedLiveMarkets.length + displayedArchivedCompletedMarkets.length;

  const activeGenesisTvlUsd = useMemo(() => {
    if (!totalDepositsReads || !collateralPricesMap) return 0;
    const activeIds = new Set(activeMarkets.map(([id]) => id));
    let total = 0;

    genesisMarkets.forEach(([id, mkt], marketIndex) => {
      if (!activeIds.has(id)) return;
      if (!genesisParticipatesInMaidenVoyageTotals(mkt)) return;
      const totalDeposits = totalDepositsReads?.[marketIndex]?.result as bigint | undefined;
      if (!totalDeposits || totalDeposits <= 0n) return;

      const oracleAddress = (mkt as GenesisMarketConfig).addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
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

      const oracleAddress = (mkt as GenesisMarketConfig).addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
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
              combinedMarketsWithIndexerErrors={combinedMarketsWithIndexerErrors}
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
              activeCampaignName,
              displayedCompletedByCampaignSize: displayedCompletedByCampaign.size,
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
              openManageModal={openManageModal}
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
