"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useChainId, useSwitchChain } from "wagmi";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useSailPageData } from "@/hooks/useSailPageData";
import { useSailSelectedMarket } from "@/hooks/useSailSelectedMarket";
import { SailManageModal } from "@/components/SailManageModal";
import { MarksBoostBadge } from "@/components/MarksBoostBadge";
import {
  SailMarksSubgraphErrorBanner,
  SailMarketsSections,
  SailBasicMarketCardsGrid,
} from "@/components/sail";
import { SailAdvancedLayout } from "@/components/sail/advanced/SailAdvancedLayout";
import { usePageLayoutPreference } from "@/contexts/PageLayoutPreferenceContext";
import {
  isMarketArchived,
  markets as marketsConfig,
  type DefinedMarket,
} from "@/config/markets";
import { HarborPageShell } from "@/components/shared/HarborPageShell";
import { ArchivedMarketsListSection } from "@/components/ArchivedMarketsListSection";
import { IndexMarketsLoadError } from "@/components/shared/IndexMarketsLoadError";
import { useOpenMarketManageModal } from "@/hooks/useOpenMarketManageModal";

type SailManageModalPayload = {
  marketId: string;
  market: DefinedMarket;
  initialTab: "mint" | "redeem";
};

export default function SailPage() {
  const connectedChainId = useChainId();
  const { switchChain } = useSwitchChain();

  const { isBasic: sailViewBasic } = usePageLayoutPreference();

  const { price: sailPageEthPrice, isLoading: isEthPriceLoading } =
    useCoinGeckoPrice("ethereum", 120000);
  const { price: sailPageWstETHPrice, isLoading: isWstETHPriceLoading } =
    useCoinGeckoPrice("wrapped-steth", 120000);
  const { price: sailPageFxSAVEPrice, isLoading: isFxSAVEPriceLoading } =
    useCoinGeckoPrice("fx-usd-saving", 120000);

  const isCoinGeckoLoading =
    isEthPriceLoading || isWstETHPriceLoading || isFxSAVEPriceLoading;

  const {
    isConnected,
    longFilterSelected,
    setLongFilterSelected,
    shortFilterSelected,
    setShortFilterSelected,
    chainFilterSelected,
    setChainFilterSelected,
    clearFilters,
    sailMarksError,
    sailPnLSummary,
    totalSailMarks,
    isLoadingSailMarks,
    sailMarketIdToIndex,
    sailChainOptions,
    uniqueLongSides,
    uniqueShortSides,
    reads,
    isLoadingReads,
    isReadsError,
    refetchReads,
    marketOffsets,
    minterConfigByMarketId,
    rebalanceThresholdByMarketId,
    refetchMinterConfigs,
    refetchRebalanceReads,
    tokenPricesByMarket,
    userDepositMap,
    refetchUserDeposits,
    sailUserStats,
    pnlFromMarkets,
    activeSailBoostEndTimestamp,
    activeMarkets,
    displayedArchivedSailMarkets,
    tableMarkets,
  } = useSailPageData(sailViewBasic);

  const readsReady = !isLoadingReads && !isReadsError && !!reads;

  const {
    selectedMarketId,
    setSelectedMarketId,
    selectedMarket,
    selectedMetrics,
    tvlByMarketId,
  } = useSailSelectedMarket({
    markets: tableMarkets,
    readsReady,
    reads,
    sailMarketIdToIndex,
    marketOffsets,
    minterConfigByMarketId,
    rebalanceThresholdByMarketId,
    tokenPricesByMarket,
    ethPrice: sailPageEthPrice,
    wstETHPrice: sailPageWstETHPrice,
    fxSAVEPrice: sailPageFxSAVEPrice,
    isCoinGeckoLoading,
  });

  const [manageModal, setManageModal] = useState<SailManageModalPayload | null>(
    null
  );
  const [showArchivedSail, setShowArchivedSail] = useState(false);

  const openManageModalBase = useOpenMarketManageModal<SailManageModalPayload>({
    isConnected,
    connectedChainId,
    switchChain,
    setManageModal,
    logLabel: "Sail",
  });

  const openManageModal = useCallback(
    async (
      marketId: string,
      market: DefinedMarket,
      initialTab: "mint" | "redeem" = "mint"
    ) => {
      const resolvedTab =
        isMarketArchived(market) && initialTab === "mint"
          ? "redeem"
          : initialTab;
      await openManageModalBase({
        marketId,
        market,
        initialTab: resolvedTab,
      });
    },
    [openManageModalBase]
  );

  const queryClient = useQueryClient();

  const handleManageMarketOpen = useCallback(
    (marketId: string, m: DefinedMarket) => {
      void openManageModal(marketId, m, "mint");
    },
    [openManageModal]
  );

  const refetchAfterManage = useCallback(async () => {
    await Promise.all([
      refetchReads(),
      refetchUserDeposits(),
      refetchMinterConfigs(),
      refetchRebalanceReads(),
    ]);
    queryClient.invalidateQueries({ queryKey: ["sailPositionPnL"] });
    queryClient.invalidateQueries({ queryKey: ["sailPositionsPnLSummary"] });
    queryClient.invalidateQueries({ queryKey: ["sailPositionsForPnL"] });
  }, [
    queryClient,
    refetchMinterConfigs,
    refetchReads,
    refetchRebalanceReads,
    refetchUserDeposits,
  ]);

  const selectedUserDeposit = useMemo(() => {
    if (!selectedMarketId) return undefined;
    const globalIndex = sailMarketIdToIndex.get(selectedMarketId);
    if (globalIndex === undefined) return undefined;
    return userDepositMap.get(globalIndex);
  }, [selectedMarketId, sailMarketIdToIndex, userDepositMap]);

  const selectedCurrentValueUSD = useMemo(() => {
    if (!selectedUserDeposit || !selectedMarketId) return undefined;
    const tokenPrices = tokenPricesByMarket[selectedMarketId];
    if (!tokenPrices || tokenPrices.leveragedPriceUSD <= 0) return undefined;
    return (
      (Number(selectedUserDeposit) / 1e18) * tokenPrices.leveragedPriceUSD
    );
  }, [selectedMarketId, selectedUserDeposit, tokenPricesByMarket]);

  const toolbarProps = {
    sailChainOptions,
    showNetworkFilter: sailChainOptions.length > 1,
    chainFilterSelected,
    setChainFilterSelected,
    uniqueLongSides,
    uniqueShortSides,
    longFilterSelected,
    setLongFilterSelected,
    shortFilterSelected,
    setShortFilterSelected,
    onClearFilters: clearFilters,
  };

  return (
    <>
      <HarborPageShell>
        {!sailViewBasic && activeSailBoostEndTimestamp != null ? (
          <div className="mb-2">
            <MarksBoostBadge
              multiplier={2}
              endTimestamp={activeSailBoostEndTimestamp}
            />
          </div>
        ) : null}

        {!sailViewBasic && sailMarksError ? (
          <SailMarksSubgraphErrorBanner error={sailMarksError} />
        ) : null}

        {isLoadingReads ? null : isReadsError ? (
          <IndexMarketsLoadError onRetry={() => refetchReads()} />
        ) : sailViewBasic ? (
          <SailMarketsSections toolbarProps={toolbarProps}>
            <SailBasicMarketCardsGrid
              activeMarkets={activeMarkets}
              sailMarketIdToIndex={sailMarketIdToIndex}
              marketOffsets={marketOffsets}
              reads={reads}
              minterConfigByMarketId={minterConfigByMarketId}
              isConnected={isConnected}
              onExploreMarket={handleManageMarketOpen}
              userDepositMap={userDepositMap}
              tokenPricesByMarket={tokenPricesByMarket}
            />
          </SailMarketsSections>
        ) : (
          <SailAdvancedLayout
            selectedMarketId={selectedMarketId}
            selectedMarket={selectedMarket?.market ?? null}
            selectedMetrics={selectedMetrics}
            dropdownMarkets={tableMarkets}
            onSelectMarket={setSelectedMarketId}
            reads={reads}
            sailMarketIdToIndex={sailMarketIdToIndex}
            marketOffsets={marketOffsets}
            isConnected={isConnected}
            userDepositMap={userDepositMap}
            tokenPricesByMarket={tokenPricesByMarket}
            userDeposit={selectedUserDeposit}
            currentValueUSD={selectedCurrentValueUSD}
            onManageSuccess={refetchAfterManage}
            leveragedTokenPriceUSD={
              selectedMarketId
                ? tokenPricesByMarket[selectedMarketId]?.leveragedPriceUSD
                : undefined
            }
            ethPrice={sailPageEthPrice}
            wstETHPrice={sailPageWstETHPrice}
            fxSAVEPrice={sailPageFxSAVEPrice}
            walletStats={{
              isConnected,
              sailUserStats,
              pnlFromMarkets,
              pnlSummaryLoading: sailPnLSummary.isLoading,
              isLoadingSailMarks,
              totalSailMarks,
            }}
          />
        )}

        <ArchivedMarketsListSection
          markets={displayedArchivedSailMarkets}
          showSection={showArchivedSail}
          onToggleShow={() => setShowArchivedSail((v) => !v)}
          onManage={(marketId) => {
            const m = (marketsConfig as Record<string, DefinedMarket>)[marketId];
            if (!m) return;
            void openManageModal(marketId, m, "redeem");
          }}
        />
      </HarborPageShell>

      {manageModal && (
        <SailManageModal
          isOpen={!!manageModal}
          onClose={() => setManageModal(null)}
          marketId={manageModal.marketId}
          market={manageModal.market}
          initialTab={manageModal.initialTab}
          onSuccess={async () => {
            setManageModal(null);
            await refetchAfterManage();
          }}
          leveragedTokenPriceUSD={
            tokenPricesByMarket[manageModal.marketId]?.leveragedPriceUSD
          }
          ethPrice={sailPageEthPrice}
          wstETHPrice={sailPageWstETHPrice}
          fxSAVEPrice={sailPageFxSAVEPrice}
        />
      )}
    </>
  );
}
