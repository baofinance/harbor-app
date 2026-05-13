"use client";

import Link from "next/link";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useFounderMetrics } from "@/hooks/useFounderMetrics";
import {
  useDashboardPositions,
  type DashboardPositionRow,
} from "@/hooks/useDashboardPositions";
import { formatPercent, formatUSD } from "@/utils/formatters";

function PositionsSubsection({
  title,
  rows,
  loading,
  error,
  emptyHint,
}: {
  title: string;
  rows: DashboardPositionRow[];
  loading: boolean;
  error: string | null;
  emptyHint: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-semibold text-white mb-2 font-geo">{title}</h3>
      {error ? (
        <p className="text-xs text-amber-200/90">{error}</p>
      ) : loading ? (
        <p className="text-xs text-white/50">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-white/50">{emptyHint}</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="min-w-[480px] w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-left text-white/50 uppercase tracking-wide text-[10px]">
                <th className="py-2 pl-1 pr-2">Market</th>
                <th className="py-2 px-2">Type</th>
                <th className="py-2 px-2 text-right">Notional</th>
                <th className="py-2 pl-2 pr-1 w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="py-2 pl-1 pr-2 text-white">{r.marketLabel}</td>
                  <td className="py-2 px-2 text-white/75">{r.detail}</td>
                  <td className="py-2 px-2 text-right font-mono text-white tabular-nums">
                    {formatUSD(r.usd, { compact: false })}
                  </td>
                  <td className="py-2 pl-2 pr-1 text-right">
                    <Link
                      href={r.href}
                      className="text-harbor hover:underline text-xs font-medium whitespace-nowrap"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function metricCard(label: string, value: string, note?: string) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-4">
      <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-1 text-xl sm:text-2xl font-semibold text-white tabular-nums">{value}</div>
      {note ? <div className="mt-1 text-xs text-white/50">{note}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  const { rows, isLoading, error, refresh, isConnected, walletAddress } = useFounderMetrics();
  const {
    maidenVoyageRows,
    earnRows,
    leverageRows,
    isLoading: posLoading,
    errors: posErrors,
  } = useDashboardPositions();

  const totalPaid = rows.reduce((sum, row) => sum + row.paidUSD, 0);
  const totalOutstanding = rows.reduce((sum, row) => sum + row.outstandingUSD, 0);

  return (
    <div className="min-h-0 flex-1 text-white max-w-[1300px] mx-auto font-sans relative w-full">
      <main className="container mx-auto px-4 sm:px-10 pb-6 pt-2 sm:pt-4 space-y-5">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-transparent p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">Harbor</p>
              <h1 className="text-3xl sm:text-4xl font-bold font-mono text-white mt-1">Dashboard</h1>
              <p className="text-white/70 mt-2 text-sm max-w-xl">
                Founder yield attribution and a snapshot of open Maiden Voyage, Earn, and Leverage
                positions for this wallet.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/genesis"
                className="rounded-full bg-harbor px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Maiden voyage
              </Link>
              <Link
                href="/anchor"
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Earn
              </Link>
              <Link
                href="/sail"
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Leverage
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {metricCard(
            "Wallet",
            walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "—",
            isConnected ? "Metrics below are for this address." : "Connect to load data."
          )}
          {metricCard(
            "Founder markets",
            rows.length.toString(),
            "Maiden Voyage markets with founder yield data for you."
          )}
          {metricCard("Total paid", formatUSD(totalPaid, { compact: false }), "Recorded on Harbor's payout ledger.")}
          {metricCard(
            "Uncollected",
            formatUSD(totalOutstanding, { compact: false }),
            "Attributed yield minus recorded payouts (see note in table)."
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div>
              <h2 className="text-xl font-semibold text-white font-geo">Maiden Voyage founder yield</h2>
              <p className="text-xs text-white/60 mt-1 max-w-2xl">
                <strong>MV ownership</strong> is your share of the genesis cap (from the indexer).{" "}
                <strong>Yield pool %</strong> is your boost-weighted share used to split cumulative
                yield. <strong>Uncollected</strong> is not a scheduled “next bill”—it is what is
                still owed vs payouts on file until treasury sets an explicit payment cadence.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 self-start rounded-md bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
            >
              <ArrowPathIcon className="h-4 w-4" />
              {isLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {!isConnected ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              Connect your wallet to view founder yield.
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
          ) : isLoading ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              No founder yield rows for this wallet. If you have deposits, check Maiden Voyage after
              genesis ends so final ownership is written on-chain.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="min-w-[820px] w-full text-sm">
                <thead>
                  <tr className="bg-white/5 text-white/60 text-xs uppercase tracking-wide">
                    <th className="text-left py-2.5 px-3">Market</th>
                    <th className="text-right py-2.5 px-3">MV ownership</th>
                    <th className="text-right py-2.5 px-3">Yield pool %</th>
                    <th className="text-right py-2.5 px-3">Total paid</th>
                    <th className="text-right py-2.5 px-3">Uncollected</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.marketId} className="border-t border-white/5">
                      <td className="py-2.5 px-3 text-white">{row.marketName}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-white tabular-nums">
                        {formatPercent(row.ownershipSharePct, { decimals: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white tabular-nums">
                        {formatPercent(row.yieldSharePct, { decimals: 4 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white tabular-nums">
                        {formatUSD(row.paidUSD, { compact: false })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white tabular-nums">
                        {formatUSD(row.outstandingUSD, { compact: false })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white font-geo">Your positions</h2>
            <p className="text-xs text-white/60 mt-1 max-w-2xl">
              From the Harbor marks subgraph (Earn / Maiden Voyage) and the Sail price subgraph
              (Leverage notional). USD is indexer-reported; open the app for full detail and
              actions.
            </p>
          </div>

          {!isConnected ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              Connect your wallet to view positions.
            </div>
          ) : null}

          {isConnected ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <PositionsSubsection
                title="Maiden Voyage"
                rows={maidenVoyageRows}
                loading={posLoading.maidenVoyage}
                error={posErrors.maidenVoyage}
                emptyHint="No active genesis deposits for this wallet."
              />
              <PositionsSubsection
                title="Earn"
                rows={earnRows}
                loading={posLoading.anchor}
                error={posErrors.anchor}
                emptyHint="No ha tokens or stability pool balances in the indexer."
              />
              <PositionsSubsection
                title="Leverage"
                rows={leverageRows}
                loading={posLoading.leverage}
                error={posErrors.leverage}
                emptyHint="No open leveraged positions in the Sail subgraph."
              />
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
