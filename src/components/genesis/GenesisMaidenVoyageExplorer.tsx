"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArchivedMarketsListSection } from "@/components/ArchivedMarketsListSection";
import { BellIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import {
  FEATURED_COMPLETED_MARKET_IDS,
  getGenesisMarketTypeLabel,
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
import {
  GenesisMarketChainCell,
  GenesisMarketCollateralEquationStrip,
} from "./GenesisMarketSharedRowCells";
import { readContractRowResult } from "./readContractRow";
import type { GenesisClaimMarketArgs } from "./GenesisCompletedMarketsSection";
import {
  GenesisMaidenVoyageToolbar,
  type MaidenVoyageStatusFilter,
} from "./GenesisMaidenVoyageToolbar";
import { GenesisMaidenVoyageTableHeader } from "./GenesisMaidenVoyageTableHeader";
import {
  MV_EXPLORER_COL_ACTION_CLASSNAME,
  MV_EXPLORER_COL_CAPACITY_CLASSNAME,
  MV_EXPLORER_COL_LAUNCH_CLASSNAME,
  MV_EXPLORER_COL_LIFECYCLE_CLASSNAME,
  MV_EXPLORER_COL_NETWORK_CLASSNAME,
  MV_EXPLORER_COL_PHASE_CLASSNAME,
  MV_EXPLORER_COL_TYPE_CLASSNAME,
  MV_EXPLORER_COL_VOYAGE_CLASSNAME,
  MV_EXPLORER_COL_VOYAGE_INNER_CLASSNAME,
  MV_EXPLORER_OPEN_STATUS_CLASSNAME,
  MV_EXPLORER_TABLE_INNER_CLASSNAME,
  MV_EXPLORER_TABLE_ROW_DESKTOP_CLASSNAME,
  MV_EXPLORER_TABLE_ROW_MOBILE_CLASSNAME,
  MV_EXPLORER_TABLE_ROW_SHELL_CLASSNAME,
  MV_EXPLORER_TABLE_SCROLL_WRAP_CLASSNAME,
  MV_EXPLORER_TYPE_CHIP_CLASSNAME,
} from "./genesisMaidenVoyageTableGrid";
import { MV_COMPLETED_PILL, MV_UPCOMING_BADGE } from "./maidenVoyageLayoutStyles";

const EXPLORER_NETWORK_ICON_PX = 20;

function ExplorerRowNetworkCell({ mkt }: { mkt: GenesisMarketConfig }) {
  return (
    <div className={MV_EXPLORER_COL_NETWORK_CLASSNAME}>
      <GenesisMarketChainCell
        chainName={mkt.chain?.name ?? "Ethereum"}
        chainLogo={mkt.chain?.logo ?? "icons/eth.png"}
        size={EXPLORER_NETWORK_ICON_PX}
      />
    </div>
  );
}

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
  /** Basic (UI): Ongoing / Upcoming filters only; no archived block. */
  viewBasic?: boolean;
};

const BASIC_STATUS_FILTERS = new Set<MaidenVoyageStatusFilter>([
  "ongoing",
  "upcoming",
]);

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
  totalDepositsReads: _totalDepositsReads,
  isConnected,
  address,
  claimingMarket,
  collateralPricesMap: _collateralPricesMap,
  coinGeckoPrices: _coinGeckoPrices,
  coinGeckoLoading: _coinGeckoLoading,
  chainlinkBtcPrice: _chainlinkBtcPrice,
  onClaim,
  onManage,
  defaultArchivedExpanded = false,
  viewBasic = false,
}: GenesisMaidenVoyageExplorerProps) {
  const [tab, setTab] = useState<MaidenVoyageStatusFilter>(
    viewBasic ? "ongoing" : "all",
  );
  const [archivedExpanded, setArchivedExpanded] = useState(
    defaultArchivedExpanded,
  );

  useEffect(() => {
    if (viewBasic && !BASIC_STATUS_FILTERS.has(tab)) {
      setTab("ongoing");
    }
  }, [viewBasic, tab]);

  const statusFilter = tab;

  /** Include all live genesis markets (ETH + MegaETH, etc.) — featured hero does not remove rows. */
  const tableMarkets = genesisMarkets;

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

      switch (statusFilter) {
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
    [statusFilter, genesisMarkets, reads, isConnected],
  );

  const visibleGenesisRows = useMemo(() => {
    if (statusFilter === "completed") {
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
    statusFilter,
    genesisMarkets,
    tableMarkets,
    nonArchivedTableMarkets,
    filterByTab,
    reads,
    isConnected,
  ]);

  const visibleUpcoming =
    statusFilter === "ongoing" ? [] : comingSoonMarkets;

  const hasArchivedMarkets = archivedMarkets.length > 0;

  const scrollToArchived = useCallback(() => {
    setArchivedExpanded(true);
    requestAnimationFrame(() => {
      document
        .getElementById("maiden-voyage-archived")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const hasRows = visibleGenesisRows.length > 0 || visibleUpcoming.length > 0;

  return (
    <section
      id="maiden-voyage-explorer"
      className="mb-8 scroll-mt-24"
      aria-label="Maiden Voyage markets"
    >
      <GenesisMaidenVoyageToolbar
        viewBasic={viewBasic}
        statusFilter={tab}
        onStatusFilterChange={setTab}
        archivedCount={archivedMarkets.length}
        showArchivedLink={hasArchivedMarkets && !archivedExpanded}
        onViewArchived={scrollToArchived}
      />

      <div className={MV_EXPLORER_TABLE_SCROLL_WRAP_CLASSNAME}>
        <div className={MV_EXPLORER_TABLE_INNER_CLASSNAME}>
          <GenesisMaidenVoyageTableHeader />

          {!hasRows && !(hasArchivedMarkets && archivedExpanded) ? (
            <div className="rounded-md border border-[#1E4775]/15 bg-white px-4 py-6 text-center text-sm text-[#1E4775]/60 shadow-sm">
              No voyages in this view yet.
            </div>
          ) : null}

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
              onClaim={onClaim}
              onManage={onManage}
            />
          ))}
        </div>
      </div>

      {!viewBasic && hasArchivedMarkets ? (
        <ArchivedMarketsListSection
          sectionId="maiden-voyage-archived"
          heading="Archived voyages"
          subtitle="Deposits disabled · withdrawals and claims still available"
          markets={archivedMarkets.map(([id, mkt]) => [
            id,
            { name: resolveDisplayName(mkt) },
          ])}
          showSection={archivedExpanded}
          onToggleShow={() => setArchivedExpanded((v) => !v)}
          expandedContent={
            <div
              id="maiden-voyage-archived-list"
              className={MV_EXPLORER_TABLE_SCROLL_WRAP_CLASSNAME}
            >
              <div className={MV_EXPLORER_TABLE_INNER_CLASSNAME}>
                <GenesisMaidenVoyageTableHeader />
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
                  onClaim={onClaim}
                  onManage={onManage}
                  archived
                />
                ))}
              </div>
            </div>
          }
        />
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

  const voyageInner = (
    <div className={MV_EXPLORER_COL_VOYAGE_INNER_CLASSNAME}>
      <p className="font-medium text-sm truncate max-w-full text-[#1E4775]">
        {voyageLabel}
      </p>
      <div className="flex justify-center">
        <GenesisMarketCollateralEquationStrip
          collateralSymbol={collateralSymbol}
          peggedSymbol={peggedSymbol}
          leveragedSymbol={leveragedSymbol}
          iconSize={18}
        />
      </div>
    </div>
  );

  return (
    <div className={MV_EXPLORER_TABLE_ROW_SHELL_CLASSNAME}>
      <div className={MV_EXPLORER_TABLE_ROW_MOBILE_CLASSNAME}>
        <div className="flex items-center gap-2">
          <ExplorerRowNetworkCell mkt={mkt} />
          <span className={MV_UPCOMING_BADGE}>Upcoming</span>
        </div>
        {voyageInner}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <span className={MV_EXPLORER_TYPE_CHIP_CLASSNAME}>
            {getGenesisMarketTypeLabel(mkt.pegTarget)}
          </span>
          <span className={MV_EXPLORER_COL_PHASE_CLASSNAME}>Opening soon</span>
        </div>
      </div>

      <div className={MV_EXPLORER_TABLE_ROW_DESKTOP_CLASSNAME}>
        <ExplorerRowNetworkCell mkt={mkt} />
        <div className={MV_EXPLORER_COL_LIFECYCLE_CLASSNAME}>
          <span className={MV_UPCOMING_BADGE}>Upcoming</span>
        </div>
        <div className={MV_EXPLORER_COL_VOYAGE_CLASSNAME}>{voyageInner}</div>
        <div className={MV_EXPLORER_COL_TYPE_CLASSNAME}>
          <span className={MV_EXPLORER_TYPE_CHIP_CLASSNAME}>
            {getGenesisMarketTypeLabel(mkt.pegTarget)}
          </span>
        </div>
        <div className={MV_EXPLORER_COL_PHASE_CLASSNAME}>Opening soon</div>
        <div className={MV_EXPLORER_COL_CAPACITY_CLASSNAME}>
          {formatEstCapacityUsd(genesisAddress)}
        </div>
        <div className={MV_EXPLORER_COL_LAUNCH_CLASSNAME}>
          {launchWindow ?? "TBD"}
        </div>
        <div className={MV_EXPLORER_COL_ACTION_CLASSNAME}>
          <a
            href={MAIDEN_VOYAGE_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#1E4775]/25 px-3 py-1.5 text-xs font-semibold text-[#1E4775] transition hover:border-[#1E4775]/40 hover:bg-[#1E4775]/5"
          >
            <BellIcon className="h-3.5 w-3.5" aria-hidden />
            Notify me
          </a>
        </div>
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

  const lifecycleCell = showCompleted ? (
    <span className={MV_COMPLETED_PILL}>
      <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden />
      Completed
    </span>
  ) : (
    <span className={MV_EXPLORER_OPEN_STATUS_CLASSNAME}>
      {archived ? "Archived" : "Open"}
    </span>
  );

  const voyageInner = (
    <div className={MV_EXPLORER_COL_VOYAGE_INNER_CLASSNAME}>
      <p
        className="font-medium text-sm lg:text-base truncate max-w-full text-[#1E4775]"
        title={displayMarketName}
      >
        {displayMarketName}
      </p>
      <div className="flex justify-center">
        <GenesisMarketCollateralEquationStrip
          collateralSymbol={collateralSymbol}
          peggedSymbol={peggedSymbol}
          leveragedSymbol={leveragedSymbol}
          iconSize={18}
        />
      </div>
    </div>
  );

  const actionCell = (
    <GenesisMarketRowClaimActions
      variant="desktop"
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
  );

  return (
    <div className={MV_EXPLORER_TABLE_ROW_SHELL_CLASSNAME}>
      <div className={MV_EXPLORER_TABLE_ROW_MOBILE_CLASSNAME}>
        <div className="flex items-center gap-2">
          <ExplorerRowNetworkCell mkt={mkt} />
          {lifecycleCell}
        </div>
        {voyageInner}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={MV_EXPLORER_TYPE_CHIP_CLASSNAME}>
            {getGenesisMarketTypeLabel(mkt.pegTarget)}
          </span>
          <span>{statusLabel}</span>
        </div>
        <div className="flex justify-end">{actionCell}</div>
      </div>

      <div className={MV_EXPLORER_TABLE_ROW_DESKTOP_CLASSNAME}>
        <ExplorerRowNetworkCell mkt={mkt} />
        <div className={MV_EXPLORER_COL_LIFECYCLE_CLASSNAME}>{lifecycleCell}</div>
        <div className={MV_EXPLORER_COL_VOYAGE_CLASSNAME}>{voyageInner}</div>
        <div className={MV_EXPLORER_COL_TYPE_CLASSNAME}>
          <span className={MV_EXPLORER_TYPE_CHIP_CLASSNAME}>
            {getGenesisMarketTypeLabel(mkt.pegTarget)}
          </span>
        </div>
        <div className={MV_EXPLORER_COL_PHASE_CLASSNAME}>{statusLabel}</div>
        <div className={MV_EXPLORER_COL_CAPACITY_CLASSNAME}>
          {formatEstCapacityUsd(genesisAddress)}
        </div>
        <div className={MV_EXPLORER_COL_LAUNCH_CLASSNAME}>
          {launchWindow ?? "—"}
        </div>
        <div className={MV_EXPLORER_COL_ACTION_CLASSNAME}>{actionCell}</div>
      </div>
    </div>
  );
}
