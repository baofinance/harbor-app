"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { CurrencyDollarIcon, ShieldCheckIcon } from "@heroicons/react/24/solid";
import { Vault, Wallet } from "lucide-react";
import { MarketMaintenanceTag } from "@/components/MarketMaintenanceTag";
import NetworkIconCell from "@/components/NetworkIconCell";
import type { DefinedMarket } from "@/config/markets";
import { isMarketInMaintenance } from "@/config/markets";
import type { MarketData } from "@/hooks/anchor/useAnchorMarketData";
import { TokenLogo } from "@/components/shared";
import type { AnchorMarketGroupCollapsedRowProps } from "@/components/anchor/AnchorMarketGroupCollapsedRow";

export const ANCHOR_BASIC_CARD_SYMBOL_ORDER = [
  "haETH",
  "haBTC",
  "haUSD",
  "haEUR",
] as const;

type MarketListItem = {
  marketId: string;
  market: DefinedMarket;
  marketIndex: number;
};

export type AnchorBasicMarketCardsGridProps = {
  marketGroups: Array<{ symbol: string; list: MarketListItem[] }>;
  /** Symbols that always appear in UI−; missing live config renders as “Coming soon” (e.g. haUSD without MegaETH). */
  alwaysShowSymbols?: readonly string[];
  getMarketsDataForGroup: (list: MarketListItem[]) => MarketData[];
  showLiveAprLoading: boolean;
  isConnected: boolean;
  onOpenManage: AnchorMarketGroupCollapsedRowProps["onOpenManage"];
};

function sortBasicCardGroups(
  entries: Array<[string, MarketListItem[]]>
): Array<[string, MarketListItem[]]> {
  const rank = (sym: string) => {
    const i = ANCHOR_BASIC_CARD_SYMBOL_ORDER.indexOf(
      sym as (typeof ANCHOR_BASIC_CARD_SYMBOL_ORDER)[number]
    );
    return i === -1 ? ANCHOR_BASIC_CARD_SYMBOL_ORDER.length : i;
  };
  return [...entries].sort(([a], [b]) => {
    const dr = rank(a) - rank(b);
    return dr !== 0 ? dr : a.localeCompare(b);
  });
}

function yieldRailLabel(
  market: DefinedMarket
): "eth" | "usd" | "neutral" {
  const sym = market.collateral?.symbol?.toLowerCase() ?? "";
  if (sym === "wsteth") return "eth";
  if (sym === "fxsave") return "usd";
  return "neutral";
}

/** `TokenLogo` symbol for strip collateral (matches Genesis compact card). */
function tokenStripCollateralLogoSymbol(collateralSymbol: string): string {
  const s = collateralSymbol.trim();
  const lower = s.toLowerCase();
  if (lower === "wsteth") return "stETH";
  return s;
}

/** 20px box: bullets + flow use the same icon footprint. */
const ICON_BOX = "flex h-5 w-5 shrink-0 items-center justify-center";
const BULLET_ROW_CLASS =
  "grid grid-cols-[theme(spacing.5)_minmax(0,1fr)] items-center gap-x-3";

/** Third bullet: filled orange disc + white X, thin dark ring. */
function NoLockupsBulletIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        cx="10"
        cy="10"
        r="7.25"
        fill="#fb923c"
        stroke="#9a3412"
        strokeWidth="1.25"
      />
      <path
        d="M7 7l6 6M13 7l-6 6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const FLOW_LOGO_PX = 26;
const FLOW_ICON_CLASS = "h-5 w-5 shrink-0 text-[#1E4775]";
const FLOW_ARROW_CLASS = `${FLOW_ICON_CLASS} opacity-40`;

