"use client";

import React from "react";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import SimpleTooltip from "@/components/SimpleTooltip";
import Image from "next/image";
import { formatUSD, formatToken } from "@/utils/formatters";
import { getLogoPath } from "@/components/shared";
import {
  GENESIS_MARKET_TEST_TAG_CLASS,
  GENESIS_MARKET_TEST_TAG_TOOLTIP,
} from "@/components/shared/indexMarketsToolbarStyles";
import { GenesisAprMarksColumn } from "./GenesisAprMarksColumn";
import { GenesisCompactMarketCard } from "./GenesisCompactMarketCard";
import { GenesisMarketRowClaimActions } from "./GenesisMarketRowClaimActions";
import { GenesisMarketTokenStrip } from "./GenesisMarketTokenStrip";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import { GenesisMarketExpandedView } from "@/components/GenesisMarketExpandedView";
import { getDepositMode } from "@/utils/depositMode";
import { formatGenesisMarketDisplayName } from "@/utils/genesisDisplay";
import { maidenVoyageYieldOwnerSharePercent } from "@/config/maidenVoyageYield";
import { computeGenesisRowUsdPricing } from "@/utils/genesisRowPricing";
import {
  isGenesisCompletedUi,
  isGenesisDepositWithdrawBlockedByConfig,
  isGenesisSoonUi,
  isMarketInMaintenance,
} from "@/config/markets";
import type { CollateralPriceData } from "@/hooks/useCollateralPrice";
import {
  getGenesisDepositCapData,
  resolveGenesisTokenCapAmount,
} from "@/utils/genesisDepositCap";
import { resolveGenesisUnderlyingApr } from "@/utils/genesisAprDerived";
import { formatEther } from "viem";
import {
  GenesisMarketChainCell,
  GenesisYourDepositAmountText,
} from "./GenesisMarketSharedRowCells";
import {
  GENESIS_ACTIVE_HEADER_INNER_GRID_CLASS,
  GENESIS_ACTIVE_LG_ROW_GRID_BASE,
  GENESIS_ACTIVE_LG_ROW_COLS_OPEN,
  GENESIS_ACTIVE_LG_ROW_COLS_ENDED,
  GENESIS_ACTIVE_MD_ROW_GRID_BASE,
  GENESIS_ACTIVE_MD_ROW_COLS_OPEN,
  GENESIS_ACTIVE_MD_ROW_COLS_ENDED,
} from "./genesisActiveTableStyles";
import { readContractRowResult } from "./readContractRow";

export type GenesisActiveMarketsSectionProps = {
  showHeaders: boolean;
  genesisViewBasic: boolean;
  displayedActiveMarkets: Array<[string, GenesisMarketConfig]>;
  genesisMarkets: Array<[string, GenesisMarketConfig]>;
  reads: readonly unknown[] | undefined;
  totalDepositsReads: readonly unknown[] | undefined;
  /** From `useMultipleTokenPrices` — per-market ha/hs USD for claim tooltips. */
  tokenPricesByMarket: Record<
    string,
    { peggedPriceUSD: number; leveragedPriceUSD: number } | undefined
  >;
  isConnected: boolean;
  address: `0x${string}` | undefined;
  expandedMarkets: string[];
  setExpandedMarkets: React.Dispatch<React.SetStateAction<string[]>>;
  claimingMarket: string | null;
  claimMarket: (args: {
    marketId: string;
    genesisAddress: string | undefined;
    displayMarketName: string;
    peggedSymbolForShare: string;
  }) => Promise<void>;
  openManageModal: (
    marketId: string,
    market: GenesisMarketConfig,
    initialTab?: "deposit" | "withdraw"
  ) => Promise<void>;
  now: Date;
  marksResults:
    | NonNullable<
        ReturnType<typeof import("@/hooks/useGenesisPageData").useGenesisPageData>["marksResults"]
      >
    | undefined;
  isLoadingMarks: boolean;
  maidenVoyageCampaignResults: NonNullable<
    ReturnType<typeof import("@/hooks/useGenesisPageData").useGenesisPageData>["maidenVoyageCampaignResults"]
  >;
  isLoadingMaidenVoyageIndex: boolean;
  wstETHAPR: number | undefined;
  fxSAVEAPR: number | undefined;
  isLoadingWstETHAPR: boolean;
  isLoadingFxSAVEAPR: boolean;
  mounted: boolean;
  safeTotalGenesisTVL: number;
  safeIsLoadingTotalTVL: boolean;
  safeTotalMaidenVoyageMarks: number;
  fdv: number;
  collateralPricesMap: Map<string, CollateralPriceData>;
  coinGeckoPrices: Record<string, number | null>;
  coinGeckoLoading: boolean;
  chainlinkBtcPrice: number | null;
};


