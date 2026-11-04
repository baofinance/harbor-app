"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import {
  isMarketArchived,
  markets as marketsConfig,
  type DefinedMarket,
} from "@/config/markets";
import { AnchorDepositWithdrawModal } from "@/components/AnchorDepositWithdrawModal";
import { ArchivedMarketsListSection } from "@/components/ArchivedMarketsListSection";
import { AnchorAdvancedLayout } from "@/components/anchor/advanced";
import { AnchorClaimCompoundDialogs } from "@/components/anchor/AnchorClaimCompoundDialogs";
import { EtherscanLink as SharedEtherscanLink } from "@/components/shared";
import { HARBOR_FROSTED_LIGHT_CARD_ROUNDED } from "@/components/shared/harborFrostedSurfaceStyles";
import { HarborPageShell } from "@/components/shared/HarborPageShell";
import { IndexMarksSubgraphErrorBanner } from "@/components/shared/IndexMarksSubgraphErrorBanner";
import { useAnchorClaimCompound } from "@/hooks/anchor/useAnchorClaimCompound";
import { useAnchorPageData } from "@/hooks/anchor/useAnchorPageData";
import { useAnchorSelectedMarket } from "@/hooks/anchor/useAnchorSelectedMarket";
import { useHarborAccount } from "@/hooks/useHarborAccount";
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

export default function AnchorPage() {
  const { address, isConnected } = useHarborAccount();
  const connectedChainId = useChainId();
  const { switchChain } = useSwitchChain();

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
  const claim = useAnchorClaimCompound({
    anchorMarkets,
    reads,
    peggedPriceUSDMap,
    allPoolRewards,
    poolRewardsMap,
    refetchReads,
    refetchUserDeposits,
  });
  const {
    isClaimingAll,
    isCompoundingAll,
    setIsClaimAllModalOpen,
  } = claim;


  // Create a map for quick lookup: marketId -> marketData
  const marketsDataMap = useMemo(() => {
    const map = new Map<string, (typeof allMarketsData)[0]>();
    allMarketsData.forEach((marketData) => {
      map.set(marketData.marketId, marketData);
    });
    return map;
  }, [allMarketsData]);

  const marketsReady = displayedAnchorMarkets.length > 0;

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

          {displayedAnchorMarkets.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.06] px-4 py-8 text-center text-sm text-white/70">
              No Earn markets match the current filters.
            </div>
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
              isLoadingMarketData={isLoadingReads}
              marketDataError={isReadsError}
              onRetryMarketData={() => refetchReads()}
              walletStats={{
                isConnected,
                earnPortfolioUSD: allMarketsTotalPositionUSD || 0,
                positionsCount,
                vaprPercent: blendedVaprPercent,
                isLoadingMarks: isLoadingLedgerMarks || isLoadingAnchorMarks,
                isLoadingPortfolio: isLoadingReads,
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

        <AnchorClaimCompoundDialogs
          claim={claim}
          anchorMarkets={anchorMarkets}
          reads={reads}
          allPoolRewards={allPoolRewards}
          claimAllPositions={claimAllPositions}
          marketsDataMap={marketsDataMap}
        />

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
