"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useContractReads,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { formatEther } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { markets } from "../../config/markets";
import { GenesisManageModal } from "@/components/GenesisManageModal";
import { GENESIS_ABI, contracts } from "../../config/contracts";
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
  BanknotesIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  StarIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import InfoTooltip from "@/components/InfoTooltip";
import SimpleTooltip from "@/components/SimpleTooltip";
import Image from "next/image";
import { useAllHarborMarks, useAllMarketBonusStatus } from "@/hooks/useHarborMarks";
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

// Helper function to get accepted deposit assets for a market
// Now reads from market config instead of hardcoding
function getAcceptedDepositAssets(
  market: any
): Array<{ symbol: string; name: string }> {
  // Use acceptedAssets from market config if available
  if (market?.acceptedAssets && Array.isArray(market.acceptedAssets)) {
    return market.acceptedAssets;
  }
  // Fallback: return collateral token as the only accepted asset
  if (market?.collateral?.symbol) {
    return [
      {
        symbol: market.collateral.symbol,
        name: market.collateral.name || market.collateral.symbol,
      },
    ];
  }
  return [];
}

// Minimal ABIs for summary reads
// Note: totalDeposits() doesn't exist in IGenesis interface, so we removed it
const genesisABI = [
  {
    inputs: [],
    name: "genesisIsEnded",
    outputs: [{ type: "bool", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "depositor", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "depositor", type: "address" }],
    name: "claimable",
    outputs: [
      { type: "uint256", name: "peggedAmount" },
      { type: "uint256", name: "leveragedAmount" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "PEGGED_TOKEN",
    outputs: [{ type: "address", name: "token" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LEVERAGED_TOKEN",
    outputs: [{ type: "address", name: "token" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "WRAPPED_COLLATERAL_TOKEN",
    outputs: [{ type: "address", name: "token" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const erc20SymbolABI = [
  {
    inputs: [],
    name: "symbol",
    outputs: [{ type: "string", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Standard Chainlink-style oracle ABI: latestAnswer returns a single price, decimals describes scaling
// Harbor oracle returns tuple: (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
// Support both formats for backward compatibility
const chainlinkOracleABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [
      { type: "uint256", name: "" },
      { type: "uint256", name: "" },
      { type: "uint256", name: "" },
      { type: "uint256", name: "" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Fallback ABI for single-value oracles (backward compatibility)
const chainlinkOracleSingleValueABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ type: "int256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

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
              abi: genesisABI,
              functionName: "PEGGED_TOKEN" as const,
            },
            {
              address: genesisAddress as `0x${string}`,
              abi: genesisABI,
              functionName: "LEVERAGED_TOKEN" as const,
            },
            {
              address: genesisAddress as `0x${string}`,
              abi: genesisABI,
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
    leveragedTokenSymbol &&
    leveragedTokenSymbol.toLowerCase().startsWith("hs")
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
        {/* Genesis Info */}
        <div className="bg-white p-2 flex flex-col justify-center">
          <h3 className="text-[#1E4775] font-semibold mb-1 text-xs text-center">
            End Date/Time
          </h3>
          <p className="text-sm font-bold text-[#1E4775] text-center">
            {formatDateTime(endDate)}
          </p>
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
  const [manageModal, setManageModal] = useState<{
    marketId: string;
    market: any;
    initialTab?: "deposit" | "withdraw";
  } | null>(null);
  const [now, setNow] = useState(new Date());
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);
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
      Object.entries(markets).filter(
        ([_, mkt]) => (mkt as any).addresses?.genesis
      ),
    []
  );

  // Get all genesis addresses for subgraph queries
  const genesisAddresses = useMemo(
    () =>
      genesisMarkets
        .map(([_, mkt]) => (mkt as any).addresses?.genesis)
        .filter((addr): addr is string => !!addr && typeof addr === "string"),
    [genesisMarkets]
  );

  // Fetch marks data from subgraph
  const {
    data: allMarksData,
    isLoading: isLoadingMarks,
    refetch: refetchMarks,
    error: marksError,
  } = useAllHarborMarks(genesisAddresses);

  // Fetch market bonus status for all markets (early deposit bonus tracking)
  const {
    data: allMarketBonusStatus,
    isLoading: isLoadingBonusStatus,
  } = useAllMarketBonusStatus(genesisAddresses);

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
          abi: genesisABI,
          functionName: "genesisIsEnded" as const,
        },
      ];
      const user =
        isConnected && address
          ? [
              {
                address: g,
                abi: genesisABI,
                functionName: "balanceOf" as const,
                args: [address as `0x${string}`],
              },
              {
                address: g,
                abi: genesisABI,
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
          abi: genesisABI,
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

  // Fetch total deposits by checking the balance of wrapped collateral token in genesis contract
  // Since totalDeposits() doesn't exist in IGenesis, we get it from the token balance
  const erc20BalanceABI = [
    {
      inputs: [{ name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

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
          abi: erc20BalanceABI,
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
    return genesisMarkets.map(([_, mkt]) => 
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

  // Log when CoinGecko prices update
  useEffect(() => {
    if (coinGeckoIds.length > 0) {
      console.log(`[Genesis Price] CoinGecko state:`, {
        loading: coinGeckoLoading,
        prices: coinGeckoPrices,
        requestedIds: coinGeckoIds,
        timestamp: new Date().toISOString(),
      });
    }
  }, [coinGeckoPrices, coinGeckoLoading, coinGeckoIds]);

  // Log when collateral prices update
  useEffect(() => {
    if (collateralPricesMap.size > 0) {
      console.log(`[Genesis Price] Collateral prices updated:`, {
        totalPrices: collateralPricesMap.size,
        isLoading: collateralPricesLoading,
        error: collateralPricesError,
      });
    }
  }, [collateralPricesMap, collateralPricesLoading, collateralPricesError]);

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

  return (
    <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
      <main className="container mx-auto px-4 sm:px-10 pb-6">
        {/* Header */}
        <div className="mb-2">
          {/* Title Row with Social Buttons */}
          <div className="p-4 flex items-center justify-between mb-0">
            <div className="w-[120px]" /> {/* Spacer for centering */}
            <h1 className="font-bold font-mono text-white text-7xl text-center">
              Maiden Voyage
            </h1>
            {/* Compact Social Buttons */}
            <div className="flex flex-col items-end gap-2 border border-white/30  px-3 py-2">
              <div className="text-white text-xs font-medium whitespace-nowrap">
                follow to stay up to date
              </div>
              <div className="flex items-center justify-center gap-2 w-full">
                <a
                  href="https://x.com/0xharborfi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-black hover:bg-gray-800 text-white  transition-colors"
                  title="Follow @0xharborfi on X"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://discord.gg/harborfin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-[#5865F2] hover:bg-[#4752C4] text-white  transition-colors"
                  title="Join Discord"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Subheader */}
          <div className="flex items-center justify-center mb-2 -mt-2">
            <p className="text-white/80 text-lg text-center">
              Earn rewards for providing initial liquidity for new markets
            </p>
          </div>

          {/* Four Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Deposit Box */}
            <div className="bg-[#17395F] p-4 sm:p-3 md:p-4 flex flex-col">
              <div className="flex items-center justify-center mb-2">
                <BanknotesIcon className="w-5 h-5 sm:w-4 sm:h-4 md:w-6 md:h-6 text-white mr-1.5 sm:mr-1 md:mr-2 flex-shrink-0" />
                <h2 className="font-bold text-white text-lg sm:text-sm md:text-base lg:text-lg text-center">
                  Deposit
                </h2>
              </div>
              <div className="flex-1 flex items-center">
                <p className="text-sm sm:text-xs md:text-sm text-white/80 text-center w-full">
                  Deposit{" "}
                  <span className="font-semibold text-white">any token</span>{" "}
                  via ParaSwap to provide resources for a market's maiden voyage
                </p>
              </div>
            </div>

            {/* Earn Box */}
            <div className="bg-[#17395F] p-4 sm:p-3 md:p-4 flex flex-col">
              <div className="flex items-center justify-center mb-2">
                <CurrencyDollarIcon className="w-5 h-5 sm:w-4 sm:h-4 md:w-6 md:h-6 text-white mr-1.5 sm:mr-1 md:mr-2 flex-shrink-0" />
                <h2 className="font-bold text-white text-lg sm:text-sm md:text-base lg:text-lg text-center">
                  Earn Ledger Marks
                </h2>
              </div>
              <div className="flex-1 flex items-end">
                <div className="w-full space-y-2 text-sm sm:text-xs md:text-sm text-white/80">
                  <div className="grid grid-cols-2 gap-2 sm:gap-1 md:gap-2">
                    <div className="text-center">
                      <div className="mb-1">During Genesis:</div>
                      <div className="flex justify-center">
                        <span className="inline-flex items-center gap-0.5 sm:gap-0.5 md:gap-1 px-1.5 sm:px-1 md:px-2 py-1 bg-white text-[#1E4775] text-xs sm:text-[10px] md:text-xs font-mono w-fit">
                          <span>10x</span>
                          <Image
                            src="/icons/marks.png"
                            alt="Marks"
                            width={24}
                            height={24}
                            className="flex-shrink-0 w-4 h-4 sm:w-3 sm:h-3 md:w-5 md:h-5"
                          />
                          <span>/$/day</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="mb-1">End Bonus:</div>
                      <div className="flex justify-center">
                        <span className="inline-flex items-center gap-0.5 sm:gap-0.5 md:gap-1 px-1.5 sm:px-1 md:px-2 py-1 bg-white text-[#1E4775] text-xs sm:text-[10px] md:text-xs font-mono w-fit">
                          <span>100x</span>
                          <Image
                            src="/icons/marks.png"
                            alt="Marks"
                            width={24}
                            height={24}
                            className="flex-shrink-0 w-4 h-4 sm:w-3 sm:h-3 md:w-5 md:h-5"
                          />
                          <span>/$</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* After Maiden Voyage Box */}
            <div className="bg-[#17395F] p-4 sm:p-3 md:p-4 flex flex-col">
              <div className="flex items-center justify-center mb-2">
                <ArrowPathIcon className="w-5 h-5 sm:w-4 sm:h-4 md:w-6 md:h-6 text-white mr-1.5 sm:mr-1 md:mr-2 flex-shrink-0" />
                <h2 className="font-bold text-white text-lg sm:text-sm md:text-base lg:text-lg text-center">
                  After Maiden Voyage
                </h2>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <p className="text-sm sm:text-xs md:text-sm text-white/80 text-center mb-2">
                  Claim ha + hs tokens. Value = deposit value.
                </p>
                <div className="text-center">
                  <div className="flex items-center justify-center">
                    <span className="inline-flex items-center gap-0.5 sm:gap-0.5 md:gap-1 px-1.5 sm:px-1 md:px-2 py-1 bg-white text-[#1E4775] text-xs sm:text-[10px] md:text-xs font-mono w-fit">
                      <span>1-10x</span>
                      <Image
                        src="/icons/marks.png"
                        alt="Marks"
                        width={24}
                        height={24}
                        className="flex-shrink-0 w-4 h-4 sm:w-3 sm:h-3 md:w-5 md:h-5"
                      />
                      <span>/$/day</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Early Deposit Bonus Box */}
            {(() => {
              // Check if any market has an active early deposit bonus (threshold not reached)
              const hasActiveBonus = allMarketBonusStatus?.some((status) => {
                const bonusData = status.data;
                return bonusData && !bonusData.thresholdReached;
              });

              // Check if any genesis is still active (not ended)
              const hasActiveGenesis = genesisMarkets.some(([_, mkt], mi) => {
                const baseOffset = mi * (isConnected ? 3 : 1);
                const contractSaysEnded = reads?.[baseOffset]?.result as
                  | boolean
                  | undefined;
                return contractSaysEnded !== true;
              });

              // TEMPORARY: Always show banner for testing (remove this condition later)
              // Only show banner if there's an active bonus and active genesis
              // if (!hasActiveBonus || !hasActiveGenesis) return null;

              // Get threshold info from first market with active bonus, or fallback to any market
              const activeBonusMarket = allMarketBonusStatus?.find((status) => {
                const bonusData = status.data;
                return bonusData && !bonusData.thresholdReached;
              }) || allMarketBonusStatus?.[0]; // Fallback to first market if all thresholds reached
              const thresholdToken = activeBonusMarket?.data?.thresholdToken || "fxUSD";
              const thresholdAmount = activeBonusMarket?.data?.thresholdAmount
                ? Number(activeBonusMarket.data.thresholdAmount).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })
                : "250,000";

              return (
                <div className="bg-[#17395F] p-4 sm:p-3 md:p-4 flex flex-col">
                  <div className="flex items-center justify-center mb-2">
                    <h2 className="font-bold text-[#FF8A7A] text-lg sm:text-sm md:text-base lg:text-lg text-center">
                      Early Bonus
                    </h2>
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <p className="text-sm sm:text-xs md:text-sm text-white/80 text-center mb-2">
                      Earn a huge bonus for being one of our first depositors!
                    </p>
                    <div className="text-center">
                      <div className="flex items-center justify-center">
                        <span className="inline-flex items-center gap-0.5 sm:gap-0.5 md:gap-1 px-1.5 sm:px-1 md:px-2 py-1 bg-white text-[#1E4775] text-xs sm:text-[10px] md:text-xs font-mono w-fit">
                          <span>100x</span>
                          <Image
                            src="/icons/marks.png"
                            alt="Marks"
                            width={24}
                            height={24}
                            className="flex-shrink-0 w-4 h-4 sm:w-3 sm:h-3 md:w-5 md:h-5"
                          />
                          <span>/$</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

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

          if (allMarksData && !isLoadingMarks) {
            const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds

            allMarksData.forEach((result) => {
              // Handle both array and single object responses from GraphQL
              const userMarksData = result.data?.userHarborMarks;
              const marks = Array.isArray(userMarksData)
                ? userMarksData[0]
                : userMarksData;

              if (marks) {
                const marksPerDayFromSubgraph = parseFloat(
                  marks.marksPerDay || "0"
                );
                const bonusMarks = parseFloat(marks.bonusMarks || "0");

                // Find the market to get contract's genesisIsEnded() status
                const market = genesisMarkets.find(
                  ([_, mkt]) =>
                    (mkt as any).addresses?.genesis?.toLowerCase() ===
                    result.genesisAddress?.toLowerCase()
                );

                // Use contract's genesisIsEnded() as authoritative source
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

                // Use subgraph's USD value directly - it's already calculated correctly with real-time prices
                // The subgraph stores:
                // - currentDeposit: token amount in wei (e.g., "155000000000000000000" = 155 tokens)
                // - currentDepositUSD: USD value calculated with real-time oracle prices (e.g., "0.267616772775666308")
                // - marksPerDay: calculated marks per day based on USD value
                const currentDepositUSD = parseFloat(
                  marks.currentDepositUSD || "0"
                );
                // Use subgraph's marksPerDay directly - it's already calculated correctly
                // If genesis has ended, marksPerDay should be 0 (no more marks accumulating)
                const marksPerDay = genesisEnded ? 0 : marksPerDayFromSubgraph;

                // Calculate current marks dynamically based on time elapsed since last update
                // Marks accumulate at 10 marks per dollar per day
                // IMPORTANT: Start with currentMarks from subgraph, which already accounts for forfeitures and bonus marks
                // The subgraph's currentMarks includes:
                // - Accumulated marks from deposits (10 marks per dollar per day)
                // - Bonus marks (100 marks per dollar) if genesis has ended
                // - Forfeited marks from withdrawals
                let currentMarks = parseFloat(marks.currentMarks || "0");

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

                totalCurrentMarks += currentMarks;
                totalMarksPerDay += marksPerDay;

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
                const earlyBonusEligibleUSD = parseFloat(marks.earlyBonusEligibleDepositUSD || "0");
                const earlyBonusMarks = parseFloat(marks.earlyBonusMarks || "0");
                
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              {/* Header Box */}
              <div className="bg-[#FF8A7A] p-3 flex items-center justify-center gap-2 sm:col-span-2 md:col-span-1">
                <h2 className="font-bold font-mono text-white text-2xl text-center">
                  Ledger Marks
                </h2>
                <InfoTooltip
                  label={
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-lg mb-2">Ledger Marks</h3>
                        <p className="text-white/90 leading-relaxed">
                          A ledger is both a record of truth and a core DeFi
                          symbol — and a mark is what every sailor leaves behind
                          on a voyage.
                        </p>
                      </div>

                      <div className="border-t border-white/20 pt-3">
                        <p className="text-white/90 leading-relaxed mb-2">
                          Each Ledger Mark is proof that you were here early,
                          helping stabilize the first Harbor markets and guide
                          them through calm launch conditions.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-white/70 mt-0.5">•</span>
                          <p className="text-white/90 leading-relaxed">
                            The more you contribute, the deeper your mark on the
                            ledger.
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-white/70 mt-0.5">•</span>
                          <p className="text-white/90 leading-relaxed">
                            When $TIDE surfaces, these marks will convert into
                            your share of rewards and governance power.
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-white/20 pt-3">
                        <p className="text-white/80 italic leading-relaxed">
                          Think of them as a record of your journey — every
                          mark, a line in Harbor's logbook.
                        </p>
                      </div>
                    </div>
                  }
                  side="right"
                >
                  <QuestionMarkCircleIcon className="w-5 h-5 text-white cursor-help" />
                </InfoTooltip>
              </div>

              {/* Current Marks Box */}
              <div className="bg-[#17395F] p-3">
                <div className="text-xs text-white/70 mb-0.5 text-center">
                  Current Maiden Voyage Marks
                </div>
                <div className="text-base font-bold text-white font-mono text-center">
                  {!mounted || isLoadingMarks ? (
                    <span className="text-white/50">-</span>
                  ) : totalCurrentMarks > 0 ? (
                    totalCurrentMarks.toLocaleString(undefined, {
                      minimumFractionDigits: totalCurrentMarks < 100 ? 2 : 0,
                      maximumFractionDigits: totalCurrentMarks < 100 ? 2 : 0,
                    })
                  ) : (
                    "0"
                  )}
                </div>
              </div>

              {/* Marks per Day Box */}
              <div className="bg-[#17395F] p-3">
                <div className="text-xs text-white/70 mb-0.5 text-center">
                  Marks per Day
                </div>
                <div className="text-base font-bold text-white font-mono text-center">
                  {!mounted || isLoadingMarks ? (
                    <span className="text-white/50">-</span>
                  ) : totalMarksPerDay > 0 ? (
                    totalMarksPerDay.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
                  ) : (
                    "0"
                  )}
                </div>
              </div>

              {/* Bonus at End of Genesis Marks Box */}
              <div className="bg-[#17395F] p-3">
                <div className="text-xs text-white/70 mb-0.5 text-center flex items-center justify-center gap-1">
                  Bonus at End of Genesis
                  {anyInProcessing && (
                    <SimpleTooltip label="Bonus marks will be applied once processing is complete and tokens are claimable.">
                      <ClockIcon className="w-3 h-3 text-yellow-400 cursor-help" />
                    </SimpleTooltip>
                  )}
                </div>
                <div className="text-base font-bold text-white font-mono text-center">
                  {!mounted || isLoadingMarks ? (
                    <span className="text-white/50">-</span>
                  ) : allContractsEnded ? (
                    <span className="text-white/50">Applied</span>
                  ) : totalBonusAtEnd > 0 ? (
                    totalBonusAtEnd.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })
                  ) : (
                    "0"
                  )}
                </div>
                
                {/* Early Deposit Bonus - shown in small highlighted text */}
                {mounted && !isLoadingMarks && (
                  <>
                    {!allContractsEnded && totalEarlyBonusEstimate > 0 && (
                      <div className="text-[10px] text-green-300 mt-1 text-center bg-green-900/30 px-2 py-0.5">
                        Early deposit bonus: +{totalEarlyBonusEstimate.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    )}
                    {allContractsEnded && totalEarlyBonusMarks > 0 && (
                      <div className="text-[10px] text-green-300 mt-1 text-center bg-green-900/30 px-2 py-0.5">
                        Early deposit bonus: {totalEarlyBonusMarks.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Only show market rows section if there are active/pending markets or ended markets with claimable tokens */}
        {hasActiveOrPendingMarkets && (
          <section className="space-y-2 overflow-visible">
            {/* Market Rows - sorted with running markets first, then completed markets */}
            {/* Within each section, markets with deposits are sorted to the top */}
            {(() => {
              // Sort markets: running first, then completed
              // Within each group, markets with deposits first
              const sortedMarkets = [...genesisMarkets].sort((a, b) => {
                const [_, mktA] = a;
                const [__, mktB] = b;
                const miA = genesisMarkets.findIndex((m) => m[0] === a[0]);
                const miB = genesisMarkets.findIndex((m) => m[0] === b[0]);

                const baseOffsetA = miA * (isConnected ? 3 : 1);
                const baseOffsetB = miB * (isConnected ? 3 : 1);

                const isEndedA =
                  (reads?.[baseOffsetA]?.result as boolean) ?? false;
                const isEndedB =
                  (reads?.[baseOffsetB]?.result as boolean) ?? false;

                // First, sort by ended status: running (not ended) first, then completed (ended)
                if (isEndedA && !isEndedB) return 1; // A is ended, B is running -> B comes first
                if (!isEndedA && isEndedB) return -1; // A is running, B is ended -> A comes first

                // Within the same group (both running or both completed), sort by deposit
                const userDepositA = isConnected
                  ? (reads?.[baseOffsetA + 1]?.result as bigint | undefined)
                  : undefined;
                const userDepositB = isConnected
                  ? (reads?.[baseOffsetB + 1]?.result as bigint | undefined)
                  : undefined;

                const hasDepositA = userDepositA && userDepositA > 0n;
                const hasDepositB = userDepositB && userDepositB > 0n;

                // Markets with deposits come first within their group
                if (hasDepositA && !hasDepositB) return -1;
                if (!hasDepositA && hasDepositB) return 1;

                return 0;
              });

              // Check if we have ended markets
              // Show ended markets regardless of claimable tokens (they may have been claimed)
              const hasEndedMarkets = sortedMarkets.some((market) => {
                const mi = genesisMarkets.findIndex((m) => m[0] === market[0]);
                const baseOffset = mi * (isConnected ? 3 : 1);
                const isEnded =
                  (reads?.[baseOffset]?.result as boolean) ?? false;
                return isEnded;
              });
              const hasLiveMarkets = sortedMarkets.some((market) => {
                const mi = genesisMarkets.findIndex((m) => m[0] === market[0]);
                const baseOffset = mi * (isConnected ? 3 : 1);
                return !((reads?.[baseOffset]?.result as boolean) ?? false);
              });
              // Show headers if we have both types, OR if we have live markets, OR if we have only ended markets
              const showHeaders =
                (hasEndedMarkets && hasLiveMarkets) ||
                hasLiveMarkets ||
                hasEndedMarkets;

              let lastWasEnded: boolean | null = null;
              let activeHeaderRendered = false;
              let endedHeaderRendered = false;

              const marketRows = sortedMarkets.map(([id, mkt], idx) => {
                const mi = genesisMarkets.findIndex((m) => m[0] === id);
                // Updated offset: [isEnded, balanceOf?, claimable?] - no totalDeposits anymore
                const baseOffset = mi * (isConnected ? 3 : 1);
                const contractReadResult = reads?.[baseOffset];
                const contractSaysEnded =
                  contractReadResult?.status === "success"
                    ? (contractReadResult.result as boolean)
                    : undefined;

                // Fallback to subgraph data if contract read fails
                const marksForMarket = allMarksData?.find(
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

                // Use contract value if available, otherwise fall back to subgraph
                const isEnded =
                  contractSaysEnded !== undefined
                    ? contractSaysEnded
                    : subgraphSaysEnded ?? false;

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

                // Show all ended markets (they may have been claimed already, but should still be visible)
                // Always show ended markets so users can see completed events
                const userDeposit = isConnected
                  ? (reads?.[baseOffset + 1]?.result as bigint | undefined)
                  : undefined;
                const willBeSkipped = false; // Always show ended markets

                // Add section header for active markets at the start
                const activeHeader =
                  showHeaders && !activeHeaderRendered && !isEnded ? (
                    <>
                      <div key={`section-active`} className="pt-4 mb-3">
                        <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">
                          Active Genesis Events
                        </h2>
                      </div>
                      <div
                        key={`header-active`}
                        className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto"
                      >
                        <div className="grid lg:grid-cols-[1.5fr_1fr_1fr_1fr_0.5fr_1fr] md:grid-cols-[120px_140px_1fr_1fr_90px_80px] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
                          <div className="min-w-0 text-center">Market</div>
                          <div className="text-center min-w-0 flex items-center justify-center gap-1.5">
                            <span>Deposit Assets</span>
                            <SimpleTooltip
                              label={
                                <div>
                                  <div className="font-semibold mb-1">
                                    Multi-Token Support
                                  </div>
                                  <div className="text-xs opacity-90">
                                    Deposit any ERC20 token via ParaSwap.
                                    Non-collateral tokens will be automatically
                                    swapped.
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

                // Add header for completed markets when transitioning from active to completed
                const endedHeader =
                  showHeaders &&
                  !endedHeaderRendered &&
                  isEnded &&
                  (lastWasEnded === null || lastWasEnded !== isEnded) ? (
                    <>
                      <div key={`section-ended`} className="pt-4 mb-3">
                        <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">
                          Completed Genesis Events
                        </h2>
                      </div>
                      <div
                        key={`header-ended`}
                        className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto sticky top-0 z-10"
                      >
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
                    </>
                  ) : null;

                // Mark that we've rendered the active header
                if (activeHeader && !willBeSkipped) {
                  activeHeaderRendered = true;
                }

                // Mark that we've rendered the ended header
                if (endedHeader && !willBeSkipped) {
                  endedHeaderRendered = true;
                }

                // Only update lastWasEnded if this market will actually be rendered
                if (!willBeSkipped) {
                  lastWasEnded = isEnded;
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
                // userDeposit already defined above for willBeSkipped check

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
                const oracleAddress = (mkt as any).addresses?.collateralPrice as
                  | `0x${string}`
                  | undefined;
                const collateralPriceData = oracleAddress
                  ? collateralPricesMap.get(oracleAddress.toLowerCase())
                  : undefined;
                
                // Extract wrapped rate and underlying price from hook data (if available)
                const wrappedRate = collateralPriceData?.maxRate;
                const underlyingPriceFromOracle = collateralPriceData?.priceUSD || 0;

                // Calculate price: Priority order: Hardcoded $1 (fxUSD) → CoinGecko → Oracle
                let underlyingPriceUSD: number = 0;
                let priceError: string | null = null;
                const marketCoinGeckoId = (mkt as any)?.coinGeckoId as
                  | string
                  | undefined;

                console.log(`[Genesis Price] Market ${id} price calculation:`, {
                  collateralSymbol,
                  underlyingSymbol,
                  marketCoinGeckoId,
                  coinGeckoLoading,
                  coinGeckoPrice: marketCoinGeckoId
                    ? coinGeckoPrices[marketCoinGeckoId]
                    : undefined,
                  oraclePrice: underlyingPriceFromOracle,
                  wrappedRate: wrappedRate?.toString(),
                  collateralPriceData: collateralPriceData ? {
                    priceUSD: collateralPriceData.priceUSD,
                    maxRate: collateralPriceData.maxRate?.toString(),
                    isLoading: collateralPriceData.isLoading,
                  } : null,
                });

                // Priority 1: For fxUSD underlying (fxSAVE markets), always use hardcoded $1.00
                if (underlyingSymbol.toLowerCase() === "fxusd") {
                  underlyingPriceUSD = 1.0;
                  console.log(
                    `[Genesis Price] Market ${id}: Using hardcoded fxUSD price: $1.00`
                  );
                } else if (
                  marketCoinGeckoId &&
                  coinGeckoPrices[marketCoinGeckoId] &&
                  coinGeckoPrices[marketCoinGeckoId]! > 0
                ) {
                  // Priority 2: Try CoinGecko price for other markets (preferred when available)
                  // Only use if price is valid (> 0)
                  underlyingPriceUSD = coinGeckoPrices[marketCoinGeckoId]!;
                  console.log(
                    `[Genesis Price] Market ${id}: Using CoinGecko price for ${marketCoinGeckoId}: $${underlyingPriceUSD}`
                  );
                } else if (underlyingPriceFromOracle > 0) {
                  // Priority 3: Use oracle price from hook as fallback
                  let oraclePriceUSD = underlyingPriceFromOracle;
                  
                  // For BTC/stETH markets, oracle might return price in BTC terms, need to convert to USD
                  const pegTarget = (mkt as any)?.pegTarget?.toLowerCase();
                  const isBTCMarket = pegTarget === "btc" || pegTarget === "bitcoin";
                  if (isBTCMarket && oraclePriceUSD > 0 && oraclePriceUSD < 1) {
                    // If price is less than $1, it's likely in BTC terms (e.g., 0.05 BTC per stETH)
                    // Get BTC price in USD and convert
                    const btcPriceUSD = coinGeckoPrices["bitcoin"] || 0;
                    if (btcPriceUSD > 0) {
                      oraclePriceUSD = oraclePriceUSD * btcPriceUSD;
                      console.log(
                        `[Genesis Price] Market ${id}: Converted BTC-denominated oracle price to USD: ${underlyingPriceFromOracle} BTC × $${btcPriceUSD} = $${oraclePriceUSD}`
                      );
                    }
                  }
                  
                  // Only use oracle price if it's reasonable (not zero or extremely small)
                  // This prevents showing <0.01 when oracle returns invalid data
                  if (oraclePriceUSD > 0.01) {
                    underlyingPriceUSD = oraclePriceUSD;
                    console.log(
                      `[Genesis Price] Market ${id}: Using oracle price: $${underlyingPriceUSD}${
                        coinGeckoLoading
                          ? " (CoinGecko loading)"
                          : coinGeckoError
                          ? " (CoinGecko failed)"
                          : ""
                      }`
                    );
                  } else {
                    priceError =
                      "Price oracle returned value too small (<0.01)";
                    console.warn(
                      `[Genesis Price] Market ${id}: Oracle returned value too small: $${oraclePriceUSD}`
                    );
                  }
                } else {
                  // Check if there was an error reading the oracle
                  if (collateralPriceData?.error) {
                    priceError = `Failed to read price oracle: ${
                      collateralPriceData.error.message || "Unknown error"
                    }`;
                    console.warn(
                      `[Genesis Price] Market ${id}: Oracle read failed:`,
                      collateralPriceData.error
                    );
                  } else {
                    priceError = "Price oracle not available";
                    console.warn(
                      `[Genesis Price] Market ${id}: Oracle not available, CoinGecko loading: ${coinGeckoLoading}, CoinGecko error: ${
                        coinGeckoError ? String(coinGeckoError) : "none"
                      }`
                    );
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
                    ((coinGeckoId.toLowerCase() === "fx-saving-usd" || coinGeckoId.toLowerCase() === "fxsave") &&
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
                  coinGeckoIsWrappedToken && coinGeckoReturnedPrice && coinGeckoReturnedPrice > 0
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
                    : underlyingPriceUSD; // Fallback to underlying price if no rate available and CoinGecko not loading

                console.log(
                  `[Genesis Price] Market ${id} wrapped token price calculation:`,
                  {
                    isWstETH,
                    coinGeckoIsWrappedToken,
                    underlyingPriceUSD,
                    coinGeckoLoading,
                    stETHPrice,
                    useStETHFallback,
                    wrappedRate: wrappedRate?.toString(),
                    wrappedTokenPriceUSD,
                    source: coinGeckoIsWrappedToken
                      ? "CoinGecko (wrapped)"
                      : useStETHFallback
                      ? "stETH fallback"
                      : underlyingPriceUSD > 0
                      ? "Oracle"
                      : "None (0)",
                  }
                );

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
                
                console.log(
                  `[Genesis Deposit] Market ${id} user deposit calculation:`,
                  {
                    userDepositAmount,
                    collateralPriceUSD,
                    userDepositUSD,
                    calculation: `${userDepositAmount} wrapped tokens * $${collateralPriceUSD} = $${userDepositUSD}`,
                  }
                );

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

                const isExpanded = expandedMarket === id;
                const acceptedAssets = getAcceptedDepositAssets(mkt);

                // Show all markets (no skipping)
                return (
                  <React.Fragment key={id}>
                    {activeHeader}
                    {endedHeader}
                    <div
                      className={`py-2.5 px-2 overflow-x-auto overflow-y-visible transition cursor-pointer ${
                        isExpanded
                          ? "bg-[rgb(var(--surface-selected-rgb))]"
                          : "bg-white hover:bg-[rgb(var(--surface-selected-rgb))]"
                      }`}
                      onClick={() => setExpandedMarket(isExpanded ? null : id)}
                    >
                      {/* Mobile Card Layout (< md) */}
                      <div className="md:hidden space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[#1E4775] font-medium text-sm">
                              {rowLeveragedSymbol &&
                              rowLeveragedSymbol.toLowerCase().startsWith("hs")
                                ? rowLeveragedSymbol.slice(2)
                                : rowLeveragedSymbol || (mkt as any).name}
                            </span>
                            <span className="text-[#1E4775]/60">:</span>
                            <div className="flex items-center gap-0.5">
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
                              {isExpanded ? (
                                <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0 ml-1" />
                              ) : (
                                <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0 ml-1" />
                              )}
                            </div>
                          </div>
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
                                    initialTab:
                                      userDeposit && userDeposit > 0n
                                        ? "withdraw"
                                        : "deposit",
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
                            <div>
                              <div className="text-[#1E4775]/70 text-[10px]">
                                Deposit Assets
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                {acceptedAssets.map((asset) => (
                                  <Image
                                    key={asset.symbol}
                                    src={getLogoPath(asset.symbol)}
                                    alt={asset.name}
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0 rounded-full"
                                  />
                                ))}
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
                                  <div className="text-[#1E4775]/70">
                                    Your Deposit
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
                                  <div className="text-[#1E4775]/70">
                                    Your Deposit
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
                            : "grid-cols-[120px_140px_1fr_1fr_90px_80px]"
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

                        {/* Deposit Assets (if not ended) */}
                        {!isEnded && (
                          <div className="flex items-center justify-center gap-1.5">
                            {acceptedAssets.map((asset) => (
                              <Image
                                key={asset.symbol}
                                src={getLogoPath(asset.symbol)}
                                alt={asset.name}
                                width={20}
                                height={20}
                                className="flex-shrink-0 rounded-full"
                              />
                            ))}
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap">
                              <ArrowPathIcon className="w-2.5 h-2.5" />
                              <span>Any Token</span>
                            </div>
                          </div>
                        )}

                        {/* Stats Columns */}
                        {isEnded ? (
                          <>
                            <div className="text-center">
                              <SimpleTooltip
                                label={
                                  claimablePegged > 0n &&
                                  anchorTokenPriceUSD > 0
                                    ? formatUSD(
                                        Number(formatEther(claimablePegged)) *
                                          anchorTokenPriceUSD
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
                            <div className="text-center">
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
                                    initialTab:
                                      userDeposit && userDeposit > 0n
                                        ? "withdraw"
                                        : "deposit",
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
                            : "grid-cols-[1.5fr_1fr_1fr_1fr_0.5fr_1fr]"
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
                        {!isEnded && (
                          <div
                            className="flex items-center justify-center gap-1.5 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {acceptedAssets.map((asset) => (
                              <SimpleTooltip
                                key={asset.symbol}
                                label={
                                  <div>
                                    <div className="font-semibold mb-1">
                                      {asset.name}
                                    </div>
                                    <div className="text-xs opacity-90">
                                      All assets are converted to{" "}
                                      {collateralSymbol} on deposit
                                    </div>
                                  </div>
                                }
                              >
                                <Image
                                  src={getLogoPath(asset.symbol)}
                                  alt={asset.name}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help rounded-full"
                                />
                              </SimpleTooltip>
                            ))}
                            <SimpleTooltip
                              label={
                                <div>
                                  <div className="font-semibold mb-1">
                                    Any Token Supported
                                  </div>
                                  <div className="text-xs opacity-90">
                                    Deposit any ERC20 token via ParaSwap. It
                                    will be automatically swapped to{" "}
                                    {collateralSymbol}.
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
                        )}
                        {isEnded ? (
                          <>
                            {/* Anchor Tokens Column */}
                            <div className="text-center min-w-0">
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
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </div>
                            {/* Sail Tokens Column */}
                            <div className="text-center min-w-0">
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
                                <span className="text-xs text-gray-400">-</span>
                              )}
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
                            <SimpleTooltip label={underlyingSymbol}>
                              <Image
                                src={getLogoPath(underlyingSymbol)}
                                alt={underlyingSymbol}
                                width={20}
                                height={20}
                                className="flex-shrink-0 cursor-help rounded-full"
                              />
                            </SimpleTooltip>
                          </div>
                        )}
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
                          className="text-center min-w-0 pb-2"
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
                                    initialTab:
                                      userDeposit && userDeposit > 0n
                                        ? "withdraw"
                                        : "deposit",
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
                      {(() => {
                        // Get market bonus status from the hook called at top level
                        const marketBonusData = allMarketBonusStatus?.find(
                          (status) =>
                            status.genesisAddress?.toLowerCase() ===
                            genesisAddress?.toLowerCase()
                        );
                        const marketBonusStatus = marketBonusData?.data;
                        
                        if (!marketBonusStatus || isLoadingBonusStatus) return null;
                        
                        const bonusProgress = Math.min(
                          100,
                          (Number(marketBonusStatus.cumulativeDeposits) / Number(marketBonusStatus.thresholdAmount)) * 100
                        );
                        
                         // Get user's marks for this market
                         const marksForMarket = allMarksData?.find(
                          (marks) =>
                            marks.genesisAddress?.toLowerCase() ===
                            genesisAddress?.toLowerCase()
                        );
                        const userMarksData = marksForMarket?.data?.userHarborMarks;
                        const marks = Array.isArray(userMarksData)
                          ? userMarksData[0]
                          : userMarksData;
                        
                        const userQualifies = marks?.qualifiesForEarlyBonus || false;
                        // Calculate qualified deposit USD:
                        // - If user has a current deposit, use current deposit USD (calculated with current price)
                        // - If user has no current deposit (e.g., claimed after genesis ended), use subgraph value
                        //   (historical data, price at deposit time is fine for display purposes)
                        const earlyBonusEligibleDepositUSDFromSubgraph = parseFloat(marks?.earlyBonusEligibleDepositUSD || "0");
                        const earlyBonusEligibleUSD = userDepositUSD > 0
                          ? userDepositUSD // Use current deposit USD (calculated with current price)
                          : earlyBonusEligibleDepositUSDFromSubgraph; // Use subgraph value if no current deposit
                        
                        return (
                          <div className="px-2 pt-1.5 pb-0 border-t border-[#1E4775]/10">
                            <div>
                              {/* Progress Bar - label, bar, amounts, and qualification on one line */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] text-[#1E4775] font-semibold whitespace-nowrap">Early Deposit Bonus</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-[100px]">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${
                                      marketBonusStatus.thresholdReached
                                        ? "bg-gray-400"
                                        : "bg-[#FF8A7A]"
                                    }`}
                                    style={{ width: `${bonusProgress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-[#1E4775]/70 whitespace-nowrap">
                                  {`${Number(marketBonusStatus.cumulativeDeposits).toLocaleString(undefined, { maximumFractionDigits: 0 })} / ${Number(marketBonusStatus.thresholdAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${marketBonusStatus.thresholdToken}`}
                                </span>
                                
                                {/* User Qualification Status - on same line */}
                                {userQualifies && earlyBonusEligibleUSD > 0 && (
                                  <div className="bg-[#1E4775]/10 border border-[#1E4775]/20 px-1.5 py-0.25 whitespace-nowrap">
                                    <span className="text-[10px] text-[#1E4775] font-semibold">
                                      ✓ {formatUSD(earlyBonusEligibleUSD)} qualified
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Expanded View */}
                    {isExpanded && (
                      <MarketExpandedView
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
                      />
                    )}
                  </React.Fragment>
                );
              });

              return marketRows;
            })()}
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
            await Promise.all([
              refetchReads(),
              refetchTotalDeposits(),
              refetchPrices(),
            ]);

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
