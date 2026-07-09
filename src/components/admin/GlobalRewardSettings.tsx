"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMarketGroupYieldPlans } from "@/hooks/useMarketGroupYieldPlans";
import {
  formatUsdCompact,
  poolKeysMeetingMinTvl,
  type MarketGroupLike,
  type MarketYieldPlan,
  type TokenPriceMap,
} from "@/utils/marketYieldSnapshot";

function poolKindLabel(kind: "collateral" | "leveraged") {
  return kind === "collateral" ? "Anchor Pool" : "Sail Pool";
}

type GlobalRewardSettingsProps = {
  marketGroups: MarketGroupLike[];
  depositTokenPrices: TokenPriceMap;
  rewardTokenPrices: TokenPriceMap;
  apyPctByMarketId: Record<string, number | null>;
  revenueSplitInput: string;
  onRevenueSplitChange: (value: string) => void;
  onApplyPoolAmounts: (
    injections: Record<string, { amount: string; enable: boolean }>,
  ) => void;
};

export function GlobalRewardSettings({
  marketGroups,
  depositTokenPrices,
  rewardTokenPrices,
  apyPctByMarketId,
  revenueSplitInput,
  onRevenueSplitChange,
  onApplyPoolAmounts,
}: GlobalRewardSettingsProps) {
  const [expanded, setExpanded] = useState(true);
  const [minPoolTvlInput, setMinPoolTvlInput] = useState("1000");
  const [selectedPoolKeys, setSelectedPoolKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectionTouched, setSelectionTouched] = useState(false);

  const minPoolTvlUsd = minPoolTvlInput.trim()
    ? parseFloat(minPoolTvlInput)
    : 0;
  const revenueSplitPct = revenueSplitInput.trim()
    ? parseFloat(revenueSplitInput)
    : null;

  const { plans, isLoading } = useMarketGroupYieldPlans({
    groups: marketGroups,
    depositTokenPrices,
    rewardTokenPrices,
    apyPctByMarketId,
    revenueSplitPct,
    minPoolTvlUsd: Number.isFinite(minPoolTvlUsd) ? minPoolTvlUsd : 0,
    enabled: expanded,
  });

  useEffect(() => {
    if (selectionTouched || isLoading || plans.length === 0) return;
    setSelectedPoolKeys(new Set(poolKeysMeetingMinTvl(plans, minPoolTvlUsd)));
  }, [plans, minPoolTvlUsd, isLoading, selectionTouched]);

  const poolRows = useMemo(() => {
    const rows: Array<{
      plan: MarketYieldPlan;
      line: MarketYieldPlan["anchorLine"];
    }> = [];
    for (const plan of plans) {
      rows.push({ plan, line: plan.anchorLine });
      rows.push({ plan, line: plan.sailLine });
    }
    return rows;
  }, [plans]);

  const togglePool = useCallback((poolKey: string, checked: boolean) => {
    setSelectionTouched(true);
    setSelectedPoolKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(poolKey);
      else next.delete(poolKey);
      return next;
    });
  }, []);

  const syncSelectionToMinTvl = useCallback(() => {
    setSelectionTouched(false);
    setSelectedPoolKeys(new Set(poolKeysMeetingMinTvl(plans, minPoolTvlUsd)));
  }, [plans, minPoolTvlUsd]);

  const handleApplySelected = useCallback(() => {
    const planByPoolKey = new Map<
      string,
      { amount: string; plan: MarketYieldPlan }
    >();
    for (const plan of plans) {
      if (plan.anchorLine.rewardAmount) {
        planByPoolKey.set(plan.anchorLine.poolKey, {
          amount: plan.anchorLine.rewardAmount,
          plan,
        });
      }
      if (plan.sailLine.rewardAmount) {
        planByPoolKey.set(plan.sailLine.poolKey, {
          amount: plan.sailLine.rewardAmount,
          plan,
        });
      }
    }

    const injections: Record<string, { amount: string; enable: boolean }> = {};
    for (const poolKey of selectedPoolKeys) {
      const entry = planByPoolKey.get(poolKey);
      if (!entry || !entry.amount || entry.amount === "0") continue;
      if (entry.plan.error) continue;
      injections[poolKey] = { amount: entry.amount, enable: true };
    }
    onApplyPoolAmounts(injections);
  }, [plans, selectedPoolKeys, onApplyPoolAmounts]);

  const selectedCount = selectedPoolKeys.size;
  const canApply =
    selectedCount > 0 &&
    !isLoading &&
    revenueSplitPct != null &&
    revenueSplitPct > 0;

  return (
    <div className="mt-4 border border-white/10 rounded overflow-hidden bg-black/20">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-white font-geo text-base">Global</span>
        <span className="text-white/50 text-xs">
          {expanded ? "Hide" : "Show"} · TVL split + revenue split for all pools
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-white/10 px-4 py-4 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-32">
              <div className="text-white/70 text-xs mb-1">Revenue split (%)</div>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={revenueSplitInput}
                onChange={(e) => onRevenueSplitChange(e.target.value)}
                placeholder="75"
                className="w-full bg-zinc-900/50 px-3 py-1.5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 text-xs"
              />
            </div>
            <div className="w-36">
              <div className="text-white/70 text-xs mb-1">Min pool TVL (USD)</div>
              <input
                type="number"
                min={0}
                step={100}
                value={minPoolTvlInput}
                onChange={(e) => {
                  setMinPoolTvlInput(e.target.value);
                  setSelectionTouched(false);
                }}
                placeholder="1000"
                className="w-full bg-zinc-900/50 px-3 py-1.5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 text-xs"
              />
            </div>
            <button
              type="button"
              className="py-1.5 px-3 bg-white/10 text-white text-xs font-medium hover:bg-white/15 transition-colors"
              onClick={syncSelectionToMinTvl}
              disabled={isLoading}
            >
              Select pools ≥ min TVL
            </button>
            <button
              type="button"
              className="py-1.5 px-3 bg-harbor text-white text-xs font-medium hover:bg-harbor/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleApplySelected}
              disabled={!canApply}
            >
              Set reward amounts ({selectedCount} pools)
            </button>
          </div>

          <p className="text-white/50 text-xs max-w-3xl">
            Uses each market&apos;s collateral yield, applies the revenue split,
            splits by pool TVL, then fills reward amounts for selected pools.
            Deselect any pool to handle it manually instead.
          </p>

          {isLoading ? (
            <div className="text-white/50 text-xs">Loading market data…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="text-left text-white/50 border-b border-white/10">
                    <th className="py-2 pr-3 font-medium w-10">Incl.</th>
                    <th className="py-2 pr-3 font-medium">Market</th>
                    <th className="py-2 pr-3 font-medium">Pool</th>
                    <th className="py-2 pr-3 font-medium text-right">TVL</th>
                    <th className="py-2 pr-3 font-medium text-right">
                      Reward amount
                    </th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {poolRows.map(({ plan, line }) => {
                    const selected = selectedPoolKeys.has(line.poolKey);
                    const tvlOk = line.meetsMinTvl;
                    return (
                      <tr
                        key={line.poolKey}
                        className="border-b border-white/5 text-white/80"
                      >
                        <td className="py-2 pr-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) =>
                              togglePool(line.poolKey, e.target.checked)
                            }
                          />
                        </td>
                        <td className="py-2 pr-3">{plan.marketName}</td>
                        <td className="py-2 pr-3">
                          {poolKindLabel(line.poolKind)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">
                          ${formatUsdCompact(line.tvlUsd)}
                          {!tvlOk ? (
                            <span className="ml-1 text-amber-300/80">
                              (&lt; min)
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">
                          {line.rewardAmount ?? "—"}{" "}
                          {line.rewardAmount ? plan.rewardTokenSymbol : ""}
                        </td>
                        <td className="py-2 text-white/50">
                          {plan.error ? (
                            <span className="text-amber-300">{plan.error}</span>
                          ) : tvlOk ? (
                            "Ready"
                          ) : (
                            "Below min TVL"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
