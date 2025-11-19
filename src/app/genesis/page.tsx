"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useContractReads } from "wagmi";
import { formatEther } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { markets } from "../../config/markets";
import { GenesisDepositModal } from "@/components/GenesisDepositModal";
import { GenesisWithdrawModal } from "@/components/GenesisWithdrawModal";
import { GENESIS_ABI } from "../../config/contracts";
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
                  width={14}
                  height={14}
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
  const { data: allMarksData, isLoading: isLoadingMarks, refetch: refetchMarks } = useAllHarborMarks(
    genesisAddresses
  );

  const queryClient = useQueryClient();

  // Index layout per market: [isEnded, balanceOf?, claimable?]
  // Note: totalDeposits() doesn't exist in IGenesis interface
  // We'll get total deposits by checking the collateral token balance of the genesis contract
  const { data: reads, refetch: refetchReads } = useContractReads({
    contracts: genesisMarkets.flatMap(([_, m]) => {
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
    }),
    query: {
      enabled: genesisMarkets.length > 0,
      retry: 1,
      retryOnMount: false,
    },
  });

  // Fetch collateral token addresses from genesis contracts
  const { data: collateralTokenReads, refetch: refetchCollateralTokens } = useContractReads({
    contracts: genesisMarkets.map(([_, m]) => {
      const g = (m as any).addresses?.genesis as `0x${string}` | undefined;
      if (!g || typeof g !== "string" || !g.startsWith("0x") || g.length !== 42)
        return null;
      return {
        address: g,
        abi: genesisABI,
        functionName: "WRAPPED_COLLATERAL_TOKEN" as const,
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null),
    query: {
      enabled: genesisMarkets.length > 0,
      retry: 1,
      retryOnMount: false,
    },
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
  
  const { data: totalDepositsReads, refetch: refetchTotalDeposits } = useContractReads({
    contracts: genesisMarkets.flatMap(([_, m], mi) => {
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
    }),
    query: {
      enabled: genesisMarkets.length > 0 && collateralTokenReads && collateralTokenReads.length > 0,
      retry: 1,
      retryOnMount: false,
    },
  });

  // Fetch collateral price oracles for each market (for USD calculations)
  const { data: priceReads, refetch: refetchPrices } = useContractReads({
    contracts: genesisMarkets.flatMap(([_, m]) => {
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
    }),
    query: {
      enabled: genesisMarkets.length > 0,
      retry: 1,
      retryOnMount: false,
    },
  });

  return (
    <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
      <main className="container mx-auto px-4 sm:px-10 pb-6">
        {/* Header */}
        <div className="mb-2">
          {/* Title - Full Row */}
          <div className="p-4 flex items-center justify-center mb-0">
            <h1 className="font-bold font-mono text-white text-7xl text-center">
              Maiden Voyage
            </h1>
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
                <h2 className="font-bold text-white text-lg text-center">Deposit</h2>
              </div>
              <p className="text-sm text-white/80 text-center">
                Deposit a supported asset to provide resources for a markets maiden voyage
              </p>
            </div>

            {/* Earn Box */}
            <div className="bg-[#17395F] p-4">
              <div className="flex items-center justify-center mb-2">
                <CurrencyDollarIcon className="w-6 h-6 text-white mr-2" />
                <h2 className="font-bold text-white text-lg text-center">Earn Ledger Marks</h2>
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
                          width={12}
                          height={12}
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
                          width={12}
                          height={12}
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
                <h2 className="font-bold text-white text-lg text-center">After Maiden Voyage</h2>
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
                        width={12}
                        height={12}
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
          // Calculate total marks from subgraph data
          let totalCurrentMarks = 0;
          let totalMarksPerDay = 0;
          let totalEstimatedMarks = 0;

          if (allMarksData && !isLoadingMarks) {
            allMarksData.forEach((result) => {
              if (result.data?.userHarborMarks && result.data.userHarborMarks.length > 0) {
                const marks = result.data.userHarborMarks[0];
                const currentMarks = parseFloat(marks.currentMarks || "0");
                const marksPerDay = parseFloat(marks.marksPerDay || "0");
                const bonusMarks = parseFloat(marks.bonusMarks || "0");
                const genesisEnded = marks.genesisEnded || false;

                totalCurrentMarks += currentMarks;
                totalMarksPerDay += marksPerDay;

                // For estimated total: current marks + bonus marks (if ended) or current marks + projected future marks
                if (genesisEnded) {
                  // If ended, estimated total is current marks (which includes bonus)
                  totalEstimatedMarks += currentMarks;
                } else {
                  // If not ended, calculate estimated total based on remaining time
                  // Find the market to get end date using the genesisAddress from result
                  const market = genesisMarkets.find(
                    ([_, m]) => (m as any).addresses?.genesis?.toLowerCase() === result.genesisAddress?.toLowerCase()
                  );
                  if (market) {
                    const endDate = (market[1] as any).genesis?.endDate;
                    if (endDate) {
                      const end = new Date(endDate);
                      const daysUntilEnd = Math.max(
                        0,
                        (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      // Current marks + (marks per day * days remaining) + bonus at end
                      // Bonus is 100 marks per dollar, so we need currentDepositUSD
                      const currentDepositUSD = parseFloat(marks.currentDepositUSD || "0");
                      const bonusAtEnd = currentDepositUSD * 100;
                      totalEstimatedMarks += currentMarks + (marksPerDay * daysUntilEnd) + bonusAtEnd;
                    } else {
                      totalEstimatedMarks += currentMarks;
                    }
                  } else {
                    totalEstimatedMarks += currentMarks;
                  }
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
                          Think of them as a record of your journey — every mark,
                          a line in Harbor's logbook.
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
                  Current Marks
                </div>
                <div className="text-base font-bold text-white font-mono text-center">
                  {isLoadingMarks ? (
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
                  {isLoadingMarks ? (
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

              {/* Estimated Total Marks Box */}
              <div className="bg-[#17395F] p-3">
                <div className="text-xs text-white/70 mb-0.5 text-center">
                  Estimated Total Marks
                </div>
                <div className="text-base font-bold text-white font-mono text-center">
                  {isLoadingMarks ? (
                    <span className="text-white/50">-</span>
                  ) : totalEstimatedMarks > 0 ? (
                    totalEstimatedMarks.toLocaleString(undefined, {
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
              <div className="text-center min-w-0">Total Deposits</div>
              <div className="text-center min-w-0">Your Deposit</div>
              <div className="text-center min-w-0">Status</div>
              <div className="text-center min-w-0">Action</div>
            </div>
          </div>

          {/* Market Rows */}
          {genesisMarkets.map(([id, m], mi) => {
            // Updated offset: [isEnded, balanceOf?, claimable?] - no totalDeposits anymore
            const baseOffset = mi * (isConnected ? 3 : 1);
            const isEnded = (reads?.[baseOffset]?.result as boolean) ?? false;
            // Get total deposits from the collateral token balance of the genesis contract
            const totalDeposits = totalDepositsReads?.[mi]?.result as bigint | undefined;
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
            const onChainCollateralAddress = collateralTokenReads?.[mi]?.result as
              | `0x${string}`
              | undefined;
            const collateralAddress = onChainCollateralAddress || (m as any).addresses?.collateralToken;
            const collateralSymbol = (m as any).collateral?.symbol || "ETH";
            
            // Debug logging for collateral address
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Genesis ${id}] Collateral Address Debug:`, {
                onChainCollateralAddress,
                configCollateralToken: (m as any).addresses?.collateralToken,
                finalCollateralAddress: collateralAddress,
                collateralSymbol,
                expectedWstETH: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
              });
            }
            const endDate = (m as any).genesis?.endDate;

            // Get price from oracle
            const priceOffset = mi * 2;
            const priceDecimalsResult = priceReads?.[priceOffset];
            const priceAnswerResult = priceReads?.[priceOffset + 1];
            
            // Debug logging (remove in production)
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Genesis ${id}] Price Oracle Debug:`, {
                oracleAddress: (m as any).addresses?.collateralPrice,
                priceOffset,
                decimalsResult: priceDecimalsResult,
                answerResult: priceAnswerResult,
                decimalsStatus: priceDecimalsResult?.status,
                answerStatus: priceAnswerResult?.status,
              });
            }
            
            // Try to get decimals, fallback to 18 if the function doesn't exist or reverts
            // Most Chainlink oracles use 8 decimals for USD pairs, but ETH-based tokens often use 18
            let priceDecimals = 18; // Default fallback
            if (priceDecimalsResult?.status === 'success' && priceDecimalsResult?.result !== undefined) {
              priceDecimals = Number(priceDecimalsResult.result);
            } else if (priceDecimalsResult?.status === 'failure') {
              // If decimals() function doesn't exist or reverts, use default
              // For wstETH/stETH, 18 decimals is standard
              priceDecimals = 18;
            }
            
            // latestAnswer returns int256, but for prices it should be positive
            const priceRaw = priceAnswerResult?.status === 'success' && priceAnswerResult?.result !== undefined
              ? (priceAnswerResult.result as bigint)
              : undefined;
            
            const collateralPriceUSD: number = priceRaw !== undefined && priceRaw > 0n
              ? Number(priceRaw) / 10 ** priceDecimals
              : 0;
            
            // Debug logging for calculated price
            if (process.env.NODE_ENV === 'development' && priceRaw !== undefined) {
              console.log(`[Genesis ${id}] Price Calculation:`, {
                priceRaw: priceRaw.toString(),
                priceDecimals,
                calculatedPrice: collateralPriceUSD,
                decimalsSource: priceDecimalsResult?.status === 'success' ? 'oracle' : 'fallback',
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

            // Calculate status
            let statusText = "";
            if (isEnded) {
              // Check if there are claimable tokens
              const claimablePegged = claimableResult?.[0] || 0n;
              const claimableLeveraged = claimableResult?.[1] || 0n;
              const hasClaimable =
                claimablePegged > 0n || claimableLeveraged > 0n;
              statusText = hasClaimable ? "Claim available" : "Ended";
            } else {
              // Show time remaining
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
                            width={20}
                            height={20}
                            className="flex-shrink-0 cursor-help rounded-full"
                          />
                        </SimpleTooltip>
                      ))}
                    </div>
                    <div className="text-center min-w-0">
                      <div className="flex items-center justify-center gap-1.5">
                        <SimpleTooltip
                          label={
                            totalDeposits && totalDeposits > 0n
                              ? `${formatToken(totalDeposits)} ${collateralSymbol}`
                              : "No deposits"
                          }
                        >
                          <div className="font-mono text-[#1E4775] font-semibold cursor-help">
                            {totalDepositsUSD > 0
                              ? formatUSD(totalDepositsUSD)
                              : "$0"}
                          </div>
                        </SimpleTooltip>
                        <SimpleTooltip label={collateralSymbol}>
                          <Image
                            src={getLogoPath(collateralSymbol)}
                            alt={collateralSymbol}
                            width={16}
                            height={16}
                            className="flex-shrink-0 cursor-help rounded-full"
                          />
                        </SimpleTooltip>
                      </div>
                    </div>
                    <div className="text-center min-w-0">
                      <div className="flex items-center justify-center gap-1.5">
                        <SimpleTooltip
                          label={
                            userDeposit && userDeposit > 0n
                              ? `${formatToken(userDeposit)} ${collateralSymbol}`
                              : "No deposit"
                          }
                        >
                          <div className="font-mono text-[#1E4775] font-semibold cursor-help">
                            {userDepositUSD > 0
                              ? formatUSD(userDepositUSD)
                              : "$0"}
                          </div>
                        </SimpleTooltip>
                        <SimpleTooltip label={collateralSymbol}>
                          <Image
                            src={getLogoPath(collateralSymbol)}
                            alt={collateralSymbol}
                            width={16}
                            height={16}
                            className="flex-shrink-0 cursor-help rounded-full"
                          />
                        </SimpleTooltip>
                      </div>
                    </div>
                    <div className="text-center min-w-0">
                      <span className="text-[10px] uppercase px-2 py-1 bg-[#1E4775]/10 text-[#1E4775]">
                        {statusText}
                      </span>
                    </div>
                    <div
                      className="text-center min-w-0"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                                  collateralToken: (m as any).addresses?.collateralToken,
                                  wrappedCollateralToken: (m as any).addresses?.wrappedCollateralToken,
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
            // Refetch all contract data
            await Promise.all([
              refetchReads(),
              refetchCollateralTokens(),
              refetchTotalDeposits(),
              refetchPrices(),
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
            // Refetch all contract data
            await Promise.all([
              refetchReads(),
              refetchCollateralTokens(),
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
