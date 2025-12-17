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
import { useAllHarborMarks } from "@/hooks/useHarborMarks";
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
  const { data: expandedReads, error: expandedReadsError } =
    useContractReads({
      contracts:
        genesisAddress &&
        typeof genesisAddress === "string" &&
        genesisAddress.startsWith("0x") &&
        genesisAddress.length === 42
          ? [
              {
                address: genesisAddress as `0x${string}`,
                abi: genesisABI,
                functionName: "peggedToken" as const,
              },
              {
                address: genesisAddress as `0x${string}`,
                abi: genesisABI,
                functionName: "leveragedToken" as const,
              },
              {
                address: genesisAddress as `0x${string}`,
                abi: genesisABI,
                functionName: "collateralToken" as const,
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
  const { data: tokenSymbols, error: tokenSymbolsError } =
    useContractReads({
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

  return (
    <div className="bg-[rgb(var(--surface-selected-rgb))] p-4 border-t border-white/20">
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
                  width={24}
                  height={24}
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
                  width={24}
                  height={24}
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
                  width={24}
                  height={24}
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

                <div className="flex justify-end">
                  <button
                    onClick={onClose}
                    className="text-xs font-semibold text-[#1E4775] border border-[#1E4775] rounded-full py-2 px-4 hover:bg-[#1E4775]/10 transition"
                  >
                    Close
                  </button>
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
                <div className="flex justify-end">
                  <button
                    onClick={onClose}
                    className="text-xs font-semibold text-[#1E4775] border border-[#1E4775] rounded-full py-2 px-4 hover:bg-[#1E4775]/10 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Fetch collateral price oracles for each market (for USD calculations)
  // Priority order: CoinGecko → Tuple answer → Single answer
  const priceContracts = useMemo(() => {
    return genesisMarkets.flatMap(([_, mkt]) => {
      // Use collateralPrice for calculating USD value of deposits
      const oracleAddress = (mkt as any).addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      if (
        !oracleAddress ||
        typeof oracleAddress !== "string" ||
        !oracleAddress.startsWith("0x") ||
        oracleAddress.length !== 42
      )
        return [];
      // Try tuple format first (Harbor oracle), fallback to single-value handled in result processing
      return [
        {
          address: oracleAddress,
          abi: chainlinkOracleABI,
          functionName: "decimals" as const,
        },
        {
          address: oracleAddress,
          abi: chainlinkOracleABI,
          functionName: "latestAnswer" as const,
        },
      ];
    });
  }, [genesisMarkets]);

  const { data: priceReads, refetch: refetchPrices } = useContractReads({
    contracts: priceContracts,
    enabled: genesisMarkets.length > 0,
  });

  // Fetch CoinGecko prices for markets that have coinGeckoId
  const coinGeckoIds = useMemo(
    () =>
      genesisMarkets
        .map(([_, mkt]) => (mkt as any)?.coinGeckoId)
        .filter((id): id is string => !!id),
    [genesisMarkets]
  );
  const { prices: coinGeckoPrices } = useCoinGeckoPrices(coinGeckoIds, 60000);

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

          {/* Three Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {/* Deposit Box */}
            <div className="bg-[#17395F] p-4">
              <div className="flex items-center justify-center mb-2">
                <BanknotesIcon className="w-6 h-6 text-white mr-2" />
                <h2 className="font-bold text-white text-lg text-center">
                  Deposit
                </h2>
              </div>
              <p className="text-sm text-white/80 text-center">
                Deposit <span className="font-semibold text-white">any token</span> via ParaSwap to provide resources for a market's maiden voyage
              </p>
            </div>

            {/* Earn Box */}
            <div className="bg-[#17395F] p-4">
              <div className="flex items-center justify-center mb-2">
                <CurrencyDollarIcon className="w-6 h-6 text-white mr-2" />
                <h2 className="font-bold text-white text-lg text-center">
                  Earn Ledger Marks
                </h2>
              </div>
              <div className="space-y-2 text-sm text-white/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="mb-1">During Genesis:</div>
                    <div className="flex justify-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-white text-[#1E4775] text-xs font-mono w-fit">
                        <span>10x</span>
                        <Image
                          src="/icons/marks.png"
                          alt="Marks"
                          width={24}
                          height={24}
                          className="flex-shrink-0"
                        />
                        <span>/$/day</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="mb-1">End Bonus:</div>
                    <div className="flex justify-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-white text-[#1E4775] text-xs font-mono w-fit">
                        <span>100x</span>
                        <Image
                          src="/icons/marks.png"
                          alt="Marks"
                          width={24}
                          height={24}
                          className="flex-shrink-0"
                        />
                        <span>/$</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* After Maiden Voyage Box */}
            <div className="bg-[#17395F] p-4">
              <div className="flex items-center justify-center mb-2">
                <ArrowPathIcon className="w-6 h-6 text-white mr-2" />
                <h2 className="font-bold text-white text-lg text-center">
                  After Maiden Voyage
                </h2>
              </div>
              <div className="space-y-2 text-sm text-white/80">
                <p className="text-sm text-white/80 text-center">
                  Claim ha + hs tokens. Value = deposit value.
                </p>
                <div className="text-center">
                  <div className="flex items-center justify-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white text-[#1E4775] text-xs font-mono w-fit">
                      <span>1-10x</span>
                      <Image
                        src="/icons/marks.png"
                        alt="Marks"
                        width={24}
                        height={24}
                        className="flex-shrink-0"
                      />
                      <span>/$/day</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-2"></div>

        {/* Ledger Marks Section */}
        {(() => {
          // Calculate total marks from subgraph data (only maiden voyage/genesis marks)
          let totalCurrentMarks = 0;
          let totalMarksPerDay = 0;
          let totalBonusAtEnd = 0;
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
              </div>
            </div>
          );
        })()}

        {/* Divider */}
        <div className="border-t border-white/10 mb-2"></div>

        <section className="space-y-2 overflow-visible">
          {/* Header Row - Hidden on mobile, shown on md+ */}
          <div className="hidden md:block bg-white p-3 overflow-x-auto">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center uppercase tracking-wider text-xs text-[#1E4775] font-bold">
              <div className="min-w-0 text-center">Market</div>
              <div className="text-center min-w-0 flex items-center justify-center gap-1.5">
                <span>Deposit Assets</span>
                <SimpleTooltip
                  label={
                    <div>
                      <div className="font-semibold mb-1">Multi-Token Support</div>
                      <div className="text-xs opacity-90">
                        Deposit any ERC20 token via ParaSwap. Non-collateral tokens will be automatically swapped.
                      </div>
                    </div>
                  }
                >
                  <ArrowPathIcon className="w-3.5 h-3.5 text-[#1E4775] cursor-help" />
                </SimpleTooltip>
              </div>
              <div className="text-center min-w-0">
                {genesisMarkets.some(([_, mkt], mi) => {
                  const baseOffset = mi * (isConnected ? 3 : 1);
                  const isEnded =
                    (reads?.[baseOffset]?.result as boolean) ?? false;
                  return isEnded;
                })
                  ? "Claim Assets"
                  : "Total Deposits"}
              </div>
              <div className="text-center min-w-0">Your Deposit</div>
              <div className="text-center min-w-0">Status</div>
              <div className="text-center min-w-0">Action</div>
            </div>
          </div>

          {/* Market Rows */}
          {genesisMarkets.map(([id, mkt], mi) => {
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

            // Get token symbols from market configuration
            const rowPeggedSymbol = (mkt as any).peggedToken?.symbol || "ha";
            const rowLeveragedSymbol = (mkt as any).leveragedToken?.symbol || "hs";
            const displayMarketName =
              rowLeveragedSymbol &&
              rowLeveragedSymbol.toLowerCase().startsWith("hs")
                ? rowLeveragedSymbol.slice(2)
                : rowLeveragedSymbol || (mkt as any).name || "Market";
            const peggedNoPrefix =
              rowPeggedSymbol && rowPeggedSymbol.toLowerCase().startsWith("ha")
                ? rowPeggedSymbol.slice(2)
                : rowPeggedSymbol || "pegged token";

            // Get total deposits from the collateral token balance of the genesis contract
            const totalDeposits = totalDepositsReads?.[mi]?.result as
              | bigint
              | undefined;
            const userDeposit = isConnected
              ? (reads?.[baseOffset + 1]?.result as bigint | undefined)
              : undefined;
            const claimableResult = isConnected
              ? (reads?.[baseOffset + 2]?.result as
                  | [bigint, bigint]
                  | undefined)
              : undefined;

            const genesisAddress = (mkt as any).addresses?.genesis;
            // Use on-chain collateral token address from genesis contract, fallback to config
            const onChainCollateralAddress = collateralTokenReads?.[mi]
              ?.result as `0x${string}` | undefined;
            const collateralAddress =
              onChainCollateralAddress ||
              (mkt as any).addresses?.collateralToken;
            const collateralSymbol = (mkt as any).collateral?.symbol || "ETH";
            const wrappedCollateralSymbol = (mkt as any).collateral?.underlyingSymbol || collateralSymbol;

            // Debug logging for collateral address
            const endDate = (mkt as any).genesis?.endDate;

            // Get price from oracle
            const priceOffset = mi * 2;
            const priceDecimalsResult = priceReads?.[priceOffset];
            const priceAnswerResult = priceReads?.[priceOffset + 1];
            // Try to get decimals from oracle; default to 18 (wstETH-style feeds) if unavailable
            let priceDecimals = 18;
            if (
              priceDecimalsResult?.status === "success" &&
              priceDecimalsResult?.result !== undefined
            ) {
              priceDecimals = Number(priceDecimalsResult.result);
            }

            // Price priority order: CoinGecko → Tuple answer → Single answer
            // Handle both tuple and single-value oracle formats
            // Harbor oracle returns tuple: (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
            // Standard Chainlink returns single int256
            // Note: We try tuple format first via chainlinkOracleABI, but handle both formats in result processing
            let priceRaw: bigint | undefined;
            let wrappedRate: bigint | undefined;
            if (
              priceAnswerResult?.status === "success" &&
              priceAnswerResult?.result !== undefined
            ) {
              const result = priceAnswerResult.result;
              // Priority 2: Check if result is a tuple (array with 4 elements) - Harbor oracle format
              if (Array.isArray(result) && result.length === 4) {
                // Harbor oracle format: use maxUnderlyingPrice (index 1) and maxWrappedRate (index 3)
                priceRaw = result[1] as bigint;
                wrappedRate = result[3] as bigint;
              } else if (typeof result === "bigint") {
                // Priority 3: Standard Chainlink format - single int256 value
                // Convert to positive if negative (some oracles return negative for error states)
                priceRaw = result < 0n ? -result : result;
              }
            }

            // Calculate price: Priority order: CoinGecko → Hardcoded $1 (fxUSD) → Oracle
            let underlyingPriceUSD: number = 0;
            let priceError: string | null = null;
            const marketCoinGeckoId = (mkt as any)?.coinGeckoId as
              | string
              | undefined;

            // Priority 1: Try CoinGecko price first if available
            if (marketCoinGeckoId && coinGeckoPrices[marketCoinGeckoId]) {
              underlyingPriceUSD = coinGeckoPrices[marketCoinGeckoId]!;
            } else if (collateralSymbol.toLowerCase() === "fxusd") {
              // For fxUSD, use hardcoded $1.00
              underlyingPriceUSD = 1.00;
            } else if (priceRaw !== undefined) {
              // Priority 2 & 3: Use oracle price (tuple or single-value format)
              // Convert to positive if negative (some oracles return negative for error states)
              const priceValue = priceRaw < 0n ? -priceRaw : priceRaw;

              if (priceValue > 0n) {
                underlyingPriceUSD = Number(priceValue) / 10 ** priceDecimals;
              } else {
                priceError = "Price oracle returned zero or invalid value";
              }
            } else {
              // Check if there was an error reading the oracle
              if (priceAnswerResult?.status === "failure") {
                priceError = `Failed to read price oracle: ${
                  priceAnswerResult.error?.message || "Unknown error"
                }`;
              } else if (priceDecimalsResult?.status === "failure") {
                priceError = `Failed to read price oracle decimals: ${
                  priceDecimalsResult.error?.message || "Unknown error"
                }`;
              } else {
                priceError = "Price oracle not available";
              }
            }

            // Calculate wrapped token price: underlying price * wrapped rate
            // Deposits are stored in wrapped collateral tokens, so we need wrapped token price
            // IMPORTANT: If CoinGecko ID is for wrapped token (e.g., "wrapped-steth"), it already returns wrapped price
            const coinGeckoId = (mkt as any)?.coinGeckoId as string | undefined;
            const coinGeckoIsWrappedToken = coinGeckoId && (
              (coinGeckoId.toLowerCase() === "wrapped-steth" && collateralSymbol.toLowerCase() === "wsteth") ||
              (coinGeckoId.toLowerCase() === "fxsave" && collateralSymbol.toLowerCase() === "fxsave")
            );
            
            // Don't multiply by wrapped rate if CoinGecko already returns wrapped token price
            const wrappedTokenPriceUSD = coinGeckoIsWrappedToken && underlyingPriceUSD > 0
              ? underlyingPriceUSD // CoinGecko already returns wrapped token price (from line 1456)
              : wrappedRate && underlyingPriceUSD > 0
                ? underlyingPriceUSD * (Number(wrappedRate) / 1e18)
                : underlyingPriceUSD; // Fallback to underlying price if no rate available

            // Use wrapped token price for USD calculations since deposits are in wrapped collateral
            const collateralPriceUSD = wrappedTokenPriceUSD;

            // Calculate USD values using wrapped token price
            const totalDepositsAmount = totalDeposits
              ? Number(formatEther(totalDeposits))
              : 0;
            const totalDepositsUSD = totalDepositsAmount * collateralPriceUSD;

            const userDepositAmount = userDeposit
              ? Number(formatEther(userDeposit))
              : 0;
            const userDepositUSD = userDepositAmount * collateralPriceUSD;

            // Calculate status
            // IMPORTANT: Contract's genesisIsEnded() takes precedence over time-based calculation
            // isEnded is already calculated above using contract read (with subgraph fallback)
            let statusText = "";
            const claimablePegged = claimableResult?.[0] || 0n;
            const claimableLeveraged = claimableResult?.[1] || 0n;
            const hasClaimable =
              claimablePegged > 0n || claimableLeveraged > 0n;

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

            return (
              <React.Fragment key={id}>
                <div
                  className={`p-3 overflow-x-auto overflow-y-visible transition cursor-pointer ${
                    isExpanded
                      ? "bg-[rgb(var(--surface-selected-rgb))]"
                      : "bg-white hover:bg-[rgb(var(--surface-selected-rgb))]"
                  }`}
                  onClick={() => setExpandedMarket(isExpanded ? null : id)}
                >
                  {/* Mobile Card Layout */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[#1E4775] font-medium text-base">
                          {rowLeveragedSymbol &&
                          rowLeveragedSymbol.toLowerCase().startsWith("hs")
                            ? rowLeveragedSymbol.slice(2)
                            : rowLeveragedSymbol || (mkt as any).name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Image
                            src={getLogoPath(rowPeggedSymbol)}
                            alt={rowPeggedSymbol}
                            width={24}
                            height={24}
                            className="flex-shrink-0"
                          />
                          <Image
                            src={getLogoPath(rowLeveragedSymbol)}
                            alt={rowLeveragedSymbol}
                            width={24}
                            height={24}
                            className="flex-shrink-0"
                          />
                        </div>
                        {isExpanded ? (
                          <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
                        )}
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
                              className="px-4 py-2 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full whitespace-nowrap touch-target"
                            >
                              {claimingMarket === id ? "Claiming..." : "Claim"}
                            </button>
                          ) : null
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setManageModal({ open: true, marketId: id });
                            }}
                            className="px-4 py-2 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] transition-colors rounded-full whitespace-nowrap touch-target"
                          >
                            Manage
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
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
                      </div>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-semibold uppercase tracking-wide">
                        <ArrowPathIcon className="w-2.5 h-2.5" />
                        <span>Any Token</span>
                      </div>
                      <div className="flex-1 flex items-center justify-between text-xs">
                        <div>
                          <div className="text-[#1E4775]/70">Total</div>
                          <div className="text-[#1E4775] font-semibold">
                            {isEnded
                              ? hasClaimable
                                ? `${formatEther(claimablePegged)} ${rowPeggedSymbol || (mkt as any).peggedToken?.symbol || "ha"}`
                                : "-"
                              : totalDeposits && totalDeposits > 0n
                              ? collateralPriceUSD > 0
                                ? formatUSD(totalDepositsUSD)
                                : `${formatToken(totalDeposits)} ${wrappedCollateralSymbol}`
                              : "$0"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#1E4775]/70">Yours</div>
                          <div className="text-[#1E4775] font-semibold">
                            {userDeposit && userDeposit > 0n
                              ? collateralPriceUSD > 0
                                ? formatUSD(userDepositUSD)
                                : `${formatToken(userDeposit)} ${wrappedCollateralSymbol}`
                              : "$0"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#1E4775]/70">Status</div>
                          <div>
                            {isProcessing ? (
                              <span className="text-[10px] uppercase px-2 py-1 bg-yellow-100 text-yellow-800">
                                {statusText}
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase px-2 py-1 bg-[#1E4775]/10 text-[#1E4775]">
                                {statusText}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Table Layout */}
                  <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center justify-start gap-2">
                        <span className="text-[#1E4775] font-medium flex-1 min-w-0 truncate">
                          {rowLeveragedSymbol &&
                          rowLeveragedSymbol.toLowerCase().startsWith("hs")
                            ? rowLeveragedSymbol.slice(2)
                            : rowLeveragedSymbol || (mkt as any).name}
                        </span>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <Image
                            src={getLogoPath(rowPeggedSymbol)}
                            alt={rowPeggedSymbol}
                            width={18}
                            height={18}
                            className="flex-shrink-0"
                          />
                          <Image
                            src={getLogoPath(rowLeveragedSymbol)}
                            alt={rowLeveragedSymbol}
                            width={18}
                            height={18}
                            className="flex-shrink-0"
                          />
                        </div>
                        {isExpanded ? (
                          <ChevronUpIcon className="w-4 h-4 text-[#1E4775] flex-shrink-0 ml-1" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4 text-[#1E4775] flex-shrink-0 ml-1" />
                        )}
                      </div>
                    </div>
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
                                All assets are converted to {wrappedCollateralSymbol}{" "}
                                on deposit
                              </div>
                            </div>
                          }
                        >
                          <Image
                            src={getLogoPath(asset.symbol)}
                            alt={asset.name}
                            width={24}
                            height={24}
                            className="flex-shrink-0 cursor-help rounded-full"
                          />
                        </SimpleTooltip>
                      ))}
                      <SimpleTooltip
                        label={
                          <div>
                            <div className="font-semibold mb-1">Any Token Supported</div>
                            <div className="text-xs opacity-90">
                              Deposit any ERC20 token via ParaSwap. It will be automatically swapped to {wrappedCollateralSymbol}.
                            </div>
                          </div>
                        }
                      >
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold uppercase tracking-wide cursor-help">
                          <ArrowPathIcon className="w-3 h-3" />
                          <span>Any Token</span>
                        </div>
                      </SimpleTooltip>
                    </div>
                    <div className="text-center min-w-0">
                      {isEnded ? (
                        // After genesis ends, show claimable assets
                        <div className="flex flex-col items-center gap-1">
                          {hasClaimable ? (
                            <>
                              {claimablePegged > 0n && (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-[#1E4775] font-semibold text-xs">
                                    {formatEther(claimablePegged)}{" "}
                                    {rowPeggedSymbol ||
                                      (mkt as any).peggedToken?.symbol ||
                                      "haPB"}
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
                                    width={24}
                                    height={24}
                                    className="flex-shrink-0"
                                  />
                                </div>
                              )}
                              {claimableLeveraged > 0n && (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-[#1E4775] font-semibold text-xs">
                                    {formatEther(claimableLeveraged)}{" "}
                                    {rowLeveragedSymbol ||
                                      (mkt as any).leveragedToken?.symbol ||
                                      "hsPB"}
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
                                    width={24}
                                    height={24}
                                    className="flex-shrink-0"
                                  />
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-500">
                              No tokens to claim
                            </span>
                          )}
                        </div>
                      ) : (
                        // Before genesis ends, show total deposits
                        <div className="flex items-center justify-center gap-1.5">
                          <SimpleTooltip
                            label={
                              totalDeposits && totalDeposits > 0n
                                ? priceError
                                  ? `${formatToken(
                                      totalDeposits
                                    )} ${wrappedCollateralSymbol}\n\nPrice Error: ${priceError}`
                                  : `${formatToken(
                                      totalDeposits
                                    )} ${wrappedCollateralSymbol}`
                                : priceError
                                ? `No deposits\n\nPrice Error: ${priceError}`
                                : "No deposits"
                            }
                          >
                            <div className="font-mono text-[#1E4775] font-semibold cursor-help">
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
                                  )} ${wrappedCollateralSymbol}`
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
                          <SimpleTooltip label={wrappedCollateralSymbol}>
                            <Image
                              src={getLogoPath(wrappedCollateralSymbol)}
                              alt={wrappedCollateralSymbol}
                              width={24}
                              height={24}
                              className="flex-shrink-0 cursor-help rounded-full"
                            />
                          </SimpleTooltip>
                        </div>
                      )}
                    </div>
                    <div className="text-center min-w-0">
                      <div className="flex items-center justify-center gap-1.5">
                        <SimpleTooltip
                          label={
                            userDeposit && userDeposit > 0n
                              ? priceError
                                ? `${formatToken(
                                    userDeposit
                                  )} ${wrappedCollateralSymbol}\n\nPrice Error: ${priceError}`
                                : `${formatToken(
                                    userDeposit
                                  )} ${wrappedCollateralSymbol}`
                              : priceError
                              ? `No deposit\n\nPrice Error: ${priceError}`
                              : "No deposit"
                          }
                        >
                          <div className="font-mono text-[#1E4775] font-semibold cursor-help">
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
                                )} ${wrappedCollateralSymbol}`
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
                        <SimpleTooltip label={wrappedCollateralSymbol}>
                          <Image
                            src={getLogoPath(wrappedCollateralSymbol)}
                            alt={wrappedCollateralSymbol}
                            width={24}
                            height={24}
                            className="flex-shrink-0 cursor-help rounded-full"
                          />
                        </SimpleTooltip>
                      </div>
                    </div>
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
                                  The Harbor team will transfer collateral and
                                  make ha + hs tokens claimable imminently.
                                </p>
                                <p className="mt-2">
                                  <strong>Deposits:</strong> Still possible
                                  until claiming opens. Complete your deposit
                                  before the processing ends.
                                </p>
                                <p>
                                  <strong>Marks:</strong> Still being earned
                                  during processing. Bonus marks will be applied
                                  at the end of processing.
                                </p>
                              </div>
                            </div>
                          }
                        >
                          <span className="text-[10px] uppercase px-2 py-1 bg-yellow-100 text-yellow-800 cursor-help flex items-center gap-1 justify-center">
                            <ClockIcon className="w-3 h-3" />
                            {statusText}
                          </span>
                        </SimpleTooltip>
                      ) : (
                        <span className="text-[10px] uppercase px-2 py-1 bg-[#1E4775]/10 text-[#1E4775]">
                          {statusText}
                        </span>
                      )}
                    </div>
                    <div
                      className="text-center min-w-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isEnded ? (
                        // After genesis ends, show claim button only
                        <div className="flex items-center justify-center">
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
                              {claimingMarket === id ? "Claiming..." : "Claim"}
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
                                initialTab: userDeposit && userDeposit > 0n ? "withdraw" : "deposit",
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
                    collateralSymbol={wrappedCollateralSymbol}
                    collateralPriceUSD={collateralPriceUSD}
                    peggedSymbol={rowPeggedSymbol}
                    leveragedSymbol={rowLeveragedSymbol}
                  />
                )}
              </React.Fragment>
            );
          })}
        </section>
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
