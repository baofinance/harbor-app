"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  useChainId,
  useWriteContract,
  usePublicClient,
  useSwitchChain,
} from "wagmi";
import { useHarborAccount } from "@/hooks/useHarborAccount";
import { HARBOR_FROSTED_LIGHT_CARD_ROUNDED, HARBOR_FROSTED_MODAL_SHELL } from "@/components/shared/harborFrostedSurfaceStyles";
import { formatEther, parseEther } from "viem";
import {
  isAnchorSoonUi,
  isMarketArchived,
  isMarketInMaintenance,
  markets as marketsConfig,
  type DefinedMarket,
} from "@/config/markets";
import { HarborPageShell } from "@/components/shared/HarborPageShell";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import { MarketMaintenanceTag } from "@/components/MarketMaintenanceTag";
import { POLLING_INTERVALS } from "@/config/polling";
import {
  formatUSD,
  formatToken,
  formatDateTime,
  formatTimeRemaining,
} from "@/utils/formatters";
import {
  EtherscanLink as SharedEtherscanLink,
  TokenLogo,
  getLogoPath,
} from "@/components/shared";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon,
  GiftIcon,
  CheckCircleIcon,
  XMarkIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { AnchorDepositWithdrawModal } from "@/components/AnchorDepositWithdrawModal";
import { AnchorClaimAllModal } from "@/components/AnchorClaimAllModal";
import {
  CompoundTargetTokenModal,
  CompoundTargetMode,
  CompoundSelectedPosition,
  CompoundTargetOption,
  CompoundTargetPoolApr,
} from "@/components/CompoundTargetTokenModal";
import {
  TransactionProgressModal,
  TransactionStep,
} from "@/components/TransactionProgressModal";
import {
  CompoundConfirmationModal,
  FeeInfo,
} from "@/components/CompoundConfirmationModal";
import {
  CompoundPoolSelectionModal,
  PoolOption,
} from "@/components/CompoundPoolSelectionModal";
import { AnchorClaimMarketModal } from "@/components/AnchorClaimMarketModal";
import SimpleTooltip from "@/components/SimpleTooltip";
import InfoTooltip from "@/components/InfoTooltip";
import { rewardsABI } from "@/abis/rewards";
import {
  STABILITY_POOL_ABI,
  ERC20_ABI,
  MINTER_ABI,
  MINTER_ABI_EXTENDED,
  STABILITY_POOL_MANAGER_ABI,
  WRAPPED_PRICE_ORACLE_ABI,
} from "@/abis/shared";
import Image from "next/image";
import {
  formatRatio,
  formatAPR,
  formatCompactUSD,
  calculateVolatilityProtection,
  getAcceptedDepositAssets,
} from "@/utils/anchor";
import { useAnchorPageData } from "@/hooks/anchor/useAnchorPageData";
import { useAnchorClaimCompound } from "@/hooks/anchor/useAnchorClaimCompound";
import { RewardTokensDisplay } from "@/components/anchor/RewardTokensDisplay";
import { AnchorMarketGroupCollapsedRow } from "@/components/anchor/AnchorMarketGroupCollapsedRow";
import { AnchorMarketsSections } from "@/components/anchor/AnchorMarketsSections";
import { AnchorMarketGroupExpandedSection } from "@/components/anchor/AnchorMarketGroupExpandedSection";
import { AnchorMarketsTableHeader } from "@/components/anchor/AnchorMarketsTableHeader";
import { AnchorBasicMarketCardsGrid } from "@/components/anchor/AnchorBasicMarketCardsGrid";
import { AnchorRewardsStrip } from "@/components/anchor/AnchorRewardsStrip";
import { AnchorEarningsSection } from "@/components/anchor/AnchorEarningsSection";
import { AnchorWalletPositionsSection } from "@/components/anchor/AnchorWalletPositionsSection";
import { IndexMarksSubgraphErrorBanner } from "@/components/shared/IndexMarksSubgraphErrorBanner";
import { IndexMarketsLoadError } from "@/components/shared/IndexMarketsLoadError";
import { ArchivedMarketsListSection } from "@/components/ArchivedMarketsListSection";
import {
  AnchorVaprTooltipContent,
  type AnchorVaprPositionApr,
} from "@/components/anchor/AnchorVaprTooltipContent";
import {
  ANCHOR_MARKETS_WALLET_ROW_LG_CLASSNAME,
  ANCHOR_MARKETS_WALLET_ROW_MD_CLASSNAME,
} from "@/components/anchor/anchorMarketsTableGrid";
import { usePageLayoutPreference } from "@/contexts/PageLayoutPreferenceContext";
import {
  LEDGER_MARKS_STRIP_SURFACE_ABOVE_TOOLBAR_CLASS,
} from "@/components/shared/indexMarketsToolbarStyles";
import {
  HARBOR_BTN_GLASS_COMPACT_CORAL_CLASS,
  HARBOR_BTN_GLASS_MAX_CHIP_ROUND_CLASS,
  HARBOR_BTN_GLASS_PILL_CORAL_CLASS,
  HARBOR_BTN_GLASS_PILL_NAVY_CLASS,
  HARBOR_BTN_GLASS_PILL_OUTLINE_CLASS,
} from "@/components/shared/harborButtonStyles";
import {
  INDEX_MANAGE_BUTTON_CLASS_DESKTOP,
  INDEX_MODAL_CANCEL_BUTTON_CLASS_DESKTOP,
  INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL,
} from "@/utils/indexPageManageButton";
import { calculateReadOffset } from "@/utils/anchor/calculateReadOffset";
import { useMultipleCollateralPrices } from "@/hooks/useCollateralPrice";
import { computeGenesisWrappedCollateralPriceUSD } from "@/utils/wrappedCollateralPriceUSD";
import { DEBUG_ANCHOR } from "@/config/debug";
import { getDepositMode } from "@/utils/depositMode";
import NetworkIconCell from "@/components/NetworkIconCell";
import { useExpandedMarketIds } from "@/hooks/useExpandedMarketIds";
import { useOpenMarketManageModal } from "@/hooks/useOpenMarketManageModal";

// Flag to temporarily disable anchor marks (set to false to pause marks)
const ANCHOR_MARKS_ENABLED = true;

// Token metadata types are now in useAnchorTokenMetadata hook
import { usePoolRewardAPR } from "@/hooks/usePoolRewardAPR";
import { usePoolRewardTokens } from "@/hooks/usePoolRewardTokens";
import { WithdrawalTimer } from "@/components/WithdrawalTimer";
// Use shared ABIs from @/abis/shared
const minterABI = MINTER_ABI_EXTENDED;
const stabilityPoolABI = STABILITY_POOL_ABI;
const stabilityPoolManagerABI = STABILITY_POOL_MANAGER_ABI;
const erc20ABI = ERC20_ABI;
const wrappedPriceOracleABI = WRAPPED_PRICE_ORACLE_ABI;
const chainlinkOracleABI = WRAPPED_PRICE_ORACLE_ABI;

type AnchorManageModalPayload = {
  marketId: string;
  market: DefinedMarket;
  initialTab?:
    | "mint"
    | "deposit"
    | "withdraw"
    | "redeem"
    | "deposit-mint"
    | "withdraw-redeem";
  simpleMode?: boolean;
  bestPoolType?: "collateral" | "sail";
  allMarkets?: Array<{ marketId: string; market: DefinedMarket }>;
  initialDepositAsset?: string;
};

// Helper function to get accepted deposit assets from market config

