"use client";

import React, { useEffect, useMemo, useState } from "react";

export type CompoundTargetMode = "single-token" | "keep-per-token";

export interface CompoundSelectedPosition {
  marketId: string;
  market: any;
  poolType: "collateral" | "sail";
  rewardsUSD: number;
  rewardTokens: Array<{
    symbol: string;
    claimable: bigint;
    claimableFormatted: string;
  }>;
}

export interface CompoundTargetPoolApr {
  marketId: string;
  collateralSymbol: string; // e.g. fxSAVE / wstETH
  poolType: "collateral" | "sail";
  poolAddress: `0x${string}`;
  apr?: number; // %
}

export interface CompoundTargetOption {
  // Representative market used as an "anchor" for next step; APRs can span multiple markets.
  marketId: string;
  symbol: string; // e.g. haBTC
  pools: CompoundTargetPoolApr[];
}

interface CompoundTargetTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: CompoundSelectedPosition[];
  options: CompoundTargetOption[];
  selectedClaimPools: Array<{ marketId: string; poolType: "collateral" | "sail" }>;
  preflight:
    | {
        key: string;
        isLoading: boolean;
        error?: string;
        fees: Array<{
          id: string;
          label: string;
          tokenSymbol: string;
          feeFormatted: string;
          feePercentage?: number;
          details?: string;
        }>;
      }
    | null;
  simplePreflight:
    | {
        key: string;
        isLoading: boolean;
        error?: string;
        fees: Array<{
          id: string;
          label: string;
          tokenSymbol: string;
          feeFormatted: string;
          feePercentage?: number;
          details?: string;
        }>;
      }
    | null;
  onPreflight: (args: {
    targetMarketId: string;
    allocations: Array<{ poolAddress: `0x${string}`; percentage: number }>;
    selectedClaimPools: Array<{ marketId: string; poolType: "collateral" | "sail" }>;
  }) => void;
  onSimplePreflight: (args: {
    selectedClaimPools: Array<{ marketId: string; poolType: "collateral" | "sail" }>;
  }) => void;
  onContinue: (args: {
    mode: CompoundTargetMode;
    targetMarketId?: string;
    allocations?: Array<{ poolAddress: `0x${string}`; percentage: number }>;
  }) => void;
}