function AnchorBasicHorizontalTokenStrip({
  collateralSymbol,
  peggedSymbol,
}: {
  collateralSymbol: string;
  peggedSymbol: string;
}) {
  const collateralLogo = tokenStripCollateralLogoSymbol(collateralSymbol);
  return (
    <div
      className="flex min-h-[48px] w-full max-w-full flex-nowrap items-center justify-evenly gap-0 rounded-md border border-[#1E4775]/12 bg-[#f8fafc] px-0 py-1 sm:py-1.5"
      title={`${collateralSymbol} → ${peggedSymbol} → wallet or vault`}
      aria-label={`${collateralSymbol} to ${peggedSymbol}, then wallet or vault`}
    >
      <span className={ICON_BOX} title={collateralSymbol}>
        <TokenLogo
          symbol={collateralLogo}
          size={FLOW_LOGO_PX}
          className="ring-0"
        />
      </span>
      <ArrowRightIcon
        className={`${FLOW_ARROW_CLASS} shrink-0`}
        aria-hidden
      />
      <span className={ICON_BOX} title={peggedSymbol}>
        <TokenLogo
          symbol={peggedSymbol}
          size={FLOW_LOGO_PX}
          className="ring-0"
        />
      </span>
      <ArrowRightIcon
        className={`${FLOW_ARROW_CLASS} shrink-0`}
        aria-hidden
      />
      <div
        className="flex shrink-0 flex-col items-center justify-center gap-px text-[#1E4775]"
        aria-hidden
      >
        <span className={ICON_BOX}>
          <Wallet className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className={ICON_BOX}>
          <Vault className="h-5 w-5" strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}

/** Shared vertical slots so haUSD / haETH / … line up in the grid row. */
const CARD_RAIL_SLOT =
  "mt-1.5 flex min-h-[2rem] w-full max-w-[280px] items-center justify-center";
const CARD_CHAINS_SLOT =
  "mt-1.5 flex min-h-[1.5rem] w-full flex-wrap items-center justify-center gap-1.5";
const CARD_STATUS_SLOT =
  "mt-1.5 flex min-h-[1.25rem] w-full items-center justify-center";
const CARD_APR_SLOT =
  "mt-2 flex min-h-[2rem] w-full items-center justify-center";

const YIELD_SEGMENT_TRACK_CLASS =
  "flex w-full max-w-[280px] rounded-lg bg-[#e2e8f0] p-0.5";
/** Single backing collateral: one rail label only (no toggle). */
const YIELD_SINGLE_RAIL_CLASS =
  "w-full rounded-md bg-white py-1 text-center text-xs font-semibold text-[#153B63] shadow-sm";

/** Coming-soon haUSD: single ETH rail (no fake second segment). */
function YieldRailSingleEthStatic() {
  return (
    <div className={YIELD_SEGMENT_TRACK_CLASS} aria-label="Yield type">
      <span className={YIELD_SINGLE_RAIL_CLASS}>ETH Yield</span>
    </div>
  );
}

const CARD_SHELL_CLASS =
  "flex h-full min-h-0 flex-col rounded-xl border border-[#1E4775]/12 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.04] sm:p-5";

function AnchorBasicMarketCard({
  symbol,
  marketList,
  marketsData,
  showLiveAprLoading,
  isConnected,
  onOpenManage,
}: {
  symbol: string;
  marketList: MarketListItem[];
  marketsData: MarketData[];
  showLiveAprLoading: boolean;
  isConnected: boolean;
  onOpenManage: AnchorMarketGroupCollapsedRowProps["onOpenManage"];
}) {
  const pegTarget = marketList[0]?.market?.pegTarget ?? "";
  const groupHasMaintenance = marketList.some(({ market }) =>
    isMarketInMaintenance(market)
  );

  const railsPresent = useMemo(() => {
    const set = new Set<"eth" | "usd">();
    for (const { market } of marketList) {
      const r = yieldRailLabel(market);
      if (r === "eth") set.add("eth");
      if (r === "usd") set.add("usd");
    }
    return set;
  }, [marketList]);

  const hasMultiRail = railsPresent.has("eth") && railsPresent.has("usd");
  const singleEthOnly = railsPresent.has("eth") && !railsPresent.has("usd");
  const singleUsdOnly = railsPresent.has("usd") && !railsPresent.has("eth");

  const defaultMarketId = useMemo(() => {
    let bestId = marketList[0]?.marketId;
    let bestApr = -1;
    for (const { marketId } of marketList) {
      const md = marketsData.find((d) => d.marketId === marketId);
      if (md && md.maxAPR > bestApr) {
        bestApr = md.maxAPR;
        bestId = marketId;
      }
    }
    return bestId ?? marketList[0]?.marketId ?? "";
  }, [marketList, marketsData]);

  const [selectedMarketId, setSelectedMarketId] = useState(defaultMarketId);

  useEffect(() => {
    setSelectedMarketId(defaultMarketId);
  }, [defaultMarketId]);

  const selectedEntry = marketList.find((m) => m.marketId === selectedMarketId);
  const selectedMarket = selectedEntry?.market ?? marketList[0]?.market;
  const selectedData = marketsData.find((d) => d.marketId === selectedMarketId);

  const bulletRealYield = (() => {
    if (!selectedMarket) return "Real yield from stability pools.";
    const r = yieldRailLabel(selectedMarket);
    if (r === "eth") return "Real yield from wstETH and protocol fees.";
    if (r === "usd") return "Real yield from fxSAVE and protocol fees.";
    return `Real yield while keeping ${pegTarget}-pegged exposure.`;
  })();

  const formatAprRange = (min: number, max: number) => {
    if (min > 0 && min !== max)
      return `${min.toFixed(1)}% - ${max.toFixed(1)}%`;
    if (max > 0) return `${max.toFixed(1)}%`;
    return "—";
  };

  const minAPR = selectedData?.minAPR ?? 0;
  const maxAPR = selectedData?.maxAPR ?? 0;
  const aprDisplay =
    showLiveAprLoading && minAPR <= 0 && maxAPR <= 0
      ? "…"
      : formatAprRange(minAPR, maxAPR);

  const chains = useMemo(() => {
    const seen = new Map<string, { name: string; logo?: string }>();
    for (const { market } of marketList) {
      const c = market.chain;
      if (c?.name && !seen.has(c.name))
        seen.set(c.name, { name: c.name, logo: c.logo });
    }
    return Array.from(seen.values());
  }, [marketList]);

  const yieldRailControl = (() => {
    if (hasMultiRail) {
      return (
        <div
          className={YIELD_SEGMENT_TRACK_CLASS}
          role="tablist"
          aria-label="Yield type"
        >
          {(["eth", "usd"] as const).map((rail) => {
            const m = marketList.find(
              ({ market }) => yieldRailLabel(market) === rail
            );
            if (!m) return null;
            const active = m.marketId === selectedMarketId;
            return (
              <button
                key={rail}
                type="button"
                role="tab"
                aria-selected={active}
                className={`flex-1 rounded-md py-1 text-center text-xs font-semibold transition ${
                  active
                    ? "bg-white text-[#153B63] shadow-sm"
                    : "bg-transparent text-[#94a3b8] hover:text-[#64748b]"
                }`}
                onClick={() => setSelectedMarketId(m.marketId)}
              >
                {rail === "eth" ? "ETH Yield" : "USD Yield"}
              </button>
            );
          })}
        </div>
      );
    }
    if (singleEthOnly) {
      return (
        <div className={YIELD_SEGMENT_TRACK_CLASS} aria-label="Yield type">
          <span className={YIELD_SINGLE_RAIL_CLASS}>ETH Yield</span>
        </div>
      );
    }
    if (singleUsdOnly) {
      return (
        <div className={YIELD_SEGMENT_TRACK_CLASS} aria-label="Yield type">
          <span className={YIELD_SINGLE_RAIL_CLASS}>USD Yield</span>
        </div>
      );
    }
    return null;
  })();

  const handleStartEarning = () => {
    if (!isConnected || !selectedMarket || groupHasMaintenance) return;
    const enrichedAllMarkets = marketList.map((m) => {
      const marketData = marketsData.find((md) => md.marketId === m.marketId);
      return {
        marketId: m.marketId,
        market: {
          ...m.market,
          wrappedRate: marketData?.wrappedRate,
        },
      };
    });
    const md = marketsData.find((d) => d.marketId === selectedMarketId);
    onOpenManage({
      marketId: selectedMarketId,
      market: {
        ...selectedMarket,
        wrappedRate: md?.wrappedRate,
      },
      initialTab: "deposit",
      simpleMode: true,
      bestPoolType: "collateral",
      allMarkets: enrichedAllMarkets,
      initialDepositAsset:
        selectedMarket.peggedToken?.symbol || symbol,
    });
  };

  return (
    <article className={CARD_SHELL_CLASS}>
      <div className="flex shrink-0 flex-col items-center text-center">
        <TokenLogo symbol={symbol} size={72} className="mb-1 shrink-0" />
        <h3 className="font-mono text-2xl font-bold leading-tight tracking-tight text-[#0f172a]">
          {symbol}
        </h3>
        <div className={CARD_RAIL_SLOT}>{yieldRailControl}</div>

        <div className={CARD_CHAINS_SLOT} aria-label="Networks">
          {chains.map((c) => (
            <NetworkIconCell
              key={c.name}
              chainName={c.name}
              chainLogo={c.logo}
              size={22}
              className="rounded-full ring-1 ring-[#1E4775]/10"
            />
          ))}
        </div>

        <div className={CARD_STATUS_SLOT}>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-[#4A9784] shadow-[0_0_0_3px_rgba(74,151,132,0.2)]"
              aria-hidden
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#4A9784]">
              Market active
            </span>
          </span>
        </div>
      </div>

      <div className={CARD_APR_SLOT}>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#E0F2FE] px-2.5 py-0.5 text-xs font-semibold text-[#0369A1]">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#0369A1]/80">
            APR
          </span>
          <span className="font-mono tabular-nums">{aprDisplay}</span>
        </span>
      </div>

      <div className="mt-2.5 flex min-h-0 flex-1 flex-col gap-2.5">
        <ul className="flex flex-col gap-2 text-left text-[13px] leading-snug text-[#475569]">
          <li className={BULLET_ROW_CLASS}>
            <span className={ICON_BOX}>
              <CurrencyDollarIcon
                className="h-5 w-5 text-[#16a34a]"
                aria-hidden
              />
            </span>
            <span className="min-w-0 self-center leading-snug">
              {bulletRealYield}
            </span>
          </li>
          <li className={BULLET_ROW_CLASS}>
            <span className={ICON_BOX}>
              <ShieldCheckIcon
                className="h-5 w-5 text-[#1E4775]"
                aria-hidden
              />
            </span>
            <span className="min-w-0 self-center leading-snug">
              Backed by stability pools.
            </span>
          </li>
          <li className={BULLET_ROW_CLASS}>
            <span className={ICON_BOX}>
              <NoLockupsBulletIcon />
            </span>
            <span className="min-w-0 self-center leading-snug">
              No lockups. No liquidations.
            </span>
          </li>
        </ul>

        {selectedMarket?.collateral?.symbol ? (
          <div className="shrink-0">
            <AnchorBasicHorizontalTokenStrip
              collateralSymbol={selectedMarket.collateral.symbol}
              peggedSymbol={selectedMarket.peggedToken?.symbol ?? symbol}
            />
          </div>
        ) : (
          <div className="min-h-[48px] shrink-0" aria-hidden />
        )}
      </div>

      {groupHasMaintenance && (
        <div className="mt-2 flex shrink-0 justify-center">
          <MarketMaintenanceTag />
        </div>
      )}

      <div className="mt-auto flex shrink-0 flex-col gap-2 pt-4">
        <button
          type="button"
          disabled={!isConnected || groupHasMaintenance}
          onClick={handleStartEarning}
          className="w-full rounded-xl bg-[#153B63] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0F2F52] disabled:cursor-not-allowed disabled:bg-[#153B63]/40"
        >
          Start Earning
        </button>
        <Link
          href={`/anchor/${encodeURIComponent(symbol)}`}
          className="flex items-center justify-center gap-1 text-center text-xs font-semibold text-[#1E4775] hover:text-[#0c2a4a]"
        >
          Learn more
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

function AnchorBasicComingSoonCard({ symbol }: { symbol: string }) {
  return (
    <article className={CARD_SHELL_CLASS}>
      <div className="flex shrink-0 flex-col items-center text-center">
        <TokenLogo symbol={symbol} size={72} className="mb-1 shrink-0 opacity-90" />
        <h3 className="font-mono text-2xl font-bold leading-tight tracking-tight text-[#0f172a]">
          {symbol}
        </h3>
        <div className={CARD_RAIL_SLOT}>
          <YieldRailSingleEthStatic />
        </div>
        <div className={CARD_CHAINS_SLOT} aria-label="Networks">
          <NetworkIconCell
            chainName="MegaETH"
            chainLogo="icons/eth.png"
            size={22}
            className="rounded-full ring-1 ring-[#1E4775]/10"
          />
        </div>
        <div className={CARD_STATUS_SLOT}>
          <span className="inline-flex items-center rounded-full bg-[#f1f5f9] px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#64748b]">
            Coming soon
          </span>
        </div>
      </div>

      <div className={CARD_APR_SLOT}>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-xs font-semibold text-[#64748b]">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]/80">
            APR
          </span>
          <span className="font-mono tabular-nums">—</span>
        </span>
      </div>

      <div className="mt-2.5 flex min-h-0 flex-1 flex-col gap-2.5 opacity-90">
        <ul className="flex flex-col gap-2 text-left text-[13px] leading-snug text-[#94a3b8]">
          <li className={BULLET_ROW_CLASS}>
            <span className={ICON_BOX}>
              <CurrencyDollarIcon
                className="h-5 w-5 text-[#16a34a]/90"
                aria-hidden
              />
            </span>
            <span className="min-w-0 self-center leading-snug">
              Real yield from LST and protocol fees.
            </span>
          </li>
          <li className={BULLET_ROW_CLASS}>
            <span className={ICON_BOX}>
              <ShieldCheckIcon
                className="h-5 w-5 text-[#1E4775]/90"
                aria-hidden
              />
            </span>
            <span className="min-w-0 self-center leading-snug">
              Backed by stability pools.
            </span>
          </li>
          <li className={BULLET_ROW_CLASS}>
            <span className={ICON_BOX}>
              <NoLockupsBulletIcon />
            </span>
            <span className="min-w-0 self-center leading-snug">
              No lockups. No liquidations.
            </span>
          </li>
        </ul>

        <div className="shrink-0">
          <AnchorBasicHorizontalTokenStrip
            collateralSymbol="wstETH"
            peggedSymbol={symbol}
          />
        </div>
      </div>

      <div className="mt-auto flex shrink-0 cursor-not-allowed flex-col gap-2 pt-4 opacity-75">
        <button
          type="button"
          disabled
          className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#94a3b8]"
        >
          Coming soon
        </button>
        <Link
          href={`/anchor/${encodeURIComponent(symbol)}`}
          className="pointer-events-auto flex items-center justify-center gap-1 text-center text-xs font-semibold text-[#1E4775] opacity-100 hover:text-[#0c2a4a]"
        >
          Learn more
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

export function AnchorBasicMarketCardsGrid({
  marketGroups,
  alwaysShowSymbols = ANCHOR_BASIC_CARD_SYMBOL_ORDER,
  getMarketsDataForGroup,
  showLiveAprLoading,
  isConnected,
  onOpenManage,
}: AnchorBasicMarketCardsGridProps) {
  const sorted = useMemo(() => {
    const bySymbol = new Map(marketGroups.map((g) => [g.symbol, g.list] as const));
    const rows: Array<[string, MarketListItem[]]> = [];
    for (const sym of alwaysShowSymbols) {
      rows.push([sym, bySymbol.get(sym) ?? []]);
    }
    const orderSet = new Set<string>([...alwaysShowSymbols]);
    for (const g of marketGroups) {
      if (!orderSet.has(g.symbol)) {
        rows.push([g.symbol, g.list]);
      }
    }
    return sortBasicCardGroups(rows).map(([symbol, list]) => ({ symbol, list }));
  }, [marketGroups, alwaysShowSymbols]);

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {sorted.map(({ symbol, list }) => {
        if (list.length === 0) {
          if (symbol === "haUSD") {
            return <AnchorBasicComingSoonCard key={symbol} symbol={symbol} />;
          }
          return null;
        }
        const marketsData = getMarketsDataForGroup(list);
        return (
          <AnchorBasicMarketCard
            key={symbol}
            symbol={symbol}
            marketList={list}
            marketsData={marketsData}
            showLiveAprLoading={showLiveAprLoading}
            isConnected={isConnected}
            onOpenManage={onOpenManage}
          />
        );
      })}
    </div>
  );
}
