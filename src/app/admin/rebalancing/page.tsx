"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { markets } from "@/config/markets";
import { useAccount, useContractReads, usePublicClient, useWriteContract } from "wagmi";
import { minterABI } from "@/abis/minter";
import { STABILITY_POOL_MANAGER_ABI } from "@/abis/shared";
import { formatEther } from "viem";
import { ConnectWallet } from "@/components/Wallet";
import { formatCollateralRatio } from "@/hooks/useTransparencyData";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type MarketRebalanceRow = {
  marketId: string;
  marketName: string;
  minterAddress: `0x${string}`;
  stabilityPoolManagerAddress: `0x${string}`;
  collateralRatio?: bigint;
  rebalanceable?: boolean;
  rebalanceThreshold?: bigint;
};

function BoolPill({ value }: { value?: boolean }) {
  const isTrue = value === true;
  const isFalse = value === false;
  const className = isTrue
    ? "bg-green-900/30 text-green-300 border-green-500/30"
    : isFalse
      ? "bg-orange-900/30 text-orange-300 border-orange-500/30"
      : "bg-gray-900/30 text-gray-400 border-gray-500/30";

  const label = value === true ? "Available" : value === false ? "Not available" : "Loading…";

  return (
    <span className={`px-3 py-1 border text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export default function AdminRebalancingPage() {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [mounted, setMounted] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [activeMarketId, setActiveMarketId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [minPeggedLiquidated] = useState<bigint>(0n);

  useEffect(() => setMounted(true), []);

  const rebalanceMarkets = useMemo(() => {
    return Object.entries(markets)
      .map(([marketId, m]) => {
        const minter = (m as any)?.addresses?.minter as `0x${string}` | undefined;
        const stabilityPoolManager = (m as any)?.addresses?.stabilityPoolManager as
          | `0x${string}`
          | undefined;

        if (!minter || !stabilityPoolManager) return null;
        if (stabilityPoolManager.toLowerCase() === ZERO_ADDRESS) return null;

        return {
          marketId,
          marketName: (m as any)?.name ?? marketId,
          minterAddress: minter,
          stabilityPoolManagerAddress: stabilityPoolManager,
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, []);

  const contracts = useMemo(() => {
    const cs: any[] = [];
    for (const m of rebalanceMarkets) {
      cs.push({
        address: m.stabilityPoolManagerAddress,
        abi: STABILITY_POOL_MANAGER_ABI,
        functionName: "rebalanceable",
      });
      cs.push({
        address: m.stabilityPoolManagerAddress,
        abi: STABILITY_POOL_MANAGER_ABI,
        functionName: "rebalanceThreshold",
      });
      cs.push({
        address: m.minterAddress,
        abi: minterABI,
        functionName: "collateralRatio",
      });
    }
    return cs;
  }, [rebalanceMarkets]);

  const { data, refetch } = useContractReads({
    contracts,
    query: {
      enabled: mounted && isConnected && contracts.length > 0,
      refetchInterval: 30_000,
      staleTime: 15_000,
      retry: 1,
      allowFailure: true,
    } as any,
  });

  const rows: MarketRebalanceRow[] = useMemo(() => {
    const out: MarketRebalanceRow[] = [];
    for (let i = 0; i < rebalanceMarkets.length; i++) {
      const base = i * 3;
      const rebalanceableRes = data?.[base]?.status === "success" ? (data?.[base]?.result as boolean) : undefined;
      const thresholdRes = data?.[base + 1]?.status === "success" ? (data?.[base + 1]?.result as bigint) : undefined;
      const collateralRatioRes = data?.[base + 2]?.status === "success" ? (data?.[base + 2]?.result as bigint) : undefined;

      const m = rebalanceMarkets[i];
      out.push({
        marketId: m.marketId,
        marketName: m.marketName,
        minterAddress: m.minterAddress,
        stabilityPoolManagerAddress: m.stabilityPoolManagerAddress,
        rebalanceable: rebalanceableRes,
        rebalanceThreshold: thresholdRes,
        collateralRatio: collateralRatioRes,
      });
    }
    return out;
  }, [rebalanceMarkets, data]);

  const handleRebalance = async (row: MarketRebalanceRow) => {
    if (!address) return;
    if (!row.stabilityPoolManagerAddress) return;
    if (row.rebalanceable !== true) return;
    if (row.stabilityPoolManagerAddress.toLowerCase() === ZERO_ADDRESS) return;

    setActiveMarketId(row.marketId);
    setTxError(null);
    setTxHash(null);

    try {
      const bountyReceiver = address as `0x${string}`;
      if (!bountyReceiver || bountyReceiver.toLowerCase() === ZERO_ADDRESS) {
        throw new Error("bountyReceiver must be non-zero");
      }

      const hash = await writeContractAsync({
        address: row.stabilityPoolManagerAddress,
        abi: STABILITY_POOL_MANAGER_ABI,
        functionName: "rebalance",
        args: [bountyReceiver, minPeggedLiquidated],
      });

      setTxHash(hash as `0x${string}`);
      // Wait for finality, then refresh UI.
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      await refetch();
    } catch (e: any) {
      const msg =
        e?.shortMessage ||
        e?.message ||
        (typeof e === "string" ? e : "Rebalance transaction failed");
      setTxError(String(msg));
    } finally {
      setActiveMarketId(null);
    }
  };

  // If not connected show placeholder like other admin pages.
  if (!mounted) {
    return (
      <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
        <main className="container mx-auto px-4 sm:px-10 pt-[6rem] pb-6 relative z-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="text-4xl font-medium font-geo text-left text-white">ADMIN / REBALANCING</h1>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
      <main className="container mx-auto px-4 sm:px-10 pt-[6rem] pb-6 relative z-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-4xl font-medium font-geo text-left text-white">ADMIN / REBALANCING</h1>
          <Link href="/admin">
            <button className="py-2 px-4 bg-white/10 text-white font-medium hover:bg-white/15 transition-colors">
              Back to Admin
            </button>
          </Link>
        </div>

        {!isConnected ? (
          <div className="bg-zinc-900/50 p-6 text-center">
            <p className="mb-4 text-white/70">Please connect your wallet to access admin functions</p>
            <div className="inline-block">
              <ConnectWallet />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 bg-zinc-900/50 p-4 sm:p-6 space-y-3">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white">Rebalance stability pools</div>
                  <div className="text-xs text-white/60">
                    Anyone can call `rebalance(...)`, but execution is only successful when `collateralRatio &lt; rebalanceThreshold`.
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-white/70 select-none">
                  <input
                    type="checkbox"
                    checked={showRaw}
                    onChange={(e) => setShowRaw(e.target.checked)}
                  />
                  Show raw collateralRatio / addresses
                </label>
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="bg-zinc-900/50 p-6 text-center text-white/70">
                No markets with `stabilityPoolManager` found.
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((row) => {
                  const isBusy = activeMarketId === row.marketId;
                  const buttonDisabled = !row.rebalanceable || row.rebalanceable !== true || isBusy;
                  const cr = row.collateralRatio;
                  const threshold = row.rebalanceThreshold;

                  return (
                    <div key={row.marketId} className="bg-zinc-900/50 p-4 sm:p-6 space-y-3">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                          <div className="text-lg font-medium text-white">{row.marketName}</div>
                          <div className="text-xs text-white/60">Market ID: <span className="font-mono">{row.marketId}</span></div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <BoolPill value={row.rebalanceable} />
                            {typeof cr === "bigint" && typeof threshold === "bigint" && (
                              <span className="text-xs text-white/70">
                                CR: <span className="font-mono">{formatCollateralRatio(cr)}</span> • Threshold:{" "}
                                <span className="font-mono">{formatCollateralRatio(threshold)}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 items-start md:items-end">
                          <button
                            onClick={() => handleRebalance(row)}
                            disabled={buttonDisabled}
                            className="py-2 px-4 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isBusy ? "Submitting..." : "Rebalance"}
                          </button>
                          {txError && activeMarketId === row.marketId && (
                            <div className="text-xs text-red-300 max-w-md">
                              {txError}
                            </div>
                          )}
                          {txHash && activeMarketId === row.marketId && (
                            <div className="text-xs text-white/60 font-mono">
                              tx: {txHash}
                            </div>
                          )}
                        </div>
                      </div>

                      {showRaw && (
                        <div className="text-xs text-white/60 space-y-2">
                          <div>
                            Minter: <span className="font-mono">{row.minterAddress}</span>
                          </div>
                          <div>
                            stabilityPoolManager: <span className="font-mono">{row.stabilityPoolManagerAddress}</span>
                          </div>
                          <div>
                            collateralRatio raw:{" "}
                            <span className="font-mono">{cr !== undefined ? cr.toString() : "-"}</span>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-white/50">
                        Params: `bountyReceiver={address}` • `minPeggedLiquidated={formatEther(minPeggedLiquidated)}`
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

