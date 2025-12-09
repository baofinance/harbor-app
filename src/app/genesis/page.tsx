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
import { GenesisDepositModal } from "@/components/GenesisDepositModal";
import { GenesisWithdrawModal } from "@/components/GenesisWithdrawModal";
import { GENESIS_ABI } from "../../config/contracts";
import { useAnvilContractReads } from "@/hooks/useAnvilContractReads";
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
import { useCoinGeckoPrices } from "@/hooks/useCoinGeckoPrice";

// Helper function to get logo path for tokens/networks
function getLogoPath(symbol: string): string {
  const normalizedSymbol = symbol.toLowerCase();
  if (normalizedSymbol === "eth" || normalizedSymbol === "ethereum") {
    return "/icons/eth.png";
  }
  if (normalizedSymbol === "fxsave") {
    return "/icons/fxSave.png";
  }
  if (normalizedSymbol === "fxusd") {
    return "/icons/fxUSD.webp";
  }
  if (normalizedSymbol === "usdc") {
    return "/icons/usdc.webp";
  }
  if (normalizedSymbol === "steth") {
    return "/icons/steth_logo.webp";
  }
  if (normalizedSymbol === "wsteth") {
    return "/icons/wstETH.webp";
  }
  // Use haETH logo for haPB, haUSD2 for other ha tokens
  if (normalizedSymbol === "hapb") {
    return "/icons/haETH.png";
  }
  if (normalizedSymbol.startsWith("ha")) {
    return "/icons/haUSD2.png";
  }
  // Use hsUSDETH logo for sail tokens (e.g., hsPB) - for test environment
  if (normalizedSymbol.startsWith("hs")) {
    return "/icons/hsUSDETH.png";
  }
  return "/icons/placeholder.svg";
}

