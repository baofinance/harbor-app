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
import { AnchorAdvancedLayout } from "@/components/anchor/advanced";
import { useAnchorSelectedMarket } from "@/hooks/anchor/useAnchorSelectedMarket";
import { IndexMarketsLoadError } from "@/components/shared/IndexMarketsLoadError";
import { IndexMarksSubgraphErrorBanner } from "@/components/shared/IndexMarksSubgraphErrorBanner";
import { ArchivedMarketsListSection } from "@/components/ArchivedMarketsListSection";
import {
  ANCHOR_MARKETS_WALLET_ROW_LG_CLASSNAME,
  ANCHOR_MARKETS_WALLET_ROW_MD_CLASSNAME,
} from "@/components/anchor/anchorMarketsTableGrid";
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
import { computeGenesisWrappedCollateralPriceUSD } from "@/utils/wrappedCollateralPriceUSD";
import { DEBUG_ANCHOR } from "@/config/debug";
import { getDepositMode } from "@/utils/depositMode";
import NetworkIconCell from "@/components/NetworkIconCell";
import { useOpenMarketManageModal } from "@/hooks/useOpenMarketManageModal";

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
  const [contractAddressesModal, setContractAddressesModal] = useState<{
    marketId: string;
    market: any;
    minterAddress: string;
  } | null>(null);

  // Ensure component is mounted before showing dynamic content to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

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
  } = useAnchorPageData(address);
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

  const marketsReady = !isLoadingReads && !isReadsError;

  const {
    selectedMarketId,
    setSelectedMarketId,
    selectedMarket,
    selectedMarketData,
  } = useAnchorSelectedMarket({
    markets: displayedAnchorMarkets,
    marketsReady,
    marketPositions,
    marketsDataById: marketsDataMap,
  });

  const claimableRewardsUSD = useMemo(() => {
    let total = 0;
    for (const md of allMarketsData) {
      total += (md.collateralRewardsUSD || 0) + (md.sailRewardsUSD || 0);
    }
    return total;
  }, [allMarketsData]);

  const positionsCount = useMemo(() => {
    let count = 0;
    for (const md of allMarketsData) {
      if ((md.collateralPoolDepositUSD || 0) > 0) count += 1;
      if ((md.sailPoolDepositUSD || 0) > 0) count += 1;
    }
    return count;
  }, [allMarketsData]);

  const blendedVaprPercent = useMemo(() => {
    let weighted = 0;
    let depositUSD = 0;
    for (const md of allMarketsData) {
      const collateralUSD = md.collateralPoolDepositUSD || 0;
      const sailUSD = md.sailPoolDepositUSD || 0;
      const collateralApr = md.collateralPoolAPR
        ? (md.collateralPoolAPR.collateral || 0) +
          (md.collateralPoolAPR.steam || 0)
        : 0;
      const sailApr = md.sailPoolAPR
        ? (md.sailPoolAPR.collateral || 0) + (md.sailPoolAPR.steam || 0)
        : 0;
      if (collateralUSD > 0) {
        weighted += collateralUSD * collateralApr;
        depositUSD += collateralUSD;
      }
      if (sailUSD > 0) {
        weighted += sailUSD * sailApr;
        depositUSD += sailUSD;
      }
    }
    if (depositUSD <= 0) return null;
    return weighted / depositUSD;
  }, [allMarketsData]);

  const marksPerDay =
    totalAnchorLedgerMarksPerDay ||
    totalAnchorMarksPerDay ||
    totalMarksPerDay ||
    0;

  const allMarketsForSelectedToken = useMemo(() => {
    if (!selectedMarket) return undefined;
    const peg = selectedMarket.market.peggedToken?.symbol;
    const chain = harborMarketChainKey(selectedMarket.market);
    return displayedAnchorMarkets
      .filter(
        ([, m]) =>
          m.peggedToken?.symbol === peg && harborMarketChainKey(m) === chain,
      )
      .map(([marketId, market]) => {
        const marketData = marketsDataMap.get(marketId);
        return {
          marketId,
          market: {
            ...market,
            wrappedRate: marketData?.wrappedRate,
          },
        };
      });
  }, [selectedMarket, displayedAnchorMarkets, marketsDataMap]);

  const refetchAfterManage = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await Promise.all([
      refetchReads(),
      refetchUserDeposits(),
      refetchPositions(),
    ]);
  }, [refetchReads, refetchUserDeposits, refetchPositions]);

  return (
    <>
      <HarborPageShell>
          {ledgerMarksError && (
            <IndexMarksSubgraphErrorBanner error={ledgerMarksError} />
          )}

          {isLoadingReads ? null : isReadsError ? (
            <IndexMarketsLoadError onRetry={() => refetchReads()} />
          ) : (
            <AnchorAdvancedLayout
              selectedMarketId={selectedMarketId}
              selectedMarket={selectedMarket?.market ?? null}
              selectedMarketData={selectedMarketData}
              dropdownMarkets={displayedAnchorMarkets}
              onSelectMarket={setSelectedMarketId}
              isConnected={isConnected}
              marketPositions={marketPositions}
              marketsDataById={marketsDataMap}
              peggedPriceUSDMap={peggedPriceUSDMap}
              allMarketsForSelectedToken={allMarketsForSelectedToken}
              onManageSuccess={refetchAfterManage}
              claimableRewardsUSD={claimableRewardsUSD}
              isClaiming={isClaimingAll || isCompoundingAll}
              onClaim={() => setIsClaimAllModalOpen(true)}
              walletStats={{
                isConnected,
                earnPortfolioUSD: allMarketsTotalPositionUSD || 0,
                positionsCount,
                vaprPercent: blendedVaprPercent,
                isLoadingMarks: isLoadingLedgerMarks || isLoadingAnchorMarks,
                totalMarks: totalAnchorLedgerMarks || totalAnchorMarks || 0,
                marksPerDay,
              }}
            />
          )}

          <ArchivedMarketsListSection
            markets={displayedArchivedAnchorMarkets}
            showSection={showArchivedAnchor}
            onToggleShow={() => setShowArchivedAnchor((v) => !v)}
            onManage={(marketId) => {
              const m = (marketsConfig as Record<string, DefinedMarket>)[marketId];
              if (!m) return;
              const peg = m.peggedToken?.symbol;
              const chain = harborMarketChainKey(m);
              const allMarkets = Object.entries(marketsConfig)
                .filter(
                  ([, market]) =>
                    market.peggedToken?.symbol === peg &&
                    harborMarketChainKey(market) === chain,
                )
                .map(([id, market]) => ({ marketId: id, market }));
              void openManageModal({
                marketId,
                market: m,
                initialTab: "withdraw",
                simpleMode: true,
                allMarkets,
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
            onRetry={transactionProgress.onRetry}
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
