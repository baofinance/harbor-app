"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useAccount,
  useContractReads,
  useContractRead,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { formatEther } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { markets } from "../../config/markets";
import { GenesisManageModal } from "@/components/GenesisManageModal";
import { contracts } from "../../config/contracts";
import {
  GENESIS_ABI,
  ERC20_ABI,
  CHAINLINK_ORACLE_ABI,
  HARBOR_ORACLE_WITH_DECIMALS_ABI,
} from "@/abis/shared";
import {
  ArrowRightIcon,
  GiftIcon,
  ScaleIcon,
  GlobeAltIcon,
  WalletIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  StarIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import InfoTooltip from "@/components/InfoTooltip";
import SimpleTooltip from "@/components/SimpleTooltip";
import Image from "next/image";
import {
  useAllHarborMarks,
  useAllMarketBonusStatus,
} from "@/hooks/useHarborMarks";
import { useMinterTokenMeta } from "@/hooks/useMinterTokenMeta";
import {
  formatUSD,
  formatToken,
  formatTimeRemaining,
  formatDateTime,
} from "@/utils/formatters";
import { EtherscanLink, getLogoPath, TokenLogo } from "@/components/shared";
import { MINTER_ABI } from "@/abis/shared";
import Link from "next/link";
import { useCoinGeckoPrices } from "@/hooks/useCoinGeckoPrice";
import { useMultipleTokenPrices } from "@/hooks/useTokenPrices";
import { useMultipleCollateralPrices } from "@/hooks/useCollateralPrice";
import { useWstETHAPR } from "@/hooks/useWstETHAPR";
import { useFxSAVEAPR } from "@/hooks/useFxSAVEAPR";
import { useTotalGenesisTVL } from "@/hooks/useTotalGenesisTVL";
import { useTotalMaidenVoyageMarks } from "@/hooks/useTotalMaidenVoyageMarks";
import { getAcceptedDepositAssets } from "@/utils/markets";
import TideAPRTooltip from "@/components/TideAPRTooltip";
import { GenesisErrorBanner } from "@/components/GenesisErrorBanner";
import { GenesisMarketExpandedView } from "@/components/GenesisMarketExpandedView";
import { useSortedGenesisMarkets } from "@/hooks/useSortedGenesisMarkets";
import { GenesisHeaderSummary } from "@/components/GenesisHeaderSummary";
import { GenesisLedgerMarksSummary } from "@/components/GenesisLedgerMarksSummary";
import {
  calculateTideAPR,
  calculateMarksForAPR,
  calculateMarksBreakdown,
  calculateTideAPRBreakdown,
} from "@/utils/tideAPR";
import {
  calculateTokenAllocationPercent,
  calculateTokenAllocationAmount,
  calculateTokenPrice,
  TOTAL_TOKEN_SUPPLY,
  DEFAULT_FDV,
} from "@/utils/tokenAllocation";

// Use ERC20_ABI which includes symbol
const erc20SymbolABI = ERC20_ABI;

// Oracle ABIs - Harbor tuple and Chainlink single-value
const chainlinkOracleABI = HARBOR_ORACLE_WITH_DECIMALS_ABI;
const chainlinkOracleSingleValueABI = CHAINLINK_ORACLE_ABI;

function MarketExpandedView({
  marketId,
  market,
  genesisAddress,
  totalDeposits,
  totalDepositsUSD,
  userDeposit,
  isConnected,
  address,
  endDate,
  collateralSymbol,
  collateralPriceUSD,
  peggedSymbol,
  leveragedSymbol,
  underlyingAPR,
}: {
  marketId: string;
  market: any;
  genesisAddress: string | undefined;
  totalDeposits: bigint | undefined;
  totalDepositsUSD: number;
  userDeposit: bigint | undefined;
  isConnected: boolean;
  address: string | undefined;
  endDate: string | undefined;
  collateralSymbol: string;
  collateralPriceUSD: number;
  peggedSymbol?: string;
  leveragedSymbol?: string;
  underlyingAPR?: number | null;
}) {
  // Fetch contract data for expanded view
  const { data: expandedReads, error: expandedReadsError } = useContractReads({
    contracts:
      genesisAddress &&
      typeof genesisAddress === "string" &&
      genesisAddress.startsWith("0x") &&
      genesisAddress.length === 42
        ? [
            {
              address: genesisAddress as `0x${string}`,
              abi: GENESIS_ABI,
              functionName: "PEGGED_TOKEN" as const,
            },
            {
              address: genesisAddress as `0x${string}`,
              abi: GENESIS_ABI,
              functionName: "LEVERAGED_TOKEN" as const,
            },
            {
              address: genesisAddress as `0x${string}`,
              abi: GENESIS_ABI,
              functionName: "WRAPPED_COLLATERAL_TOKEN" as const,
            },
          ]
        : [],
    query: {
      enabled:
        !!genesisAddress &&
        typeof genesisAddress === "string" &&
        genesisAddress.startsWith("0x") &&
        genesisAddress.length === 42,
      retry: 1,
      retryOnMount: false,
    },
  });

  const peggedTokenAddress = expandedReads?.[0]?.result as
    | `0x${string}`
    | undefined;
  const leveragedTokenAddress = expandedReads?.[1]?.result as
    | `0x${string}`
    | undefined;
  const collateralTokenAddress = expandedReads?.[2]?.result as
    | `0x${string}`
    | undefined;

  // Get token symbols
  const { data: tokenSymbols, error: tokenSymbolsError } = useContractReads({
    contracts: [
      ...(peggedTokenAddress &&
      typeof peggedTokenAddress === "string" &&
      peggedTokenAddress.startsWith("0x") &&
      peggedTokenAddress.length === 42
        ? [
            {
              address: peggedTokenAddress,
              abi: erc20SymbolABI,
              functionName: "symbol" as const,
            },
          ]
        : []),
      ...(leveragedTokenAddress &&
      typeof leveragedTokenAddress === "string" &&
      leveragedTokenAddress.startsWith("0x") &&
      leveragedTokenAddress.length === 42
        ? [
            {
              address: leveragedTokenAddress,
              abi: erc20SymbolABI,
              functionName: "symbol" as const,
            },
          ]
        : []),
      ...(collateralTokenAddress &&
      typeof collateralTokenAddress === "string" &&
      collateralTokenAddress.startsWith("0x") &&
      collateralTokenAddress.length === 42
        ? [
            {
              address: collateralTokenAddress,
              abi: erc20SymbolABI,
              functionName: "symbol" as const,
            },
          ]
        : []),
    ],
    query: {
      enabled:
        (!!peggedTokenAddress &&
          typeof peggedTokenAddress === "string" &&
          peggedTokenAddress.startsWith("0x") &&
          peggedTokenAddress.length === 42) ||
        (!!leveragedTokenAddress &&
          typeof leveragedTokenAddress === "string" &&
          leveragedTokenAddress.startsWith("0x") &&
          leveragedTokenAddress.length === 42) ||
        (!!collateralTokenAddress &&
          typeof collateralTokenAddress === "string" &&
          collateralTokenAddress.startsWith("0x") &&
          collateralTokenAddress.length === 42),
      retry: 1,
      retryOnMount: false,
    },
  });

  const peggedTokenSymbol =
    peggedSymbol ||
    (peggedTokenAddress && tokenSymbols?.[0]?.result
      ? (tokenSymbols[0].result as string)
      : market.peggedToken?.symbol) ||
    "ha";
  const leveragedTokenSymbol =
    leveragedSymbol ||
    (leveragedTokenAddress && tokenSymbols?.[1]?.result
      ? (tokenSymbols[1].result as string)
      : market.leveragedToken?.symbol) ||
    "hs";
  const collateralTokenSymbol =
    collateralTokenAddress && tokenSymbols?.[2]?.result
      ? (tokenSymbols[2].result as string)
      : market.collateral?.symbol || "ETH";

  // Calculate USD values
  const userDepositAmount = userDeposit ? Number(formatEther(userDeposit)) : 0;
  const userDepositUSD = userDepositAmount * collateralPriceUSD;

  // Calculate ledger marks (dollar value x 100)
  const estimatedLedgerMarks = userDepositUSD * 100;

  // Calculate share of ledger marks (% of deposit)
  const shareOfLedgerMarks =
    totalDepositsUSD > 0 && userDepositUSD > 0
      ? (userDepositUSD / totalDepositsUSD) * 100
      : 0;

  // Format end date/time
  const formatEndDateTime = (dateString: string | undefined): string => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "-";
    }
  };

  const addresses = market.addresses as Record<string, string | undefined>;

  // Get market name for description - use leveraged token symbol without "hs" prefix
  // This gives us "FXUSD-BTC" from "hsFXUSD-BTC", etc.
  const marketName =
    leveragedTokenSymbol && leveragedTokenSymbol.toLowerCase().startsWith("hs")
      ? leveragedTokenSymbol.slice(2)
      : leveragedTokenSymbol || (market as any).name || "Market";

  return (
    <div className="bg-[rgb(var(--surface-selected-rgb))] p-4 border-t border-white/20">
      {/* Description Box */}
      <div className="bg-white p-4 mb-2 border border-[#1E4775]/10">
        <p className="text-xs text-[#1E4775] leading-relaxed">
          Earn ledger marks for providing liquidity to the{" "}
          <span className="font-semibold">{marketName}</span> market.{" "}
          <span className="font-semibold">{collateralTokenSymbol}</span> is
          split into equal portions of{" "}
          <span className="font-semibold">{peggedTokenSymbol}</span> and{" "}
          <span className="font-semibold">{leveragedTokenSymbol}</span>, which
          are minted on claim. Until you claim, you have{" "}
          <span className="font-semibold">{collateralTokenSymbol}</span>{" "}
          exposure. After you claim your net exposure depends on the balance of
          the market compared to your balance of{" "}
          <span className="font-semibold">{peggedTokenSymbol}</span> and{" "}
          <span className="font-semibold">{leveragedTokenSymbol}</span> tokens.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* First Column: End Date/Time and Projected APR */}
        <div className="flex flex-col gap-2 h-full">
          {/* Genesis Info */}
          <div className="bg-white p-2 flex flex-col justify-center">
            <h3 className="text-[#1E4775] font-semibold mb-1 text-xs text-center">
              End Date/Time
            </h3>
            <p className="text-sm font-bold text-[#1E4775] text-center">
              {formatDateTime(endDate)}
            </p>
          </div>

          {/* Projected Stability Pool APR */}
          {underlyingAPR !== null && underlyingAPR !== undefined && (
            <div className="text-xs text-white bg-[#1E4775] px-4 py-2 text-center flex-1 flex flex-col justify-center">
              <div className="font-semibold mb-1">
                Projected {peggedTokenSymbol} APR (Stability pools)
              </div>
              <div>
                <span className="font-semibold">
                  {(underlyingAPR * 2 * 100).toFixed(2)}% +
                </span>
                <Image
                  src="/icons/marks.png"
                  alt="Marks"
                  width={20}
                  height={20}
                  className="inline-block ml-1 align-middle"
                />
              </div>
            </div>
          )}
        </div>

        {/* Contract Info */}
        <div className="bg-white p-2 flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-1 text-xs">
            Contract Info
          </h3>
          <div>
            <EtherscanLink label="Genesis" address={addresses.genesis} />
            <EtherscanLink label="Minter" address={addresses.minter} />
            <EtherscanLink
              label="Collateral Token"
              address={addresses.collateralToken}
            />
            <EtherscanLink label="ha Token" address={peggedTokenAddress} />
            <EtherscanLink label="hs Token" address={leveragedTokenAddress} />
          </div>
        </div>

        <div className="bg-white p-2 flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-1 text-xs">Tokens</h3>
          <div className="space-y-1 text-xs flex-1 flex justify-center flex-col">
            <div className="flex justify-between items-center">
              <span className="text-[#1E4775]/70">Market Collateral:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#1E4775] font-mono">
                  {collateralTokenSymbol}
                </span>
                <Image
                  src={getLogoPath(collateralTokenSymbol)}
                  alt={collateralTokenSymbol}
                  width={20}
                  height={20}
                  className="flex-shrink-0"
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#1E4775]/70">ha Token:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#1E4775] font-mono">
                  {peggedTokenSymbol}
                </span>
                <Image
                  src={getLogoPath(peggedTokenSymbol)}
                  alt={peggedTokenSymbol}
                  width={20}
                  height={20}
                  className="flex-shrink-0"
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#1E4775]/70">hs Token:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#1E4775] font-mono">
                  {leveragedTokenSymbol}
                </span>
                <Image
                  src={getLogoPath(leveragedTokenSymbol)}
                  alt={leveragedTokenSymbol}
                  width={20}
                  height={20}
                  className="flex-shrink-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GenesisIndexPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
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

  const genesisMarkets = useMemo(
    () =>
      Object.entries(markets).filter(([_, mkt]) => {
        const genesisAddr = (mkt as any).addresses?.genesis;
        return (
          genesisAddr &&
          genesisAddr !== "0x0000000000000000000000000000000000000000" &&
          (mkt as any).status !== "coming-soon"
        );
      }),
    []
  );

  const comingSoonMarkets = useMemo(
    () =>
      Object.entries(markets).filter(
        ([_, mkt]) =>
          (mkt as any).status === "coming-soon" &&
          (mkt as any).marksCampaign?.id === "metals-maiden-voyage"
      ),
    []
  );

  // Get all genesis addresses for subgraph queries
  // Filter out zero addresses (coming soon markets use placeholder addresses)
  const genesisAddresses = useMemo(
    () =>
      genesisMarkets
        .map(([_, mkt]) => (mkt as any).addresses?.genesis)
        .filter(
          (addr): addr is string =>
            !!addr &&
            typeof addr === "string" &&
            addr !== "0x0000000000000000000000000000000000000000"
        ),
    [genesisMarkets]
  );

  // Fetch marks data from subgraph
  const {
    data: allMarksData,
    isLoading: isLoadingMarks,
    refetch: refetchMarks,
    error: marksError,
  } = useAllHarborMarks(genesisAddresses);

  // Extract results and error info from the new structure
  const marksResults = allMarksData?.results || [];
  const hasIndexerErrors = allMarksData?.hasIndexerErrors || false;
  const hasAnyErrors = allMarksData?.hasAnyErrors || false;
  const marketsWithIndexerErrors = allMarksData?.marketsWithIndexerErrors || [];
  const marketsWithOtherErrors = allMarksData?.marketsWithOtherErrors || [];

  // Map genesis addresses to market names for error display
  const getMarketName = (genesisAddress: string) => {
    const market = genesisMarkets.find(
      ([_, mkt]) =>
        (mkt as any).addresses?.genesis?.toLowerCase() ===
        genesisAddress.toLowerCase()
    );
    if (!market)
      return genesisAddress.slice(0, 6) + "..." + genesisAddress.slice(-4);
    const [id, mkt] = market;
    const rowLeveragedSymbol = (mkt as any).rowLeveragedSymbol;
    if (
      rowLeveragedSymbol &&
      rowLeveragedSymbol.toLowerCase().startsWith("hs")
    ) {
      return rowLeveragedSymbol.slice(2);
    }
    return rowLeveragedSymbol || (mkt as any).name || id;
  };

  // Fetch market bonus status for all markets (early deposit bonus tracking)
  const { data: allMarketBonusStatus, isLoading: isLoadingBonusStatus } =
    useAllMarketBonusStatus(genesisAddresses);

  // Extract error info from bonus status
  const bonusStatusResults = allMarketBonusStatus?.results || [];
  const bonusHasIndexerErrors = allMarketBonusStatus?.hasIndexerErrors || false;
  const bonusHasAnyErrors = allMarketBonusStatus?.hasAnyErrors || false;
  const bonusMarketsWithIndexerErrors =
    allMarketBonusStatus?.marketsWithIndexerErrors || [];
  const bonusMarketsWithOtherErrors =
    allMarketBonusStatus?.marketsWithOtherErrors || [];

  // Combine errors from marks and bonus status
  const combinedHasIndexerErrors = hasIndexerErrors || bonusHasIndexerErrors;
  const combinedHasAnyErrors = hasAnyErrors || bonusHasAnyErrors;
  const combinedMarketsWithIndexerErrors = Array.from(
    new Set([...marketsWithIndexerErrors, ...bonusMarketsWithIndexerErrors])
  );
  const combinedMarketsWithOtherErrors = Array.from(
    new Set([...marketsWithOtherErrors, ...bonusMarketsWithOtherErrors])
  );

  // Oracle pricing failed: user has deposit but subgraph reports 0 USD (oracle unavailable)
  const marketsWithOraclePricingError = useMemo(() => {
    const list: string[] = [];
    (marksResults || []).forEach((r: { genesisAddress?: string; data?: { userHarborMarks?: { currentDeposit?: string; currentDepositUSD?: string } }; errors?: unknown[] }) => {
      const marks = r.data?.userHarborMarks;
      if (!marks || r.errors?.length) return;
      const currentDeposit = parseFloat(marks.currentDeposit || "0");
      const currentDepositUSD = parseFloat(marks.currentDepositUSD || "0");
      if (currentDeposit > 0 && currentDepositUSD === 0 && r.genesisAddress) {
        list.push(r.genesisAddress);
      }
    });
    return list;
  }, [marksResults]);
  const hasOraclePricingError = marketsWithOraclePricingError.length > 0;

  const queryClient = useQueryClient();

  // Index layout per market: [isEnded, balanceOf?, claimable?]
  // Note: totalDeposits() doesn't exist in IGenesis interface
  // We'll get total deposits by checking the collateral token balance of the genesis contract
  // Use Anvil-specific hook to ensure reads go to Anvil network
  const genesisReadContracts = useMemo(() => {
    return genesisMarkets.flatMap(([_, mkt]) => {
      const g = (mkt as any).addresses?.genesis as `0x${string}` | undefined;
      if (!g || typeof g !== "string" || !g.startsWith("0x") || g.length !== 42)
        return [];
      const base = [
        {
          address: g,
          abi: GENESIS_ABI,
          functionName: "genesisIsEnded" as const,
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
              },
              {
                address: g,
                abi: GENESIS_ABI,
                functionName: "claimable" as const,
                args: [address as `0x${string}`],
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

  // Chainlink BTC/USD Oracle on Mainnet (fallback when CoinGecko fails)
  const CHAINLINK_BTC_USD_ORACLE =
    "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c" as `0x${string}`;

  // Fetch Chainlink BTC/USD as fallback for BTC-pegged markets
  const { data: chainlinkBtcPriceData } = useContractRead({
    address: CHAINLINK_BTC_USD_ORACLE,
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

  return (
    <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
      <main className="container mx-auto px-4 sm:px-10 pb-6">
        <GenesisHeaderSummary />

        {/* Divider */}
        <div className="border-t border-white/10 my-2"></div>

        {/* Subgraph Error Banner */}
        {marksError && (
          <div className="bg-[#FF8A7A]/10 border border-[#FF8A7A]/30 rounded p-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-[#FF8A7A] text-xl mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-[#FF8A7A] font-semibold text-sm mb-1">
                  Harbor Marks Subgraph Error
                </p>
                <p className="text-white/70 text-xs">
                  Unable to load Harbor Marks data. This may be due to rate
                  limiting or service issues. Your deposits and core
                  functionality remain unaffected.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Ledger Marks Section */}
        {(() => {
          // Calculate total marks from subgraph data (only maiden voyage/genesis marks)
          // First, determine which campaign to show (prioritize active campaigns)
          const campaignInfo = new Map<string, { label: string; isActive: boolean; marks: number; campaignId?: string }>();
          
          // First pass: collect campaign info to determine which campaign to display
          if (process.env.NODE_ENV === "development") {
            console.log("[Marks Results] Total results received", {
              totalResults: marksResults?.length || 0,
              genesisAddressesQueried: genesisAddresses,
              results: marksResults?.map(r => ({
                genesisAddress: r.genesisAddress,
                hasData: !!r.data?.userHarborMarks,
                campaignId: r.data?.userHarborMarks?.campaignId,
                campaignLabel: r.data?.userHarborMarks?.campaignLabel,
                currentDepositUSD: r.data?.userHarborMarks?.currentDepositUSD,
                hasErrors: r.errors?.length > 0,
              })) || [],
            });
          }
          
          if (marksResults && marksResults.length > 0 && !isLoadingMarks) {
            marksResults.forEach((result) => {
              const userMarksData = result.data?.userHarborMarks;
              const marks = Array.isArray(userMarksData) ? userMarksData[0] : userMarksData;
              
              const market = genesisMarkets.find(
                ([_, mkt]) =>
                  (mkt as any).addresses?.genesis?.toLowerCase() ===
                  result.genesisAddress?.toLowerCase()
              );
              
              if (!market) return;
              
              // Use campaign from market config, fallback to subgraph
              const marketConfig = market[1] as any;
              const campaignLabel = marketConfig?.marksCampaign?.label || marks?.campaignLabel;
              const campaignId = marketConfig?.marksCampaign?.id || marks?.campaignId;
              
              if (!campaignLabel) return;
              
              let contractSaysEnded: boolean | undefined;
              const marketIndex = genesisMarkets.findIndex(([id]) => id === market[0]);
              if (marketIndex >= 0) {
                const baseOffset = marketIndex * (isConnected ? 3 : 1);
                const contractReadResult = reads?.[baseOffset];
                contractSaysEnded =
                  contractReadResult?.status === "success"
                    ? (contractReadResult.result as boolean)
                    : undefined;
              }
              
              const genesisEnded =
                contractSaysEnded !== undefined
                  ? contractSaysEnded
                  : marks?.genesisEnded || false;
              
              const originalCurrentMarks = parseFloat(marks?.currentMarks || "0");
              const currentDepositUSD = parseFloat(marks?.currentDepositUSD || "0");
              const genesisStartDate = parseInt(marks?.genesisStartDate || "0");
              const lastUpdated = parseInt(marks?.lastUpdated || "0");
              const currentTime = Math.floor(Date.now() / 1000);
              
              let currentMarks = originalCurrentMarks;
              if (!genesisEnded && currentDepositUSD > 0 && genesisStartDate > 0) {
                const timeElapsed = currentTime - lastUpdated;
                const daysElapsed = Math.max(0, timeElapsed / 86400);
                const marksAccumulated = currentDepositUSD * 10 * daysElapsed;
                currentMarks = currentMarks + marksAccumulated;
              }
              
              const existing = campaignInfo.get(campaignLabel) || {
                label: campaignLabel,
                isActive: false,
                marks: 0,
                campaignId: campaignId,
              };
              existing.isActive = existing.isActive || !genesisEnded;
              existing.marks += currentMarks;
              campaignInfo.set(campaignLabel, existing);
            });
          }
          
          // Determine which campaign to show (prioritize active, then by marks)
          const campaigns = Array.from(campaignInfo.values());
          const activeCampaigns = campaigns.filter(c => c.isActive);
          const campaignsToConsider = activeCampaigns.length > 0 ? activeCampaigns : campaigns;
          campaignsToConsider.sort((a, b) => b.marks - a.marks);
          const selectedCampaign = campaignsToConsider[0];
          const selectedCampaignId = selectedCampaign?.campaignId;
          
          if (process.env.NODE_ENV === "development") {
            console.log("[Campaign Selection]", {
              allCampaigns: Array.from(campaignInfo.entries()).map(([label, info]) => ({
                label,
                campaignId: info.campaignId,
                isActive: info.isActive,
                marks: info.marks,
              })),
              selectedCampaign: selectedCampaign ? {
                label: selectedCampaign.label,
                campaignId: selectedCampaign.campaignId,
                isActive: selectedCampaign.isActive,
                marks: selectedCampaign.marks,
              } : null,
              selectedCampaignId,
              totalMarksResults: marksResults?.length || 0,
            });
          }
          
          // Now calculate totals only for the selected campaign
          let totalCurrentMarks = 0;
          let totalMarksPerDay = 0;
          let totalBonusAtEnd = 0;
          let totalEarlyBonusMarks = 0;
          let totalEarlyBonusEstimate = 0;
          let anyGenesisStillActive = false;

          // Check if ALL genesis contracts have ended based on contract reads
          // This is the authoritative check - bonus marks are only "Applied" when contract says so
          const allContractsEnded = genesisMarkets.every(([_, mkt], mi) => {
            const baseOffset = mi * (isConnected ? 3 : 1);
            const contractSaysEnded = reads?.[baseOffset]?.result as
              | boolean
              | undefined;
            return contractSaysEnded === true;
          });

          // Check if any genesis is in "processing" state (time expired but contract not ended)
          const anyInProcessing = genesisMarkets.some(([_, mkt], mi) => {
            const baseOffset = mi * (isConnected ? 3 : 1);
            const contractSaysEnded = reads?.[baseOffset]?.result as
              | boolean
              | undefined;
            const endDate = (mkt as any).genesis?.endDate;
            const timeHasExpired = endDate
              ? new Date(endDate).getTime() <= Date.now()
              : false;
            return timeHasExpired && !contractSaysEnded;
          });

          if (marksResults && marksResults.length > 0 && !isLoadingMarks) {
            const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds

            marksResults.forEach((result) => {
              // Handle both array and single object responses from GraphQL
              const userMarksData = result.data?.userHarborMarks;
              // Get a reference to the marks object - but we'll read values directly to avoid mutations
              const marks = Array.isArray(userMarksData)
                ? userMarksData[0]
                : userMarksData;

              if (marks) {
                // Find the market to get campaign from config
                const market = genesisMarkets.find(
                  ([_, mkt]) =>
                    (mkt as any).addresses?.genesis?.toLowerCase() ===
                    result.genesisAddress?.toLowerCase()
                );
                
                // Use campaign ID from market config, fallback to subgraph
                const marketConfig = market?.[1] as any;
                const marketCampaignId = marketConfig?.marksCampaign?.id || marks?.campaignId;
                
                // Only process marks from the selected campaign
                if (selectedCampaignId && marketCampaignId !== selectedCampaignId) {
                  if (process.env.NODE_ENV === "development") {
                    console.log("[Campaign Filter] Skipping marks from different campaign", {
                      genesisAddress: result.genesisAddress,
                      marketCampaignId,
                      selectedCampaignId,
                      currentDepositUSD: marks.currentDepositUSD,
                    });
                  }
                  return; // Skip marks from other campaigns
                }
                
                if (process.env.NODE_ENV === "development") {
                  console.log("[Campaign Marks] Processing marks for campaign", {
                    genesisAddress: result.genesisAddress,
                    campaignId: marks.campaignId,
                    campaignLabel: marks.campaignLabel,
                    currentDepositUSD: marks.currentDepositUSD,
                    currentMarks: marks.currentMarks,
                  });
                }
                
                // Read the original subgraph value ONCE at the start - don't mutate the object
                const originalCurrentMarks = parseFloat(
                  marks.currentMarks || "0"
                );
                const bonusMarks = parseFloat(marks.bonusMarks || "0");

                // Use contract's genesisIsEnded() as authoritative source
                // (market already found above for campaign filtering)
                // Fallback to subgraph value if contract read is not available
                let contractSaysEnded: boolean | undefined;
                if (market) {
                  const marketIndex = genesisMarkets.findIndex(
                    ([id]) => id === market[0]
                  );
                  if (marketIndex >= 0) {
                    const baseOffset = marketIndex * (isConnected ? 3 : 1);
                    const contractReadResult = reads?.[baseOffset];
                    contractSaysEnded =
                      contractReadResult?.status === "success"
                        ? (contractReadResult.result as boolean)
                        : undefined;
                  }
                }

                // Use contract value if available, otherwise fall back to subgraph
                const genesisEnded =
                  contractSaysEnded !== undefined
                    ? contractSaysEnded
                    : marks.genesisEnded || false;

                if (!genesisEnded) {
                  anyGenesisStillActive = true;
                }
                const genesisStartDate = parseInt(
                  marks.genesisStartDate || "0"
                );
                const lastUpdated = parseInt(marks.lastUpdated || "0");

                // Use subgraph's USD value - it's the source of truth
                // The subgraph calculates currentDepositUSD using real-time oracle prices
                const currentDepositUSD = parseFloat(
                  marks.currentDepositUSD || "0"
                );

                // Use subgraph's marksPerDay - it's the source of truth
                // The subgraph updates this daily with current prices
                const marksPerDay = parseFloat(marks.marksPerDay || "0");

                // Calculate current marks dynamically based on time elapsed since last update
                // Marks accumulate at 10 marks per dollar per day
                // IMPORTANT: Always start from the original subgraph value to prevent accumulation bugs
                // The subgraph's currentMarks includes:
                // - Accumulated marks from deposits (10 marks per dollar per day) up to lastUpdated
                // - Bonus marks (100 marks per dollar) if genesis has ended
                // - Forfeited marks from withdrawals
                // We add marks accumulated since lastUpdated to get the current total
                let currentMarks = originalCurrentMarks;

                // If genesis has ended, the subgraph's currentMarks already includes:
                // - All accumulated marks up to genesis end
                // - Bonus marks (100 marks per dollar)
                // We should use it directly without recalculating
                if (genesisEnded) {
                  // Genesis has ended - use subgraph's currentMarks directly (includes bonus)
                  // No need to accumulate more marks
                } else if (currentDepositUSD > 0 && genesisStartDate > 0) {
                  // Calculate time elapsed since last update (not since genesis start)
                  // This ensures we only accumulate marks for the time since the last event (deposit/withdraw)
                  // The subgraph's currentMarks already includes all marks up to lastUpdated, including forfeitures
                  const timeElapsed = currentTime - lastUpdated;
                  const daysElapsed = Math.max(0, timeElapsed / 86400); // Convert seconds to days, ensure non-negative

                  // Add marks accumulated since last update
                  // Use the CURRENT deposit USD (after any withdrawals) to calculate new marks
                  // 10 marks per dollar per day
                  const marksAccumulated = currentDepositUSD * 10 * daysElapsed;
                  currentMarks = currentMarks + marksAccumulated;
                }

                // DO NOT mutate the original subgraph data - this causes marks to compound on each render
                // Instead, use currentMarks directly for display and calculations
                // The APR calculation will use calculateMarksForAPR which handles bonus marks separately

                totalCurrentMarks += currentMarks;
                totalMarksPerDay += marksPerDay;
                
                if (process.env.NODE_ENV === "development") {
                  console.log("[Campaign Totals] After adding market", {
                    genesisAddress: result.genesisAddress,
                    marketDepositUSD: currentDepositUSD,
                    marketMarksPerDay: marksPerDay,
                    marketCurrentMarks: currentMarks,
                    runningTotalMarks: totalCurrentMarks,
                    runningTotalMarksPerDay: totalMarksPerDay,
                  });
                }

                // Debug logging for marks calculation
                if (process.env.NODE_ENV === "development") {
                  const marksAccumulated = genesisEnded
                    ? 0
                    : currentMarks - originalCurrentMarks;
                  console.log("[Marks Calculation]", {
                    genesisAddress: result.genesisAddress,
                    subgraphCurrentMarks: originalCurrentMarks,
                    calculatedCurrentMarks: currentMarks,
                    marksAccumulated: marksAccumulated,
                    subgraphCurrentDepositUSD: currentDepositUSD,
                    subgraphMarksPerDay: marksPerDay,
                    bonusAtEnd:
                      !genesisEnded && currentDepositUSD > 0
                        ? currentDepositUSD * 100
                        : 0,
                    lastUpdated:
                      lastUpdated > 0
                        ? new Date(lastUpdated * 1000).toISOString()
                        : "N/A",
                    timeSinceUpdate:
                      lastUpdated > 0
                        ? `${Math.floor(
                            (currentTime - lastUpdated) / 3600
                          )} hours`
                        : "N/A",
                    daysElapsed:
                      lastUpdated > 0 ? (currentTime - lastUpdated) / 86400 : 0,
                    subgraphCurrentDeposit: marks.currentDeposit || "0",
                    note: "Subgraph is source of truth for currentDepositUSD and marksPerDay",
                  });
                }

                // Calculate bonus at end of genesis
                // Bonus is 100 marks per dollar deposited
                // Only calculate if genesis hasn't ended (bonus is given at end)
                if (!genesisEnded && currentDepositUSD > 0) {
                  const bonusAtEnd = currentDepositUSD * 100;
                  totalBonusAtEnd += bonusAtEnd;
                } else if (genesisEnded) {
                  // If genesis has ended, bonus is already included in currentMarks
                  // But we can still show what the bonus was by checking bonusMarks from subgraph
                  const bonusMarks = parseFloat(marks.bonusMarks || "0");
                  totalBonusAtEnd += bonusMarks;
                }

                // Calculate early deposit bonus
                const earlyBonusEligibleUSD = parseFloat(
                  marks.earlyBonusEligibleDepositUSD || "0"
                );
                const earlyBonusMarks = parseFloat(
                  marks.earlyBonusMarks || "0"
                );

                if (!genesisEnded && earlyBonusEligibleUSD > 0) {
                  // Estimate early bonus for eligible deposits
                  totalEarlyBonusEstimate += earlyBonusEligibleUSD * 100;
                } else if (genesisEnded && earlyBonusMarks > 0) {
                  // If genesis has ended, show actual early bonus earned
                  totalEarlyBonusMarks += earlyBonusMarks;
                }
              }
            });
          }

          return (
            <GenesisLedgerMarksSummary
              selectedCampaign={selectedCampaign}
              mounted={mounted}
              isLoadingMarks={isLoadingMarks}
              totalCurrentMarks={totalCurrentMarks}
              totalMarksPerDay={totalMarksPerDay}
              anyInProcessing={anyInProcessing}
              allContractsEnded={allContractsEnded}
              isConnected={isConnected}
              totalBonusAtEnd={totalBonusAtEnd}
              totalEarlyBonusEstimate={totalEarlyBonusEstimate}
              totalEarlyBonusMarks={totalEarlyBonusMarks}
            />
          );
        })()}

        {/* Token Allocation Progress Bar */}
        {(() => {
          // Calculate total TVL by summing deposits from all markets
          let calculatedTVL = 0;
          if (
            genesisMarkets.length > 0 &&
            totalDepositsReads &&
            collateralPricesMap
          ) {
            genesisMarkets.forEach(([id, mkt], mi) => {
              const totalDeposits = totalDepositsReads?.[mi]?.result as
                | bigint
                | undefined;
              if (!totalDeposits) return;

              const totalDepositsAmount = Number(formatEther(totalDeposits));

              // Get price using the same logic as in market rows
              const underlyingSymbol =
                (mkt as any).collateral?.underlyingSymbol ||
                (mkt as any).collateral?.symbol ||
                "ETH";
              const collateralSymbol = (mkt as any).collateral?.symbol || "ETH";
              const marketCoinGeckoId = (mkt as any)?.coinGeckoId as
                | string
                | undefined;

              // Priority 1: Hardcoded $1 for fxUSD
              let underlyingPriceUSD = 0;
              if (underlyingSymbol.toLowerCase() === "fxusd") {
                underlyingPriceUSD = 1.0;
              } else if (
                marketCoinGeckoId &&
                coinGeckoPrices[marketCoinGeckoId] &&
                coinGeckoPrices[marketCoinGeckoId]! > 0
              ) {
                underlyingPriceUSD = coinGeckoPrices[marketCoinGeckoId]!;
              } else {
                const oracleAddress = (mkt as any).addresses
                  ?.collateralPrice as `0x${string}` | undefined;
                const collateralPriceData = oracleAddress
                  ? collateralPricesMap.get(oracleAddress.toLowerCase())
                  : undefined;
                const underlyingPriceFromOracle =
                  collateralPriceData?.priceUSD || 0;
                if (underlyingPriceFromOracle > 0.01) {
                  underlyingPriceUSD = underlyingPriceFromOracle;
                }
              }

              // Calculate wrapped token price
              const oracleAddress = (mkt as any).addresses?.collateralPrice as
                | `0x${string}`
                | undefined;
              const collateralPriceData = oracleAddress
                ? collateralPricesMap.get(oracleAddress.toLowerCase())
                : undefined;
              const wrappedRate = collateralPriceData?.maxRate;

              const isWstETH = collateralSymbol.toLowerCase() === "wsteth";
              const isFxSAVE = collateralSymbol.toLowerCase() === "fxsave";
              const coinGeckoReturnedPrice =
                marketCoinGeckoId && coinGeckoPrices[marketCoinGeckoId];
              const coinGeckoIsWrappedToken =
                coinGeckoReturnedPrice &&
                ((marketCoinGeckoId?.toLowerCase() === "wrapped-steth" &&
                  isWstETH) ||
                  ((marketCoinGeckoId?.toLowerCase() === "fx-usd-saving" ||
                    marketCoinGeckoId?.toLowerCase() === "fxsave") &&
                    isFxSAVE));

              const stETHPrice = coinGeckoPrices["lido-staked-ethereum-steth"];
              const useStETHFallback =
                isWstETH &&
                !coinGeckoIsWrappedToken &&
                underlyingPriceUSD === 0 &&
                stETHPrice &&
                stETHPrice > 0 &&
                wrappedRate &&
                wrappedRate > 0n;

              const wrappedTokenPriceUSD =
                coinGeckoIsWrappedToken &&
                coinGeckoReturnedPrice &&
                coinGeckoReturnedPrice > 0
                  ? coinGeckoReturnedPrice
                  : useStETHFallback
                  ? stETHPrice! * (Number(wrappedRate) / 1e18)
                  : wrappedRate && underlyingPriceUSD > 0
                  ? underlyingPriceUSD * (Number(wrappedRate) / 1e18)
                  : isFxSAVE
                  ? 1.07
                  : underlyingPriceUSD;

              const totalDepositsUSD =
                totalDepositsAmount * wrappedTokenPriceUSD;
              calculatedTVL += totalDepositsUSD;
            });
          }

          // Use calculated TVL if available, otherwise fall back to safeTotalGenesisTVL
          const currentTVL =
            calculatedTVL > 0 ? calculatedTVL : safeTotalGenesisTVL;
          const currentAllocationPercent =
            calculateTokenAllocationPercent(currentTVL);
          const currentAllocationAmount =
            calculateTokenAllocationAmount(currentTVL);

          // Milestones
          // Note: < $1M = 1%, $1M-$10M = 1%-4%, $10M-$50M = 4%-10%
          const milestones = [
            {
              tvl: 0,
              label: "<$1M",
              percent: 0.01,
              allocation: TOTAL_TOKEN_SUPPLY * 0.01,
            }, // Base: 1% for any amount < $1M
            {
              tvl: 1_000_000,
              label: "$1M",
              percent: 0.01,
              allocation: TOTAL_TOKEN_SUPPLY * 0.01,
            }, // Still 1% at $1M
            {
              tvl: 10_000_000,
              label: "$10M",
              percent: 0.04,
              allocation: TOTAL_TOKEN_SUPPLY * 0.04,
            }, // 4% at $10M
            {
              tvl: 50_000_000,
              label: "$50M",
              percent: 0.1,
              allocation: TOTAL_TOKEN_SUPPLY * 0.1,
            }, // 10% at $50M
          ];

          // Calculate progress percentage
          // Progress bar represents: 0% = $0, 33.33% = $1M, 66.67% = $10M, 100% = $50M
          let progressPercent = 0;

          if (currentTVL < 1_000_000) {
            // < $1M: Show progress from 0% to 33.33% of the bar
            // Scale from $0 to $1M
            progressPercent = (currentTVL / 1_000_000) * 33.33;
          } else if (currentTVL < 10_000_000) {
            // $1M to $10M: Linear from 33.33% to 66.67% of the bar
            const segmentStart = 1_000_000;
            const segmentEnd = 10_000_000;
            const segmentProgress =
              (currentTVL - segmentStart) / (segmentEnd - segmentStart);
            progressPercent = 33.33 + segmentProgress * 33.34; // 33.33% at $1M, 66.67% at $10M
          } else if (currentTVL < 50_000_000) {
            // $10M to $50M: Linear from 66.67% to 100% of the bar
            const segmentStart = 10_000_000;
            const segmentEnd = 50_000_000;
            const segmentProgress =
              (currentTVL - segmentStart) / (segmentEnd - segmentStart);
            progressPercent = 66.67 + segmentProgress * 33.33; // 66.67% at $10M, 100% at $50M
          } else {
            // >= $50M: 100% progress (at the end)
            progressPercent = 100;
          }

          // Get next milestone
          let nextMilestone;
          let nextAllocationPercent;
          let nextAllocationAmount;

          if (currentTVL < 1_000_000) {
            // Next milestone is $1M (but still 1% allocation)
            nextMilestone = { tvl: 1_000_000, label: "$1M", percent: 0.01 };
            nextAllocationPercent = 0.01;
            nextAllocationAmount = TOTAL_TOKEN_SUPPLY * 0.01;
          } else if (currentTVL < 10_000_000) {
            // Next milestone is $10M (4% allocation)
            nextMilestone = { tvl: 10_000_000, label: "$10M", percent: 0.04 };
            nextAllocationPercent = 0.04;
            nextAllocationAmount = TOTAL_TOKEN_SUPPLY * 0.04;
          } else if (currentTVL < 50_000_000) {
            // Next milestone is $50M (10% allocation)
            nextMilestone = { tvl: 50_000_000, label: "$50M", percent: 0.1 };
            nextAllocationPercent = 0.1;
            nextAllocationAmount = TOTAL_TOKEN_SUPPLY * 0.1;
          } else {
            // Already at max
            nextMilestone = null;
            nextAllocationPercent = 0.1;
            nextAllocationAmount = TOTAL_TOKEN_SUPPLY * 0.1;
          }

          return (
            <>
              {/* Two Columns: Allocation (50%) | Allocated + FDV (50%) - HIDDEN */}
              {false && (
                <div className="grid grid-cols-1 gap-2 mb-2">
                  {/* Box 1: Maiden Voyage Airdrop Allocation (takes 50% of row) */}
                  <div className="bg-[#17395F] px-4 pt-4 pb-4">
                    <div className="text-xs font-medium text-white/70 uppercase tracking-wider mb-6 text-center">
                      Maiden Voyage Airdrop Allocation: Increases with TVL
                    </div>
                    {/* Combined Progress Bar */}
                    <div className="mt-3">
                      {/* TVL Labels above bar */}
                      <div className="flex items-center justify-between text-xs font-medium text-white/70 mb-1 relative">
                        <span>$0</span>
                        <span className="absolute left-[33.33%] transform -translate-x-1/2 text-center font-semibold">
                          $1M
                        </span>
                        <span className="absolute left-[66.67%] transform -translate-x-1/2 text-center font-semibold">
                          $10M
                        </span>
                        <span>$50M</span>
                      </div>

                      {/* Combined Progress Bar */}
                      <div className="relative w-full bg-gray-200 rounded-full h-1.5 min-w-[100px]">
                        {/* Progress fill with gradient segments */}
                        {(() => {
                          let progressPercent = 0;
                          let fillColor = "";

                          if (currentTVL < 1_000_000) {
                            // < $1M: Show progress from 0% to 33.33% of the bar
                            progressPercent = (currentTVL / 1_000_000) * 33.33;
                            fillColor = "bg-[#FF8A7A]";
                          } else if (currentTVL < 10_000_000) {
                            // $1M to $10M: Linear from 33.33% to 66.67% of the bar
                            const segmentStart = 1_000_000;
                            const segmentEnd = 10_000_000;
                            const segmentProgress =
                              (currentTVL - segmentStart) /
                              (segmentEnd - segmentStart);
                            progressPercent = 33.33 + segmentProgress * 33.34;
                            fillColor =
                              "bg-gradient-to-r from-[#FF8A7A] to-[#FFB84D]";
                          } else if (currentTVL < 50_000_000) {
                            // $10M to $50M: Linear from 66.67% to 100% of the bar
                            const segmentStart = 10_000_000;
                            const segmentEnd = 50_000_000;
                            const segmentProgress =
                              (currentTVL - segmentStart) /
                              (segmentEnd - segmentStart);
                            progressPercent = 66.67 + segmentProgress * 33.33;
                            fillColor = "bg-[#FFB84D]";
                          } else {
                            progressPercent = 100;
                            fillColor = "bg-[#FFB84D]";
                          }

                          return (
                            <>
                              <div
                                className={`absolute top-0 left-0 h-1.5 ${fillColor} rounded-full transition-all duration-500`}
                                style={{ width: `${progressPercent}%` }}
                              />
                              {currentTVL > 0 && currentTVL < 50_000_000 && (
                                <div
                                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow z-10"
                                  style={{
                                    left: `${progressPercent}%`,
                                    transform: "translateX(-50%)",
                                  }}
                                />
                              )}
                            </>
                          );
                        })()}

                        {/* Divider at $1M (33.33%) */}
                        <div className="absolute top-0 bottom-0 left-[33.33%] w-1 bg-white z-20 shadow-sm" />

                        {/* Divider at $10M (66.67%) */}
                        <div className="absolute top-0 bottom-0 left-[66.67%] w-1 bg-white z-20 shadow-sm" />

                        {/* Current TVL Tag inline with progress bar, pointing to indicator */}
                        {currentTVL > 0 &&
                          currentTVL < 50_000_000 &&
                          (() => {
                            let progressPercent = 0;
                            if (currentTVL < 1_000_000) {
                              progressPercent =
                                (currentTVL / 1_000_000) * 33.33;
                            } else if (currentTVL < 10_000_000) {
                              const segmentStart = 1_000_000;
                              const segmentEnd = 10_000_000;
                              const segmentProgress =
                                (currentTVL - segmentStart) /
                                (segmentEnd - segmentStart);
                              progressPercent = 33.33 + segmentProgress * 33.34;
                            } else if (currentTVL < 50_000_000) {
                              const segmentStart = 10_000_000;
                              const segmentEnd = 50_000_000;
                              const segmentProgress =
                                (currentTVL - segmentStart) /
                                (segmentEnd - segmentStart);
                              progressPercent = 66.67 + segmentProgress * 33.33;
                            }

                            // If progress > 50%, position tag on left with arrow on right
                            const isOver50Percent = progressPercent > 50;

                            return (
                              <div
                                className="absolute top-1/2 left-0 transform -translate-y-1/2 z-30 flex items-center"
                                style={{
                                  left: `${progressPercent}%`,
                                  ...(isOver50Percent
                                    ? {
                                        marginRight: "8px",
                                        transform: "translate(-100%, -50%)",
                                      }
                                    : { marginLeft: "8px" }),
                                }}
                              >
                                {isOver50Percent ? (
                                  <>
                                    {/* Tag on left */}
                                    <div className="bg-[#2C3E50] text-white text-xs font-semibold px-2.5 py-1 rounded-l shadow whitespace-nowrap">
                                      TVL: ${(currentTVL / 1_000).toFixed(0)}K
                                    </div>
                                    {/* Right-pointing arrow */}
                                    <div className="w-0 h-0 border-t-[7px] border-b-[7px] border-l-[7px] border-transparent border-l-[#2C3E50]"></div>
                                  </>
                                ) : (
                                  <>
                                    {/* Left-pointing arrow */}
                                    <div className="w-0 h-0 border-t-[7px] border-b-[7px] border-r-[7px] border-transparent border-r-[#2C3E50]"></div>
                                    {/* Tag on right */}
                                    <div className="bg-[#2C3E50] text-white text-xs font-semibold px-2.5 py-1 rounded-r shadow whitespace-nowrap">
                                      TVL: ${(currentTVL / 1_000).toFixed(0)}K
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                      </div>

                      {/* Allocation Labels below bar - aligned with TVL markers above */}
                      <div className="flex items-center justify-between text-xs font-medium text-white/70 mt-1 relative">
                        <span>1%</span>
                        <span className="absolute left-[33.33%] transform -translate-x-1/2 text-center">
                          1%
                        </span>
                        <span className="absolute left-[66.67%] transform -translate-x-1/2 text-center">
                          4%
                        </span>
                        <span>10%</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Allocated + FDV (takes 50% of row) */}
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Box 2: Allocated */}
                      <div className="bg-[#17395F] px-4 pt-3 pb-3">
                        <div className="text-xs font-medium text-white/70 uppercase tracking-wider mb-2 text-center">
                          Allocated
                        </div>
                        <div className="text-sm text-white/70 text-center">
                          <span className="text-white font-bold">
                            {(currentAllocationAmount / 1_000_000).toFixed(2)}M
                            $TIDE
                          </span>
                          <span className="text-white/60 ml-1">
                            <span className="text-white font-bold">
                              (est. $
                              {(() => {
                                const estimatedValue =
                                  currentAllocationAmount *
                                  calculateTokenPrice(fdv);
                                if (estimatedValue >= 1_000_000) {
                                  return (
                                    (estimatedValue / 1_000_000).toFixed(2) +
                                    "M"
                                  );
                                } else {
                                  return (
                                    (estimatedValue / 1_000).toFixed(0) + "k"
                                  );
                                }
                              })()}
                              )
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Box 3: FDV */}
                      <div className="bg-[#17395F] px-4 pt-3 pb-3">
                        <div className="text-xs font-medium text-white/70 uppercase tracking-wider mb-2 text-center">
                          FDV (Fully Diluted Valuation)
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={fdv / 1_000_000 || ""}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              if (inputValue === "") {
                                setFdv(0);
                              } else {
                                // Allow intermediate states like "0." or "0.5" while typing
                                const numValue = parseFloat(inputValue);
                                if (
                                  !isNaN(numValue) &&
                                  numValue >= 0 &&
                                  numValue <= 1000
                                ) {
                                  setFdv(numValue * 1_000_000);
                                } else if (
                                  inputValue === "0" ||
                                  inputValue === "0." ||
                                  inputValue.startsWith("0.")
                                ) {
                                  // Allow typing "0" or "0." or "0.5" etc
                                  const tempValue =
                                    inputValue === "0"
                                      ? 0
                                      : parseFloat(inputValue) || 0;
                                  if (tempValue >= 0 && tempValue <= 1000) {
                                    setFdv(tempValue * 1_000_000);
                                  }
                                }
                              }
                            }}
                            onBlur={(e) => {
                              // On blur, ensure we have a valid number
                              const inputValue = e.target.value;
                              const numValue = parseFloat(inputValue);
                              if (isNaN(numValue) || numValue <= 0) {
                                setFdv(DEFAULT_FDV);
                              } else if (numValue > 1000) {
                                setFdv(1000 * 1_000_000);
                              }
                            }}
                            className="w-16 bg-[#0A1F35] border border-white/20 px-2 py-1 text-white text-sm focus:outline-none focus:border-[#FF8A7A]"
                          />
                          <span className="text-white/60 whitespace-nowrap text-sm">
                            M USD
                          </span>
                          <button
                            onClick={() => setFdv(DEFAULT_FDV)}
                            className="text-[#FF8A7A] hover:text-[#FFB84D] text-xs underline"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Box 4: Revenue Tag (under Allocated and FDV) */}
                    <div className="bg-green-900/30 border border-green-500/30 px-4 py-2">
                      <div className="text-xs text-green-300 text-center">
                        ~25% of pre-TGE revenue → protocol-owned liquidity at
                        $10m FDV & After TGE for buybacks.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* GraphQL Error Banner */}
        {combinedHasIndexerErrors && (
          <GenesisErrorBanner
            tone="danger"
            title="Temporary Service Issue"
            message="The Graph Network indexers are temporarily unavailable for some markets. Your Harbor Marks are safe and will display correctly once the service is restored. This is a temporary infrastructure issue, not a problem with your account."
            markets={combinedMarketsWithIndexerErrors.map(getMarketName)}
          />
        )}
        {combinedHasAnyErrors && !combinedHasIndexerErrors && (
          <GenesisErrorBanner
            tone="warning"
            title="Harbor Marks Data Unavailable"
            message="Unable to load Harbor Marks data for some markets. Your positions and core functionality remain unaffected. Please try refreshing the page."
            markets={combinedMarketsWithOtherErrors.map(getMarketName)}
          />
        )}
        {hasOraclePricingError && (
          <GenesisErrorBanner
            tone="danger"
            title="Price oracle unavailable"
            message="The price oracle for some markets is not available. Harbor Marks cannot be calculated until the oracle is working. Your deposit is safe."
            markets={marketsWithOraclePricingError.map(getMarketName)}
          />
        )}

        {/* Divider */}
        <div className="border-t border-white/10 mt-2 mb-1"></div>

        {/* Only show market rows section if there are active/pending markets or ended markets with claimable tokens */}
        {hasActiveOrPendingMarkets && (
          <section className="space-y-2 overflow-visible">
            {/* Market Rows - sorted with running markets first, then completed markets */}
            {/* Within each section, markets with deposits are sorted to the top */}
            {(() => {
              let activeHeaderRendered = false;

              const marketRows = activeMarkets.map(([id, mkt], idx) => {
                const mi = genesisMarkets.findIndex((m) => m[0] === id);
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

                // Add section header for active markets at the start
                const activeHeader =
                  showHeaders && !activeHeaderRendered && activeMarkets.length > 0 ? (
                    <>
                      <div
                        key={`section-active`}
                        className="pt-4 mb-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        {/* Pills - shown first on narrow screens, on right on larger screens */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 order-1 sm:order-2">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#E67A6B] hover:bg-[#D66A5B] border border-white text-white text-xs font-semibold uppercase tracking-wider rounded-full transition-colors">
                            <span>Earn 10</span>
                            <Image
                              src="/icons/marks.png"
                              alt="Marks"
                              width={16}
                              height={16}
                              className="flex-shrink-0"
                            />
                            <span>/$/day + 100</span>
                            <Image
                              src="/icons/marks.png"
                              alt="Marks"
                              width={16}
                              height={16}
                              className="flex-shrink-0"
                            />
                            <span>bonus on completion</span>
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#E67A6B] hover:bg-[#D66A5B] border border-white text-white text-xs font-semibold uppercase tracking-wider rounded-full transition-colors">
                            <span>Early Deposit Bonus!</span>
                            <span>100</span>
                            <Image
                              src="/icons/marks.png"
                              alt="Marks"
                              width={20}
                              height={20}
                              className="flex-shrink-0"
                            />
                            <span>/ $</span>
                          </div>
                        </div>
                        {/* Header - shown second on narrow screens, on left on larger screens */}
                        <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider flex items-center gap-2 order-2 sm:order-1">
                          Active Campaign:
                          {activeCampaignName && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-[#E67A6B] hover:bg-[#D66A5B] border border-white text-white text-xs font-semibold uppercase tracking-wider rounded-full transition-colors">
                              {activeCampaignName}
                            </span>
                          )}
                        </h2>
                      </div>
                      <div
                        key={`header-active`}
                        className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto mb-0"
                      >
                        <div className="grid lg:grid-cols-[1.5fr_80px_0.9fr_0.9fr_0.9fr_0.7fr_0.9fr] md:grid-cols-[120px_80px_100px_1fr_1fr_90px_80px] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
                          <div className="min-w-0 text-center">Market</div>
                          <div className="text-center min-w-0">APR</div>
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
                    </>
                  ) : null;

                // Mark that we've rendered the active header
                if (activeHeader) {
                  activeHeaderRendered = true;
                }

                // Get token symbols from market configuration
                const rowPeggedSymbol =
                  (mkt as any).peggedToken?.symbol || "ha";
                const rowLeveragedSymbol =
                  (mkt as any).leveragedToken?.symbol || "hs";
                const displayMarketName =
                  rowLeveragedSymbol &&
                  rowLeveragedSymbol.toLowerCase().startsWith("hs")
                    ? rowLeveragedSymbol.slice(2)
                    : rowLeveragedSymbol || (mkt as any).name || "Market";
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

                // Debug logging for collateral address
                const endDate = (mkt as any).genesis?.endDate;

                // Get price data from the collateral prices hook
                const oracleAddress = (mkt as any).addresses
                  ?.collateralPrice as `0x${string}` | undefined;
                const collateralPriceData = oracleAddress
                  ? collateralPricesMap.get(oracleAddress.toLowerCase())
                  : undefined;

                // Extract wrapped rate and underlying price from hook data (if available)
                const wrappedRate = collateralPriceData?.maxRate;
                const underlyingPriceFromOracle =
                  collateralPriceData?.priceUSD || 0;

                // Calculate price: Priority order: Hardcoded $1 (fxUSD) → CoinGecko → Oracle
                let underlyingPriceUSD: number = 0;
                let priceError: string | null = null;
                const marketCoinGeckoId = (mkt as any)?.coinGeckoId as
                  | string
                  | undefined;

                // Priority 1: For fxUSD underlying (fxSAVE markets), always use hardcoded $1.00
                if (underlyingSymbol.toLowerCase() === "fxusd") {
                  underlyingPriceUSD = 1.0;
                } else if (
                  marketCoinGeckoId &&
                  coinGeckoPrices[marketCoinGeckoId] &&
                  coinGeckoPrices[marketCoinGeckoId]! > 0
                ) {
                  // Priority 2: Try CoinGecko price for other markets (preferred when available)
                  // Only use if price is valid (> 0)
                  underlyingPriceUSD = coinGeckoPrices[marketCoinGeckoId]!;
                } else if (underlyingPriceFromOracle > 0) {
                  // Priority 3: Use oracle price from hook as fallback
                  let oraclePriceUSD = underlyingPriceFromOracle;

                  // For BTC/stETH markets, oracle might return price in BTC terms, need to convert to USD
                  const pegTarget = (mkt as any)?.pegTarget?.toLowerCase();
                  const isBTCMarket =
                    pegTarget === "btc" || pegTarget === "bitcoin";
                  if (isBTCMarket && oraclePriceUSD > 0 && oraclePriceUSD < 1) {
                    // If price is less than $1, it's likely in BTC terms (e.g., 0.041 BTC per wstETH)
                    // Get BTC price in USD: Priority: CoinGecko → Chainlink
                    const btcPriceUSD =
                      coinGeckoPrices["bitcoin"] || chainlinkBtcPrice || 0;
                    if (btcPriceUSD > 0) {
                      oraclePriceUSD = oraclePriceUSD * btcPriceUSD;
                    }
                  }

                  // Only use oracle price if it's reasonable (not zero or extremely small)
                  // This prevents showing <0.01 when oracle returns invalid data
                  if (oraclePriceUSD > 0.01) {
                    underlyingPriceUSD = oraclePriceUSD;
                  } else {
                    priceError =
                      "Price oracle returned value too small (<0.01)";
                  }
                } else {
                  // Check if there was an error reading the oracle
                  if (collateralPriceData?.error) {
                    priceError = `Failed to read price oracle: ${
                      collateralPriceData.error.message || "Unknown error"
                    }`;
                  } else {
                    priceError = "Price oracle not available";
                  }
                }

                // Calculate wrapped token price: underlying price * wrapped rate
                // Deposits are stored in wrapped collateral tokens, so we need wrapped token price
                // IMPORTANT: Only skip rate multiplication if CoinGecko actually returned a wrapped token price
                const coinGeckoId = (mkt as any)?.coinGeckoId as
                  | string
                  | undefined;
                const coinGeckoReturnedPrice =
                  marketCoinGeckoId && coinGeckoPrices[marketCoinGeckoId];
                // Check if CoinGecko returned a price for the wrapped token (fxSAVE or wstETH)
                const coinGeckoIsWrappedToken =
                  coinGeckoReturnedPrice &&
                  coinGeckoId &&
                  ((coinGeckoId.toLowerCase() === "wrapped-steth" &&
                    collateralSymbol.toLowerCase() === "wsteth") ||
                    ((coinGeckoId.toLowerCase() === "fx-usd-saving" ||
                      coinGeckoId.toLowerCase() === "fxsave") &&
                      collateralSymbol.toLowerCase() === "fxsave"));

                // For wstETH: If CoinGecko is still loading, use oracle price with wrapped rate
                // If CoinGecko has finished and returned a price, use that (it's already wrapped)
                // Otherwise, apply wrapped rate to underlying price
                const isWstETH = collateralSymbol.toLowerCase() === "wsteth";
                const isFxSAVE = collateralSymbol.toLowerCase() === "fxsave";

                // Fallback: Use stETH price from CoinGecko if wstETH price isn't available yet
                // This provides immediate price while wstETH-specific price is loading
                const stETHPrice =
                  coinGeckoPrices["lido-staked-ethereum-steth"];
                const useStETHFallback =
                  isWstETH &&
                  !coinGeckoIsWrappedToken &&
                  underlyingPriceUSD === 0 &&
                  stETHPrice &&
                  stETHPrice > 0 &&
                  wrappedRate &&
                  wrappedRate > 0n;

                const wrappedTokenPriceUSD =
                  coinGeckoIsWrappedToken &&
                  coinGeckoReturnedPrice &&
                  coinGeckoReturnedPrice > 0
                    ? coinGeckoReturnedPrice // CoinGecko already returns wrapped token price (e.g., wstETH, fxSAVE)
                    : useStETHFallback
                    ? stETHPrice * (Number(wrappedRate) / 1e18) // Use stETH price * wrapped rate as fallback while wstETH loads
                    : (isWstETH || isFxSAVE) &&
                      coinGeckoLoading &&
                      marketCoinGeckoId &&
                      underlyingPriceUSD > 0 &&
                      wrappedRate
                    ? underlyingPriceUSD * (Number(wrappedRate) / 1e18) // While CoinGecko loads, use oracle * wrapped rate for wstETH or fxSAVE
                    : wrappedRate && underlyingPriceUSD > 0
                    ? underlyingPriceUSD * (Number(wrappedRate) / 1e18) // Multiply underlying by rate (e.g., fxUSD -> fxSAVE)
                    : coinGeckoLoading && marketCoinGeckoId
                    ? 0 // Still loading CoinGecko, don't use fallback price yet
                    : isFxSAVE
                    ? 1.07 // Hardcoded fallback for fxSAVE if everything fails
                    : underlyingPriceUSD; // Fallback to underlying price if no rate available and CoinGecko not loading

                // Use wrapped token price for USD calculations since deposits are in wrapped collateral
                const collateralPriceUSD = wrappedTokenPriceUSD;

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

                // Debug logging for marks data (after userDepositUSD and totalDepositsUSD are calculated)
                if (
                  process.env.NODE_ENV === "development" &&
                  marks &&
                  id === "btc-steth"
                ) {
                  console.log("[btc-steth Marks Debug]", {
                    marketId: id,
                    genesisAddress: (mkt as any).addresses?.genesis,
                    marksForMarketFound: !!marksForMarket,
                    currentMarks: marks.currentMarks,
                    currentDepositUSD: marks.currentDepositUSD,
                    marksPerDay: marks.marksPerDay,
                    bonusMarks: marks.bonusMarks,
                    genesisEnded: marks.genesisEnded,
                    genesisStartDate: marks.genesisStartDate,
                    lastUpdated: marks.lastUpdated,
                    userDepositUSD,
                    totalDepositsUSD,
                    calculatedUserMarks: marks
                      ? parseFloat(marks.currentMarks || "0")
                      : 0,
                  });
                }

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
                  statusText = hasClaimable ? "Claim available" : "Ended";
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
                    {activeHeader}
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
                          <div className="flex items-center justify-start gap-1.5 flex-1 min-w-0">
                            <span className="text-[#1E4775] font-medium text-sm">
                              {rowLeveragedSymbol &&
                              rowLeveragedSymbol.toLowerCase().startsWith("hs")
                                ? rowLeveragedSymbol.slice(2)
                                : rowLeveragedSymbol || (mkt as any).name}
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
                                    } catch (error) {
                                      console.error(
                                        "[APR Breakdown] Calculation error:",
                                        error
                                      );
                                      return undefined;
                                    }
                                  })()
                                : undefined;

                            // Debug breakdown calculation
                            if (
                              process.env.NODE_ENV === "development" &&
                              mounted
                            ) {
                              console.log("[APR Breakdown Debug]", {
                                marketId: id,
                                canShowCombinedAPR,
                                marksBreakdown,
                                marksForAPRTotal,
                                depositForAPR,
                                tvlForAPR,
                                genesisDays,
                                fdv,
                                aprBreakdown,
                                hasBreakdown: !!aprBreakdown,
                                conditions: {
                                  marksForAPRTotal: marksForAPRTotal > 0,
                                  depositForAPR: depositForAPR > 0,
                                  tvlForAPR: tvlForAPR > 0,
                                  genesisDays: genesisDays > 0,
                                  allMet:
                                    marksForAPRTotal > 0 &&
                                    depositForAPR > 0 &&
                                    tvlForAPR > 0 &&
                                    genesisDays > 0,
                                },
                              });
                              if (aprBreakdown) {
                                console.log(
                                  "[APR Breakdown Values]",
                                  aprBreakdown
                                );
                              }
                            }

                            // Debug logging (temporary) - after calculations
                            if (
                              process.env.NODE_ENV === "development" &&
                              mounted
                            ) {
                              const debugInfo = {
                                marketId: id,
                                mounted,
                                isValidAPR,
                                underlyingAPR,
                                isLoadingTotalTVL: safeIsLoadingTotalTVL,
                                isLoadingTotalMarks: safeIsLoadingTotalMarks,
                                totalGenesisTVL: safeTotalGenesisTVL,
                                totalMaidenVoyageMarks:
                                  safeTotalMaidenVoyageMarks,
                                userDepositUSD,
                                userMarksForMarket,
                                totalDepositsUSD,
                                depositForAPR,
                                marksForAPR,
                                tvlForAPR,
                                marksForAPRTotal,
                                genesisDays,
                                canShowCombinedAPR,
                                checks: {
                                  mounted,
                                  isValidAPR,
                                  depositForAPR: depositForAPR > 0,
                                  marksForAPR: marksForAPR > 0,
                                  tvlForAPR: tvlForAPR > 0,
                                  marksForAPRTotal: marksForAPRTotal > 0,
                                },
                              };
                              console.log(
                                "[APR Debug Full]",
                                JSON.stringify(debugInfo, null, 2)
                              );
                              console.log("[APR Debug]", debugInfo);
                            }

                            return (
                              <div className="flex-shrink-0 text-right mr-8">
                                <div className="text-[#1E4775]/70 text-[10px]">
                                  APR
                                </div>
                                {isValidAPR ? (
                                  isAprRevealed && canShowCombinedAPR ? (
                                    <TideAPRTooltip
                                      underlyingAPR={underlyingAPR}
                                      userMarks={marksForAPR}
                                      totalMarks={marksForAPRTotal}
                                      userDepositUSD={depositForAPR}
                                      totalGenesisTVL={tvlForAPR}
                                      genesisDays={genesisDays}
                                      fdv={fdv}
                                      onFdvChange={setFdv}
                                      aprBreakdown={aprBreakdown}
                                    >
                                      <span className="text-[#1E4775] font-semibold text-xs cursor-help">
                                        {isLoadingAPR || safeIsLoadingTotalTVL
                                          ? "..."
                                          : (() => {
                                              const tideAPR = calculateTideAPR(
                                                marksForAPR,
                                                marksForAPRTotal,
                                                depositForAPR,
                                                tvlForAPR,
                                                daysLeftInGenesis,
                                                fdv
                                              );
                                              const underlyingAPRPercent =
                                                (underlyingAPR || 0) * 100;
                                              const combined =
                                                underlyingAPRPercent + tideAPR;

                                              // Debug calculation
                                              if (
                                                process.env.NODE_ENV ===
                                                "development"
                                              ) {
                                                console.log(
                                                  "[APR Calculation]",
                                                  {
                                                    marketId: id,
                                                    underlyingAPRPercent,
                                                    tideAPR,
                                                    combined,
                                                    isValid:
                                                      !isNaN(combined) &&
                                                      isFinite(combined),
                                                  }
                                                );
                                              }

                                              return isNaN(combined) ||
                                                !isFinite(combined)
                                                ? "..."
                                                : `${combined.toFixed(2)}%`;
                                            })()}
                                      </span>
                                    </TideAPRTooltip>
                                  ) : (
                                    <div className="flex items-center justify-end gap-1">
                                      <SimpleTooltip
                                        label={`${collateralSymbol} underlying APR${
                                          safeIsLoadingTotalTVL ||
                                          safeIsLoadingTotalMarks
                                            ? " (Loading $TIDE data...)"
                                            : ""
                                        }`}
                                      >
                                        <span className="text-[#1E4775] font-semibold text-xs cursor-help flex items-center gap-1">
                                          {isLoadingAPR
                                            ? "..."
                                            : `${(underlyingAPR * 100).toFixed(
                                                2
                                              )}%`}
                                          <span className="text-[#1E4775]/70">+</span>
                                          <Image
                                            src="/icons/marks.png"
                                            alt="Marks"
                                            width={20}
                                            height={20}
                                            className="inline-block"
                                          />
                                        </span>
                                      </SimpleTooltip>
                                    </div>
                                  )
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    -
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0"
                          >
                            {isEnded ? (
                              hasClaimable ? (
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
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap">
                                  <ArrowPathIcon className="w-2.5 h-2.5" />
                                  <span>Any Token</span>
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
                            ? "grid-cols-[120px_60px_60px_1fr_80px]"
                            : "grid-cols-[120px_80px_100px_1fr_1fr_90px_80px]"
                        }`}
                      >
                        {/* Market Title */}
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-[#1E4775] font-medium text-sm">
                            {rowLeveragedSymbol &&
                            rowLeveragedSymbol.toLowerCase().startsWith("hs")
                              ? rowLeveragedSymbol.slice(2)
                              : rowLeveragedSymbol || (mkt as any).name}
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

                              return (
                                <div className="text-center">
                                  {isValidAPR ? (
                                    isAprRevealed && canShowCombinedAPR ? (
                                      <TideAPRTooltip
                                        underlyingAPR={underlyingAPR}
                                        userMarks={marksForAPR}
                                        totalMarks={marksForAPRTotal}
                                        userDepositUSD={depositForAPR}
                                        totalGenesisTVL={tvlForAPR}
                                        genesisDays={genesisDays}
                                        fdv={fdv}
                                        onFdvChange={setFdv}
                                        aprBreakdown={aprBreakdownMd}
                                      >
                                        <span className="text-[#1E4775] font-semibold text-xs cursor-help">
                                          {isLoadingAPR || safeIsLoadingTotalTVL
                                            ? "..."
                                            : (() => {
                                                const tideAPR =
                                                  calculateTideAPR(
                                                    marksForAPR,
                                                    marksForAPRTotal,
                                                    depositForAPR,
                                                    tvlForAPR,
                                                    daysLeftInGenesisMd,
                                                    fdv
                                                  );
                                                const underlyingAPRPercent =
                                                  (underlyingAPR || 0) * 100;
                                                const combined =
                                                  underlyingAPRPercent +
                                                  tideAPR;
                                                return isNaN(combined) ||
                                                  !isFinite(combined)
                                                  ? "..."
                                                  : `${combined.toFixed(2)}%`;
                                              })()}
                                        </span>
                                      </TideAPRTooltip>
                                    ) : (
                                      <SimpleTooltip
                                        label={`${collateralSymbol} underlying APR${
                                          safeIsLoadingTotalTVL ||
                                          safeIsLoadingTotalMarks
                                            ? " (Loading $TIDE data...)"
                                            : ""
                                        }`}
                                      >
                                        <span className="text-[#1E4775] font-semibold text-xs cursor-help flex items-center gap-1">
                                          {isLoadingAPR
                                            ? "..."
                                            : `${(underlyingAPR * 100).toFixed(
                                                2
                                              )}%`}
                                          <span className="text-[#1E4775]/70">+</span>
                                          <Image
                                            src="/icons/marks.png"
                                            alt="Marks"
                                            width={20}
                                            height={20}
                                            className="inline-block"
                                          />
                                        </span>
                                      </SimpleTooltip>
                                    )
                                  ) : (
                                    <span className="text-xs text-gray-400">
                                      -
                                    </span>
                                  )}
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
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap">
                              <ArrowPathIcon className="w-2.5 h-2.5" />
                              <span>Any Token</span>
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
                              hasClaimable ? (
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
                            ? "grid-cols-[1.5fr_1fr_1fr_1.5fr_1fr]"
                            : "grid-cols-[1.5fr_80px_0.9fr_0.9fr_0.9fr_0.7fr_0.9fr]"
                        }`}
                      >
                        <div className="min-w-0 overflow-hidden">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[#1E4775] font-medium text-sm lg:text-base">
                              {rowLeveragedSymbol &&
                              rowLeveragedSymbol.toLowerCase().startsWith("hs")
                                ? rowLeveragedSymbol.slice(2)
                                : rowLeveragedSymbol || (mkt as any).name}
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

                              return (
                                <div className="text-center min-w-0">
                                  {isValidAPR ? (
                                    isAprRevealed && canShowCombinedAPR ? (
                                      <TideAPRTooltip
                                        underlyingAPR={underlyingAPR}
                                        userMarks={marksForAPR}
                                        totalMarks={marksForAPRTotal}
                                        userDepositUSD={depositForAPR}
                                        totalGenesisTVL={tvlForAPR}
                                        genesisDays={genesisDays}
                                        fdv={fdv}
                                        onFdvChange={setFdv}
                                        aprBreakdown={aprBreakdownLg}
                                      >
                                        <span className="text-[#1E4775] font-semibold text-xs cursor-help">
                                          {isLoadingAPR || safeIsLoadingTotalTVL
                                            ? "..."
                                            : (() => {
                                                const tideAPR =
                                                  calculateTideAPR(
                                                    marksForAPR,
                                                    marksForAPRTotal,
                                                    depositForAPR,
                                                    tvlForAPR,
                                                    daysLeftInGenesisLg,
                                                    fdv
                                                  );
                                                const underlyingAPRPercent =
                                                  (underlyingAPR || 0) * 100;
                                                const combined =
                                                  underlyingAPRPercent +
                                                  tideAPR;
                                                return isNaN(combined) ||
                                                  !isFinite(combined)
                                                  ? "..."
                                                  : `${combined.toFixed(2)}%`;
                                              })()}
                                        </span>
                                      </TideAPRTooltip>
                                    ) : (
                                      <SimpleTooltip
                                        label={`${collateralSymbol} underlying APR${
                                          safeIsLoadingTotalTVL ||
                                          safeIsLoadingTotalMarks
                                            ? " (Loading $TIDE data...)"
                                            : ""
                                        }`}
                                      >
                                        <span className="text-[#1E4775] font-semibold text-xs cursor-help flex items-center gap-1">
                                          {isLoadingAPR
                                            ? "..."
                                            : `${(underlyingAPR * 100).toFixed(
                                                2
                                              )}%`}
                                          <span className="text-[#1E4775]/70">+</span>
                                          <Image
                                            src="/icons/marks.png"
                                            alt="Marks"
                                            width={20}
                                            height={20}
                                            className="inline-block"
                                          />
                                        </span>
                                      </SimpleTooltip>
                                    )
                                  ) : (
                                    <span className="text-xs text-gray-400">
                                      -
                                    </span>
                                  )}
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
                              }
                            >
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold uppercase tracking-wide cursor-help whitespace-nowrap">
                                <ArrowPathIcon className="w-3 h-3" />
                                <span>Any Token</span>
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
                                        and make ha + hs tokens claimable
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
                            // After genesis ends, show claim button only
                            <div className="flex items-center justify-center">
                              {hasClaimable ? (
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
                                    })} ${effectiveBonusStatus.thresholdToken}`}
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

              return marketRows;
            })()}
          </section>
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
              <div className="grid lg:grid-cols-[1.5fr_80px_0.9fr_1fr_0.9fr] md:grid-cols-[120px_80px_100px_1fr_90px] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
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
                    <div className="hidden md:grid lg:grid-cols-[1.5fr_80px_0.9fr_1fr_0.9fr] md:grid-cols-[120px_80px_100px_1fr_110px] gap-4 items-center">
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

        {/* Completed Genesis Events - Grouped by Campaign */}
        {completedByCampaign.size > 0 && (
          <section className="space-y-4 overflow-visible mt-8">
            {Array.from(completedByCampaign.entries()).map(([campaignLabel, markets]) => {
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
                    <div className="grid lg:grid-cols-[1.5fr_1fr_1fr_1.5fr_1fr] md:grid-cols-[120px_60px_60px_1fr_80px] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
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
                      const wrappedRate = collateralPriceData?.maxRate;
                      const underlyingPriceFromOracle = collateralPriceData?.priceUSD || 0;
                      const marketCoinGeckoId = (mkt as any)?.coinGeckoId as string | undefined;
                      const underlyingSymbol = (mkt as any).collateral?.underlyingSymbol || collateralSymbol;

                      // Calculate price (same logic as active markets)
                      let underlyingPriceUSD = 0;
                      if (underlyingSymbol.toLowerCase() === "fxusd") {
                        underlyingPriceUSD = 1.0;
                      } else if (marketCoinGeckoId && coinGeckoPrices[marketCoinGeckoId] && coinGeckoPrices[marketCoinGeckoId]! > 0) {
                        underlyingPriceUSD = coinGeckoPrices[marketCoinGeckoId]!;
                      } else if (underlyingPriceFromOracle > 0) {
                        underlyingPriceUSD = underlyingPriceFromOracle;
                      }

                      const coinGeckoId = (mkt as any)?.coinGeckoId as string | undefined;
                      const coinGeckoReturnedPrice = marketCoinGeckoId && coinGeckoPrices[marketCoinGeckoId];
                      const coinGeckoIsWrappedToken = coinGeckoReturnedPrice && coinGeckoId && (
                        (coinGeckoId.toLowerCase() === "wrapped-steth" && collateralSymbol.toLowerCase() === "wsteth") ||
                        ((coinGeckoId.toLowerCase() === "fx-usd-saving" || coinGeckoId.toLowerCase() === "fxsave") && collateralSymbol.toLowerCase() === "fxsave")
                      );
                      const isWstETH = collateralSymbol.toLowerCase() === "wsteth";
                      const isFxSAVE = collateralSymbol.toLowerCase() === "fxsave";
                      const stETHPrice = coinGeckoPrices["lido-staked-ethereum-steth"];
                      const useStETHFallback = isWstETH && !coinGeckoIsWrappedToken && underlyingPriceUSD === 0 && stETHPrice && stETHPrice > 0 && wrappedRate && wrappedRate > 0n;
                      const wrappedTokenPriceUSD = coinGeckoIsWrappedToken && coinGeckoReturnedPrice && coinGeckoReturnedPrice > 0
                        ? coinGeckoReturnedPrice
                        : useStETHFallback
                        ? stETHPrice * (Number(wrappedRate) / 1e18)
                        : (isWstETH || isFxSAVE) && coinGeckoLoading && marketCoinGeckoId && underlyingPriceUSD > 0 && wrappedRate
                        ? underlyingPriceUSD * (Number(wrappedRate) / 1e18)
                        : wrappedRate && underlyingPriceUSD > 0
                        ? underlyingPriceUSD * (Number(wrappedRate) / 1e18)
                        : coinGeckoLoading && marketCoinGeckoId
                        ? 0
                        : isFxSAVE
                        ? 1.07
                        : underlyingPriceUSD;
                      const collateralPriceUSD = wrappedTokenPriceUSD;
                      const totalDeposits = totalDepositsReads?.[mi]?.result as bigint | undefined;
                      const totalDepositsAmount = totalDeposits ? Number(formatEther(totalDeposits)) : 0;
                      const totalDepositsUSD = totalDepositsAmount * collateralPriceUSD;
                      const userDepositUSD = userDeposit && collateralPriceUSD > 0 ? Number(formatEther(userDeposit)) * collateralPriceUSD : 0;
                      const rowPeggedSymbol = (mkt as any).peggedToken?.symbol || "ha";
                      const rowLeveragedSymbol = (mkt as any).leveragedToken?.symbol || "hs";
                      const displayMarketName = rowLeveragedSymbol && rowLeveragedSymbol.toLowerCase().startsWith("hs")
                        ? rowLeveragedSymbol.slice(2)
                        : rowLeveragedSymbol || (mkt as any).name || "Market";

                      // Get token prices for claimable display
                      const anchorTokenPriceUSD = 1; // Pegged tokens are always $1
                      const sailTokenPriceUSD = collateralPriceUSD; // Leveraged tokens use collateral price

                      return (
                        <div
                          key={id}
                          className="bg-white py-2.5 px-2 rounded-none border border-white/10"
                        >
                          {/* Desktop layout */}
                          <div className="hidden md:grid lg:grid-cols-[1.5fr_1fr_1fr_1.5fr_1fr] md:grid-cols-[120px_60px_60px_1fr_80px] gap-4 items-center">
                            {/* Market Column */}
                            <div className="flex items-center gap-2 min-w-0 pl-4">
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
                            <div className="flex-shrink-0 text-center">
                              {hasClaimable ? (
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
                              {hasClaimable && (
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