// Helper function to get accepted deposit assets for a market
function getAcceptedDepositAssets(
  collateralSymbol: string
): Array<{ symbol: string; name: string }> {
  const normalized = collateralSymbol.toLowerCase();
  if (normalized === "fxsave") {
    // USD-based markets: fxSAVE, fxUSD, USDC
    return [
      { symbol: "fxSAVE", name: "fxSAVE" },
      { symbol: "fxUSD", name: "fxUSD" },
      { symbol: "USDC", name: "USDC" },
    ];
  } else if (normalized === "wsteth") {
    // ETH-based markets: ETH, stETH, wstETH
    return [
      { symbol: "ETH", name: "Ethereum" },
      { symbol: "stETH", name: "Lido Staked ETH" },
      { symbol: "wstETH", name: "Wrapped Staked ETH" },
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
    outputs: [{ type: "int256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function formatToken(
  value: bigint | undefined,
  decimals = 18,
  maxFrac = 4
): string {
  if (!value) return "0";
  const n = Number(value) / 10 ** decimals;
  if (n > 0 && n < 1 / 10 ** maxFrac)
    return `<${(1 / 10 ** maxFrac).toFixed(maxFrac)}`;
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

function formatUSD(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.01) return `<$0.01`;
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function formatTimeRemaining(
  endDate: string,
  currentTime: Date = new Date()
): string {
  const end = new Date(endDate);
  const diffMs = end.getTime() - currentTime.getTime();

  if (diffMs <= 0) {
    return "Ended";
  }

  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;
  const diffMinutes = diffMs / (1000 * 60);

  if (diffDays >= 2) {
    return `ends in ${diffDays.toFixed(1)} days`;
  } else if (diffHours >= 2) {
    return `ends in ${diffHours.toFixed(1)} hours`;
  } else {
    return `ends in ${diffMinutes.toFixed(0)} minutes`;
  }
}

function EtherscanLink({
  label,
  address,
}: {
  label: string;
  address?: string;
}) {
  if (!address) return null;
  const etherscanBaseUrl = "https://etherscan.io/address/";
  return (
    <div className="flex justify-between items-center text-xs py-0.5 border-b border-[#1E4775]/20 last:border-b-0">
      <span className="text-[#1E4775]/70">{label}</span>
      <a
        href={`${etherscanBaseUrl}${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[#1E4775] hover:underline flex items-center gap-1"
      >
        {`${address.slice(0, 6)}...${address.slice(-4)}`}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  );
}

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
    peggedTokenAddress && tokenSymbols?.[0]?.result
      ? (tokenSymbols[0].result as string)
      : market.peggedToken?.symbol || "ha";
  const leveragedTokenSymbol =
    leveragedTokenAddress && tokenSymbols?.[1]?.result
      ? (tokenSymbols[1].result as string)
      : market.leveragedToken?.symbol || "hs";
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
    <div className="bg-[#B8EBD5] p-2 border-t border-white/20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Genesis Info */}
        <div className="bg-white p-2 flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-1 text-xs">
            End Date/Time
          </h3>
          <p className="text-sm font-bold text-[#1E4775]">
            {formatEndDateTime(endDate)}
          </p>
        </div>

        {/* Contract Info */}
        <div className="bg-white p-2 flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-1 text-xs">
            Contract Info
          </h3>
          <div className="divide-y divide-[#1E4775]/20 space-y-1">
            <EtherscanLink label="Genesis" address={addresses.genesis} />
            <EtherscanLink
              label="Market Collateral"
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
              <span className="text-[#1E4775] font-mono">
                {peggedTokenSymbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#1E4775]/70">hs Token:</span>
              <span className="text-[#1E4775] font-mono">
                {leveragedTokenSymbol}
              </span>
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
  const [depositModal, setDepositModal] = useState<{
    marketId: string;
    genesisAddress: string;
    collateralAddress: string;
    collateralSymbol: string;
    acceptedAssets: Array<{ symbol: string; name: string }>;
  } | null>(null);
  const [withdrawModal, setWithdrawModal] = useState<{
    marketId: string;
    genesisAddress: string;
    collateralSymbol: string;
    userDeposit: bigint;
  } | null>(null);
  const [now, setNow] = useState(new Date());
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [claimingMarket, setClaimingMarket] = useState<string | null>(null);

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
      Object.entries(markets).filter(([_, m]) => (m as any).addresses?.genesis),
    []
  );

  // Get all genesis addresses for subgraph queries
  const genesisAddresses = useMemo(
    () =>
      genesisMarkets
        .map(([_, m]) => (m as any).addresses?.genesis)
        .filter((addr): addr is string => !!addr && typeof addr === "string"),
    [genesisMarkets]
  );

  // Fetch marks data from subgraph
  const {
    data: allMarksData,
    isLoading: isLoadingMarks,
    refetch: refetchMarks,
  } = useAllHarborMarks(genesisAddresses);

  const queryClient = useQueryClient();

  // Index layout per market: [isEnded, balanceOf?, claimable?]
  // Note: totalDeposits() doesn't exist in IGenesis interface
  // We'll get total deposits by checking the collateral token balance of the genesis contract
  // Use Anvil-specific hook to ensure reads go to Anvil network
  const genesisReadContracts = useMemo(() => {
    return genesisMarkets.flatMap(([_, m]) => {
      const g = (m as any).addresses?.genesis as `0x${string}` | undefined;
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

  const { data: reads, refetch: refetchReads } = useAnvilContractReads({
    contracts: genesisReadContracts,
    enabled: genesisMarkets.length > 0,
    refetchInterval: 5000, // Refetch every 5 seconds to catch genesis end
  });

  // Fetch collateral token addresses from genesis contracts
  const collateralTokenContracts = useMemo(() => {
    return genesisMarkets
      .map(([_, m]) => {
        const g = (m as any).addresses?.genesis as `0x${string}` | undefined;
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
    useAnvilContractReads({
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
    return genesisMarkets.flatMap(([_, m], mi) => {
      const g = (m as any).addresses?.genesis as `0x${string}` | undefined;
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
    useAnvilContractReads({
      contracts: totalDepositsContracts,
      enabled:
        genesisMarkets.length > 0 &&
        collateralTokenReads &&
        collateralTokenReads.length > 0,
    });

  // Fetch collateral price oracles for each market (for USD calculations)
  const priceContracts = useMemo(() => {
    return genesisMarkets.flatMap(([_, m]) => {
      // Use collateralPrice for calculating USD value of deposits
      const oracleAddress = (m as any).addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      if (
        !oracleAddress ||
        typeof oracleAddress !== "string" ||
        !oracleAddress.startsWith("0x") ||
        oracleAddress.length !== 42
      )
        return [];
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

  const { data: priceReads, refetch: refetchPrices } = useAnvilContractReads({
    contracts: priceContracts,
    enabled: genesisMarkets.length > 0,
  });

  // Fetch CoinGecko prices for markets that have coinGeckoId
  const coinGeckoIds = useMemo(
    () =>
      genesisMarkets
        .map(([_, m]) => (m as any)?.coinGeckoId)
        .filter((id): id is string => !!id),
    [genesisMarkets]
  );
  const { prices: coinGeckoPrices } = useCoinGeckoPrices(coinGeckoIds, 60000);

  // Refetch marks when genesis ends to get bonus marks
  useEffect(() => {
    if (!reads || !isConnected) return;

    // Check if any genesis has ended
    const anyEnded = genesisMarkets.some(([_, m], mi) => {
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
            <div className="flex flex-col items-end gap-2 border border-white/30 rounded-lg px-3 py-2">
              <div className="text-white text-xs font-medium whitespace-nowrap">
                follow to stay up to date
              </div>
              <div className="flex items-center justify-center gap-2 w-full">
              <a
                href="https://x.com/0xharborfi"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
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
                className="p-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition-colors"
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
                Deposit a supported asset to provide resources for a markets
                maiden voyage
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="mb-1">During Genesis:</div>
                    <div className="flex justify-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-white text-[#1E4775] text-xs font-mono rounded w-fit">
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
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-white text-[#1E4775] text-xs font-mono rounded w-fit">
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
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white text-[#1E4775] text-xs font-mono rounded w-fit">
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
          const allContractsEnded = genesisMarkets.every(([_, m], mi) => {
            const baseOffset = mi * (isConnected ? 3 : 1);
            const contractSaysEnded = reads?.[baseOffset]?.result as
              | boolean
              | undefined;
            return contractSaysEnded === true;
          });

          // Check if any genesis is in "processing" state (time expired but contract not ended)
          const anyInProcessing = genesisMarkets.some(([_, m], mi) => {
            const baseOffset = mi * (isConnected ? 3 : 1);
            const contractSaysEnded = reads?.[baseOffset]?.result as
              | boolean
              | undefined;
            const endDate = (m as any).genesis?.endDate;
            const timeHasExpired = endDate
              ? new Date(endDate).getTime() <= Date.now()
              : false;
            return timeHasExpired && !contractSaysEnded;
          });

          if (allMarksData && !isLoadingMarks) {
            const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds

            // Debug: log the raw marks data
            if (process.env.NODE_ENV === "development") {
              console.log("[Marks Data Debug]", {
                allMarksDataLength: allMarksData.length,
                allMarksData: allMarksData.map((r) => ({
                  genesisAddress: r.genesisAddress,
                  hasData: !!r.data,
                  hasUserHarborMarks: !!r.data?.userHarborMarks,
                  userHarborMarksLength: r.data?.userHarborMarks?.length || 0,
                  errors: r.errors,
                })),
              });
            }

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
                  ([_, m]) =>
                    (m as any).addresses?.genesis?.toLowerCase() ===
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

                // Get the actual USD value using the price oracle
                // The subgraph stores:
                // - currentDeposit: token amount in wei (e.g., "155000000000000000000" = 155 tokens)
                // - currentDepositUSD: USD value (e.g., "310000" = $310,000)
                // - marksPerDay: calculated marks per day based on USD value
                const currentDepositWei = marks.currentDeposit || "0";
                const currentDepositTokenAmount =
                  parseFloat(currentDepositWei) / 1e18; // Convert from wei to tokens
                let currentDepositUSD = parseFloat(
                  marks.currentDepositUSD || "0"
                ); // Use subgraph's USD value as fallback
                // If genesis has ended, marksPerDay should be 0 (no more marks accumulating)
                let marksPerDay = genesisEnded ? 0 : marksPerDayFromSubgraph; // Use subgraph's value as fallback

                // Try to get price from the price reads we already have
                if (market) {
                  const marketIndex = genesisMarkets.findIndex(
                    ([id]) => id === market[0]
                  );
                  if (marketIndex >= 0) {
                    const priceOffset = marketIndex * 2;
                    const priceAnswerResult = priceReads?.[priceOffset + 1];
                    const priceDecimalsResult = priceReads?.[priceOffset];

                    // Try to get decimals from oracle, fallback to 8 (Chainlink standard)
                    let priceDecimals = 8; // Default fallback (Chainlink standard)
                    if (
                      priceDecimalsResult?.status === "success" &&
                      priceDecimalsResult?.result !== undefined
                    ) {
                      priceDecimals = Number(priceDecimalsResult.result);
                    }

                    const priceRaw =
                      priceAnswerResult?.status === "success" &&
                      priceAnswerResult?.result !== undefined
                        ? (priceAnswerResult.result as bigint)
                        : undefined;

                    // Calculate price: handle negative values (convert to positive) and apply decimals
                    let collateralPriceUSD: number = 0;
                    const marketCoinGeckoId = (m as any)?.coinGeckoId as string | undefined;
                    
                    // Try CoinGecko price first if available
                    if (marketCoinGeckoId && coinGeckoPrices[marketCoinGeckoId]) {
                      collateralPriceUSD = coinGeckoPrices[marketCoinGeckoId]!;
                    } else if (priceRaw !== undefined) {
                      // Convert to positive if negative (some oracles return negative for error states)
                      const priceValue = priceRaw < 0n ? -priceRaw : priceRaw;

                      if (priceValue > 0n) {
                        collateralPriceUSD =
                          Number(priceValue) / 10 ** priceDecimals;
                      }
                    }

                    if (collateralPriceUSD > 0) {
                      // Calculate actual USD value: token amount * price per token
                      currentDepositUSD =
                        currentDepositTokenAmount * collateralPriceUSD;

                      // Recalculate marksPerDay with correct USD value
                      // marksPerDay should be: currentDepositUSD * 10 marks per dollar per day
                      // But if genesis has ended, marksPerDay should be 0
                      marksPerDay = genesisEnded ? 0 : currentDepositUSD * 10;

                      // Debug logging
                      if (process.env.NODE_ENV === "development") {
                        console.log("[Marks USD Calculation]", {
                          genesisAddress: result.genesisAddress,
                          currentDepositTokenAmount,
                          collateralPriceUSD,
                          calculatedCurrentDepositUSD: currentDepositUSD,
                          marksPerDayFromSubgraph: marksPerDayFromSubgraph,
                          correctedMarksPerDay: marksPerDay,
                          usingFallback:
                            priceRaw === undefined || priceRaw === 0n,
                        });
                      }
                    } else {
                      // Debug if price is not available
                      if (process.env.NODE_ENV === "development") {
                        console.log("[Marks USD Calculation - No Price]", {
                          genesisAddress: result.genesisAddress,
                          currentDepositTokenAmount,
                          priceRaw: priceRaw?.toString(),
                          priceDecimals,
                          collateralPriceUSD,
                          priceAnswerStatus: priceAnswerResult?.status,
                          priceDecimalsStatus: priceDecimalsResult?.status,
                        });
                      }
                    }
                  }
                }

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
                  if (process.env.NODE_ENV === "development") {
                    console.log("[Marks - Genesis Ended]", {
                      genesisAddress: result.genesisAddress,
                      currentMarksFromSubgraph: marks.currentMarks,
                      bonusMarks: bonusMarks,
                      currentMarks: currentMarks,
                    });
                  }
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

                  // Debug logging
                  if (process.env.NODE_ENV === "development") {
                    console.log("[Marks Calculation]", {
                      genesisAddress: result.genesisAddress,
                      currentMarksFromSubgraph: marks.currentMarks,
                      currentDepositUSD,
                      genesisStartDate: new Date(
                        genesisStartDate * 1000
                      ).toISOString(),
                      lastUpdated: new Date(lastUpdated * 1000).toISOString(),
                      currentTime: new Date(currentTime * 1000).toISOString(),
                      timeElapsed,
                      daysElapsed,
                      marksAccumulated,
                      calculatedCurrentMarks: currentMarks,
                      genesisEnded,
                    });
                  }
                } else {
                  // Debug why marks aren't being calculated
                  if (process.env.NODE_ENV === "development") {
                    console.log("[Marks Calculation - Skipped]", {
                      genesisAddress: result.genesisAddress,
                      genesisEnded,
                      currentDepositUSD,
                      genesisStartDate,
                      reason: !genesisEnded
                        ? "genesisEnded is true"
                        : currentDepositUSD <= 0
                        ? "no deposit"
                        : genesisStartDate <= 0
                        ? "no start date"
                        : "unknown",
                    });
                  }
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
            <div className="grid grid-cols-4 gap-2 mb-2">
              {/* Header Box */}
              <div className="bg-[#FF8A7A] p-3 flex items-center justify-center gap-2">
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
                      maximumFractionDigits: 0,
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
          {/* Header Row */}
          <div className="bg-white p-3 overflow-x-auto">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center uppercase tracking-wider text-xs text-[#1E4775] font-bold">
              <div className="min-w-0 text-center">Market</div>
              <div className="text-center min-w-0">Deposit Assets</div>
              <div className="text-center min-w-0">
                {genesisMarkets.some(([_, m], mi) => {
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
          {genesisMarkets.map(([id, m], mi) => {
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
                (m as any).addresses?.genesis?.toLowerCase()
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

            // Debug logging for genesis end status
            if (process.env.NODE_ENV === "development") {
              const genesisAddress = (m as any).addresses?.genesis;
              console.log(`[Genesis ${id}] End Status Check:`, {
                genesisAddress,
                baseOffset,
                contractReadStatus: contractReadResult?.status,
                contractReadResult: contractReadResult?.result,
                contractSaysEnded,
                subgraphSaysEnded,
                finalIsEnded: isEnded,
                error: contractReadResult?.error?.message,
                allReadsLength: reads?.length,
              });
            }
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

            const genesisAddress = (m as any).addresses?.genesis;
            // Use on-chain collateral token address from genesis contract, fallback to config
            const onChainCollateralAddress = collateralTokenReads?.[mi]
              ?.result as `0x${string}` | undefined;
            const collateralAddress =
              onChainCollateralAddress || (m as any).addresses?.collateralToken;
            const collateralSymbol = (m as any).collateral?.symbol || "ETH";

            // Debug logging for collateral address
            if (process.env.NODE_ENV === "development") {
              console.log(`[Genesis ${id}] Collateral Address Debug:`, {
                onChainCollateralAddress,
                configCollateralToken: (m as any).addresses?.collateralToken,
                finalCollateralAddress: collateralAddress,
                collateralSymbol,
                expectedWstETH: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
              });
            }
            const endDate = (m as any).genesis?.endDate;

            // Get price from oracle
            const priceOffset = mi * 2;
            const priceDecimalsResult = priceReads?.[priceOffset];
            const priceAnswerResult = priceReads?.[priceOffset + 1];

            // Debug logging (remove in production)
            if (process.env.NODE_ENV === "development") {
              console.log(`[Genesis ${id}] Price Oracle Debug:`, {
                oracleAddress: (m as any).addresses?.collateralPrice,
                priceOffset,
                decimalsResult: priceDecimalsResult,
                answerResult: priceAnswerResult,
                decimalsStatus: priceDecimalsResult?.status,
                answerStatus: priceAnswerResult?.status,
              });
            }

            // Try to get decimals from oracle, fallback to 8 (Chainlink standard) if not available
            // Most Chainlink oracles use 8 decimals for USD pairs
            let priceDecimals = 8; // Default fallback (Chainlink standard)
            if (
              priceDecimalsResult?.status === "success" &&
              priceDecimalsResult?.result !== undefined
            ) {
              priceDecimals = Number(priceDecimalsResult.result);
            } else if (priceDecimalsResult?.status === "failure") {
              // If decimals() function doesn't exist or reverts, try 8 (Chainlink) then 18 (ETH standard)
              // Try to infer from price value if available
              priceDecimals = 8; // Default to Chainlink standard
            }

            // latestAnswer returns int256, which can be negative, but prices should be positive
            const priceRaw =
              priceAnswerResult?.status === "success" &&
              priceAnswerResult?.result !== undefined
                ? (priceAnswerResult.result as bigint)
                : undefined;

            // Calculate price: handle negative values (convert to positive) and apply decimals
            let collateralPriceUSD: number = 0;
            let priceError: string | null = null;
            const marketCoinGeckoId = (m as any)?.coinGeckoId as string | undefined;

            // Try CoinGecko price first if available
            if (marketCoinGeckoId && coinGeckoPrices[marketCoinGeckoId]) {
              collateralPriceUSD = coinGeckoPrices[marketCoinGeckoId]!;
            } else if (priceRaw !== undefined) {
              // Convert to positive if negative (some oracles return negative for error states)
              const priceValue = priceRaw < 0n ? -priceRaw : priceRaw;

              if (priceValue > 0n) {
                collateralPriceUSD = Number(priceValue) / 10 ** priceDecimals;
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

            // Debug logging for calculated price
            if (process.env.NODE_ENV === "development") {
              console.log(`[Genesis ${id}] Price Calculation:`, {
                oracleAddress: (m as any).addresses?.collateralPrice,
                priceRaw: priceRaw?.toString(),
                priceRawNumber: priceRaw ? Number(priceRaw) : undefined,
                priceDecimals,
                calculatedPrice: collateralPriceUSD,
                priceError,
                decimalsSource:
                  priceDecimalsResult?.status === "success"
                    ? "oracle"
                    : "fallback",
                answerStatus: priceAnswerResult?.status,
                decimalsStatus: priceDecimalsResult?.status,
              });
            }

            // Calculate USD values
            const totalDepositsAmount = totalDeposits
              ? Number(formatEther(totalDeposits))
              : 0;
            const totalDepositsUSD = totalDepositsAmount * collateralPriceUSD;

            const userDepositAmount = userDeposit
              ? Number(formatEther(userDeposit))
              : 0;
            const userDepositUSD = userDepositAmount * collateralPriceUSD;

            // Debug logging for deposits (after all variables are defined)
            if (process.env.NODE_ENV === "development") {
              console.log(`[Genesis ${id}] Deposit Debug:`, {
                genesisAddress,
                baseOffset,
                readsLength: reads?.length,
                readsData: reads?.map((r, idx) => ({
                  idx,
                  status: r.status,
                  result: r.result?.toString(),
                  error: r.error?.message,
                })),
                totalDepositsReadsLength: totalDepositsReads?.length,
                totalDepositsRead: totalDepositsReads?.[mi],
                totalDeposits: totalDeposits?.toString(),
                totalDepositsAmount,
                totalDepositsUSD,
                userDeposit: userDeposit?.toString(),
                userDepositAmount,
                userDepositUSD,
                isConnected,
                address,
                collateralTokenReads: collateralTokenReads?.map((r, idx) => ({
                  idx,
                  status: r.status,
                  result: r.result,
                })),
                collateralAddress,
                onChainCollateralAddress,
                collateralPriceUSD,
              });
            }

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

            if (process.env.NODE_ENV === "development") {
              const readResult = reads?.[baseOffset];
              console.log(`[Genesis ${id}] Status Calculation:`, {
                isEnded,
                timeHasExpired,
                isProcessing,
                contractReadStatus: readResult?.status,
                contractReadResult: readResult?.result,
                hasClaimable,
                endDate,
                now: now.toISOString(),
              });
            }

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
            const acceptedAssets = getAcceptedDepositAssets(collateralSymbol);

            return (
              <React.Fragment key={id}>
                <div
                  className={`p-3 overflow-x-auto overflow-y-visible transition cursor-pointer ${
                    isExpanded ? "bg-[#B8EBD5]" : "bg-white hover:bg-[#B8EBD5]"
                  }`}
                  onClick={() => setExpandedMarket(isExpanded ? null : id)}
                >
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center text-sm">
                    <div className="whitespace-nowrap min-w-0 overflow-hidden">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[#1E4775] font-medium">
                          {(m as any).name}
                        </span>
                        {isExpanded ? (
                          <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
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
                                All assets are converted to {collateralSymbol}{" "}
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
                                    {(m as any).peggedToken?.symbol || "haPB"}
                                  </span>
                                  <Image
                                    src={getLogoPath(
                                      (m as any).peggedToken?.symbol || "haPB"
                                    )}
                                    alt={
                                      (m as any).peggedToken?.symbol || "haPB"
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
                                    {(m as any).leveragedToken?.symbol ||
                                      "hsPB"}
                                  </span>
                                  <Image
                                    src={getLogoPath(
                                      (m as any).leveragedToken?.symbol ||
                                        "hsPB"
                                    )}
                                    alt={
                                      (m as any).leveragedToken?.symbol ||
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
                                    )} ${collateralSymbol}\n\nPrice Error: ${priceError}`
                                  : `${formatToken(
                                      totalDeposits
                                    )} ${collateralSymbol}`
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
                                  )} ${collateralSymbol}\n\nPrice Error: ${priceError}`
                                : `${formatToken(
                                    userDeposit
                                  )} ${collateralSymbol}`
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
                                  } catch (error) {
                                    console.error("Claim failed:", error);
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
                        // Before genesis ends, show deposit/withdraw buttons
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (genesisAddress && collateralAddress) {
                                setDepositModal({
                                  marketId: id,
                                  genesisAddress,
                                  collateralAddress,
                                  collateralSymbol,
                                  acceptedAssets,
                                  marketAddresses: {
                                    collateralToken: (m as any).addresses
                                      ?.collateralToken,
                                    wrappedCollateralToken: (m as any).addresses
                                      ?.wrappedCollateralToken,
                                  },
                                });
                              }
                            }}
                            disabled={
                              isEnded || !genesisAddress || !collateralAddress
                            }
                            className="px-4 py-2 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full whitespace-nowrap"
                          >
                            Deposit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                genesisAddress &&
                                userDeposit &&
                                userDeposit > 0n
                              ) {
                                setWithdrawModal({
                                  marketId: id,
                                  genesisAddress,
                                  collateralSymbol,
                                  userDeposit,
                                });
                              }
                            }}
                            disabled={
                              !userDeposit ||
                              userDeposit === 0n ||
                              !genesisAddress ||
                              isEnded
                            }
                            className="px-4 py-2 text-xs font-medium bg-white text-[#1E4775] border border-[#1E4775] hover:bg-[#1E4775]/5 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors rounded-full whitespace-nowrap"
                          >
                            Withdraw
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
                    market={m}
                    genesisAddress={genesisAddress}
                    totalDeposits={totalDeposits}
                    totalDepositsUSD={totalDepositsUSD}
                    userDeposit={userDeposit}
                    isConnected={isConnected}
                    address={address}
                    endDate={endDate}
                    collateralSymbol={collateralSymbol}
                    collateralPriceUSD={collateralPriceUSD}
                  />
                )}
              </React.Fragment>
            );
          })}
        </section>
      </main>

      {depositModal && (
        <GenesisDepositModal
          isOpen={!!depositModal}
          onClose={() => setDepositModal(null)}
          genesisAddress={depositModal.genesisAddress}
          collateralAddress={depositModal.collateralAddress}
          collateralSymbol={depositModal.collateralSymbol}
          acceptedAssets={depositModal.acceptedAssets}
          marketAddresses={depositModal.marketAddresses}
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

            // Wait longer for subgraph to index the deposit event
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

            setDepositModal(null);
          }}
        />
      )}

      {withdrawModal && (
        <GenesisWithdrawModal
          isOpen={!!withdrawModal}
          onClose={() => setWithdrawModal(null)}
          genesisAddress={withdrawModal.genesisAddress}
          collateralSymbol={withdrawModal.collateralSymbol}
          userDeposit={withdrawModal.userDeposit}
          onSuccess={async () => {
            // Wait for blockchain state to update
            await new Promise((resolve) => setTimeout(resolve, 2000));
            // Refetch contract data in order: collateral tokens first (needed for total deposits)
            await refetchCollateralTokens();
            // Wait a bit for collateral token reads to complete before refetching total deposits
            await new Promise((resolve) => setTimeout(resolve, 500));
            // Then refetch everything else
            await Promise.all([
              refetchReads(),
              refetchTotalDeposits(),
              refetchPrices(),
            ]);

            // Wait longer for subgraph to index the withdrawal event
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

            setWithdrawModal(null);
          }}
        />
      )}
    </div>
  );
}
