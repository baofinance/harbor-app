"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ArchivedMarketsListSection } from "@/components/ArchivedMarketsListSection";
import { BellIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { HARBOR_BTN_SECONDARY_CLASS } from "@/components/shared/harborButtonStyles";
import { HarborSectionCard } from "@/components/shared/HarborSectionCard";
import {
  HARBOR_SECTION_ACCENT_MV_CLASS,
  HARBOR_SECTION_ICON_MV_CLASS,
} from "@/components/shared/harborSectionCardStyles";
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
  isGenesisSoonUi,
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
  MV_EXPLORER_MOBILE_META_GRID_CLASSNAME,
  MV_EXPLORER_MOBILE_META_LABEL_CLASSNAME,
  MV_EXPLORER_MOBILE_VOYAGE_CLASSNAME,
  MV_EXPLORER_OPEN_STATUS_CLASSNAME,
  MV_EXPLORER_TABLE_INNER_CLASSNAME,
  MV_EXPLORER_TABLE_ROW_DESKTOP_CLASSNAME,
  MV_EXPLORER_TABLE_ROW_MOBILE_CLASSNAME,
  MV_EXPLORER_TABLE_ROW_SHELL_CLASSNAME,
  MV_EXPLORER_TABLE_SCROLL_WRAP_CLASSNAME,
  MV_EXPLORER_TYPE_CHIP_CLASSNAME,
} from "./genesisMaidenVoyageTableGrid";
import {
  GenesisVoyageArchivedBadge,
  GenesisVoyageCompletedBadge,
} from "./GenesisVoyageLifecycleBadge";
import { GENESIS_TABLE_FROSTED_SURFACE } from "./genesisActiveTableStyles";
import { MV_UPCOMING_BADGE } from "./maidenVoyageLayoutStyles";

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

function ExplorerMobileVoyageBlock({
  title,
  collateralSymbol,
  peggedSymbol,
  leveragedSymbol,
}: {
  title: string;
  collateralSymbol: string;
  peggedSymbol: string;
  leveragedSymbol: string;
}) {
  return (
    <div className={MV_EXPLORER_MOBILE_VOYAGE_CLASSNAME}>
      <p
        className="max-w-full truncate font-medium text-sm text-[#1E4775]"
        title={title}
      >
        {title}
      </p>
      <GenesisMarketCollateralEquationStrip
        collateralSymbol={collateralSymbol}
        peggedSymbol={peggedSymbol}
        leveragedSymbol={leveragedSymbol}
        iconSize={18}
      />
    </div>
  );
}

