"use client";

import { useCallback, useMemo, useState } from "react";
import { BellIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import {
  FEATURED_COMPLETED_MARKET_IDS,
  getGenesisMarketTypeLabel,
  isFeaturedActiveMarket,
  isFeaturedCompletedMarket,
  MAIDEN_VOYAGE_DOCS_URL,
} from "@/config/maidenVoyageFeatured";
import { maidenVoyageCapUsd } from "@/config/maidenVoyageCap";
import {
  isGenesisCompletedUi,
  isGenesisDepositWithdrawBlockedByConfig,
  isMarketArchived,
  isMarketInMaintenance,
} from "@/config/markets";
import type { CollateralPriceData } from "@/hooks/useCollateralPrice";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import { formatUSD } from "@/utils/formatters";
import { formatGenesisMarketDisplayName } from "@/utils/genesisDisplay";
import { GenesisMarketRowClaimActions } from "./GenesisMarketRowClaimActions";
import { GenesisMarketCollateralEquationStrip } from "./GenesisMarketSharedRowCells";
import { readContractRowResult } from "./readContractRow";
import type { GenesisClaimMarketArgs } from "./GenesisCompletedMarketsSection";
import {
  MV_COMPLETED_PILL,
  MV_EXPLORER_TAB_ACTIVE,
  MV_EXPLORER_TAB_INACTIVE,
  MV_EXPLORER_TABS,
  MV_TABLE_HEADER,
  MV_TABLE_ROW,
  MV_TYPE_TAG,
  MV_UPCOMING_BADGE,
} from "./maidenVoyageLayoutStyles";

const EXPLORER_TABS = [
  { id: "all", label: "All Voyages" },
  { id: "ongoing", label: "Ongoing" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
] as const;

type ExplorerTab = (typeof EXPLORER_TABS)[number]["id"];

const TABLE_COLS_LG =
  "lg:grid-cols-[88px_minmax(0,1.4fr)_100px_minmax(0,0.9fr)_100px_110px_auto]";
const TABLE_COLS_MD =
  "md:grid-cols-[72px_minmax(0,1fr)_88px_minmax(0,0.8fr)_88px_96px_auto]";

export type GenesisMaidenVoyageExplorerProps = {
  genesisMarkets: Array<[string, GenesisMarketConfig]>;
  comingSoonMarkets: Array<[string, GenesisMarketConfig]>;
  reads: readonly unknown[] | undefined;
  totalDepositsReads: readonly unknown[] | undefined;
  isConnected: boolean;
  address: `0x${string}` | undefined;
  claimingMarket: string | null;
  collateralPricesMap: Map<string, CollateralPriceData>;
  coinGeckoPrices: Record<string, number | null>;
  coinGeckoLoading: boolean;
  chainlinkBtcPrice: number | null;
  onClaim: (args: GenesisClaimMarketArgs) => Promise<void>;
  onManage: (
    marketId: string,
    market: GenesisMarketConfig,
    initialTab?: "deposit" | "withdraw",
  ) => void;
  defaultArchivedExpanded?: boolean;
};

function resolveDisplayName(mkt: GenesisMarketConfig): string {
  const rowLeveragedSymbol = mkt.leveragedToken?.symbol;
  const raw =
    rowLeveragedSymbol && rowLeveragedSymbol.toLowerCase().startsWith("hs")
      ? rowLeveragedSymbol.slice(2)
      : rowLeveragedSymbol || mkt.name || "Market";
  return formatGenesisMarketDisplayName(raw);
}

function formatLaunchWindow(endDate?: string): string | null {
  if (!endDate) return null;
  const parsed = new Date(endDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatEstCapacityUsd(genesisAddress?: string): string {
  const cap = maidenVoyageCapUsd(genesisAddress?.toLowerCase() ?? null);
  return cap != null ? formatUSD(cap) : "—";
}

export function GenesisMaidenVoyageExplorer({
  genesisMarkets,
  comingSoonMarkets,
  reads,
  totalDepositsReads,
  isConnected,
  address,
  claimingMarket,
  collateralPricesMap,
  coinGeckoPrices,
  coinGeckoLoading,
  chainlinkBtcPrice,
  onClaim,
  onManage,
  defaultArchivedExpanded = false,
}: GenesisMaidenVoyageExplorerProps) {
  const [tab, setTab] = useState<ExplorerTab>("all");
  const [archivedExpanded, setArchivedExpanded] = useState(
    defaultArchivedExpanded,
  );

  const tableMarkets = useMemo(
    () => genesisMarkets.filter(([id]) => !isFeaturedActiveMarket(id)),
    [genesisMarkets],
  );

  const archivedMarkets = useMemo(
    () => tableMarkets.filter(([, mkt]) => isMarketArchived(mkt)),
    [tableMarkets],
  );

  const nonArchivedTableMarkets = useMemo(
    () => tableMarkets.filter(([, mkt]) => !isMarketArchived(mkt)),
    [tableMarkets],
  );

  const filterByTab = useCallback(
    (marketId: string, mkt: GenesisMarketConfig): boolean => {
      const mi = genesisMarkets.findIndex((m) => m[0] === marketId);
      const baseOffset = mi * (isConnected ? 3 : 1);
      const isEnded =
        readContractRowResult<boolean>(reads, baseOffset) ?? false;

      switch (tab) {
        case "upcoming":
          return false;
        case "ongoing":
          return !isEnded && !isGenesisCompletedUi(mkt);
        case "completed":
          return (
            isFeaturedCompletedMarket(marketId) ||
            isEnded ||
            isGenesisCompletedUi(mkt)
          );
        case "all":
        default:
          return true;
      }
    },
    [tab, genesisMarkets, reads, isConnected],
  );

  const visibleGenesisRows = useMemo(() => {
    if (tab === "completed") {
      const featuredRows = FEATURED_COMPLETED_MARKET_IDS.map((id) => {
        const entry = genesisMarkets.find(([mid]) => mid === id);
        return entry ? ([id, entry[1]] as [string, GenesisMarketConfig]) : null;
      }).filter((row): row is [string, GenesisMarketConfig] => row != null);

      const featuredSet = new Set(FEATURED_COMPLETED_MARKET_IDS);
      const otherCompleted = tableMarkets.filter(([id, mkt]) => {
        if (featuredSet.has(id)) return false;
        const mi = genesisMarkets.findIndex((m) => m[0] === id);
        const baseOffset = mi * (isConnected ? 3 : 1);
        const ended =
          readContractRowResult<boolean>(reads, baseOffset) ?? false;
        return ended || isGenesisCompletedUi(mkt);
      });
      return [...featuredRows, ...otherCompleted];
    }

    return nonArchivedTableMarkets.filter(([id, mkt]) => filterByTab(id, mkt));
  }, [
    tab,
    genesisMarkets,
    tableMarkets,
    nonArchivedTableMarkets,
    filterByTab,
    reads,
    isConnected,
  ]);

  const visibleUpcoming = tab === "ongoing" ? [] : comingSoonMarkets;

  const showArchivedSection =
    (tab === "all" || tab === "completed") && archivedMarkets.length > 0;

  const scrollToArchived = useCallback(() => {
    setTab("completed");
    setArchivedExpanded(true);
    requestAnimationFrame(() => {
      document
        .getElementById("maiden-voyage-archived-list")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const hasRows = visibleGenesisRows.length > 0 || visibleUpcoming.length > 0;

  return (
    <section
      id="maiden-voyage-explorer"
      className="mb-8 scroll-mt-24"
      aria-label="All Maiden Voyages"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className={MV_EXPLORER_TABS} role="tablist" aria-label="Voyage filters">
          {EXPLORER_TABS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={tab === option.id}
              className={
                tab === option.id
                  ? MV_EXPLORER_TAB_ACTIVE
                  : MV_EXPLORER_TAB_INACTIVE
              }
              onClick={() => setTab(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {showArchivedSection && !archivedExpanded ? (
          <button
            type="button"
            onClick={scrollToArchived}
            className="text-xs font-semibold text-[#FF8A7A]/90 hover:text-[#ffb4a8]"
          >
            View archived ({archivedMarkets.length})
          </button>
        ) : null}
      </div>

      <div
        className={`${MV_TABLE_HEADER} ${TABLE_COLS_LG} ${TABLE_COLS_MD} mb-2`}
      >
        <div>Status</div>
        <div>Voyage</div>
        <div>Type</div>
        <div>Status</div>
        <div className="text-right">Est. capacity</div>
        <div className="text-right">Launch window</div>
        <div className="text-right">Action</div>
      </div>

      {!hasRows && !(showArchivedSection && archivedExpanded) ? (
        <p className="rounded-xl border border-white/10 bg-[#0f2340] px-4 py-6 text-center text-sm text-white/50">
          No voyages in this view yet.
        </p>
      ) : null}

      <div className="space-y-2">
        {visibleUpcoming.map(([id, mkt], index) => (
          <UpcomingExplorerRow
            key={id}
            voyageLabel={`Maiden Voyage #${FEATURED_COMPLETED_MARKET_IDS.length + 2 + index}`}
            mkt={mkt}
          />
        ))}

        {visibleGenesisRows.map(([id, mkt]) => (
          <GenesisExplorerRow
            key={id}
            marketId={id}
            mkt={mkt}
            genesisMarkets={genesisMarkets}
            reads={reads}
            isConnected={isConnected}
            address={address}
            claimingMarket={claimingMarket}
            collateralPricesMap={collateralPricesMap}
            onClaim={onClaim}
            onManage={onManage}
          />
        ))}
      </div>

      {showArchivedSection ? (
        <div className="mt-4" id="maiden-voyage-archived">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0f2340] px-4 py-3 text-left transition hover:bg-[#132a4a]"
            onClick={() => setArchivedExpanded((v) => !v)}
            aria-expanded={archivedExpanded}
          >
            <span className="text-xs font-medium uppercase tracking-wider text-white/55">
              Archived voyages ({archivedMarkets.length})
            </span>
            <span className="text-xs text-white/40">
              {archivedExpanded ? "Hide" : "View all"}
            </span>
          </button>
          {archivedExpanded ? (
            <div id="maiden-voyage-archived-list" className="mt-2 space-y-2">
              {archivedMarkets.map(([id, mkt]) => (
                <GenesisExplorerRow
                  key={id}
                  marketId={id}
                  mkt={mkt}
                  genesisMarkets={genesisMarkets}
                  reads={reads}
                  isConnected={isConnected}
                  address={address}
                  claimingMarket={claimingMarket}
                  collateralPricesMap={collateralPricesMap}
                  onClaim={onClaim}
                  onManage={onManage}
                  archived
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type UpcomingExplorerRowProps = {
  voyageLabel: string;
  mkt: GenesisMarketConfig;
};

function UpcomingExplorerRow({ voyageLabel, mkt }: UpcomingExplorerRowProps) {
  const collateralSymbol = mkt.collateral?.symbol || "COLLATERAL";
  const peggedSymbol = mkt.peggedToken?.symbol || "ha";
  const leveragedSymbol = mkt.leveragedToken?.symbol || "hs";
  const genesisAddress = mkt.addresses?.genesis;
  const launchWindow = formatLaunchWindow(mkt.genesis?.endDate);

  return (
    <div className={`${MV_TABLE_ROW} ${TABLE_COLS_LG} ${TABLE_COLS_MD}`}>
      <div>
        <span className={MV_UPCOMING_BADGE}>Upcoming</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white/90">{voyageLabel}</p>
        <div className="mt-1">
          <GenesisMarketCollateralEquationStrip
            collateralSymbol={collateralSymbol}
            peggedSymbol={peggedSymbol}
            leveragedSymbol={leveragedSymbol}
            iconSize={18}
          />
        </div>
      </div>
      <div>
        <span className={MV_TYPE_TAG}>
          {getGenesisMarketTypeLabel(mkt.pegTarget)}
        </span>
      </div>
      <div className="text-sm text-white/55">Opening soon</div>
      <div className="font-mono text-sm font-semibold tabular-nums text-white/80 md:text-right">
        {formatEstCapacityUsd(genesisAddress)}
      </div>
      <div className="text-sm text-white/55 md:text-right">
        {launchWindow ?? "TBD"}
      </div>
      <div className="flex justify-end">
        <a
          href={MAIDEN_VOYAGE_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/35 hover:text-white/90"
        >
          <BellIcon className="h-3.5 w-3.5" aria-hidden />
          Notify me
        </a>
      </div>
    </div>
  );
}

type GenesisExplorerRowProps = {
  marketId: string;
  mkt: GenesisMarketConfig;
  genesisMarkets: Array<[string, GenesisMarketConfig]>;
  reads: readonly unknown[] | undefined;
  isConnected: boolean;
  address: `0x${string}` | undefined;
  claimingMarket: string | null;
  onClaim: (args: GenesisClaimMarketArgs) => Promise<void>;
  onManage: (
    marketId: string,
    market: GenesisMarketConfig,
    initialTab?: "deposit" | "withdraw",
  ) => void;
  archived?: boolean;
};

function GenesisExplorerRow({
  marketId,
  mkt,
  genesisMarkets,
  reads,
  isConnected,
  address,
  claimingMarket,
  onClaim,
  onManage,
  archived = false,
}: GenesisExplorerRowProps) {
  const mi = genesisMarkets.findIndex((m) => m[0] === marketId);
  const baseOffset = mi * (isConnected ? 3 : 1);
  const isEnded = readContractRowResult<boolean>(reads, baseOffset) ?? false;
  const claimableResult = isConnected
    ? readContractRowResult<[bigint, bigint]>(reads, baseOffset + 2)
    : undefined;
  const claimablePegged = claimableResult?.[0] || 0n;
  const claimableLeveraged = claimableResult?.[1] || 0n;
  const hasClaimable = claimablePegged > 0n || claimableLeveraged > 0n;
  const genesisAddress = mkt.addresses?.genesis;
  const collateralSymbol = mkt.collateral?.symbol || "ETH";
  const peggedSymbol = mkt.peggedToken?.symbol || "ha";
  const leveragedSymbol = mkt.leveragedToken?.symbol || "hs";
  const peggedNoPrefix =
    peggedSymbol.toLowerCase().startsWith("ha")
      ? peggedSymbol.slice(2)
      : peggedSymbol;
  const displayMarketName = resolveDisplayName(mkt);
  const launchWindow = formatLaunchWindow(mkt.genesis?.endDate);
  const depositBlocked = isGenesisDepositWithdrawBlockedByConfig(mkt);
  const showCompleted =
    isEnded || isGenesisCompletedUi(mkt) || isFeaturedCompletedMarket(marketId);

  const statusLabel = archived
    ? "Archived"
    : showCompleted
      ? "Launched"
      : isEnded
        ? "Ended"
        : "Open";

  return (
    <div className={`${MV_TABLE_ROW} ${TABLE_COLS_LG} ${TABLE_COLS_MD}`}>
      <div>
        {showCompleted ? (
          <span className={MV_COMPLETED_PILL}>
            <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden />
            Completed
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A9784]">
            {archived ? "Archived" : "Open"}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white/90">{displayMarketName}</p>
        <div className="mt-1">
          <GenesisMarketCollateralEquationStrip
            collateralSymbol={collateralSymbol}
            peggedSymbol={peggedSymbol}
            leveragedSymbol={leveragedSymbol}
            iconSize={18}
          />
        </div>
      </div>
      <div>
        <span className={MV_TYPE_TAG}>
          {getGenesisMarketTypeLabel(mkt.pegTarget)}
        </span>
      </div>
      <div className="text-sm text-white/55">{statusLabel}</div>
      <div className="font-mono text-sm font-semibold tabular-nums text-white/80 md:text-right">
        {formatEstCapacityUsd(genesisAddress)}
      </div>
      <div className="text-sm text-white/55 md:text-right">
        {launchWindow ?? "—"}
      </div>
      <div className="flex justify-end">
        <GenesisMarketRowClaimActions
          variant="responsive"
          isEnded={isEnded}
          showMaintenanceTag={isMarketInMaintenance(mkt)}
          hasClaimable={hasClaimable}
          genesisAddress={genesisAddress}
          walletAddress={address}
          isClaimingThisMarket={claimingMarket === marketId}
          onClaim={() =>
            onClaim({
              marketId,
              genesisAddress,
              displayMarketName,
              peggedSymbolForShare: peggedNoPrefix,
            })
          }
          onManage={() =>
            onManage(
              marketId,
              mkt,
              archived || depositBlocked ? "withdraw" : "deposit",
            )
          }
          manageButtonLabel={
            archived || depositBlocked ? "Withdraw" : "Manage"
          }
        />
      </div>
    </div>
  );
}