export function GenesisActiveMarketsSection(props: GenesisActiveMarketsSectionProps) {
  const {
    showHeaders,
    genesisViewBasic,
    displayedActiveMarkets,
    genesisMarkets,
    reads,
    totalDepositsReads,
    tokenPricesByMarket,
    isConnected,
    address,
    expandedMarkets,
    setExpandedMarkets,
    claimingMarket,
    claimMarket,
    openManageModal,
    now,
    marksResults,
    isLoadingMarks,
    maidenVoyageCampaignResults,
    isLoadingMaidenVoyageIndex,
    wstETHAPR,
    fxSAVEAPR,
    isLoadingWstETHAPR,
    isLoadingFxSAVEAPR,
    mounted,
    safeTotalGenesisTVL,
    safeIsLoadingTotalTVL,
    safeTotalMaidenVoyageMarks,
    fdv,
    collateralPricesMap,
    coinGeckoPrices,
    coinGeckoLoading,
    chainlinkBtcPrice,
  } = props;

              // Table header bar: always show when showHeaders, even when "deselect all" (0 markets)
              const activeSectionHeader = showHeaders ? (
                <div
                  key="header-active"
                        className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto mb-0 rounded-md"
                      >
                  <div className={GENESIS_ACTIVE_HEADER_INNER_GRID_CLASS}>
                    <div className="min-w-0" aria-label="Network" />
                          <div className="min-w-0 text-center">Market</div>
                          <div className="text-center min-w-0">Marks</div>
                          <div className="text-center min-w-0 flex items-center justify-center gap-1.5">
                            <span>Deposit Assets</span>
                            <SimpleTooltip
                              label={
                                <div>
                                  <div className="font-semibold mb-1">
                                    Multi-Token Support
                                  </div>
                                  <div className="text-xs opacity-90 mb-2">
                                    Zapper-supported assets are zapped in with
                                    no slippage. Any other ERC20s are swapped
                                    with Velora.
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] opacity-75">
                                        wstETH markets:
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <Image
                                          src={getLogoPath("ETH")}
                                          alt="ETH"
                                          width={16}
                                          height={16}
                                          className="rounded-full"
                                        />
                                        <span className="text-[10px]">ETH</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Image
                                          src={getLogoPath("stETH")}
                                          alt="stETH"
                                          width={16}
                                          height={16}
                                          className="rounded-full"
                                        />
                                        <span className="text-[10px]">
                                          stETH
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] opacity-75">
                                        fxSAVE markets:
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <Image
                                          src={getLogoPath("USDC")}
                                          alt="USDC"
                                          width={16}
                                          height={16}
                                          className="rounded-full"
                                        />
                                        <span className="text-[10px]">
                                          USDC
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Image
                                          src={getLogoPath("fxUSD")}
                                          alt="fxUSD"
                                          width={16}
                                          height={16}
                                          className="rounded-full"
                                        />
                                        <span className="text-[10px]">
                                          fxUSD
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              }
                            >
                              <ArrowPathIcon className="w-3.5 h-3.5 text-[#1E4775] cursor-help" />
                            </SimpleTooltip>
                          </div>
                          <div className="text-center min-w-0">
                            Total
                            <span className="hidden lg:inline"> Deposits</span>
                          </div>
                          <div className="text-center min-w-0">
                            Your Deposit
                          </div>
                          <div className="text-center min-w-0">Status</div>
                          <div className="text-center min-w-0">Action</div>
                        </div>
                      </div>
                  ) : null;

              const marketRows = displayedActiveMarkets.map(([id, mkt]) => {
                const mi = genesisMarkets.findIndex((m) => m[0] === id);
                const depositModeRow = getDepositMode(mkt);
                const isCollateralOnlyRow = depositModeRow.collateralOnly;
                const isMegaEthRow = depositModeRow.isMegaEth;
                const genesisPreviewSoon = isGenesisSoonUi(mkt);
                const genesisClaimOnlyCfg = isGenesisCompletedUi(mkt);
                const genesisDepositWithdrawBlocked =
                  isGenesisDepositWithdrawBlockedByConfig(mkt);
                const genesisGreyRow =
                  genesisPreviewSoon || genesisClaimOnlyCfg;
                // Updated offset: [isEnded, balanceOf?, claimable?] - no totalDeposits anymore
                const baseOffset = mi * (isConnected ? 3 : 1);

                // Fallback to subgraph data if contract read fails
                const marksForMarket = marksResults?.find(
                  (marks: {
                    genesisAddress?: string;
                    data?: { userHarborMarks?: unknown };
                  }) =>
                    marks.genesisAddress?.toLowerCase() ===
                    (mkt as GenesisMarketConfig).addresses?.genesis?.toLowerCase()
                );
                // Extract genesisEnded from subgraph data (handle both array and single object responses)
                const userMarksData = marksForMarket?.data?.userHarborMarks;
                const marks = Array.isArray(userMarksData)
                  ? userMarksData[0]
                  : userMarksData;
                // All markets in activeMarkets are active (not ended)
                const isEnded = false;

                // Check claimable tokens early to determine if market will be skipped
                const claimableResult = isConnected
                  ? readContractRowResult<[bigint, bigint]>(
                      reads,
                      baseOffset + 2
                    )
                  : undefined;
                const claimablePegged = claimableResult?.[0] || 0n;
                const claimableLeveraged = claimableResult?.[1] || 0n;
                const hasClaimable =
                  claimablePegged > 0n || claimableLeveraged > 0n;

                const userDeposit = isConnected
                  ? readContractRowResult<bigint>(reads, baseOffset + 1)
                  : undefined;

                // Get token symbols from market configuration
                const rowPeggedSymbol =
                  (mkt as GenesisMarketConfig).peggedToken?.symbol || "ha";
                const rowLeveragedSymbol =
                  (mkt as GenesisMarketConfig).leveragedToken?.symbol || "hs";
                const rawDisplayMarketName =
                  rowLeveragedSymbol &&
                  rowLeveragedSymbol.toLowerCase().startsWith("hs")
                    ? rowLeveragedSymbol.slice(2)
                    : rowLeveragedSymbol || (mkt as GenesisMarketConfig).name || "Market";
                const displayMarketName = formatGenesisMarketDisplayName(rawDisplayMarketName);
                const showMaintenanceTag = isMarketInMaintenance(mkt);
                const peggedNoPrefix =
                  rowPeggedSymbol &&
                  rowPeggedSymbol.toLowerCase().startsWith("ha")
                    ? rowPeggedSymbol.slice(2)
                    : rowPeggedSymbol || "pegged token";

                // Get total deposits from the collateral token balance of the genesis contract
                const totalDeposits = readContractRowResult<bigint>(
                  totalDepositsReads,
                  mi
                );

                const genesisAddress = (mkt as GenesisMarketConfig).addresses?.genesis;
                const collateralSymbol =
                  (mkt as GenesisMarketConfig).collateral?.symbol || "ETH"; // What's deposited (wrapped collateral)
                const underlyingSymbol =
                  (mkt as GenesisMarketConfig).collateral?.underlyingSymbol || collateralSymbol; // The underlying/base token

                const endDate = (mkt as GenesisMarketConfig).genesis?.endDate;

                // Get price data from the collateral prices hook
                const oracleAddress = (mkt as GenesisMarketConfig).addresses
                  ?.collateralPrice as `0x${string}` | undefined;
                const collateralPriceData = oracleAddress
                  ? collateralPricesMap.get(oracleAddress.toLowerCase())
                  : undefined;

                const marketCoinGeckoId = (mkt as GenesisMarketConfig)?.coinGeckoId as
                  | string
                  | undefined;

                const { collateralPriceUSD, priceError } =
                  computeGenesisRowUsdPricing({
                  underlyingSymbol,
                  pegTarget: (mkt as GenesisMarketConfig)?.pegTarget,
                  marketCoinGeckoId,
                  coinGeckoPrices,
                  collateralPriceData,
                  chainlinkBtcPrice,
                  coinGeckoLoading,
                  collateralSymbol,
                });

                // Calculate USD values using wrapped token price
                // Note: totalDeposits is the balance of wrapped collateral token in the genesis contract
                const totalDepositsAmount = totalDeposits
                  ? Number(formatEther(totalDeposits))
                  : 0;
                const totalDepositsUSD =
                  totalDepositsAmount * collateralPriceUSD;

                // balanceOf returns wrapped collateral tokens (fxSAVE, wstETH) - confirmed from contract
                // In the Genesis contract, shares are stored in WRAPPED_COLLATERAL_TOKEN units
                // So balanceOf returns the amount in wrapped tokens, not underlying tokens
                // We just need to multiply by the wrapped token price to get USD value
                const userDepositAmount = userDeposit
                  ? Number(formatEther(userDeposit))
                  : 0;
                // userDepositAmount is already in wrapped tokens, so just multiply by wrapped token price
                const userDepositUSD = userDepositAmount * collateralPriceUSD;

                const { underlyingAPR, isWstETH: isWstETHCollateralMarket } =
                  resolveGenesisUnderlyingApr(collateralSymbol, {
                    wstETHAPR,
                    fxSAVEAPR,
                    isLoadingWstETHAPR,
                    isLoadingFxSAVEAPR,
                  });

                // Get anchor and sail token prices from the hook
                const tokenPrices = tokenPricesByMarket[id];
                const anchorTokenPriceUSD = tokenPrices?.peggedPriceUSD || 0;
                const sailTokenPriceUSD = tokenPrices?.leveragedPriceUSD || 0;

                // Calculate status
                // IMPORTANT: Contract's genesisIsEnded() takes precedence over time-based calculation
                // isEnded is already calculated above using contract read (with subgraph fallback)
                // claimablePegged, claimableLeveraged, and hasClaimable are already calculated above
                let statusText = "";

                // Check if time has expired but contract hasn't finalized genesis yet
                const timeHasExpired = endDate
                  ? new Date(endDate).getTime() <= now.getTime()
                  : false;
                const isProcessing = timeHasExpired && !isEnded;

                if (genesisPreviewSoon) {
                  statusText = "Opening soon";
                } else if (genesisClaimOnlyCfg) {
                  statusText = "Deposits closed";
                } else if (isEnded) {
                  statusText = showMaintenanceTag
                    ? "Maintenance"
                    : hasClaimable
                      ? "Claim available"
                      : "Ended";
                } else if (isProcessing) {
                  statusText = "Processing";
                } else {
                  statusText = "Genesis Open";
                }

                const isExpanded = expandedMarkets.includes(id);
                const showTestMarketTag =
                  (mkt as GenesisMarketConfig).test === true;
                const depositCapData = getGenesisDepositCapData({
                  genesisAddress,
                  collateralSymbol,
                  totalDepositsAmount,
                  maidenVoyageCampaignResults: maidenVoyageCampaignResults || [],
                  marksResults: marksResults || [],
                  genesisTokenCapAmount: (mkt as GenesisMarketConfig)
                    .genesisTokenCapAmount,
                });

                if (genesisViewBasic) {
                  return (
                    <GenesisCompactMarketCard
                      key={id}
                      marketName={displayMarketName}
                      chainName={(mkt as GenesisMarketConfig).chain?.name || "Ethereum"}
                      chainLogo={(mkt as GenesisMarketConfig).chain?.logo || "icons/eth.png"}
                      collateralSymbol={collateralSymbol}
                      peggedSymbol={rowPeggedSymbol}
                      leveragedSymbol={rowLeveragedSymbol}
                      statusText={statusText}
                      isExpanded={isExpanded}
                      isEnded={isEnded}
                      isProcessing={isProcessing}
                      showMaintenanceTag={showMaintenanceTag}
                      hasClaimable={hasClaimable}
                      isClaiming={claimingMarket === id}
                      canWithdraw={Boolean(userDeposit && userDeposit > 0n)}
                      userDepositDisplay={
                        userDeposit && userDeposit > 0n
                          ? collateralPriceUSD > 0
                            ? formatUSD(userDepositUSD)
                            : `${formatToken(userDeposit)} ${collateralSymbol}`
                          : "$0"
                      }
                      capData={depositCapData}
                      onToggleExpand={() =>
                        setExpandedMarkets((prev) =>
                          prev.includes(id)
                            ? prev.filter((x) => x !== id)
                            : [...prev, id]
                        )
                      }
                      onDeposit={() => {
                        if (genesisDepositWithdrawBlocked) return;
                        void openManageModal(id, mkt as GenesisMarketConfig, "deposit");
                      }}
                      onWithdraw={() => {
                        if (genesisDepositWithdrawBlocked) return;
                        void openManageModal(id, mkt as GenesisMarketConfig, "withdraw");
                      }}
                      onClaim={() =>
                        claimMarket({
                          marketId: id,
                          genesisAddress,
                          displayMarketName,
                          peggedSymbolForShare: peggedNoPrefix,
                        })
                      }
                      isGenesisPreviewSoon={genesisPreviewSoon}
                      isGenesisClaimOnlyConfig={genesisClaimOnlyCfg}
                      expandedContent={
                        <GenesisMarketExpandedView
                          marketId={id}
                          market={mkt}
                          genesisAddress={genesisAddress}
                          totalDeposits={totalDeposits}
                          totalDepositsUSD={totalDepositsUSD}
                          userDeposit={userDeposit}
                          isConnected={isConnected}
                          address={address}
                          endDate={endDate}
                          collateralSymbol={collateralSymbol}
                          collateralPriceUSD={collateralPriceUSD}
                          peggedSymbol={rowPeggedSymbol}
                          leveragedSymbol={rowLeveragedSymbol}
                          underlyingAPR={underlyingAPR}
                        />
                      }
                    />
                  );
                }

                // Show all markets (no skipping)
                // One wrapper per market so parent `space-y-2` does not insert a gap between the
                // table row and expanded panel (that gap showed the dark page bg as a “black line”).
                return (
                  <div key={id} className="overflow-visible">
                    <div
                      className={`py-2.5 px-2 overflow-x-auto overflow-y-visible transition cursor-pointer ${
                        genesisGreyRow ? "opacity-90 saturate-[0.78]" : ""
                      } ${
                        isExpanded ? "rounded-t-lg" : "rounded-lg"
                      } ${
                        isExpanded
                          ? "bg-[rgb(var(--surface-selected-rgb))]"
                          : "bg-white hover:bg-[rgb(var(--surface-selected-rgb))]"
                      }`}
                      onClick={() =>
                        setExpandedMarkets((prev) =>
                          prev.includes(id)
                            ? prev.filter((x) => x !== id)
                            : [...prev, id]
                        )
                      }
                    >
                      {/* Mobile Card Layout (< md) */}
                      <div className="md:hidden space-y-1.5">
                        <div className="flex items-center justify-between gap-2 pl-1">
                          <div className="flex items-center justify-start gap-1.5 flex-1 min-w-0 flex-wrap">
                            <span className="text-[#1E4775] font-medium text-sm">
                              {displayMarketName}
                            </span>
                            <GenesisMarketTokenStrip
                              variant="mobile"
                              underlyingSymbol={underlyingSymbol}
                              rowPeggedSymbol={rowPeggedSymbol}
                              rowLeveragedSymbol={rowLeveragedSymbol}
                            />
                            {isExpanded ? (
                              <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0 ml-1" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0 ml-1" />
                            )}
                          </div>
                          {/* Combined APR for mobile - next to market title */}
                          <GenesisAprMarksColumn
                            layout="mobile"
                            isLoadingMarks={isLoadingMarks}
                            input={{
                              collateralSymbol,
                              wstETHAPR,
                              fxSAVEAPR,
                              isLoadingWstETHAPR,
                              isLoadingFxSAVEAPR,
                              marks,
                              endDate,
                              userDepositUSD,
                              genesisAddress,
                              mounted,
                              safeTotalGenesisTVL,
                              safeIsLoadingTotalTVL,
                              totalDepositsUSD,
                              safeTotalMaidenVoyageMarks,
                              fdv,
                            }}
                          />
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0"
                          >
                            <GenesisMarketRowClaimActions
                              variant="compact"
                              isEnded={isEnded}
                              showMaintenanceTag={showMaintenanceTag}
                              hasClaimable={hasClaimable}
                              genesisAddress={genesisAddress}
                              walletAddress={address}
                              isClaimingThisMarket={claimingMarket === id}
                              manageDisabled={genesisDepositWithdrawBlocked}
                              onClaim={() =>
                                claimMarket({
                                  marketId: id,
                                  genesisAddress,
                                  displayMarketName,
                                  peggedSymbolForShare: peggedNoPrefix,
                                })
                              }
                              onManage={() =>
                                void openManageModal(id, mkt as GenesisMarketConfig)
                              }
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isEnded && (
                            <div className="hidden md:block">
                              <div className="text-[#1E4775]/70 text-[10px]">
                                Deposit Assets
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Image
                                  src={getLogoPath(collateralSymbol)}
                                  alt={collateralSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 rounded-full"
                                />
                                <div className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap ${isCollateralOnlyRow ? "bg-[#1E4775]/10 text-[#1E4775]" : "bg-blue-100 text-blue-700"}`}>
                                  {!isCollateralOnlyRow && <ArrowPathIcon className="w-2.5 h-2.5" />}
                                  <span>{isCollateralOnlyRow ? "Collateral" : "Any Token"}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="flex-1 flex items-center justify-between text-xs">
                            {isEnded ? (
                              <>
                                <div>
                                  <div className="text-[#1E4775]/70">
                                    Anchor
                                  </div>
                                  <SimpleTooltip
                                    label={
                                      claimablePegged > 0n &&
                                      anchorTokenPriceUSD > 0
                                        ? formatUSD(
                                            Number(
                                              formatEther(claimablePegged)
                                            ) * anchorTokenPriceUSD
                                          )
                                        : claimablePegged > 0n
                                        ? `${formatToken(claimablePegged)} ${
                                            rowPeggedSymbol || "tokens"
                                          }`
                                        : ""
                                    }
                                  >
                                    <div className="text-[#1E4775] font-semibold cursor-help">
                                      {claimablePegged > 0n
                                        ? formatToken(claimablePegged)
                                        : "-"}
                                    </div>
                                  </SimpleTooltip>
                                </div>
                                <div>
                                  <div className="text-[#1E4775]/70">Sail</div>
                                  <SimpleTooltip
                                    label={
                                      claimableLeveraged > 0n &&
                                      sailTokenPriceUSD > 0
                                        ? formatUSD(
                                            Number(
                                              formatEther(claimableLeveraged)
                                            ) * sailTokenPriceUSD
                                          )
                                        : claimableLeveraged > 0n
                                        ? `${formatToken(claimableLeveraged)} ${
                                            rowLeveragedSymbol || "tokens"
                                          }`
                                        : ""
                                    }
                                  >
                                    <div className="text-[#1E4775] font-semibold cursor-help">
                                      {claimableLeveraged > 0n
                                        ? formatToken(claimableLeveraged)
                                        : "-"}
                                    </div>
                                  </SimpleTooltip>
                                </div>
                                <div>
                                  <div className="text-[#1E4775]/70 flex items-center justify-center gap-1">
                                    <Image
                                      src={getLogoPath(collateralSymbol)}
                                      alt={collateralSymbol}
                                      width={14}
                                      height={14}
                                      className="flex-shrink-0 rounded-full"
                                    />
                                    <span>Your Deposit</span>
                                  </div>
                                  <GenesisYourDepositAmountText
                                    userDeposit={userDeposit}
                                    collateralPriceUSD={collateralPriceUSD}
                                    collateralSymbol={collateralSymbol}
                                    userDepositUSD={userDepositUSD}
                                    className="text-[#1E4775] font-semibold"
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <div className="text-[#1E4775]/70">Total</div>
                                  <div className="text-[#1E4775] font-semibold">
                                    {totalDeposits && totalDeposits > 0n
                                      ? collateralPriceUSD > 0
                                        ? formatUSD(totalDepositsUSD)
                                        : `${formatToken(
                                            totalDeposits
                                          )} ${collateralSymbol}`
                                      : "$0"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[#1E4775]/70 flex items-center justify-center gap-1">
                                    <Image
                                      src={getLogoPath(collateralSymbol)}
                                      alt={collateralSymbol}
                                      width={14}
                                      height={14}
                                      className="flex-shrink-0 rounded-full"
                                    />
                                    <span>Your Deposit</span>
                                  </div>
                                  <GenesisYourDepositAmountText
                                    userDeposit={userDeposit}
                                    collateralPriceUSD={collateralPriceUSD}
                                    collateralSymbol={collateralSymbol}
                                    userDepositUSD={userDepositUSD}
                                    className="text-[#1E4775] font-semibold"
                                  />
                                </div>
                                <div>
                                  <div className="text-[#1E4775]/70">
                                    Status
                                  </div>
                                  <div>
                                    {showTestMarketTag ? (
                                      <SimpleTooltip
                                        label={GENESIS_MARKET_TEST_TAG_TOOLTIP}
                                        side="top"
                                      >
                                        <span
                                          className={GENESIS_MARKET_TEST_TAG_CLASS}
                                        >
                                          TEST
                                        </span>
                                      </SimpleTooltip>
                                    ) : isProcessing ? (
                                      <span className="text-[10px] uppercase px-2 py-1 bg-yellow-100 text-yellow-800 whitespace-nowrap">
                                        {statusText}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] uppercase px-2 py-1 bg-[#1E4775]/10 text-[#1E4775] whitespace-nowrap">
                                        {statusText}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Medium Screen Layout (md to lg) */}
                      <div
                        className={`${GENESIS_ACTIVE_MD_ROW_GRID_BASE} ${
                          isEnded
                            ? GENESIS_ACTIVE_MD_ROW_COLS_ENDED
                            : GENESIS_ACTIVE_MD_ROW_COLS_OPEN
                        }`}
                      >
                        <GenesisMarketChainCell
                          chainName={(mkt as GenesisMarketConfig).chain?.name || "Ethereum"}
                          chainLogo={(mkt as GenesisMarketConfig).chain?.logo || "icons/eth.png"}
                          size={18}
                        />
                        {/* Market Title */}
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span className="text-[#1E4775] font-medium text-sm">
                            {displayMarketName}
                          </span>
                          {isExpanded ? (
                            <ChevronUpIcon className="w-4 h-4 text-[#1E4775] flex-shrink-0" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4 text-[#1E4775] flex-shrink-0" />
                          )}
                        </div>

                        {/* Combined APR Column - Only show for active markets */}
                        {!isEnded
                          ? (
                              <GenesisAprMarksColumn
                                layout="md"
                                isLoadingMarks={isLoadingMarks}
                                input={{
                                  collateralSymbol,
                                  wstETHAPR,
                                  fxSAVEAPR,
                                  isLoadingWstETHAPR,
                                  isLoadingFxSAVEAPR,
                                  marks,
                                  endDate,
                                  userDepositUSD,
                                  genesisAddress,
                                  mounted,
                                  safeTotalGenesisTVL,
                                  safeIsLoadingTotalTVL,
                                  totalDepositsUSD,
                                  safeTotalMaidenVoyageMarks,
                                  fdv,
                                }}
                              />
                            )
                          : null}


                        {/* Deposit Assets (if not ended) */}
                        {!isEnded && (
                          <div className="flex items-center justify-center gap-1.5">
                            <Image
                              src={getLogoPath(collateralSymbol)}
                              alt={collateralSymbol}
                              width={20}
                              height={20}
                              className="flex-shrink-0 rounded-full"
                            />
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap ${isCollateralOnlyRow ? "bg-[#1E4775]/10 text-[#1E4775]" : "bg-blue-100 text-blue-700"}`}>
                              {!isCollateralOnlyRow && <ArrowPathIcon className="w-2.5 h-2.5" />}
                              <span>{isCollateralOnlyRow ? "Collateral" : "Any Token"}</span>
                            </div>
                          </div>
                        )}

                        {/* Stats Columns */}
                        {isEnded ? (
                          <>
                            {/* Anchor Tokens Column */}
                            <div className="text-center">
                              {claimablePegged > 0n ? (
                                <SimpleTooltip
                                  label={
                                    anchorTokenPriceUSD > 0
                                      ? formatUSD(
                                          Number(formatEther(claimablePegged)) *
                                            anchorTokenPriceUSD
                                        )
                                      : `${formatToken(claimablePegged)} ${
                                          rowPeggedSymbol || "tokens"
                                        }`
                                  }
                                >
                                  <div className="flex items-center justify-center gap-1 cursor-help">
                                    <span className="font-mono text-[#1E4775] font-semibold text-xs">
                                      {formatToken(claimablePegged)}
                                    </span>
                                    <Image
                                      src={getLogoPath(
                                        rowPeggedSymbol ||
                                          (mkt as GenesisMarketConfig).peggedToken?.symbol ||
                                          "haPB"
                                      )}
                                      alt={
                                        rowPeggedSymbol ||
                                        (mkt as GenesisMarketConfig).peggedToken?.symbol ||
                                        "haPB"
                                      }
                                      width={20}
                                      height={20}
                                      className="flex-shrink-0"
                                    />
                                  </div>
                                </SimpleTooltip>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[#1E4775] font-semibold text-xs">
                                    {rowPeggedSymbol ||
                                      (mkt as GenesisMarketConfig).peggedToken?.symbol ||
                                      "haTOKEN"}
                                  </span>
                                  <Image
                                    src={getLogoPath(
                                      rowPeggedSymbol ||
                                        (mkt as GenesisMarketConfig).peggedToken?.symbol ||
                                        "haPB"
                                    )}
                                    alt={
                                      rowPeggedSymbol ||
                                      (mkt as GenesisMarketConfig).peggedToken?.symbol ||
                                      "haPB"
                                    }
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0"
                                  />
                                </div>
                              )}
                            </div>
                            {/* Sail Tokens Column */}
                            <div className="text-center">
                              {claimableLeveraged > 0n ? (
                                <SimpleTooltip
                                  label={
                                    sailTokenPriceUSD > 0
                                      ? formatUSD(
                                          Number(
                                            formatEther(claimableLeveraged)
                                          ) * sailTokenPriceUSD
                                        )
                                      : `${formatToken(claimableLeveraged)} ${
                                          rowLeveragedSymbol || "tokens"
                                        }`
                                  }
                                >
                                  <div className="flex items-center justify-center gap-1 cursor-help">
                                    <span className="font-mono text-[#1E4775] font-semibold text-xs">
                                      {formatToken(claimableLeveraged)}
                                    </span>
                                    <Image
                                      src={getLogoPath(
                                        rowLeveragedSymbol ||
                                          (mkt as GenesisMarketConfig).leveragedToken?.symbol ||
                                          "hsPB"
                                      )}
                                      alt={
                                        rowLeveragedSymbol ||
                                        (mkt as GenesisMarketConfig).leveragedToken?.symbol ||
                                        "hsPB"
                                      }
                                      width={20}
                                      height={20}
                                      className="flex-shrink-0"
                                    />
                                  </div>
                                </SimpleTooltip>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[#1E4775] font-semibold text-xs">
                                    {rowLeveragedSymbol ||
                                      (mkt as GenesisMarketConfig).leveragedToken?.symbol ||
                                      "hsTOKEN"}
                                  </span>
                                  <Image
                                    src={getLogoPath(
                                      rowLeveragedSymbol ||
                                        (mkt as GenesisMarketConfig).leveragedToken?.symbol ||
                                        "hsPB"
                                    )}
                                    alt={
                                      rowLeveragedSymbol ||
                                      (mkt as GenesisMarketConfig).leveragedToken?.symbol ||
                                      "hsPB"
                                    }
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <div className="text-[#1E4775] font-semibold">
                                {userDeposit && userDeposit > 0n
                                  ? collateralPriceUSD > 0
                                    ? formatUSD(userDepositUSD)
                                    : `${formatToken(
                                        userDeposit
                                      )} ${collateralSymbol}`
                                  : "$0"}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-center">
                              <div className="text-[#1E4775] font-semibold">
                                {totalDeposits && totalDeposits > 0n
                                  ? collateralPriceUSD > 0
                                    ? formatUSD(totalDepositsUSD)
                                    : `${formatToken(
                                        totalDeposits
                                      )} ${collateralSymbol}`
                                  : "$0"}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-[#1E4775] font-semibold">
                                {userDeposit && userDeposit > 0n
                                  ? collateralPriceUSD > 0
                                    ? formatUSD(userDepositUSD)
                                    : `${formatToken(
                                        userDeposit
                                      )} ${collateralSymbol}`
                                  : "$0"}
                              </div>
                            </div>
                            <div className="text-center">
                              <div>
                                {showTestMarketTag ? (
                                  <SimpleTooltip
                                    label={GENESIS_MARKET_TEST_TAG_TOOLTIP}
                                    side="top"
                                  >
                                    <span
                                      className={GENESIS_MARKET_TEST_TAG_CLASS}
                                    >
                                      TEST
                                    </span>
                                  </SimpleTooltip>
                                ) : isProcessing ? (
                                  <span className="text-[10px] uppercase px-2 py-1 bg-yellow-100 text-yellow-800 whitespace-nowrap">
                                    {statusText}
                                  </span>
                                ) : (
                                  <span className="text-[10px] uppercase px-2 py-1 bg-[#1E4775]/10 text-[#1E4775] whitespace-nowrap">
                                    {statusText}
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Action Button */}
                        <div className="text-center">
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0"
                          >
                            <GenesisMarketRowClaimActions
                              variant="compact"
                              isEnded={isEnded}
                              showMaintenanceTag={showMaintenanceTag}
                              hasClaimable={hasClaimable}
                              genesisAddress={genesisAddress}
                              walletAddress={address}
                              isClaimingThisMarket={claimingMarket === id}
                              manageDisabled={genesisDepositWithdrawBlocked}
                              onClaim={() =>
                                claimMarket({
                                  marketId: id,
                                  genesisAddress,
                                  displayMarketName,
                                  peggedSymbolForShare: peggedNoPrefix,
                                })
                              }
                              onManage={() =>
                                void openManageModal(id, mkt as GenesisMarketConfig)
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Desktop Table Layout */}
                      <div
                        className={`${GENESIS_ACTIVE_LG_ROW_GRID_BASE} ${
                          isEnded
                            ? GENESIS_ACTIVE_LG_ROW_COLS_ENDED
                            : GENESIS_ACTIVE_LG_ROW_COLS_OPEN
                        }`}
                      >
                        <GenesisMarketChainCell
                          chainName={(mkt as GenesisMarketConfig).chain?.name || "Ethereum"}
                          chainLogo={(mkt as GenesisMarketConfig).chain?.logo || "icons/eth.png"}
                          size={20}
                        />
                        <div className="min-w-0 overflow-hidden">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="text-[#1E4775] font-medium text-sm lg:text-base">
                              {displayMarketName}
                            </span>
                            <span className="text-[#1E4775]/60 hidden xl:inline">
                              :
                            </span>
                            <div className="flex items-center gap-0.5 hidden xl:flex">
                              <SimpleTooltip label={underlyingSymbol}>
                                <Image
                                  src={getLogoPath(underlyingSymbol)}
                                  alt={underlyingSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                              <span className="text-[#1E4775]/60 text-xs">
                                =
                              </span>
                              <SimpleTooltip label={rowPeggedSymbol}>
                                <Image
                                  src={getLogoPath(rowPeggedSymbol)}
                                  alt={rowPeggedSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                              <span className="text-[#1E4775]/60 text-xs">
                                +
                              </span>
                              <SimpleTooltip label={rowLeveragedSymbol}>
                                <Image
                                  src={getLogoPath(rowLeveragedSymbol)}
                                  alt={rowLeveragedSymbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                            </div>
                            {isExpanded ? (
                              <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0 ml-1" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0 ml-1" />
                            )}
                          </div>
                        </div>
                        {/* Combined APR Column - Only show for active markets */}
                        {!isEnded
                          ? (
                              <GenesisAprMarksColumn
                                layout="lg"
                                isLoadingMarks={isLoadingMarks}
                                input={{
                                  collateralSymbol,
                                  wstETHAPR,
                                  fxSAVEAPR,
                                  isLoadingWstETHAPR,
                                  isLoadingFxSAVEAPR,
                                  marks,
                                  endDate,
                                  userDepositUSD,
                                  genesisAddress,
                                  mounted,
                                  safeTotalGenesisTVL,
                                  safeIsLoadingTotalTVL,
                                  totalDepositsUSD,
                                  safeTotalMaidenVoyageMarks,
                                  fdv,
                                }}
                              />
                            )
                          : null}

                        {!isEnded ? (
                          <div
                            className="flex items-center justify-center gap-1.5 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SimpleTooltip
                              label={
                                <div>
                                  <div className="font-semibold mb-1">
                                    {collateralSymbol}
                                  </div>
                                  <div className="text-xs opacity-90">
                                    Wrapped collateral token
                                  </div>
                                </div>
                              }
                            >
                              <Image
                                src={getLogoPath(collateralSymbol)}
                                alt={collateralSymbol}
                                width={20}
                                height={20}
                                className="flex-shrink-0 cursor-help rounded-full"
                              />
                            </SimpleTooltip>
                            <SimpleTooltip
                              label={
                                isCollateralOnlyRow ? (
                                  <div>
                                    <div className="font-semibold mb-1">
                                      {isMegaEthRow ? "Collateral only (MegaETH)" : "Collateral only"}
                                    </div>
                                    <div className="text-xs opacity-90">
                                      Deposit accepted collateral assets only.
                                      No token swap on this chain.
                                    </div>
                                  </div>
                                ) : (
                                <div>
                                  <div className="font-semibold mb-1">
                                    Any Token Supported
                                  </div>
                                  <div className="text-xs opacity-90 mb-2">
                                    Zapper-supported assets are zapped in with
                                    no slippage. Any other ERC20s are swapped
                                    with Velora.
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] opacity-75">
                                      Zapper-supported:
                                    </span>
                                    {isWstETHCollateralMarket ? (
                                      <>
                                        <div className="flex items-center gap-1">
                                          <Image
                                            src={getLogoPath("ETH")}
                                            alt="ETH"
                                            width={16}
                                            height={16}
                                            className="rounded-full"
                                          />
                                          <span className="text-[10px]">
                                            ETH
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Image
                                            src={getLogoPath("stETH")}
                                            alt="stETH"
                                            width={16}
                                            height={16}
                                            className="rounded-full"
                                          />
                                          <span className="text-[10px]">
                                            stETH
                                          </span>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-1">
                                          <Image
                                            src={getLogoPath("USDC")}
                                            alt="USDC"
                                            width={16}
                                            height={16}
                                            className="rounded-full"
                                          />
                                          <span className="text-[10px]">
                                            USDC
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Image
                                            src={getLogoPath("fxUSD")}
                                            alt="fxUSD"
                                            width={16}
                                            height={16}
                                            className="rounded-full"
                                          />
                                          <span className="text-[10px]">
                                            fxUSD
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                                )
                              }
                            >
                              <div className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide cursor-help whitespace-nowrap ${isCollateralOnlyRow ? "bg-[#1E4775]/10 text-[#1E4775]" : "bg-blue-100 text-blue-700"}`}>
                                {!isCollateralOnlyRow && <ArrowPathIcon className="w-3 h-3" />}
                                <span>{isCollateralOnlyRow ? "Collateral" : "Any Token"}</span>
                              </div>
                            </SimpleTooltip>
                          </div>
                        ) : null}
                        {isEnded ? (
                          <>
                            {/* Anchor Tokens Column */}
                            <div className="min-w-0 flex items-center justify-center">
                              {claimablePegged > 0n ? (
                                <SimpleTooltip
                                  label={
                                    anchorTokenPriceUSD > 0
                                      ? formatUSD(
                                          Number(formatEther(claimablePegged)) *
                                            anchorTokenPriceUSD
                                        )
                                      : `${formatToken(claimablePegged)} ${
                                          rowPeggedSymbol || "tokens"
                                        }`
                                  }
                                >
                                  <div className="flex items-center justify-center gap-1 cursor-help">
                                    <span className="font-mono text-[#1E4775] font-semibold text-xs">
                                      {formatToken(claimablePegged)}
                                    </span>
                                    <Image
                                      src={getLogoPath(
                                        rowPeggedSymbol ||
                                          (mkt as GenesisMarketConfig).peggedToken?.symbol ||
                                          "haPB"
                                      )}
                                      alt={
                                        rowPeggedSymbol ||
                                        (mkt as GenesisMarketConfig).peggedToken?.symbol ||
                                        "haPB"
                                      }
                                      width={20}
                                      height={20}
                                      className="flex-shrink-0"
                                    />
                                  </div>
                                </SimpleTooltip>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[#1E4775] font-semibold text-xs">
                                    {rowPeggedSymbol ||
                                      (mkt as GenesisMarketConfig).peggedToken?.symbol ||
                                      "haTOKEN"}
                                  </span>
                                  <Image
                                    src={getLogoPath(
                                      rowPeggedSymbol ||
                                        (mkt as GenesisMarketConfig).peggedToken?.symbol ||
                                        "haPB"
                                    )}
                                    alt={
                                      rowPeggedSymbol ||
                                      (mkt as GenesisMarketConfig).peggedToken?.symbol ||
                                      "haPB"
                                    }
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0"
                                  />
                                </div>
                              )}
                            </div>
                            {/* Sail Tokens Column */}
                            <div className="min-w-0 flex items-center justify-center">
                              {claimableLeveraged > 0n ? (
                                <SimpleTooltip
                                  label={
                                    sailTokenPriceUSD > 0
                                      ? formatUSD(
                                          Number(
                                            formatEther(claimableLeveraged)
                                          ) * sailTokenPriceUSD
                                        )
                                      : `${formatToken(claimableLeveraged)} ${
                                          rowLeveragedSymbol || "tokens"
                                        }`
                                  }
                                >
                                  <div className="flex items-center justify-center gap-1 cursor-help">
                                    <span className="font-mono text-[#1E4775] font-semibold text-xs">
                                      {formatToken(claimableLeveraged)}
                                    </span>
                                    <Image
                                      src={getLogoPath(
                                        rowLeveragedSymbol ||
                                          (mkt as GenesisMarketConfig).leveragedToken?.symbol ||
                                          "hsPB"
                                      )}
                                      alt={
                                        rowLeveragedSymbol ||
                                        (mkt as GenesisMarketConfig).leveragedToken?.symbol ||
                                        "hsPB"
                                      }
                                      width={20}
                                      height={20}
                                      className="flex-shrink-0"
                                    />
                                  </div>
                                </SimpleTooltip>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[#1E4775] font-semibold text-xs">
                                    {rowLeveragedSymbol ||
                                      (mkt as GenesisMarketConfig).leveragedToken?.symbol ||
                                      "hsTOKEN"}
                                  </span>
                                  <Image
                                    src={getLogoPath(
                                      rowLeveragedSymbol ||
                                        (mkt as GenesisMarketConfig).leveragedToken?.symbol ||
                                        "hsPB"
                                    )}
                                    alt={
                                      rowLeveragedSymbol ||
                                      (mkt as GenesisMarketConfig).leveragedToken?.symbol ||
                                      "hsPB"
                                    }
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0"
                                  />
                                </div>
                              )}
                            </div>
                            {/* Your Deposit Column for completed markets */}
                            <div className="min-w-0 flex items-center justify-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <SimpleTooltip
                                  label={
                                    userDeposit && userDeposit > 0n
                                      ? priceError
                                        ? `${formatToken(
                                            userDeposit
                                          )} ${collateralSymbol}\n\nPrice Error: ${priceError}`
                                        : `${formatToken(
                                            userDeposit
                                          )} ${collateralSymbol}`
                                      : priceError
                                      ? `No deposit\n\nPrice Error: ${priceError}`
                                      : "No deposit"
                                  }
                                >
                                  <div className="font-mono text-[#1E4775] font-semibold cursor-help text-xs">
                                    {userDeposit && userDeposit > 0n ? (
                                      collateralPriceUSD > 0
                                        ? formatUSD(userDepositUSD)
                                        : priceError
                                        ? "$0"
                                        : `${formatToken(
                                            userDeposit
                                          )} ${collateralSymbol}`
                                    ) : collateralPriceUSD > 0 ? (
                                      "$0"
                                    ) : (
                                      "0"
                                    )}
                                  </div>
                                </SimpleTooltip>
                                <SimpleTooltip label={collateralSymbol}>
                                  <Image
                                    src={getLogoPath(collateralSymbol)}
                                    alt={collateralSymbol}
                                    width={20}
                                    height={20}
                                    className="flex-shrink-0 cursor-help rounded-full"
                                  />
                                </SimpleTooltip>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center min-w-0 flex items-center justify-center gap-1.5">
                            <SimpleTooltip
                              label={
                                totalDeposits && totalDeposits > 0n
                                  ? priceError
                                    ? `${formatToken(
                                        totalDeposits
                                      )} ${collateralSymbol}\n\nPrice Error: ${priceError}`
                                    : `${formatToken(
                                        totalDeposits
                                      )} ${collateralSymbol}`
                                  : priceError
                                  ? `No deposits\n\nPrice Error: ${priceError}`
                                  : "No deposits"
                              }
                            >
                              <div className="font-mono text-[#1E4775] font-semibold cursor-help text-xs">
                                {totalDeposits && totalDeposits > 0n ? (
                                  collateralPriceUSD > 0
                                    ? formatUSD(totalDepositsUSD)
                                    : priceError
                                    ? "$0"
                                    : `${formatToken(
                                        totalDeposits
                                      )} ${collateralSymbol}`
                                ) : collateralPriceUSD > 0 ? (
                                  "$0"
                                ) : (
                                  "0"
                                )}
                              </div>
                            </SimpleTooltip>
                            <SimpleTooltip label={collateralSymbol}>
                              <Image
                                src={getLogoPath(collateralSymbol)}
                                alt={collateralSymbol}
                                width={20}
                                height={20}
                                className="flex-shrink-0 cursor-help rounded-full"
                              />
                            </SimpleTooltip>
                          </div>
                        )}
                        {!isEnded && (
                          <div className="text-center min-w-0 flex items-center justify-center gap-1.5">
                            <SimpleTooltip
                              label={
                                userDeposit && userDeposit > 0n
                                  ? priceError
                                    ? `${formatToken(
                                        userDeposit
                                      )} ${collateralSymbol}\n\nPrice Error: ${priceError}`
                                    : `${formatToken(
                                        userDeposit
                                      )} ${collateralSymbol}`
                                  : priceError
                                  ? `No deposit\n\nPrice Error: ${priceError}`
                                  : "No deposit"
                              }
                            >
                              <div className="font-mono text-[#1E4775] font-semibold cursor-help text-xs">
                                {userDeposit && userDeposit > 0n ? (
                                  collateralPriceUSD > 0
                                    ? formatUSD(userDepositUSD)
                                    : priceError
                                    ? "$0"
                                    : `${formatToken(
                                        userDeposit
                                      )} ${collateralSymbol}`
                                ) : collateralPriceUSD > 0 ? (
                                  "$0"
                                ) : (
                                  "0"
                                )}
                              </div>
                            </SimpleTooltip>
                            <SimpleTooltip label={collateralSymbol}>
                              <Image
                                src={getLogoPath(collateralSymbol)}
                                alt={collateralSymbol}
                                width={20}
                                height={20}
                                className="flex-shrink-0 cursor-help rounded-full"
                              />
                            </SimpleTooltip>
                          </div>
                        )}
                        {!isEnded && (
                          <div className="text-center min-w-0">
                            {showTestMarketTag ? (
                              <SimpleTooltip
                                label={GENESIS_MARKET_TEST_TAG_TOOLTIP}
                                side="top"
                              >
                                <span
                                  className={GENESIS_MARKET_TEST_TAG_CLASS}
                                >
                                  TEST
                                </span>
                              </SimpleTooltip>
                            ) : isProcessing ? (
                              <SimpleTooltip
                                label={
                                  <div className="text-left max-w-xs">
                                    <div className="font-semibold mb-1">
                                      Processing Genesis
                                    </div>
                                    <div className="text-xs space-y-1">
                                      <p>
                                        The Harbor team will transfer collateral
                                        and make anchor + sail tokens claimable
                                        imminently.
                                      </p>
                                      <p className="mt-2">
                                        <strong>Deposits:</strong> Still
                                        possible until claiming opens. Complete
                                        your deposit before the processing ends.
                                      </p>
                                      <p>
                                        <strong>Marks:</strong> Still being
                                        earned during processing. Bonus marks
                                        will be applied at the end of
                                        processing.
                                      </p>
                                    </div>
                                  </div>
                                }
                              >
                                <span className="text-[10px] uppercase px-2 py-1 bg-yellow-100 text-yellow-800 cursor-help flex items-center gap-1 justify-center whitespace-nowrap">
                                  <ClockIcon className="w-3 h-3" />
                                  {statusText}
                                </span>
                              </SimpleTooltip>
                            ) : (
                              <span className="text-[10px] uppercase px-2 py-1 bg-[#1E4775]/10 text-[#1E4775] whitespace-nowrap">
                                {statusText}
                              </span>
                            )}
                          </div>
                        )}
                        <div
                          className="text-center min-w-0 flex items-center justify-center pb-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center">
                            <GenesisMarketRowClaimActions
                              variant="desktop"
                              isEnded={isEnded}
                              showMaintenanceTag={showMaintenanceTag}
                              hasClaimable={hasClaimable}
                              showNoTokensPlaceholder={isEnded}
                              genesisAddress={genesisAddress}
                              walletAddress={address}
                              isClaimingThisMarket={claimingMarket === id}
                              manageDisabled={!genesisAddress || genesisDepositWithdrawBlocked}
                              onClaim={() =>
                                claimMarket({
                                  marketId: id,
                                  genesisAddress,
                                  displayMarketName,
                                  peggedSymbolForShare: peggedNoPrefix,
                                })
                              }
                              onManage={() =>
                                void openManageModal(id, mkt as GenesisMarketConfig)
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Maiden voyage USD deposit cap – shared across depositors */}
                      {!isEnded && !isProcessing && !genesisPreviewSoon && (() => {
                          const mv = maidenVoyageCampaignResults?.find(
                            (row: {
                              genesisAddress?: string;
                              data?: {
                                cap?: {
                                  capUSD?: string;
                                  cumulativeDepositsUSD?: string;
                                  capFilled?: boolean;
                                } | null;
                              } | null;
                            }) =>
                              row.genesisAddress?.toLowerCase() ===
                              genesisAddress?.toLowerCase()
                          );
                          const capRow = mv?.data?.cap as
                            | {
                                capUSD?: string;
                                cumulativeDepositsUSD?: string;
                                capFilled?: boolean;
                              }
                            | null
                            | undefined;
                          const marksForMarket = marksResults?.find(
                            (m: {
                              genesisAddress?: string;
                              data?: { userHarborMarks?: unknown };
                            }) =>
                              m.genesisAddress?.toLowerCase() ===
                              genesisAddress?.toLowerCase()
                          );
                          const userMarksData =
                            marksForMarket?.data?.userHarborMarks;
                          const um = Array.isArray(userMarksData)
                            ? userMarksData[0]
                            : userMarksData;
                          const ownership = parseFloat(
                            um?.finalMaidenVoyageOwnershipShare || "0"
                          );
                          const counted = parseFloat(
                            um?.maidenVoyageDepositCountedUSD || "0"
                          );
                          if (isLoadingMaidenVoyageIndex && !capRow) return null;

                          const capUsd = parseFloat(capRow?.capUSD || "0");
                          const cumulative = parseFloat(
                            capRow?.cumulativeDepositsUSD || "0"
                          );
                          const tokenCapAmount = resolveGenesisTokenCapAmount(
                            (mkt as GenesisMarketConfig).genesisTokenCapAmount
                          );
                          const useTokenCap = tokenCapAmount > 0;
                          const capTotal = useTokenCap ? tokenCapAmount : capUsd;
                          const capCurrent = useTokenCap
                            ? totalDepositsAmount
                            : cumulative;
                          const progressPct =
                            capTotal > 0
                              ? Math.min(
                                  100,
                                  (capCurrent / capTotal) * 100
                                )
                              : 0;
                          const yieldRevSharePct =
                            maidenVoyageYieldOwnerSharePercent(
                              genesisAddress?.toLowerCase() ?? null
                            );

                          return (
                            <div className="px-2 pt-2.5 pb-0.5 border-t border-[#1E4775]/10 -mb-1 mt-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <SimpleTooltip
                                  label={
                                    <span className="text-xs leading-relaxed block max-w-xs">
                                      Deposits count toward this market&apos;s USD
                                      cap. At genesis close, your counted deposit
                                      ÷ cap fixes your{" "}
                                      <strong>ownership share</strong> of this
                                      market&apos;s maiden voyage yield pool.
                                      Voyage boost is separate and only adjusts
                                      weight after genesis. Only a configured
                                      share of fee + carry revenue is credited to
                                      the maiden pool (see expanded row).
                                    </span>
                                  }
                                >
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-[#1E4775] font-semibold whitespace-nowrap cursor-help">
                                    {useTokenCap
                                      ? "Deposit cap (wstETH)"
                                      : "Deposit cap (USD)"}
                                    <InformationCircleIcon className="w-3.5 h-3.5 shrink-0 text-[#1E4775]/55" />
                                  </span>
                                </SimpleTooltip>
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-[100px]">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${
                                      (useTokenCap && capCurrent >= capTotal) ||
                                      (!useTokenCap && capRow?.capFilled)
                                        ? "bg-gray-400"
                                        : "bg-[#FF8A7A]"
                                    }`}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-[#1E4775]/70 whitespace-nowrap">
                                  {useTokenCap
                                    ? `${formatToken(totalDeposits || 0n)} ${collateralSymbol} / ${tokenCapAmount.toFixed(
                                        0
                                      )} ${collateralSymbol}`
                                    : `${formatUSD(cumulative)} / ${formatUSD(
                                        capUsd
                                      )}`}
                                </span>
                              </div>
                              {capTotal > 0 && (
                                <p className="text-[10px] text-[#1E4775]/80 leading-snug mb-0.5">
                                  {(useTokenCap && capCurrent >= capTotal) ||
                                  (!useTokenCap && capRow?.capFilled) ? (
                                    <>
                                      <span className="font-semibold text-[#1E4775]">
                                        0%
                                      </span>{" "}
                                      of capped maiden-yield{" "}
                                      <span className="font-semibold">
                                        ownership
                                      </span>{" "}
                                      remains — cap is full for this market.
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-semibold text-[#1E4775]">
                                        {(100 - progressPct).toFixed(0)}%
                                      </span>{" "}
                                      of this market&apos;s capped maiden-yield{" "}
                                      <span className="font-semibold">
                                        ownership
                                      </span>{" "}
                                      is still open (headroom for new deposits).
                                      {yieldRevSharePct != null ? (
                                        <>
                                          {" "}
                                          {yieldRevSharePct}% of attributed
                                          mint/redeem fee + collateral carry revenue
                                          is credited to this pool; that slice is
                                          split among owners.
                                        </>
                                      ) : (
                                        <>
                                          {" "}
                                          A configured share of attributed
                                          mint/redeem fee + collateral carry revenue
                                          is credited to this pool; that slice is
                                          split among owners.
                                        </>
                                      )}{" "}
                                      Not an APR guarantee.
                                    </>
                                  )}
                                </p>
                              )}
                              {(ownership > 0 ||
                                (counted > 0 && ownership === 0)) && (
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#1E4775]/80">
                                  {ownership > 0 && (
                                    <span>
                                      Your ownership (at end):{" "}
                                      <span className="font-semibold text-[#1E4775]">
                                        {(ownership * 100).toFixed(2)}%
                                      </span>
                                    </span>
                                  )}
                                  {counted > 0 && ownership === 0 && (
                                    <span>
                                      Counted toward cap: {formatUSD(counted)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                    </div>

                    {/* Expanded View */}
                    {isExpanded && (
                      <div className="overflow-hidden rounded-b-lg border-t border-[#1E4775]/12 bg-white px-5 py-4">
                        <GenesisMarketExpandedView
                          marketId={id}
                          market={mkt}
                          genesisAddress={genesisAddress}
                          totalDeposits={totalDeposits}
                          totalDepositsUSD={totalDepositsUSD}
                          userDeposit={userDeposit}
                          isConnected={isConnected}
                          address={address}
                          endDate={endDate}
                          collateralSymbol={collateralSymbol}
                          collateralPriceUSD={collateralPriceUSD}
                          peggedSymbol={rowPeggedSymbol}
                          leveragedSymbol={rowLeveragedSymbol}
                          underlyingAPR={underlyingAPR}
                        />
                      </div>
                    )}
                  </div>
                );
              });

              return (
                <>
                  {!genesisViewBasic ? activeSectionHeader : null}
                  {marketRows}
                </>
              );

}
