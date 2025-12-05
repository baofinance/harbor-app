"use client";

import React, { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import { useAccount, useContractReads } from "wagmi";
import { formatEther } from "viem";
import { markets } from "@/config/markets";
import { useAnvilContractReads } from "@/hooks/useAnvilContractReads";
import { shouldUseAnvil } from "@/config/environment";
import { useAnchorLedgerMarks } from "@/hooks/useAnchorLedgerMarks";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon,
  GiftIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  StarIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import PriceChart from "@/components/PriceChart";
import InfoTooltip from "@/components/InfoTooltip";
import { SailManageModal } from "@/components/SailManageModal";

const minterABI = [
  {
    inputs: [],
    name: "leverageRatio",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "leveragedTokenPrice",
    outputs: [{ type: "uint256", name: "nav", internalType: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "collateralRatio",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "collateralTokenBalance",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const erc20ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256", name: "" }],
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

function formatRatio(value: bigint | undefined): string {
  if (!value) return "-";
  const percentage = Number(value) / 1e16;
  return `${percentage.toFixed(2)}%`;
}

function formatLeverage(value: bigint | undefined): string {
  if (!value) return "-";
  const leverage = Number(value) / 1e18;
  return `${leverage.toFixed(2)}x`;
}

// Extract the "long" side from leveraged token description
// e.g., "Long USD vs ETH" -> "USD", "Long ETH vs BTC" -> "ETH"
function getLongSide(market: any): string {
  const desc = market.leveragedToken?.description || "";
  const match = desc.match(/Long\s+(\w+)/i);
  return match ? match[1] : "Other";
}

// Extract the "short" side from leveraged token description
// e.g., "Long USD vs ETH (short ETH)" -> "ETH", "Long ETH vs BTC" -> "BTC"
function getShortSide(market: any): string {
  const desc = market.leveragedToken?.description || "";
  // First try to find explicit "short" mention
  const shortMatch = desc.match(/short\s+(\w+)/i);
  if (shortMatch) return shortMatch[1];
  // Otherwise, if it's "Long X vs Y", Y is the short side
  const longMatch = desc.match(/Long\s+\w+\s+vs\s+(\w+)/i);
  return longMatch ? longMatch[1] : "Other";
}

function SailMarketExpandedView({
  marketId,
  market,
  leverageRatio,
  leveragedTokenPrice,
  collateralRatio,
  collateralValue,
}: {
  marketId: string;
  market: any;
  leverageRatio: bigint | undefined;
  leveragedTokenPrice: bigint | undefined;
  collateralRatio: bigint | undefined;
  collateralValue: bigint | undefined;
}) {
  return (
    <div className="bg-[#B8EBD5] p-2 border-t border-white/20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Left: Market Info */}
        <div className="grid grid-cols-1 gap-2">
          <div className="bg-white p-3 h-full flex flex-col">
            <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
              Leverage Ratio
            </h3>
            <p className="text-sm font-bold text-[#1E4775]">
              {formatLeverage(leverageRatio)}
            </p>
          </div>

          <div className="bg-white p-3 h-full flex flex-col">
            <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
              Token Price
            </h3>
            <p className="text-sm font-bold text-[#1E4775]">
              {leveragedTokenPrice
                ? formatToken(leveragedTokenPrice, 18, 4)
                : "-"}
            </p>
          </div>

          <div className="bg-white p-3 h-full flex flex-col">
            <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
              Collateral Ratio
            </h3>
            <p className="text-sm font-bold text-[#1E4775]">
              {formatRatio(collateralRatio)}
            </p>
          </div>

          <div className="bg-white p-3 h-full flex flex-col">
            <h3 className="text-[#1E4775] font-semibold mb-2 text-xs">
              Collateral Value
            </h3>
            <p className="text-sm font-bold text-[#1E4775]">
              {formatToken(collateralValue)}
            </p>
            <p className="text-xs text-[#1E4775]/70 mt-0.5">
              {market.collateral?.symbol || "ETH"}
            </p>
          </div>
        </div>

        {/* Right: Price Chart */}
        <div className="bg-white p-3">
          <h3 className="text-[#1E4775] font-semibold mb-3 text-xs">
            Price Chart
          </h3>
          <div className="h-[300px]">
            <PriceChart
              tokenType="STEAMED"
              selectedToken={market.leveragedToken?.symbol || ""}
              marketId={marketId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SailPage() {
  const { address, isConnected } = useAccount();
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<any>(null);
  const [manageModalTab, setManageModalTab] = useState<"mint" | "redeem">(
    "mint"
  );

  // Get sail marks from subgraph
  const { sailBalances, loading: isLoadingSailMarks } = useAnchorLedgerMarks();

  // Calculate total sail marks and marks per day from sail balances
  // Use useState + useEffect to ensure component re-renders when marks change every second
  const [totalSailMarksState, setTotalSailMarksState] = useState(0);

  // Update marks state whenever sailBalances change (they update every second via currentTime in the hook)
  useEffect(() => {
    if (!sailBalances || sailBalances.length === 0) {
      setTotalSailMarksState(0);
      if (process.env.NODE_ENV === "development") {
        console.log("[Sail Page] No sail balances, setting to 0");
      }
      return;
    }

    const totalMarks = sailBalances.reduce((sum, balance) => sum + balance.estimatedMarks, 0);
    
    if (process.env.NODE_ENV === "development") {
      console.log("[Sail Page] Updating totalSailMarksState", {
        totalMarks,
        sailBalancesCount: sailBalances.length,
        sailBalances: sailBalances.map(b => ({ token: b.tokenAddress, marks: b.estimatedMarks })),
      });
    }
    
    setTotalSailMarksState(totalMarks);
  }, [sailBalances]);

  const { totalSailMarks, sailMarksPerDay } = useMemo(() => {
    if (!sailBalances || sailBalances.length === 0) {
      return { totalSailMarks: 0, sailMarksPerDay: 0 };
    }

    const totalMarks = totalSailMarksState;
    const totalPerDay = sailBalances.reduce((sum, balance) => sum + balance.marksPerDay, 0);

    return {
      totalSailMarks: totalMarks,
      sailMarksPerDay: totalPerDay,
    };
  }, [totalSailMarksState, sailBalances]);

  // Get all markets with leveraged tokens
  const sailMarkets = useMemo(
    () => Object.entries(markets).filter(([_, m]) => m.leveragedToken),
    []
  );

  // Group markets by long side
  const groupedMarkets = useMemo(() => {
    const groups: Record<string, Array<[string, any]>> = {};
    sailMarkets.forEach(([id, m]) => {
      const longSide = getLongSide(m);
      if (!groups[longSide]) {
        groups[longSide] = [];
      }
      groups[longSide].push([id, m]);
    });
    return groups;
  }, [sailMarkets]);

  // Fetch contract data for all markets
  const { data: reads } = useContractReads({
    contracts: sailMarkets.flatMap(([_, m]) => {
      const minter = (m as any).addresses?.minter as `0x${string}` | undefined;

      if (
        !minter ||
        typeof minter !== "string" ||
        !minter.startsWith("0x") ||
        minter.length !== 42
      )
        return [];

      return [
        {
          address: minter,
          abi: minterABI,
          functionName: "leverageRatio" as const,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "leveragedTokenPrice" as const,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "collateralRatio" as const,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "collateralTokenBalance" as const,
        },
      ];
    }),
    query: {
      enabled: sailMarkets.length > 0,
      retry: 1,
      retryOnMount: false,
    },
  });

  // Fetch user's leveraged token balances for all markets
  const userDepositContracts = useMemo(() => {
    return sailMarkets
      .map(([_, m], index) => {
        const leveragedTokenAddress = (m as any).addresses?.leveragedToken as
          | `0x${string}`
          | undefined;
        if (
          !leveragedTokenAddress ||
          typeof leveragedTokenAddress !== "string" ||
          !leveragedTokenAddress.startsWith("0x") ||
          leveragedTokenAddress.length !== 42 ||
          !address
        )
          return null;
        return {
          marketIndex: index,
          contract: {
            address: leveragedTokenAddress,
            abi: erc20ABI,
            functionName: "balanceOf" as const,
            args: [address as `0x${string}`],
          },
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [sailMarkets, address]);

  const useAnvil = shouldUseAnvil();
  const userDepositContractArray = useMemo(() => {
    return userDepositContracts.map((c) => c.contract);
  }, [userDepositContracts]);

  const wagmiUserDepositReads = useContractReads({
    contracts: userDepositContractArray,
    query: {
      enabled: sailMarkets.length > 0 && !!address && !useAnvil,
      retry: 1,
      retryOnMount: false,
    },
  });

  const anvilUserDepositReads = useAnvilContractReads({
    contracts: userDepositContractArray,
    enabled: sailMarkets.length > 0 && !!address && useAnvil,
    refetchInterval: 5000,
  });

  const userDepositReads = useAnvil
    ? anvilUserDepositReads.data
    : wagmiUserDepositReads.data;

  // Create a map for quick lookup: marketIndex -> deposit balance
  const userDepositMap = useMemo(() => {
    const map = new Map<number, bigint | undefined>();
    userDepositContracts.forEach(({ marketIndex }, contractIndex) => {
      const readResult = userDepositReads?.[contractIndex];
      // Handle both { result: ... } and direct result formats
      const balance =
        readResult && typeof readResult === "object" && "result" in readResult
          ? (readResult.result as bigint | undefined)
          : (readResult as bigint | undefined);
      map.set(marketIndex, balance);
    });
    return map;
  }, [userDepositReads, userDepositContracts]);

  return (
    <>
      <Head>
        <title>Sail</title>
        <meta
          name="description"
          content="Mint and redeem Sail (leveraged) tokens"
        />
      </Head>

      <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
        <main className="container mx-auto px-4 sm:px-10 pb-6">
          {/* Header */}
          <div className="mb-2">
            {/* Title - Full Row */}
            <div className="p-4 flex items-center justify-center mb-0">
              <h1 className="font-bold font-mono text-white text-7xl text-center">
                Sail
              </h1>
            </div>

            {/* Subheader */}
            <div className="flex items-center justify-center mb-2 -mt-6">
              <p className="text-white/80 text-lg text-center">
                Variable leverage tokens
              </p>
            </div>

            {/* Five Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              {/* Mint Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <BanknotesIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Mint
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Mint leveraged tokens with amplified exposure to price
                  movements
                </p>
              </div>

              {/* Leverage Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <CurrencyDollarIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Leverage
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  No funding fees - There are no ongoing fees for holding Sail
                  tokens
                </p>
              </div>

              {/* Auto Rebalancing Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <ShieldCheckIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Auto rebalancing
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Positions automatically rebalance to protect you from
                  liquidation
                </p>
              </div>

              {/* Ledger Marks Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <StarIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Ledger Marks
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Earn ledger marks for deposits: 1 ledger mark per dollar per
                  day
                </p>
              </div>

              {/* Redeem Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <ArrowPathIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Redeem
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Redeem sail tokens for collateral at any time
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-2"></div>

          {/* Sail Marks Section */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {/* Header Box */}
            <div className="bg-[#FF8A7A] p-3 flex items-center justify-center gap-2">
              <h2 className="font-bold font-mono text-white text-2xl text-center">
                Sail Marks
              </h2>
              <InfoTooltip
                label={
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-lg mb-2">
                        Sail Marks
                      </h3>
                      <p className="text-white/90 leading-relaxed">
                        Earn marks for holding Sail tokens. Sail marks are earned at 1 mark per dollar per day (with a 5x multiplier).
                      </p>
                    </div>

                    <div className="border-t border-white/20 pt-3">
                      <p className="text-white/90 leading-relaxed mb-2">
                        Sail marks track your contribution to the Harbor ecosystem through leveraged token positions.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-white/70 mt-0.5">•</span>
                        <p className="text-white/90 leading-relaxed">
                          The more Sail tokens you hold, the more marks you earn.
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
                  </div>
                }
                side="right"
              />
            </div>

            {/* Current Sail Marks Box */}
            <div className="bg-[#17395F] p-3">
              <div className="text-xs text-white/70 mb-0.5 text-center">
                Current Sail Marks
              </div>
              <div className="text-base font-bold text-white font-mono text-center">
                {isLoadingSailMarks ? (
                  "-"
                ) : totalSailMarks > 0 ? (
                  totalSailMarks.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })
                ) : (
                  "0"
                )}
              </div>
            </div>

            {/* Sail Marks per Day Box */}
            <div className="bg-[#17395F] p-3">
              <div className="text-xs text-white/70 mb-0.5 text-center">
                Sail Marks per Day
              </div>
              <div className="text-base font-bold text-white font-mono text-center">
                {isLoadingSailMarks ? (
                  "-"
                ) : sailMarksPerDay > 0 ? (
                  sailMarksPerDay.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                ) : (
                  "0"
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 mb-3"></div>

          {/* Markets List - Grouped by Long Side */}
          <section className="space-y-4">
            {Object.entries(groupedMarkets).map(([longSide, markets]) => (
              <div key={longSide}>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Long {longSide}
                </h2>

                {/* Header Row */}
                <div className="bg-white p-3 overflow-x-auto mb-2">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 items-center uppercase tracking-wider text-xs text-[#1E4775] font-bold">
                    <div className="min-w-0 text-center">Token</div>
                    <div className="text-center min-w-0">Leverage</div>
                    <div className="text-center min-w-0">TVL</div>
                    <div className="text-center min-w-0">Your Position</div>
                    <div className="text-center min-w-0">Action</div>
                  </div>
                </div>

                {/* Market Rows */}
                <div className="space-y-2">
                  {markets.map(([id, m], mi) => {
                    // Find the global index of this market
                    const globalIndex = sailMarkets.findIndex(
                      ([marketId]) => marketId === id
                    );
                    const baseOffset = globalIndex * 4;

                    const leverageRatio = reads?.[baseOffset]?.result as
                      | bigint
                      | undefined;
                    const leveragedTokenPrice = reads?.[baseOffset + 1]
                      ?.result as bigint | undefined;
                    const collateralRatio = reads?.[baseOffset + 2]?.result as
                      | bigint
                      | undefined;
                    const collateralValue = reads?.[baseOffset + 3]?.result as
                      | bigint
                      | undefined;

                    const userDeposit = userDepositMap.get(globalIndex);
                    const isExpanded = expandedMarket === id;

                    return (
                      <div key={id}>
                        <div
                          className={`p-3 overflow-x-auto transition cursor-pointer ${
                            isExpanded
                              ? "bg-[#B8EBD5]"
                              : "bg-white hover:bg-[#B8EBD5]"
                          }`}
                          onClick={() =>
                            setExpandedMarket(isExpanded ? null : id)
                          }
                        >
                          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 items-center text-sm">
                            <div className="whitespace-nowrap min-w-0 overflow-hidden">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-[#1E4775] font-medium">
                                  Short {getShortSide(m)}
                                </span>
                                {isExpanded ? (
                                  <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
                                ) : (
                                  <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
                                )}
                              </div>
                              <div className="text-xs text-[#1E4775]/50 font-mono text-center mt-0.5">
                                {m.leveragedToken.symbol}
                              </div>
                            </div>
                            <div className="text-center min-w-0">
                              <span className="text-[#1E4775] font-medium text-xs font-mono">
                                {formatLeverage(leverageRatio)}
                              </span>
                            </div>
                            <div className="text-center min-w-0">
                              <span className="text-[#1E4775] font-medium text-xs font-mono">
                                {formatToken(collateralValue)}{" "}
                                {m.collateral?.symbol || "ETH"}
                              </span>
                            </div>
                            <div className="text-center min-w-0">
                              <span className="text-[#1E4775] font-medium text-xs font-mono">
                                {userDeposit ? formatToken(userDeposit) : "-"}
                              </span>
                            </div>
                            <div
                              className="text-center min-w-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMarketId(id);
                                  setSelectedMarket(m);
                                  setManageModalTab("mint");
                                  setManageModalOpen(true);
                                }}
                                disabled={!isConnected}
                                className="px-4 py-2 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full whitespace-nowrap"
                              >
                                Manage
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded View */}
                        {isExpanded && (
                          <SailMarketExpandedView
                            marketId={id}
                            market={m}
                            leverageRatio={leverageRatio}
                            leveragedTokenPrice={leveragedTokenPrice}
                            collateralRatio={collateralRatio}
                            collateralValue={collateralValue}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </main>

        {/* Manage Modal */}
        {selectedMarketId && selectedMarket && (
          <SailManageModal
            isOpen={manageModalOpen}
            onClose={() => {
              setManageModalOpen(false);
              setSelectedMarketId(null);
              setSelectedMarket(null);
            }}
            marketId={selectedMarketId}
            market={selectedMarket}
            initialTab={manageModalTab}
            onSuccess={() => {
              // Refresh data if needed
              setManageModalOpen(false);
              setSelectedMarketId(null);
              setSelectedMarket(null);
            }}
          />
        )}
      </div>
    </>
  );
}