// Component to display reward tokens for a market group
// RewardTokensDisplay component has been extracted to components/anchor/RewardTokensDisplay.tsx
// Group expanded panel: [`AnchorMarketGroupExpandedSection`](../../components/anchor/AnchorMarketGroupExpandedSection.tsx).

export default function AnchorPage() {
  const { address, isConnected } = useHarborAccount();
  const connectedChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Prices + reads: composed in useAnchorPageData (see below)
  const { expandedMarkets, toggleExpandedMarket } = useExpandedMarketIds();
  const [manageModal, setManageModal] = useState<AnchorManageModalPayload | null>(
    null
  );
  const [showArchivedAnchor, setShowArchivedAnchor] = useState(false);
  const openManageModalBase = useOpenMarketManageModal<AnchorManageModalPayload>({
    isConnected,
    connectedChainId,
    switchChain,
    setManageModal,
    logLabel: "Anchor",
  });
  const openManageModal = useCallback(
    async (payload: AnchorManageModalPayload) => {
      const depositTabs = new Set([
        "mint",
        "deposit",
        "deposit-mint",
      ] as const);
      const resolvedPayload =
        isMarketArchived(payload.market) &&
        payload.initialTab &&
        depositTabs.has(payload.initialTab as "mint" | "deposit" | "deposit-mint")
          ? { ...payload, initialTab: "withdraw" as const }
          : payload;
      await openManageModalBase(resolvedPayload);
    },
    [openManageModalBase]
  );
  const [mounted, setMounted] = useState(false);
  const [isEarningsExpanded, setIsEarningsExpanded] = useState(false);
  const [contractAddressesModal, setContractAddressesModal] = useState<{
    marketId: string;
    market: any;
    minterAddress: string;
  } | null>(null);

  // Ensure component is mounted before showing dynamic content to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  const { isBasic: anchorViewBasic } = usePageLayoutPreference();

  const {
    chainFilterSelected,
    setChainFilterSelected,
    anchorMarkets,
    displayedAnchorMarkets,
    displayedArchivedAnchorMarkets,
    anchorChainOptions,
    stagger,
    volProtectionData,
    projectedAPR,
    fxSAVEApy,
    wstETHApy,
    allPoolAddresses,
    withdrawalRequests,
    poolToRewardTokens,
    reads,
    refetchReads,
    isLoadingReads,
    isReadsError,
    readsError,
    peggedPricesFromReads,
    coinGeckoIds,
    coinGeckoPrices,
    coinGeckoLoading,
    coinGeckoError,
    peggedPriceUSDMap,
    mergedPeggedPriceMap,
    ethPrice,
    btcPrice,
    eurPrice,
    goldPrice,
    silverPrice,
    fxUSDPrice,
    fxSAVEPrice,
    usdcPrice,
    totalAnchorMarks,
    totalAnchorMarksPerDay,
    totalMarksPerDay,
    sailMarksPerDay,
    maidenVoyageMarksPerDay,
    haBalances,
    poolDeposits,
    sailBalances,
    isLoadingAnchorMarks,
    anchorMarksError,
    haLedgerBalances,
    poolLedgerDeposits,
    isLoadingLedgerMarks,
    ledgerMarksError,
    totalAnchorLedgerMarks,
    totalAnchorLedgerMarksPerDay,
    userDepositMap,
    refetchUserDeposits,
    allPoolRewards,
    poolRewardsMap,
    isLoadingAllRewards,
    isFetchingAllRewards,
    isErrorAllRewards,
    showLiveAprLoading,
    marketPositionConfigs,
    tokenPricesByMarket,
    marketPositions,
    allMarketsTotalPositionUSD,
    userHasPositions,
    refetchPositions,
    groupedMarkets,
    allMarketsData,
    anchorStats,
    claimAllPositions,
  } = useAnchorPageData(address, anchorViewBasic);
  const {
    compoundModal,
    setCompoundModal,
    compoundPoolSelection,
    setCompoundPoolSelection,
    isClaiming,
    setIsClaiming,
    isCompounding,
    setIsCompounding,
    isClaimingAll,
    isCompoundingAll,
    earlyWithdrawModal,
    setEarlyWithdrawModal,
    withdrawAmountModal,
    setWithdrawAmountModal,
    withdrawAmountInput,
    setWithdrawAmountInput,
    withdrawAmountError,
    setWithdrawAmountError,
    transactionProgress,
    setTransactionProgress,
    compoundConfirmation,
    setCompoundConfirmation,
    compoundTargetModal,
    setCompoundTargetModal,
    compoundIntent,
    setCompoundIntent,
    advancedPreflight,
    setAdvancedPreflight,
    simplePreflight,
    setSimplePreflight,
    cancelOperationRef,
    isClaimAllModalOpen,
    setIsClaimAllModalOpen,
    isDropdownOpen,
    setIsDropdownOpen,
    selectedMarketForClaim,
    setSelectedMarketForClaim,
    isClaimMarketModalOpen,
    setIsClaimMarketModalOpen,
    dropdownRef,
    handlePendingWithdraw,
    handleClaimRewards,
    handleCompoundRewards,
    createCompoundHandlers,
    handleClaimAll,
    handleCompoundAll,
    updateProgressStep,
    setCurrentStep,
    isUserRejection,
    handleCompoundConfirm,
    handleBuyTide,
    ensureAllowance,
    readErc20Balance,
    getSelectedPoolsByMarket,
    getPoolRewardTokens,
    formatTokenAmount,
    runAdvancedPreflight,
    runSimplePreflight,
    handleCompoundAllKeepPerToken,
    handleCompoundAllToSingleToken,
    handleClaimMarketBasicClaim,
    handleClaimMarketCompound,
    handleClaimMarketBuyTide,
  } = useAnchorClaimCompound({
    anchorMarkets,
    reads,
    peggedPriceUSDMap,
    allPoolRewards,
    poolRewardsMap,
    refetchReads,
    refetchUserDeposits,
  });


  // Create a map for quick lookup: marketId -> marketData
  const marketsDataMap = useMemo(() => {
    const map = new Map<string, (typeof allMarketsData)[0]>();
    allMarketsData.forEach((marketData) => {
      map.set(marketData.marketId, marketData);
    });
    return map;
  }, [allMarketsData]);

  /** Same rule as the extended rewards strip: sum `claimableValue` per stability pool from `poolRewardsMap`. */
  const anchorToolbarTotalClaimableUsd = useMemo(() => {
    let total = 0;
    for (const [, m] of anchorMarkets) {
      const collateralAddr = (m as { addresses?: { stabilityPoolCollateral?: `0x${string}` } })
        .addresses?.stabilityPoolCollateral;
      const sailAddr = (m as { addresses?: { stabilityPoolLeveraged?: `0x${string}` } }).addresses
        ?.stabilityPoolLeveraged;
      if (collateralAddr) {
        const pr = poolRewardsMap.get(collateralAddr);
        if (pr && pr.claimableValue > 0) total += pr.claimableValue;
      }
      if (sailAddr) {
        const pr = poolRewardsMap.get(sailAddr);
        if (pr && pr.claimableValue > 0) total += pr.claimableValue;
      }
    }
    return total;
  }, [anchorMarkets, poolRewardsMap]);

  const anchorToolbarYourTotalDepositUsd = useMemo(() => {
    return Object.values(marketPositions).reduce(
      (sum, pos) => sum + (pos.collateralPoolUSD || 0) + (pos.sailPoolUSD || 0),
      0
    );
  }, [marketPositions]);

  const anchorToolbarPositionAprs = useMemo(() => {
    const positionAprs: AnchorVaprPositionApr[] = [];
    for (const [marketId, market] of anchorMarkets) {
      const position = marketPositions?.[marketId];
      if (!position) continue;

      const collateralPoolAddress = (market as { addresses?: { stabilityPoolCollateral?: `0x${string}` } })
        .addresses?.stabilityPoolCollateral;
      if (collateralPoolAddress && position.collateralPoolUSD > 0) {
        const collateralApr = poolRewardsMap.get(collateralPoolAddress)?.totalRewardAPR || 0;
        if (collateralApr > 0) {
          positionAprs.push({
            poolType: "collateral",
            marketId,
            depositUSD: position.collateralPoolUSD,
            apr: collateralApr,
          });
        }
      }

      const sailPoolAddress = (market as { addresses?: { stabilityPoolLeveraged?: `0x${string}` } })
        .addresses?.stabilityPoolLeveraged;
      if (sailPoolAddress && position.sailPoolUSD > 0) {
        const sailApr = poolRewardsMap.get(sailPoolAddress)?.totalRewardAPR || 0;
        if (sailApr > 0) {
          positionAprs.push({
            poolType: "sail",
            marketId,
            depositUSD: position.sailPoolUSD,
            apr: sailApr,
          });
        }
      }
    }

    return positionAprs;
  }, [anchorMarkets, marketPositions, poolRewardsMap]);

  const anchorToolbarVapr = useMemo(() => {
    let totalWeightedApr = 0;
    let totalDepositUsd = 0;
    for (const pos of anchorToolbarPositionAprs) {
      totalWeightedApr += pos.depositUSD * pos.apr;
      totalDepositUsd += pos.depositUSD;
    }
    return totalDepositUsd > 0 ? totalWeightedApr / totalDepositUsd : 0;
  }, [anchorToolbarPositionAprs]);

  // Fetch collateral prices for all markets using the hook
  const collateralPriceOracleAddresses = useMemo(() => {
    return anchorMarkets.map(
      ([_, market]) =>
      (market as any).addresses?.collateralPrice as `0x${string}` | undefined
    );
  }, [anchorMarkets]);

  const { prices: collateralPricesMap } = useMultipleCollateralPrices(
    collateralPriceOracleAddresses,
    { refetchInterval: 60_000, enabled: stagger[4] }
  );


  return (
    <>
      <HarborPageShell>
          {!anchorViewBasic && (
            <>
              {ledgerMarksError && (
                <IndexMarksSubgraphErrorBanner error={ledgerMarksError} />
              )}

          {/* Rewards Bar - Under Title Boxes */}
          <AnchorRewardsStrip
            anchorMarkets={anchorMarkets}
            reads={reads}
            isConnected={isConnected}
            address={address}
            marketPositions={marketPositions}
            poolRewardsMap={poolRewardsMap}
            allMarketsData={allMarketsData}
            totalAnchorMarks={totalAnchorMarks}
            totalAnchorMarksPerDay={totalAnchorMarksPerDay}
            totalMarksPerDay={totalMarksPerDay}
            sailMarksPerDay={sailMarksPerDay}
            maidenVoyageMarksPerDay={maidenVoyageMarksPerDay}
            isLoadingAnchorMarks={isLoadingAnchorMarks}
            showLiveAprLoading={showLiveAprLoading}
            isErrorAllRewards={isErrorAllRewards}
            projectedAPR={projectedAPR}
            mounted={mounted}
            isLoadingLedgerMarks={isLoadingLedgerMarks}
            totalAnchorLedgerMarks={totalAnchorLedgerMarks}
            totalAnchorLedgerMarksPerDay={totalAnchorLedgerMarksPerDay}
            isClaimingAll={isClaimingAll}
            isCompoundingAll={isCompoundingAll}
            onClaimAll={() => setIsClaimAllModalOpen(true)}
            dropdownRef={dropdownRef}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
            selectedMarketForClaim={selectedMarketForClaim}
            setSelectedMarketForClaim={setSelectedMarketForClaim}
            setIsClaimMarketModalOpen={setIsClaimMarketModalOpen}
          />
            </>
          )}

          {/* Earnings Section */}
          <AnchorEarningsSection
            anchorMarkets={anchorMarkets}
            reads={reads}
            poolRewardsMap={poolRewardsMap}
            allMarketsData={allMarketsData}
            marketPositions={marketPositions}
            isEarningsExpanded={isEarningsExpanded}
            setIsEarningsExpanded={setIsEarningsExpanded}
            isClaimingAll={isClaimingAll}
            handleClaimRewards={handleClaimRewards}
            handleCompoundRewards={handleCompoundRewards}
            createCompoundHandlers={createCompoundHandlers}
            setCompoundModal={setCompoundModal}
          />

          {/* Wallet Positions Not Earning Yield */}
          <AnchorWalletPositionsSection
            isConnected={isConnected}
            address={address}
            allMarketsData={allMarketsData}
            peggedPriceUSDMap={peggedPriceUSDMap}
            mergedPeggedPriceMap={mergedPeggedPriceMap}
            coinGeckoPrices={coinGeckoPrices}
            eurPrice={eurPrice}
            btcPrice={btcPrice}
            ethPrice={ethPrice}
            openManageModal={openManageModal}
          />

          {/* Markets List */}
          <AnchorMarketsSections
            toolbarProps={{
              anchorChainOptions,
              chainFilterSelected,
              onChainFilterChange: setChainFilterSelected,
              onClearFilters: () => setChainFilterSelected([]),
              ...(anchorViewBasic
                ? {
                    basicClaimToolbar: {
                      claimableUsdDisplay:
                        anchorToolbarTotalClaimableUsd > 0
                          ? anchorToolbarTotalClaimableUsd.toFixed(2)
                          : "0.00",
                      leftMetrics: [
                        {
                          label: "TVL",
                          value: formatCompactUSD(
                            anchorStats?.yieldGeneratingTVLUSD || 0
                          ),
                        },
                        {
                          label: "Your Deposits",
                          value: formatCompactUSD(anchorToolbarYourTotalDepositUsd),
                        },
                        {
                          label: (
                            <span className="inline-flex items-center gap-1">
                              <span>VAPR</span>
                              <InfoTooltip
                                side="left"
                                label={
                                  <AnchorVaprTooltipContent
                                    positionAPRs={anchorToolbarPositionAprs}
                                    blendedAPR={anchorToolbarVapr}
                                    showLiveAprLoading={showLiveAprLoading}
                                    isErrorAllRewards={isErrorAllRewards}
                                    projectedAPR={projectedAPR}
                                  />
                                }
                              >
                                <span className="text-white/50 cursor-help text-xs">
                                  [?]
                                </span>
                              </InfoTooltip>
                            </span>
                          ),
                          value:
                            anchorToolbarVapr > 0
                              ? `${anchorToolbarVapr.toFixed(2)}%`
                              : "-",
                        },
                      ],
                      onClaim: () => setIsClaimAllModalOpen(true),
                      claimDisabled: isClaimingAll || isCompoundingAll,
                    },
                  }
                : {}),
            }}
          >
            {/* Market Cards/Rows */}
            {(() => {
              // Show loading state while fetching market data
              if (isLoadingReads) {
                return null; // Don't show anything while loading
              }

              // Show error state if there's an issue loading markets
              if (isReadsError) {
                return <IndexMarketsLoadError onRetry={() => refetchReads()} />;
              }

              // Check if any markets have finished genesis (marketsDataMap only contains finished markets)
              if (marketsDataMap.size === 0) {
                return (
                  <div className="bg-[#17395F] border border-white/10 p-6 rounded-lg text-center">
                    <p className="text-white text-lg font-medium mb-4">
                      No markets available
                    </p>
                    <button
                      onClick={() => refetchReads()}
                      className={HARBOR_BTN_GLASS_COMPACT_CORAL_CLASS}
                    >
                      Try again
                    </button>
                  </div>
                );
              }

              // Show grouped markets by ha token (use displayed markets for chain filter)
              const groups: Record<
                string,
                Array<{
                  marketId: string;
                  market: any;
                  marketIndex: number;
                }>
              > = {};

              displayedAnchorMarkets.forEach(([id, m]) => {
                const marketIndex = anchorMarkets.findIndex(([mid]) => mid === id);
                if (marketIndex < 0) return;
                const pegSymbol = m.peggedToken?.symbol || "UNKNOWN";
                const groupKey = anchorViewBasic
                  ? pegSymbol
                  : `${pegSymbol}::${harborMarketChainKey(m)}`;
                if (!groups[groupKey]) {
                  groups[groupKey] = [];
                }
                groups[groupKey].push({
                  marketId: id,
                  market: m,
                  marketIndex,
                });
              });

              // Process each group
              if (anchorViewBasic) {
                // Basic cards: show all peg groups from displayed markets (incl. preview /
                // multichain). Do not require marketsDataMap — that map only has post-genesis
                // TVL (see useAnchorMarketData), which hid haUSD and showed the single-chain
                // placeholder instead of Ethereum + MegaETH footers.
                const marketGroups = Object.entries(groups)
                  .map(([groupKey, marketList]) => ({
                    symbol: groupKey.split("::")[0] ?? groupKey,
                    list: marketList,
                  }))
                  .filter(({ list }) => list.length > 0);
                return (
                  <AnchorBasicMarketCardsGrid
                    marketGroups={marketGroups}
                    getMarketsDataForGroup={(list) =>
                      list
                        .map(({ marketId }) => marketsDataMap.get(marketId))
                        .filter(
                          (m): m is NonNullable<typeof m> => m !== undefined
                        )
                    }
                    showLiveAprLoading={showLiveAprLoading}
                    isConnected={isConnected}
                    onOpenManage={(payload) => {
                      void openManageModal(payload);
                    }}
                  />
                );
              }

              return (
                <>
                  <AnchorMarketsTableHeader />
                  {Object.entries(groups).map(([groupKey, marketList]) => {
                const symbol = groupKey.split("::")[0] ?? groupKey;
                // UI+ rows are one chain each; soon/active is per market config.
                const isComingSoonRow = marketList.every(({ market }) =>
                  isAnchorSoonUi(market)
                );

                // Collect all data for markets in this group from the hook
                const marketsData = marketList
                  .map(({ marketId }) => marketsDataMap.get(marketId))
                      .filter(
                        (m): m is NonNullable<typeof m> => m !== undefined
                      );

                // Use all markets in the group (not just those with collateral > 0)
                // This ensures all markets are displayed in the expanded view
                const activeMarketsData = marketsData;

                if (marketList.length === 0) {
                  return null;
                }

                // Calculate combined values - only include stability pool deposits (not wallet balances)
                const combinedPositionUSD = activeMarketsData.reduce(
                  (sum, m) => {
                        return (
                          sum +
                          m.collateralPoolDepositUSD +
                          m.sailPoolDepositUSD
                        );
                  },
                  0
                );
                // Also track total token amounts (for display when USD isn't available) - only pool deposits
                const combinedPositionTokens = activeMarketsData.reduce(
                  (sum, m) =>
                    sum +
                    Number(m.collateralPoolDeposit || 0n) / 1e18 +
                    Number(m.sailPoolDeposit || 0n) / 1e18,
                  0
                );
                const combinedRewardsUSD = activeMarketsData.reduce(
                      (sum, m) =>
                        sum + m.collateralRewardsUSD + m.sailRewardsUSD,
                  0
                );

                // Calculate APR ranges across all markets in group
                const allMinAPRs = activeMarketsData
                  .map((m) => m.minAPR)
                  .filter((v) => v > 0);
                const allMaxAPRs = activeMarketsData
                  .map((m) => m.maxAPR)
                  .filter((v) => v > 0);
                const minAPR =
                  allMinAPRs.length > 0 ? Math.min(...allMinAPRs) : 0;
                const maxAPR =
                  allMaxAPRs.length > 0 ? Math.max(...allMaxAPRs) : 0;

                // Collect actual APRs from stability pools for tooltip
                const collateralPoolAPRs = activeMarketsData
                  .map((m) => m.collateralPoolAPR)
                  .filter(
                    (apr): apr is { collateral: number; steam: number } =>
                      apr !== undefined
                  )
                  .map((apr) => apr.collateral + apr.steam)
                  .filter((v) => v > 0);
                const sailPoolAPRs = activeMarketsData
                  .map((m) => m.sailPoolAPR)
                  .filter(
                    (apr): apr is { collateral: number; steam: number } =>
                      apr !== undefined
                  )
                  .map((apr) => apr.collateral + apr.steam)
                  .filter((v) => v > 0);
                const collateralPoolAPRMin =
                  collateralPoolAPRs.length > 0
                    ? Math.min(...collateralPoolAPRs)
                    : null;
                const collateralPoolAPRMax =
                  collateralPoolAPRs.length > 0
                    ? Math.max(...collateralPoolAPRs)
                    : null;
                const sailPoolAPRMin =
                      sailPoolAPRs.length > 0
                        ? Math.min(...sailPoolAPRs)
                        : null;
                const sailPoolAPRMax =
                      sailPoolAPRs.length > 0
                        ? Math.max(...sailPoolAPRs)
                        : null;

                // Calculate projected APR ranges
                const allMinProjectedAPRs = activeMarketsData
                  .map((m) => m.minProjectedAPR)
                  .filter((v): v is number => v !== null && v > 0);
                const allMaxProjectedAPRs = activeMarketsData
                  .map((m) => m.maxProjectedAPR)
                  .filter((v): v is number => v !== null && v > 0);
                const minProjectedAPR =
                  allMinProjectedAPRs.length > 0
                    ? Math.min(...allMinProjectedAPRs)
                    : null;
                const maxProjectedAPR =
                  allMaxProjectedAPRs.length > 0
                    ? Math.max(...allMaxProjectedAPRs)
                    : null;

                // Collect all unique wrapped collateral assets (only show wrapped collateral, not all accepted assets)
                const assetMap = new Map<
                  string,
                  { symbol: string; name: string }
                >();
                marketList.forEach(({ market }) => {
                  if (market?.collateral?.symbol) {
                    const wrappedCollateral = {
                      symbol: market.collateral.symbol,
                      name:
                        market.collateral.name || market.collateral.symbol,
                    };
                    if (!assetMap.has(wrappedCollateral.symbol)) {
                      assetMap.set(
                        wrappedCollateral.symbol,
                        wrappedCollateral
                      );
                    }
                  }
                });
                const allDepositAssets = Array.from(assetMap.values());

                // Collect all unique reward tokens from pools for markets in this group
                const firstMarket = marketList[0]?.market;
                const depositModeRow = getDepositMode(firstMarket);
                const isCollateralOnlyRow = depositModeRow.collateralOnly;
                const isMegaEthRow = depositModeRow.isMegaEth;

                // Helper function to get directly zappable assets (no slippage)
                // Excludes wrapped collateral since it's already shown in the main deposit assets view
                    const getDirectlyZappableAssets = (
                      market: any
                    ): Array<{ symbol: string; name: string }> => {
                      const collateralSymbol =
                        market?.collateral?.symbol?.toLowerCase() || "";
                  const isFxSAVEMarket = collateralSymbol === "fxsave";
                  const isWstETHMarket = collateralSymbol === "wsteth";
                  
                  if (isFxSAVEMarket) {
                    // Exclude fxSAVE (wrapped collateral) - only show USDC and fxUSD
                    return [
                      { symbol: "USDC", name: "USD Coin" },
                      { symbol: "fxUSD", name: "f(x) USD" },
                    ];
                  } else if (isWstETHMarket) {
                    // Exclude wstETH (wrapped collateral) - only show ETH and stETH
                    return [
                      { symbol: "ETH", name: "Ethereum" },
                      { symbol: "stETH", name: "Lido Staked ETH" },
                    ];
                  }
                  return [];
                };
                
                // Collect zappable assets from all markets in the group
                const zappableAssetsMap = new Map<
                  string,
                  { symbol: string; name: string }
                >();
                if (!isComingSoonRow) {
                  marketList.forEach(({ market }) => {
                    const zappableAssets = getDirectlyZappableAssets(market);
                    zappableAssets.forEach((asset) => {
                      if (!zappableAssetsMap.has(asset.symbol)) {
                        zappableAssetsMap.set(asset.symbol, asset);
                      }
                    });
                  });
                }
                    const directlyZappableAssets = Array.from(
                      zappableAssetsMap.values()
                    );
                const collateralPoolAddress = firstMarket?.addresses
                  ?.stabilityPoolCollateral as `0x${string}` | undefined;
                const sailPoolAddress = firstMarket?.addresses
                  ?.stabilityPoolLeveraged as `0x${string}` | undefined;
                const peggedTokenSymbol = firstMarket?.peggedToken?.symbol;
                    const collateralSymbol =
                      firstMarket?.collateral?.symbol || "";

                    const isExpanded = expandedMarkets.includes(groupKey);
                    const groupHasMaintenance = marketList.some(({ market }) =>
                      isMarketInMaintenance(market)
                    );

                    const rewardPoolAddresses = marketList
                      .map(
                        ({ market }) =>
                          market.addresses?.stabilityPoolCollateral
                      )
                      .filter(Boolean) as `0x${string}`[];

                return (
                  <React.Fragment key={groupKey}>
                    <div className="rounded-md border border-[#1E4775]/10 overflow-hidden">
                      <AnchorMarketGroupCollapsedRow
                        symbol={symbol}
                        rowKey={groupKey}
                        isComingSoonRow={isComingSoonRow}
                        isExpanded={isExpanded}
                        peggedTokenSymbol={peggedTokenSymbol}
                        groupHasMaintenance={groupHasMaintenance}
                        marketList={marketList}
                        marketsData={marketsData}
                        minAPR={minAPR}
                        maxAPR={maxAPR}
                        minProjectedAPR={minProjectedAPR}
                        maxProjectedAPR={maxProjectedAPR}
                        collateralPoolAPRMin={collateralPoolAPRMin}
                        collateralPoolAPRMax={collateralPoolAPRMax}
                        sailPoolAPRMin={sailPoolAPRMin}
                        sailPoolAPRMax={sailPoolAPRMax}
                        combinedPositionUSD={combinedPositionUSD}
                        combinedPositionTokens={combinedPositionTokens}
                        combinedRewardsUSD={combinedRewardsUSD}
                        collateralPoolAddress={collateralPoolAddress}
                        sailPoolAddress={sailPoolAddress}
                        rewardPoolAddresses={rewardPoolAddresses}
                        allDepositAssets={allDepositAssets}
                        directlyZappableAssets={directlyZappableAssets}
                        isCollateralOnlyRow={isCollateralOnlyRow}
                        isMegaEthRow={isMegaEthRow}
                        collateralSymbol={collateralSymbol}
                        poolRewardsMap={poolRewardsMap}
                        isErrorAllRewards={isErrorAllRewards}
                        showLiveAprLoading={showLiveAprLoading}
                        projectedAPR={projectedAPR}
                        isConnected={isConnected}
                        onToggleExpand={toggleExpandedMarket}
                        onOpenManage={(payload) => {
                          void openManageModal(payload);
                        }}
                      />

                      {/* Expanded View - Show all markets in group */}
                      {isExpanded && (
                        <AnchorMarketGroupExpandedSection
                          activeMarketsData={activeMarketsData}
                          withdrawalRequests={withdrawalRequests}
                          volProtectionData={volProtectionData}
                          marketPositions={marketPositions}
                          poolRewardsMap={poolRewardsMap}
                          collateralPricesMap={collateralPricesMap}
                          peggedPriceUSDMap={peggedPriceUSDMap}
                          coinGeckoPrices={coinGeckoPrices}
                          coinGeckoLoading={coinGeckoLoading}
                          ethPrice={ethPrice}
                          btcPrice={btcPrice}
                          eurPrice={eurPrice}
                          goldPrice={goldPrice}
                          silverPrice={silverPrice}
                          showLiveAprLoading={showLiveAprLoading}
                          setWithdrawAmountModal={setWithdrawAmountModal}
                          setEarlyWithdrawModal={setEarlyWithdrawModal}
                          setWithdrawAmountInput={setWithdrawAmountInput}
                          setWithdrawAmountError={setWithdrawAmountError}
                          setContractAddressesModal={setContractAddressesModal}
                        />
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
                </>
              );
            })()}
          </AnchorMarketsSections>

          <ArchivedMarketsListSection
            markets={displayedArchivedAnchorMarkets}
            showSection={showArchivedAnchor}
            onToggleShow={() => setShowArchivedAnchor((v) => !v)}
            onManage={(marketId) => {
              const m = (marketsConfig as Record<string, DefinedMarket>)[marketId];
              if (!m) return;
              void openManageModal({
                marketId,
                market: m,
                initialTab: "withdraw",
                simpleMode: true,
              });
            }}
          />
      </HarborPageShell>

        {manageModal && (
          <AnchorDepositWithdrawModal
            isOpen={!!manageModal}
            onClose={() => setManageModal(null)}
            marketId={manageModal.marketId}
            market={manageModal.market}
            initialTab={
              manageModal.initialTab === "withdraw" ||
              manageModal.initialTab === "withdraw-redeem"
                ? "withdraw"
                : "deposit"
            }
            simpleMode={true}
            bestPoolType={manageModal.bestPoolType || "collateral"}
            allMarkets={manageModal.allMarkets}
            initialDepositAsset={manageModal.initialDepositAsset}
            positionsMap={marketPositions}
            onSuccess={async () => {
              // Wait for blockchain state to update
              await new Promise((resolve) => setTimeout(resolve, 2000));
              // Refetch all contract data
              await Promise.all([
                refetchReads(),
                refetchUserDeposits(),
                refetchPositions(),
              ]);
            }}
          />
        )}

        {compoundModal && (
          // Convert old compoundModal to new pool selection flow
          <CompoundPoolSelectionModal
            isOpen={true}
            onClose={() => setCompoundModal(null)}
            onConfirm={async (allocations) => {
              setCompoundModal(null);
              try {
                // Calculate reward amount from all pools
                const totalRewardAmount = BigInt(0); // Will be calculated in handleCompoundConfirm
                const collateralPool = compoundModal.market.addresses
                  ?.stabilityPoolCollateral as `0x${string}` | undefined;
                const sailPool = compoundModal.market.addresses
                  ?.stabilityPoolLeveraged as `0x${string}` | undefined;

                await handleCompoundConfirm(
                  compoundModal.market,
                  allocations
                    .map((a) => {
                      const addr = a.poolAddress.toLowerCase();
                      const collateralAddr = collateralPool?.toLowerCase();
                      const sailAddr = sailPool?.toLowerCase();
                      const poolId =
                        collateralAddr && addr === collateralAddr
                          ? ("collateral" as const)
                          : sailAddr && addr === sailAddr
                          ? ("sail" as const)
                          : null;
                      return poolId
                        ? { poolId, percentage: a.percentage }
                        : null;
                    })
                    .filter(
                      (
                        x
                      ): x is {
                        poolId: "collateral" | "sail";
                        percentage: number;
                      } => x !== null
                    ),
                  totalRewardAmount
                );
              } catch (error: any) {
                setTransactionProgress({
                  isOpen: true,
                  title: "Compounding Rewards",
                  steps: [
                    {
                      id: "error",
                      label: "Error",
                      status: "error",
                      error: error?.message || "An error occurred",
                    },
                  ],
                  currentStepIndex: 0,
                });
              }
            }}
            pools={(() => {
              // Build pools array from the market
              const market = compoundModal.market;
              const collateralPoolAddress = market.addresses
                ?.stabilityPoolCollateral as `0x${string}` | undefined;
              const sailPoolAddress = market.addresses
                ?.stabilityPoolLeveraged as `0x${string}` | undefined;

              const pools: PoolOption[] = [];

              // Get pegged token price for TVL calculation
              let peggedTokenPrice: bigint | undefined;
              const marketIndex = anchorMarkets.findIndex(
                ([id]) =>
                  id === compoundModal.market.id ||
                  (compoundModal.market as any).addresses?.peggedToken
              );
              if (marketIndex >= 0 && reads) {
                let offset = 0;
                for (let i = 0; i < marketIndex; i++) {
                  const prevMarket = anchorMarkets[i][1];
                  const prevHasCollateral = !!(prevMarket as any).addresses
                    ?.stabilityPoolCollateral;
                  const prevHasSail = !!(prevMarket as any).addresses
                    ?.stabilityPoolLeveraged;
                  const prevHasPriceOracle = !!(prevMarket as any).addresses
                    ?.collateralPrice;
                  const prevHasStabilityPoolManager = !!(prevMarket as any)
                    .addresses?.stabilityPoolManager;
                  const prevPeggedTokenAddress = (prevMarket as any)?.addresses
                    ?.peggedToken;
                  offset += 5;
                  if (prevHasStabilityPoolManager) offset += 1;
                  if (prevHasCollateral) {
                    offset += 4;
                    if (prevPeggedTokenAddress) offset += 1;
                  }
                  if (prevHasSail) {
                    offset += 4;
                    if (prevPeggedTokenAddress) offset += 1;
                  }
                  if (prevHasPriceOracle) offset += 1;
                }
                peggedTokenPrice = reads?.[offset + 3]?.result as
                  | bigint
                  | undefined;
              }

              if (collateralPoolAddress) {
                const collateralPoolData = allPoolRewards?.find(
                  (r) =>
                    r.poolAddress.toLowerCase() ===
                    collateralPoolAddress.toLowerCase()
                );
                const collateralPoolAPR = collateralPoolData?.totalAPR;

                let collateralTVLUSD: number | undefined;
                if (collateralPoolData?.tvl !== undefined && peggedTokenPrice) {
                  const tvlTokens = Number(collateralPoolData.tvl) / 1e18;
                  const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
                  collateralTVLUSD = tvlTokens * peggedPriceUSD;
                }

                pools.push({
                  id: "collateral",
                  name: `${
                    compoundModal.market.peggedToken?.symbol ||
                    compoundModal.market.id
                  } Collateral Pool`,
                  address: collateralPoolAddress,
                  apr: collateralPoolAPR,
                  tvl: collateralPoolData?.tvl,
                  tvlUSD: collateralTVLUSD,
                  enabled: true,
                });
              }

              if (sailPoolAddress) {
                const sailPoolData = allPoolRewards?.find(
                  (r) =>
                    r.poolAddress.toLowerCase() ===
                    sailPoolAddress.toLowerCase()
                );
                const sailPoolAPR = sailPoolData?.totalAPR;

                let sailTVLUSD: number | undefined;
                if (sailPoolData?.tvl !== undefined && peggedTokenPrice) {
                  const tvlTokens = Number(sailPoolData.tvl) / 1e18;
                  const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
                  sailTVLUSD = tvlTokens * peggedPriceUSD;
                }

                pools.push({
                  id: "sail",
                  name: `${
                    compoundModal.market.peggedToken?.symbol ||
                    compoundModal.market.id
                  } Sail Pool`,
                  address: sailPoolAddress,
                  apr: sailPoolAPR,
                  tvl: sailPoolData?.tvl,
                  tvlUSD: sailTVLUSD,
                  enabled: true,
                });
              }

              return pools;
            })()}
            marketSymbol={
              compoundModal.market.peggedToken?.symbol ||
              compoundModal.market.id
            }
          />
        )}

        <AnchorClaimAllModal
          isOpen={isClaimAllModalOpen}
          onClose={() => setIsClaimAllModalOpen(false)}
          onBasicClaim={handleClaimAll}
          onCompound={(selectedPools) => {
            const selectedKey = new Set(
              selectedPools.map((p) => `${p.marketId}-${p.poolType}`)
            );
            const selectedPositions = claimAllPositions.filter((p) =>
              selectedKey.has(`${p.marketId}-${p.poolType}`)
            );

            const selectedMarketIds = Array.from(
              new Set(selectedPositions.map((p) => p.marketId))
            );

            // Build token options grouped by pegged token address, and include APRs for *all* pools across *all* markets for that token.
            const tokenAddrToRepresentativeMarketId = new Map<string, string>();
            for (const marketId of selectedMarketIds) {
              const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
              const peggedTokenAddr = (market as any)?.addresses
                ?.peggedToken as `0x${string}` | undefined;
              if (!peggedTokenAddr) continue;
              if (
                !tokenAddrToRepresentativeMarketId.has(
                  peggedTokenAddr.toLowerCase()
                )
              ) {
                tokenAddrToRepresentativeMarketId.set(
                  peggedTokenAddr.toLowerCase(),
                  marketId
                );
              }
            }

            const options: CompoundTargetOption[] = Array.from(
              tokenAddrToRepresentativeMarketId.entries()
            ).map(([peggedTokenAddrLower, representativeMarketId]) => {
              // Find *all* markets that share this pegged token
              const marketsForToken = anchorMarkets.filter(([_, m]) => {
                const p = (m as any)?.addresses?.peggedToken as
                  | `0x${string}`
                  | undefined;
                return p && p.toLowerCase() === peggedTokenAddrLower;
              });

              const symbol =
                anchorMarkets.find(([id]) => id === representativeMarketId)?.[1]
                  ?.peggedToken?.symbol || representativeMarketId;

              const pools = marketsForToken.flatMap(([mid, m]) => {
                const collateralSymbol =
                  (m as any)?.collateral?.symbol || "collateral";
                  const collateralPoolAddress = (m as any).addresses
                  ?.stabilityPoolCollateral as `0x${string}` | undefined;
                const sailPoolAddress = (m as any).addresses
                  ?.stabilityPoolLeveraged as `0x${string}` | undefined;

                // Prefer the APR used on the Anchor page (from `useAnchorMarketData`), which falls back to
                // contract APRs when live reward APRs are unavailable.
                const marketData = marketsDataMap.get(mid);
                const collateralAprFromMarketData =
                  marketData?.collateralPoolAPR
                    ? (marketData.collateralPoolAPR.collateral || 0) +
                      (marketData.collateralPoolAPR.steam || 0)
                    : undefined;
                const sailAprFromMarketData = marketData?.sailPoolAPR
                  ? (marketData.sailPoolAPR.collateral || 0) +
                    (marketData.sailPoolAPR.steam || 0)
                  : undefined;

                const items: CompoundTargetPoolApr[] = [];

                if (collateralPoolAddress) {
                  const apr =
                    collateralAprFromMarketData ??
                    allPoolRewards?.find(
                      (r) =>
                        r.poolAddress.toLowerCase() ===
                        collateralPoolAddress.toLowerCase()
                    )?.totalAPR;
                  items.push({
                    marketId: mid,
                    collateralSymbol,
                      poolType: "collateral",
                    poolAddress: collateralPoolAddress,
                    apr,
                  });
                }
                if (sailPoolAddress) {
                  const apr =
                    sailAprFromMarketData ??
                    allPoolRewards?.find(
                      (r) =>
                        r.poolAddress.toLowerCase() ===
                        sailPoolAddress.toLowerCase()
                    )?.totalAPR;
                  items.push({
                    marketId: mid,
                    collateralSymbol,
                    poolType: "sail",
                    poolAddress: sailPoolAddress,
                    apr,
                  });
                }
                return items;
              });

              return {
                marketId: representativeMarketId,
                symbol,
                pools,
              };
            });

            setCompoundTargetModal({
              selectedPools,
              positions: selectedPositions as CompoundSelectedPosition[],
              options,
            });

            setIsClaimAllModalOpen(false);
          }}
          onBuyTide={handleBuyTide}
          positions={claimAllPositions}
          isLoading={isClaimingAll || isCompoundingAll}
        />

        {compoundTargetModal && (
          <CompoundTargetTokenModal
            isOpen={true}
            onClose={() => {
              setCompoundTargetModal(null);
              // allow user to go back to pool selection step
              setIsClaimAllModalOpen(true);
            }}
            positions={compoundTargetModal.positions}
            options={compoundTargetModal.options}
            selectedClaimPools={compoundTargetModal.selectedPools}
            preflight={
              advancedPreflight
                ? {
                    key: advancedPreflight.key,
                    isLoading: advancedPreflight.isLoading,
                    error: advancedPreflight.error,
                    fees: advancedPreflight.fees,
                  }
                : null
            }
            onPreflight={runAdvancedPreflight}
            simplePreflight={
              simplePreflight
                ? {
                    key: simplePreflight.key,
                    isLoading: simplePreflight.isLoading,
                    error: simplePreflight.error,
                    fees: simplePreflight.fees,
                  }
                : null
            }
            onSimplePreflight={runSimplePreflight}
            onContinue={({ mode, targetMarketId, allocations }) => {
              // Advanced compound: allocations are selected inline, so skip the next modal entirely.
              if (mode === "single-token" && targetMarketId && allocations) {
                setCompoundTargetModal(null);
                void (async () => {
                  try {
                    const preflight = advancedPreflight?.isLoading
                      ? undefined
                      : advancedPreflight?.plan &&
                        advancedPreflight.plan.targetMarketId === targetMarketId
                      ? advancedPreflight.plan
                      : undefined;
                    await handleCompoundAllToSingleToken(
                      compoundTargetModal.selectedPools,
                      targetMarketId,
                      allocations,
                      preflight
                    );
                  } catch (error: any) {
                    setTransactionProgress({
                      isOpen: true,
                      title: "Compounding Rewards",
                      steps: [
                        {
                          id: "error",
                          label: "Error",
                          status: "error",
                          error: error?.message || "An error occurred",
                        },
                      ],
                      currentStepIndex: 0,
                    });
                  }
                })();
                return;
              }

              // Simple compound (and any other modes) continue to the next modal as before.
              setCompoundIntent({
                mode,
                selectedPools: compoundTargetModal.selectedPools,
                targetMarketId,
                    });

              const marketForPoolSelection =
                compoundTargetModal.positions[0]?.market;
              if (marketForPoolSelection) {
                handleCompoundRewards(marketForPoolSelection, "collateral", 0n);
              }
              setCompoundTargetModal(null);
            }}
        />
        )}

        {selectedMarketForClaim && (
          <AnchorClaimMarketModal
            isOpen={isClaimMarketModalOpen}
            onClose={() => setIsClaimMarketModalOpen(false)}
            onBasicClaim={handleClaimMarketBasicClaim}
            onCompound={handleClaimMarketCompound}
            onBuyTide={handleClaimMarketBuyTide}
            marketSymbol={
              anchorMarkets.find(([id]) => id === selectedMarketForClaim)?.[1]
                ?.peggedToken?.symbol || "Market"
            }
            isLoading={isClaiming || isCompounding}
          />
        )}

        {/* Compound Pool Selection Modal */}
        {compoundPoolSelection && (
          <CompoundPoolSelectionModal
            isOpen={true}
            onClose={() => {
              setCompoundPoolSelection(null);
              setCompoundIntent(null);
            }}
            onConfirm={async (allocations) => {
              setCompoundPoolSelection(null);
              try {
                // If we're coming from the Claim All -> Compound flow, branch based on intent.
                if (
                  compoundIntent?.mode === "single-token" &&
                  compoundIntent.targetMarketId
                ) {
                  await handleCompoundAllToSingleToken(
                    compoundIntent.selectedPools,
                    compoundIntent.targetMarketId,
                    allocations
                  );
                  setCompoundIntent(null);
                  return;
                }

                if (compoundIntent?.mode === "keep-per-token") {
                  await handleCompoundAllKeepPerToken(
                    compoundIntent.selectedPools,
                    allocations
                  );
                  setCompoundIntent(null);
                  return;
                }

                // Default: original single-market compound confirm flow
                const totalRewardAmount = BigInt(0); // Will be calculated in handleCompoundConfirm
                const market = compoundPoolSelection.market as any;
                const collateralPoolAddress = market?.addresses
                  ?.stabilityPoolCollateral as `0x${string}` | undefined;
                const sailPoolAddress = market?.addresses
                  ?.stabilityPoolLeveraged as `0x${string}` | undefined;

                const mappedAllocations = allocations
                  .map((a) => {
                    const poolId =
                      collateralPoolAddress &&
                      a.poolAddress.toLowerCase() ===
                        collateralPoolAddress.toLowerCase()
                        ? "collateral"
                        : sailPoolAddress &&
                          a.poolAddress.toLowerCase() ===
                            sailPoolAddress.toLowerCase()
                        ? "sail"
                        : null;
                    return poolId ? { poolId, percentage: a.percentage } : null;
                  })
                  .filter(Boolean) as Array<{
                  poolId: "collateral" | "sail";
                  percentage: number;
                }>;

                await handleCompoundConfirm(
                  compoundPoolSelection.market,
                  mappedAllocations,
                  totalRewardAmount
                );
              } catch (error: any) {
                // Show error in a simple alert or toast
                setTransactionProgress({
                  isOpen: true,
                  title: "Compounding Rewards",
                  steps: [
                    {
                      id: "error",
                      label: "Error",
                      status: "error",
                      error: error?.message || "An error occurred",
                    },
                  ],
                  currentStepIndex: 0,
                });
              }
            }}
            pools={compoundPoolSelection.pools}
            marketSymbol={
              compoundPoolSelection.market.peggedToken?.symbol ||
              compoundPoolSelection.market.id
            }
          />
        )}

        {compoundConfirmation && (
          <CompoundConfirmationModal
            isOpen={true}
            onClose={() => {
              setCompoundConfirmation(null);
              setIsCompounding(false);
            }}
            onConfirm={compoundConfirmation.onConfirm}
            steps={compoundConfirmation.steps}
            fees={compoundConfirmation.fees}
            feeErrors={compoundConfirmation.feeErrors}
          />
        )}

        {/* Early withdraw confirmation */}
        {earlyWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className={`${HARBOR_FROSTED_MODAL_SHELL} shadow-xl max-w-md w-full p-4 rounded-lg`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[#1E4775] font-semibold">
                  Withdraw early?
                </h3>
                <button
                  onClick={() => setEarlyWithdrawModal(null)}
                  className="text-[#1E4775]/60 hover:text-[#1E4775]"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-[#1E4775]/80">
                Withdrawing now will incur the early withdrawal fee. The
                fee-free window opens in{" "}
                {formatTimeRemaining(
                  new Date(
                    Number(earlyWithdrawModal.start) * 1000
                  ).toISOString()
                )}{" "}
                and closes at{" "}
                {formatDateTime(
                  new Date(Number(earlyWithdrawModal.end) * 1000).toISOString()
                )}
                .
              </p>
              <div className="text-xs text-[#1E4775]/70 mt-2">
                Fee:{" "}
                {(Number(earlyWithdrawModal.earlyWithdrawFee) / 1e16).toFixed(
                  2
                )}
                %
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setEarlyWithdrawModal(null)}
                  className={INDEX_MODAL_CANCEL_BUTTON_CLASS_DESKTOP}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                    setWithdrawAmountModal({
                      poolAddress: earlyWithdrawModal.poolAddress,
                      poolType: earlyWithdrawModal.poolType,
                      useEarly: true,
                      symbol: earlyWithdrawModal.symbol,
                      maxAmount: earlyWithdrawModal.poolBalance || 0n,
                    });
                    setEarlyWithdrawModal(null);
                  }}
                  className={INDEX_WITHDRAW_BUTTON_CLASS_DESKTOP_CORAL}
                >
                  Continue with fee
                </button>
              </div>
            </div>
          </div>
        )}

        {withdrawAmountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className={`${HARBOR_FROSTED_MODAL_SHELL} max-w-lg w-full p-6 space-y-4`}>
              <div className="flex items-center justify-between">
                <h3 className="text-[#1E4775] font-semibold text-lg">
                  {withdrawAmountModal.useEarly
                    ? "Withdraw (fee applies)"
                    : "Withdraw"}
                </h3>
                <button
                  onClick={() => {
                    setWithdrawAmountModal(null);
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                  }}
                  className="text-[#1E4775]/60 hover:text-[#1E4775]"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-[#1E4775]">
                    Enter Amount
                  </label>
                  {withdrawAmountModal?.maxAmount !== undefined && (
                    <span className="text-sm text-[#1E4775]/70">
                      Balance: {formatToken(withdrawAmountModal.maxAmount)}{" "}
                      {withdrawAmountModal.symbol || "pegged"}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    value={withdrawAmountInput}
                    onChange={(e) => {
                      setWithdrawAmountInput(e.target.value);
                      setWithdrawAmountError(null);
                    }}
                    type="text"
                    placeholder="0.0"
                    className={`w-full h-14 px-4 pr-24 bg-white/85 backdrop-blur-sm text-[#1E4775] border-2 ${
                      withdrawAmountError
                        ? "border-red-500"
                        : "border-[#1E4775]/30"
                    } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-xl font-mono `}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!withdrawAmountModal?.maxAmount) return;
                      setWithdrawAmountInput(
                        formatEther(withdrawAmountModal.maxAmount)
                      );
                      setWithdrawAmountError(null);
                    }}
                    className={HARBOR_BTN_GLASS_MAX_CHIP_ROUND_CLASS}
                  >
                    MAX
                  </button>
                </div>
                {withdrawAmountError && (
                  <p className="mt-2 text-sm text-red-600">
                    {withdrawAmountError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setWithdrawAmountModal(null);
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                  }}
                  className={HARBOR_BTN_GLASS_PILL_OUTLINE_CLASS}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!withdrawAmountModal) return;
                    const raw = withdrawAmountInput.trim();
                    if (!raw) {
                      setWithdrawAmountError("Enter an amount to withdraw");
                      return;
                    }

                    let amountValue: bigint | undefined;
                    try {
                      amountValue = parseEther(raw);
                    } catch {
                      setWithdrawAmountError("Enter a valid amount");
                      return;
                    }

                    await handlePendingWithdraw(
                      withdrawAmountModal.poolAddress,
                      withdrawAmountModal.poolType,
                      withdrawAmountModal.useEarly,
                      amountValue
                    );

                    setWithdrawAmountModal(null);
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                  }}
                  className={
                    withdrawAmountModal.useEarly
                      ? HARBOR_BTN_GLASS_PILL_CORAL_CLASS
                      : HARBOR_BTN_GLASS_PILL_NAVY_CLASS
                  }
                >
                  Confirm Withdraw
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Progress Modal */}
        {transactionProgress && (
          <TransactionProgressModal
            isOpen={transactionProgress.isOpen}
            onClose={() => {
              setTransactionProgress(null);
            }}
            title={transactionProgress.title}
            steps={transactionProgress.steps}
            currentStepIndex={transactionProgress.currentStepIndex}
            onCancel={() => {
              if (cancelOperationRef.current) {
                // Call the cancel handler for claim all or compound
                cancelOperationRef.current();
                cancelOperationRef.current = null;
              } else {
                setTransactionProgress(null);
              }
            }}
            canCancel={isClaimingAll || isCompounding}
          />
        )}

        {/* Contract Addresses Modal */}
        {contractAddressesModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setContractAddressesModal(null)}
          >
            <div
              className={`${HARBOR_FROSTED_LIGHT_CARD_ROUNDED} p-6 max-w-md w-full mx-4`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#1E4775]">
                  Contract Addresses
                </h2>
                <button
                  onClick={() => setContractAddressesModal(null)}
                  className="text-[#1E4775]/70 hover:text-[#1E4775]"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">Minter</div>
                  <SharedEtherscanLink
                    label=""
                    address={contractAddressesModal.minterAddress}
                    chainId={(contractAddressesModal.market as any).chainId ?? 1}
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">
                    Collateral Pool
                  </div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.stabilityPoolCollateral
                    }
                    chainId={(contractAddressesModal.market as any).chainId ?? 1}
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">
                    Sail Pool
                  </div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.stabilityPoolLeveraged
                    }
                    chainId={(contractAddressesModal.market as any).chainId ?? 1}
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">Anchor Token</div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.peggedToken
                    }
                    chainId={(contractAddressesModal.market as any).chainId ?? 1}
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">
                    Collateral Token
                  </div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.collateralToken
                    }
                    chainId={(contractAddressesModal.market as any).chainId ?? 1}
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">
                    Price Oracle
                  </div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.collateralPrice
                    }
                    chainId={(contractAddressesModal.market as any).chainId ?? 1}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