export const CompoundTargetTokenModal = ({
  isOpen,
  onClose,
  positions,
  options,
  selectedClaimPools,
  preflight,
  simplePreflight,
  onPreflight,
  onSimplePreflight,
  onContinue,
}: CompoundTargetTokenModalProps) => {
  const [mode, setMode] = useState<CompoundTargetMode>("keep-per-token");
  const [targetMarketId, setTargetMarketId] = useState<string | undefined>(
    options[0]?.marketId
  );
  const [selectedPools, setSelectedPools] = useState<Set<string>>(new Set());
  const [percentages, setPercentages] = useState<Map<string, number>>(new Map());

  // Keep default selection in sync when options change (e.g. when user re-opens modal)
  useEffect(() => {
    if (!isOpen) return;
    if (!targetMarketId || !options.some((o) => o.marketId === targetMarketId)) {
      setTargetMarketId(options[0]?.marketId);
    }
    // Default to Simple compound each time the modal opens.
    setMode("keep-per-token");
    setSelectedPools(new Set());
    setPercentages(new Map());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, options]);

  const collateralGroups = useMemo(() => {
    const set = new Set(options.flatMap((o) => o.pools.map((p) => p.collateralSymbol)));
    return Array.from(set);
  }, [options]);

  const canSingleToken = options.length > 0;
  const selectedTokenOption = useMemo(
    () => options.find((o) => o.marketId === targetMarketId),
    [options, targetMarketId]
  );

  const tokenFilterItems = useMemo(() => {
    return options.map((o) => {
      const aprs = o.pools
        .map((p) => p.apr)
        .filter((x): x is number => x !== undefined);
      const min = aprs.length ? Math.min(...aprs) : undefined;
      const max = aprs.length ? Math.max(...aprs) : undefined;
      return {
        marketId: o.marketId,
        symbol: o.symbol,
        min,
        max,
        poolsCount: o.pools.length,
      };
    });
  }, [options]);

  const totalPct = useMemo(() => {
    return Array.from(selectedPools).reduce(
      (sum, addr) => sum + (percentages.get(addr) || 0),
      0
    );
  }, [selectedPools, percentages]);

  const pctError =
    mode === "single-token" && selectedPools.size > 0 && totalPct !== 100
      ? "Percentages must add up to 100%"
      : null;

  const allocationArray = useMemo(() => {
    return Array.from(selectedPools).map((addrLower) => ({
      poolAddress: addrLower as `0x${string}`,
      percentage: percentages.get(addrLower) || 0,
    }));
  }, [selectedPools, percentages]);

  const preflightKey = useMemo(() => {
    if (!targetMarketId) return "";
    const a = allocationArray
      .slice()
      .sort((x, y) => x.poolAddress.localeCompare(y.poolAddress))
      .map((x) => [x.poolAddress.toLowerCase(), x.percentage]);
    const c = selectedClaimPools
      .slice()
      .sort((x, y) => `${x.marketId}-${x.poolType}`.localeCompare(`${y.marketId}-${y.poolType}`));
    return JSON.stringify({ t: targetMarketId, a, c });
  }, [allocationArray, selectedClaimPools, targetMarketId]);

  const simplePreflightKey = useMemo(() => {
    const c = selectedClaimPools
      .slice()
      .sort((x, y) =>
        `${x.marketId}-${x.poolType}`.localeCompare(`${y.marketId}-${y.poolType}`)
      );
    return JSON.stringify({ c });
  }, [selectedClaimPools]);

  // Auto-run fee previews (no user button).
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "keep-per-token") {
      const isFresh = !!simplePreflight && simplePreflight.key === simplePreflightKey;
      if (!isFresh && !(simplePreflight?.isLoading && simplePreflight.key === simplePreflightKey)) {
        onSimplePreflight({ selectedClaimPools });
      }
      return;
    }

    if (mode === "single-token") {
      if (!targetMarketId) return;
      if (selectedPools.size === 0) return;
      if (pctError) return;

      const isFresh = preflight && preflight.key === preflightKey;
      if (!isFresh && !(preflight?.isLoading && preflight.key === preflightKey)) {
        onPreflight({
          targetMarketId,
          allocations: allocationArray,
          selectedClaimPools,
        });
      }
    }
  }, [
    allocationArray,
    isOpen,
    mode,
    onPreflight,
    onSimplePreflight,
    pctError,
    preflight,
    preflightKey,
    selectedClaimPools,
    selectedPools.size,
    simplePreflight,
    simplePreflightKey,
    targetMarketId,
  ]);

  const togglePool = (addrLower: string) => {
    setSelectedPools((prev) => {
      const next = new Set(prev);
      if (next.has(addrLower)) next.delete(addrLower);
      else next.add(addrLower);
      return next;
    });
    setPercentages((prev) => {
      const next = new Map(prev);
      if (next.has(addrLower)) next.delete(addrLower);
      else next.set(addrLower, 0);
      return next;
    });
    // If this becomes the only selected pool, auto-set it to 100%
    setTimeout(() => {
      setSelectedPools((prevSel) => {
        if (prevSel.size !== 1) return prevSel;
        const only = Array.from(prevSel)[0];
        setPercentages((prevPct) => {
          const nextPct = new Map(prevPct);
          nextPct.set(only, 100);
          return nextPct;
        });
        return prevSel;
      });
    }, 0);
  };

  const setPoolPct = (addrLower: string, value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    setPercentages((prev) => new Map(prev).set(addrLower, clamped));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white shadow-2xl w-full max-w-3xl mx-2 sm:mx-4 animate-in fade-in-0 scale-in-95 duration-200 flex flex-col max-h-[95vh] sm:max-h-[90vh] rounded-none overflow-hidden">
        <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-[#1E4775]/20">
          <h2 className="text-2xl font-bold text-[#1E4775]">
            Choose Anchor Token to Compound To
          </h2>
          <button
            onClick={onClose}
            className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6">
          <div>
            <div className="text-sm font-semibold text-[#1E4775] mb-2">
              Selected positions
            </div>
            <div className="border border-[#1E4775]/20">
              {positions.map((p) => {
                const symbol = p.market?.peggedToken?.symbol || p.marketId;
                return (
                  <div
                    key={`${p.marketId}-${p.poolType}`}
                    className="flex items-center justify-between px-3 py-2 border-b border-[#1E4775]/10 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1E4775] truncate">
                        {symbol} {p.poolType} pool
                      </div>
                      <div className="text-xs text-[#1E4775]/70">
                        {p.rewardTokens
                          ?.map((t) => `${t.claimableFormatted} ${t.symbol}`)
                          .join(", ")}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[#1E4775]">
                      ${p.rewardsUSD.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-[#1E4775]">
              Compounding mode
            </div>

            <label className="flex items-start gap-3 p-3 border border-[#1E4775]/20">
              <input
                type="radio"
                checked={mode === "keep-per-token"}
                onChange={() => setMode("keep-per-token")}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-[#1E4775]">
                  Simple compound
                </div>
                <div className="text-xs text-[#1E4775]/70 mt-1">
                  Claim rewards, convert to Anchor tokens, deposit back into original stability pools.
                </div>

                {/* Fee preview (auto) */}
                <div className="pt-3 mt-3 border-t border-[#1E4775]/15 space-y-2">
                  <div className="text-xs font-semibold text-[#1E4775]/80 uppercase tracking-wide">
                    Estimated fees (dry run)
                  </div>

                  {simplePreflight?.key !== simplePreflightKey && (
                    <div className="text-xs text-[#1E4775]/70">
                      Calculating…
                    </div>
                  )}

                  {simplePreflight?.isLoading && (
                    <div className="text-xs text-[#1E4775]/70">
                      Calculating…
                    </div>
                  )}

                  {simplePreflight?.error && simplePreflight.key === simplePreflightKey && (
                    <div className="text-xs text-rose-600">{simplePreflight.error}</div>
                  )}

                  {simplePreflight &&
                  !simplePreflight.isLoading &&
                  !simplePreflight.error &&
                  simplePreflight.key === simplePreflightKey ? (
                    simplePreflight.fees.length ? (
                      <div className="space-y-2">
                        {simplePreflight.fees.map((f) => (
                          <div
                            key={f.id}
                            className="p-2 border border-amber-200 bg-amber-50 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold text-amber-900">
                                {f.label}
                              </div>
                              <div className="font-mono font-semibold text-amber-900">
                                {f.feeFormatted} {f.tokenSymbol}
                                {f.feePercentage !== undefined && (
                                  <span className="text-amber-700 ml-2">
                                    ({f.feePercentage.toFixed(2)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                            {f.details && (
                              <div className="text-amber-800/80 mt-1">{f.details}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-[#1E4775]/70">
                        No protocol fees detected for your current rewards.
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 border border-[#1E4775]/20 ${
                !canSingleToken ? "opacity-50" : ""
              }`}
            >
              <input
                type="radio"
                checked={mode === "single-token"}
                onChange={() => setMode("single-token")}
                disabled={!canSingleToken}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-[#1E4775]">
                  Advanced compound
                </div>
                <div className="text-xs text-[#1E4775]/70 mt-1">
                  Claim rewards and allocate to any stability pools
                </div>

                {mode === "single-token" && canSingleToken && (
                  <div className="mt-3 space-y-3">
                    {/* Filter by Anchor token (shows APR range across all pools) */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-[#1E4775]/80 uppercase tracking-wide">
                        Filter by Anchor token
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tokenFilterItems.map((t) => (
                          <button
                            key={t.marketId}
                            type="button"
                            onClick={() => {
                              setTargetMarketId(t.marketId);
                              setSelectedPools(new Set());
                              setPercentages(new Map());
                            }}
                            className={`px-3 py-1.5 border text-sm transition-colors ${
                              targetMarketId === t.marketId
                                ? "border-[#1E4775] bg-[#1E4775]/5 text-[#1E4775]"
                                : "border-[#1E4775]/20 hover:bg-[#1E4775]/5 text-[#1E4775]"
                            }`}
                          >
                            <span className="font-semibold">{t.symbol}</span>
                            <span className="text-[#1E4775]/70 ml-2">
                              {t.min !== undefined && t.max !== undefined
                                ? t.min === t.max
                                  ? `${t.min.toFixed(2)}%`
                                  : `${t.min.toFixed(2)}–${t.max.toFixed(2)}%`
                                : "—"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pool allocation list (by address) */}
                    {selectedTokenOption && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-[#1E4775]/80 uppercase tracking-wide">
                          Choose stability pools
                        </div>
                        <div className="space-y-2">
                          {[...selectedTokenOption.pools]
                            .sort((a, b) => (b.apr ?? -Infinity) - (a.apr ?? -Infinity))
                            .map((p) => {
                              const addrLower = p.poolAddress.toLowerCase();
                              const isSelected = selectedPools.has(addrLower);
                              const showPct = selectedPools.size > 1 && isSelected;
                              const pct = percentages.get(addrLower) ?? 0;
                              return (
                                <div key={`${p.marketId}-${addrLower}`} className="border border-[#1E4775]/20 p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => togglePool(addrLower)}
                                        className="mt-1"
                                      />
                                      <div className="min-w-0">
                                        <div className="font-semibold text-[#1E4775] flex flex-wrap items-center gap-x-2">
                                          <span>
                                            {selectedTokenOption.symbol} ({p.collateralSymbol}) {p.poolType} pool
                                          </span>
                                          <span className="text-xs font-semibold text-[#1E4775]/70">
                                            APR: {p.apr !== undefined ? `${p.apr.toFixed(2)}%` : "—"}({p.marketId})
                                          </span>
                                        </div>
                                      </div>
                                    </label>

                                    {showPct && (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={pct}
                                          onChange={(e) =>
                                            setPoolPct(addrLower, Number(e.target.value))
                                          }
                                          className="w-20 px-2 py-1 border border-[#1E4775]/30 text-[#1E4775] text-sm"
                                        />
                                        <span className="text-sm text-[#1E4775]/70">%</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                        {selectedPools.size === 0 ? (
                          <div className="text-xs text-[#1E4775]/70">
                            Select one or more pools to continue.
                          </div>
                        ) : (
                          <div className="text-xs text-[#1E4775]/70">
                            Total: {totalPct}%{" "}
                            {pctError ? (
                              <span className="text-rose-600">({pctError})</span>
                            ) : null}
                          </div>
                        )}

                        {/* Fee preview (required before Continue) */}
                        {targetMarketId && selectedPools.size > 0 && !pctError && (
                          <div className="pt-3 border-t border-[#1E4775]/15 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-xs font-semibold text-[#1E4775]/80 uppercase tracking-wide">
                                Estimated fees (dry run)
                              </div>
                            </div>

                            {preflight?.key !== preflightKey && (
                              <div className="text-xs text-[#1E4775]/70">Calculating…</div>
                            )}

                            {preflight?.isLoading && (
                              <div className="text-xs text-[#1E4775]/70">Calculating…</div>
                            )}

                            {preflight?.error && preflight.key === preflightKey && (
                              <div className="text-xs text-rose-600">
                                {preflight.error}
                              </div>
                            )}

                            {preflight &&
                            !preflight.isLoading &&
                            !preflight.error &&
                            preflight.key === preflightKey ? (
                              preflight.fees.length ? (
                                <div className="space-y-2">
                                  {preflight.fees.map((f) => (
                                    <div
                                      key={f.id}
                                      className="p-2 border border-amber-200 bg-amber-50 text-xs"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="font-semibold text-amber-900">
                                          {f.label}
                                        </div>
                                        <div className="font-mono font-semibold text-amber-900">
                                          {f.feeFormatted} {f.tokenSymbol}
                                          {f.feePercentage !== undefined && (
                                            <span className="text-amber-700 ml-2">
                                              ({f.feePercentage.toFixed(2)}%)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {f.details && (
                                        <div className="text-amber-800/80 mt-1">
                                          {f.details}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-[#1E4775]/70">
                                  No protocol fees detected for your current rewards.
                                </div>
                              )
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-4 p-3 sm:p-4 lg:p-6 border-t border-[#1E4775]/20">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 text-[#1E4775]/70 hover:text-[#1E4775] transition-colors"
          >
            Back
          </button>
          <button
            onClick={() =>
              onContinue({
                mode,
                targetMarketId: mode === "single-token" ? targetMarketId : undefined,
                allocations:
                  mode === "single-token"
                    ? allocationArray
                    : undefined,
              })
            }
          disabled={
            (mode === "single-token" &&
              (!canSingleToken ||
                !targetMarketId ||
                selectedPools.size === 0 ||
                !!pctError ||
                // Require fee preview before continuing in Advanced mode
                !preflight ||
                preflight.isLoading ||
                !!preflight.error ||
                preflight.key !== preflightKey)) ||
            (mode === "keep-per-token" &&
              (!simplePreflight ||
                simplePreflight.isLoading ||
                !!simplePreflight.error ||
                simplePreflight.key !== simplePreflightKey))
          }
            className="flex-1 py-2 px-4 font-medium transition-colors bg-[#1E4775] hover:bg-[#17395F] text-white disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