function ExplorerMobileMetaField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className={MV_EXPLORER_MOBILE_META_LABEL_CLASSNAME}>{label}</div>
      <div className="min-w-0">{children}</div>
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
  comingSoonMarkets: _comingSoonMarkets,
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
}: GenesisMaidenVoyageExplorerProps) {
  const [tab, setTab] = useState<MaidenVoyageStatusFilter>("all");
  const [archivedExpanded, setArchivedExpanded] = useState(
    defaultArchivedExpanded,
  );

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
          return (
            !isEnded && !isGenesisCompletedUi(mkt) && !isGenesisSoonUi(mkt)
          );
        case "completed":
          return (
            isFeaturedCompletedMarket(marketId) ||
            isEnded ||
            isGenesisCompletedUi(mkt)
          );
        case "all":
        default:
          return !isGenesisSoonUi(mkt);
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

  /** Preview / metals upcoming rows live on the featured card only. */
  const visibleUpcoming: Array<[string, GenesisMarketConfig]> = [];

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

  const explorerBody = (
    <>
      <GenesisMaidenVoyageToolbar
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
            <div className={`rounded-lg px-4 py-6 text-center text-sm text-[#1E4775]/60 ${GENESIS_TABLE_FROSTED_SURFACE}`}>
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

      {hasArchivedMarkets ? (
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
    </>
  );

  return (
    <HarborSectionCard
      id="maiden-voyage-explorer"
      title="All voyages"
      icon={SparklesIcon}
      accentBarClass={HARBOR_SECTION_ACCENT_MV_CLASS}
      iconBadgeClass={HARBOR_SECTION_ICON_MV_CLASS}
      className="mb-8 scroll-mt-24 space-y-2"
      ariaLabel="Maiden Voyage markets"
    >
      {explorerBody}
    </HarborSectionCard>
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ExplorerRowNetworkCell mkt={mkt} />
            <span className={MV_UPCOMING_BADGE}>Upcoming</span>
          </div>
          <a
            href={MAIDEN_VOYAGE_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={HARBOR_BTN_SECONDARY_CLASS}
          >
            <BellIcon className="h-3.5 w-3.5" aria-hidden />
            Notify me
          </a>
        </div>
        <ExplorerMobileVoyageBlock
          title={voyageLabel}
          collateralSymbol={collateralSymbol}
          peggedSymbol={peggedSymbol}
          leveragedSymbol={leveragedSymbol}
        />
        <div className={MV_EXPLORER_MOBILE_META_GRID_CLASSNAME}>
          <ExplorerMobileMetaField label="Type">
            <span className={MV_EXPLORER_TYPE_CHIP_CLASSNAME}>
              {getGenesisMarketTypeLabel(mkt.pegTarget)}
            </span>
          </ExplorerMobileMetaField>
          <ExplorerMobileMetaField label="Phase">
            <span className="text-sm text-[#1E4775]">Opening soon</span>
          </ExplorerMobileMetaField>
          <ExplorerMobileMetaField label="Est. capacity">
            <span className="font-mono text-sm font-semibold tabular-nums text-[#1E4775]">
              {formatEstCapacityUsd(genesisAddress)}
            </span>
          </ExplorerMobileMetaField>
          <ExplorerMobileMetaField label="Launch window">
            <span className="text-sm text-[#1E4775]/80">
              {launchWindow ?? "TBD"}
            </span>
          </ExplorerMobileMetaField>
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
            className={HARBOR_BTN_SECONDARY_CLASS}
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

  const lifecycleCell =
    showCompleted && !archived ? (
      <GenesisVoyageCompletedBadge />
    ) : archived ? (
      <GenesisVoyageArchivedBadge />
    ) : (
      <span className={MV_EXPLORER_OPEN_STATUS_CLASSNAME}>Open</span>
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

  const claimActionProps = {
    isEnded,
    showMaintenanceTag: isMarketInMaintenance(mkt),
    hasClaimable,
    genesisAddress,
    walletAddress: address,
    isClaimingThisMarket: claimingMarket === marketId,
    onClaim: () =>
      onClaim({
        marketId,
        genesisAddress,
        displayMarketName,
        peggedSymbolForShare: peggedNoPrefix,
      }),
    onManage: () =>
      onManage(
        marketId,
        mkt,
        archived || depositBlocked ? "withdraw" : "deposit",
      ),
    manageButtonLabel: (archived || depositBlocked ? "Withdraw" : "Manage") as
      | "Manage"
      | "Withdraw",
  };

  const actionCellMobile = (
    <GenesisMarketRowClaimActions variant="compact" {...claimActionProps} />
  );
  const actionCellDesktop = (
    <GenesisMarketRowClaimActions variant="desktop" {...claimActionProps} />
  );

  return (
    <div className={MV_EXPLORER_TABLE_ROW_SHELL_CLASSNAME}>
      <div className={MV_EXPLORER_TABLE_ROW_MOBILE_CLASSNAME}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ExplorerRowNetworkCell mkt={mkt} />
            {lifecycleCell}
          </div>
          <div className="flex shrink-0 items-center justify-end">
            {actionCellMobile}
          </div>
        </div>
        <ExplorerMobileVoyageBlock
          title={displayMarketName}
          collateralSymbol={collateralSymbol}
          peggedSymbol={peggedSymbol}
          leveragedSymbol={leveragedSymbol}
        />
        <div className={MV_EXPLORER_MOBILE_META_GRID_CLASSNAME}>
          <ExplorerMobileMetaField label="Type">
            <span className={MV_EXPLORER_TYPE_CHIP_CLASSNAME}>
              {getGenesisMarketTypeLabel(mkt.pegTarget)}
            </span>
          </ExplorerMobileMetaField>
          <ExplorerMobileMetaField label="Phase">
            <span className="text-sm text-[#1E4775]">{statusLabel}</span>
          </ExplorerMobileMetaField>
          <ExplorerMobileMetaField label="Est. capacity">
            <span className="font-mono text-sm font-semibold tabular-nums text-[#1E4775]">
              {formatEstCapacityUsd(genesisAddress)}
            </span>
          </ExplorerMobileMetaField>
          <ExplorerMobileMetaField label="Launch window">
            <span className="text-sm text-[#1E4775]/80">
              {launchWindow ?? "—"}
            </span>
          </ExplorerMobileMetaField>
        </div>
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
        <div className={MV_EXPLORER_COL_ACTION_CLASSNAME}>{actionCellDesktop}</div>
      </div>
    </div>
  );
}
