"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useContractReads } from "wagmi";
import { formatEther } from "viem";
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
} from "@heroicons/react/24/outline";
import InfoTooltip from "@/components/InfoTooltip";

// Minimal ABIs for summary reads
const genesisABI = [
  {
    inputs: [],
    name: "genesisIsEnded",
    outputs: [{ type: "bool", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDeposits",
    outputs: [{ type: "uint256", name: "" }],
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
    name: "peggedToken",
    outputs: [{ type: "address", name: "token" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "leveragedToken",
    outputs: [{ type: "address", name: "token" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "collateralToken",
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
    <div className="flex justify-between items-center text-sm py-2 border-b border-[#1E4775]/20 last:border-b-0">
      <span className="text-[#1E4775]/70">{label}</span>
      <a
        href={`${etherscanBaseUrl}${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[#1E4775] hover:underline flex items-center gap-2"
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
  userDeposit,
  isConnected,
  address,
}: {
  marketId: string;
  market: any;
  genesisAddress: string | undefined;
  totalDeposits: bigint | undefined;
  userDeposit: bigint | undefined;
  isConnected: boolean;
  address: string | undefined;
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

  // Calculate points (dollar value x 100)
  const userDepositUSD = userDeposit ? Number(formatEther(userDeposit)) : 0;
  const estimatedPoints = userDepositUSD * 100;

  // Calculate share of points (% of deposit)
  const totalDepositsUSD = totalDeposits
    ? Number(formatEther(totalDeposits))
    : 0;
  const shareOfPoints =
    totalDepositsUSD > 0 && userDepositUSD > 0
      ? (userDepositUSD / totalDepositsUSD) * 100
      : 0;

  const addresses = market.addresses as Record<string, string | undefined>;

  return (
    <div className="bg-[#B8EBD5] p-6 border-t border-white/20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Points Info */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white p-4 h-full flex flex-col">
            <h3 className="text-[#1E4775] font-semibold mb-3">
              Estimated Points
            </h3>
            <p className="text-2xl font-bold text-[#1E4775]">
              {estimatedPoints.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-sm text-[#1E4775]/70 mt-1">
              {userDepositUSD.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}{" "}
              {collateralTokenSymbol} × 100
            </p>
          </div>

          <div className="bg-white p-4 h-full flex flex-col">
            <h3 className="text-[#1E4775] font-semibold mb-3">
              Share of Points
            </h3>
            <p className="text-2xl font-bold text-[#1E4775]">
              {shareOfPoints.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
              %
            </p>
            <p className="text-sm text-[#1E4775]/70 mt-1">
              Your deposit / Total deposits
            </p>
          </div>
        </div>

        {/* Right Column: Contract Info & Tokens */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white p-4 h-full flex flex-col">
            <h3 className="text-[#1E4775] font-semibold mb-3">Contract Info</h3>
            <div className="divide-y divide-[#1E4775]/20 flex-1">
              <EtherscanLink label="Genesis" address={addresses.genesis} />
              <EtherscanLink
                label="Market Collateral"
                address={addresses.collateralToken}
              />
              <EtherscanLink label="ha Token" address={peggedTokenAddress} />
              <EtherscanLink label="hs Token" address={leveragedTokenAddress} />
            </div>
          </div>

          <div className="bg-white p-4 h-full flex flex-col">
            <h3 className="text-[#1E4775] font-semibold mb-3">Tokens</h3>
            <div className="space-y-2 text-sm flex-1 flex justify-center flex-col">
              <div className="flex justify-between">
                <span className="text-[#1E4775]/70">Market Collateral:</span>
                <span className="text-[#1E4775] font-mono">
                  {collateralTokenSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#1E4775]/70">ha Token:</span>
                <span className="text-[#1E4775] font-mono">
                  {peggedTokenSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#1E4775]/70">hs Token:</span>
                <span className="text-[#1E4775] font-mono">
                  {leveragedTokenSymbol}
                </span>
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
  const [depositModal, setDepositModal] = useState<{
    marketId: string;
    genesisAddress: string;
    collateralAddress: string;
    collateralSymbol: string;
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

  // Index layout per market: [isEnded, totalDeposits, balanceOf?, claimable?]
  const { data: reads } = useContractReads({
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
        { address: g, abi: genesisABI, functionName: "totalDeposits" as const },
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

  return (
    <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
      <main className="container mx-auto px-4 sm:px-10 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-[#FF8A7A] p-6 flex items-center justify-center">
            <h1 className="font-bold font-mono text-white text-7xl text-center">
              Maiden Voyage
            </h1>
          </div>

          <div className="bg-[#17395F] p-6">
            <p className="text-white/80 text-sm mb-6">
              Maiden Voyage provides initial liquidity for new markets.
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-white">
                <ArrowRightIcon className="w-5 h-5 text-white flex-shrink-0" />
                <span>
                  Deposit value is split → 50% ha tokens + 50% hs tokens
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white">
                <GiftIcon className="w-5 h-5 text-white flex-shrink-0" />
                <span>Earn $TIDE airdrop points</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white">
                <ScaleIcon className="w-5 h-5 text-white flex-shrink-0" />
                <span>Delta neutral exposure at launch</span>
                <InfoTooltip
                  label="Delta neutral exposure depends on market balance and your balance of tokens. To maintain delta neutral exposure your ha and hs tokens should be the same balance as the market. Market balance can be affected by mint/redeem."
                  side="top"
                />
              </div>
              <div className="flex items-center gap-3 text-sm text-white">
                <GlobeAltIcon className="w-5 h-5 text-white flex-shrink-0" />
                <span>Use tokens however you want (redeem, stake, DeFi)</span>
              </div>
            </div>
          </div>

          <div className="bg-[#17395F] p-6">
            <h2 className="font-bold font-mono text-white text-4xl text-center mb-6">
              Points Program
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <span className="px-4 py-2 bg-[#FF8A7A] text-white font-bold text-2xl rounded-full">
                  100x multiplier
                </span>
                <InfoTooltip
                  label="100 points per dollar deposited at the end of genesis"
                  side="top"
                />
              </div>
              <p className="text-sm text-white/90 text-center -mt-2">
                during genesis
              </p>
              <div className="pt-4 border-t border-white/10">
                <p className="font-semibold text-sm text-white mb-1 text-center">
                  After genesis:
                </p>
                <p className="text-sm text-white/90 text-center">
                  Stay deposited or add new deposits to continue earning points.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          {/* Header Row */}
          <div className="bg-white p-6 overflow-x-auto">
            <div className="grid grid-cols-12 gap-4 items-center uppercase tracking-wider text-xs text-[#1E4775] font-bold">
              <div className="col-span-3">Market</div>
              <div className="col-span-2 text-right">Total Deposits</div>
              <div className="col-span-2 text-right">Your Deposit</div>
              <div className="col-span-2 text-right">Status</div>
              <div className="col-span-3 text-center">Action</div>
            </div>
          </div>

          {/* Market Rows */}
          {genesisMarkets.map(([id, m], mi) => {
            const baseOffset = mi * (isConnected ? 4 : 2);
            const isEnded = (reads?.[baseOffset]?.result as boolean) ?? false;
            const totalDeposits = reads?.[baseOffset + 1]?.result as
              | bigint
              | undefined;
            const userDeposit = isConnected
              ? (reads?.[baseOffset + 2]?.result as bigint | undefined)
              : undefined;
            const claimableResult = isConnected
              ? (reads?.[baseOffset + 3]?.result as
                  | [bigint, bigint]
                  | undefined)
              : undefined;

            const genesisAddress = (m as any).addresses?.genesis;
            const collateralAddress = (m as any).addresses?.collateralToken;
            const collateralSymbol = (m as any).collateral?.symbol || "ETH";
            const endDate = (m as any).genesis?.endDate;

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

            return (
              <React.Fragment key={id}>
                <div
                  className={`p-6 overflow-x-auto transition cursor-pointer ${
                    isExpanded ? "bg-[#B8EBD5]" : "bg-white hover:bg-[#B8EBD5]"
                  }`}
                  onClick={() => setExpandedMarket(isExpanded ? null : id)}
                >
                  <div className="grid grid-cols-12 gap-4 items-center text-sm">
                    <div className="col-span-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="text-[#1E4775] font-medium">
                            {(m as any).name}
                          </span>
                          <span className="text-xs text-[#1E4775]/50">
                            {(m as any).chain?.name || ""}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUpIcon className="w-5 h-5 text-[#1E4775]" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-[#1E4775]" />
                        )}
                      </div>
                    </div>
                    <div className="col-span-2 text-right font-mono text-[#1E4775]">
                      {formatToken(totalDeposits)}
                    </div>
                    <div className="col-span-2 text-right font-mono text-[#1E4775]">
                      {formatToken(userDeposit)}
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-[10px] uppercase px-2 py-1 bg-[#1E4775]/10 text-[#1E4775]">
                        {statusText}
                      </span>
                    </div>
                    <div
                      className="col-span-3 text-center"
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
                              });
                            }
                          }}
                          disabled={
                            isEnded || !genesisAddress || !collateralAddress
                          }
                          className="px-6 py-2.5 text-sm font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full"
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
                          className="px-6 py-2.5 text-sm font-medium bg-white text-[#1E4775] border border-[#1E4775] hover:bg-[#1E4775]/5 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors rounded-full"
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
                    userDeposit={userDeposit}
                    isConnected={isConnected}
                    address={address}
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
          onSuccess={() => {
            // Refetch data after successful deposit
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
          onSuccess={() => {
            // Refetch data after successful withdrawal
            setWithdrawModal(null);
          }}
        />
      )}
    </div>
  );
}
