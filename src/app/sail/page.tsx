"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useChainId, useSwitchChain } from "wagmi";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useSailPageData } from "@/hooks/useSailPageData";
import { SailManageModal } from "@/components/SailManageModal";
import {
  SailExtendedHero,
  SailLedgerMarksBar,
  SailMarksSubgraphErrorBanner,
  SailMarketsSections,
  SailMarketsTableHeader,
  SailPageTitleSection,
  SailUserStatsCards,
  SailMarketRow,
  SailBasicMarketCardsGrid,
} from "@/components/sail";
import { usePageLayoutPreference } from "@/contexts/PageLayoutPreferenceContext";
import { isSailSoonUi, type DefinedMarket } from "@/config/markets";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import { IndexMarketsLoadError } from "@/components/shared/IndexMarketsLoadError";
import { useExpandedMarketIds } from "@/hooks/useExpandedMarketIds";
import { ensureMarketWalletChain } from "@/utils/ensureMarketWalletChain";
import { formatCompactUSD } from "@/utils/anchor";
import { isValidContractAddress } from "@/utils/isValidContractAddress";

export default function SailPage() {
  const connectedChainId = useChainId();
  const { switchChain } = useSwitchChain();

  /** Nav toggle: Basic = title + markets only (no hero cards, stats strips, Sail Marks bar). Persists across routes. */
  const { isBasic: sailViewBasic } = usePageLayoutPreference();

  const { price: sailPageEthPrice } = useCoinGeckoPrice("ethereum", 120000);
  const { price: sailPageWstETHPrice } = useCoinGeckoPrice(
    "wrapped-steth",
    120000
  );
  const { price: sailPageFxSAVEPrice } = useCoinGeckoPrice(
    "fx-usd-saving",
    120000
  );

  const {
    isConnected,
    longFilterSelected,
    setLongFilterSelected,
    shortFilterSelected,
    setShortFilterSelected,
    chainFilterSelected,
    setChainFilterSelected,
    clearFilters,
    sailPnLSummary,
    totalSailMarks,
    sailMarksPerDay,
    isLoadingSailMarks,
    sailMarksError,
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
    tableMarkets,
  } = useSailPageData(sailViewBasic);

  const { expandedMarkets, toggleExpandedMarket: handleToggleMarketExpand } =
    useExpandedMarketIds();
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<DefinedMarket | null>(
    null
  );
  const [manageModalTab, setManageModalTab] = useState<"mint" | "redeem">(
    "mint"
  );

  const queryClient = useQueryClient();

  const sortedTableMarkets = useMemo(() => {
    const rank = (entry: (typeof tableMarkets)[0]) => {
      const [, m] = entry;
      const sym = m.leveragedToken?.symbol ?? "";
      const chain = harborMarketChainKey(m);
      return `${sym}::${chain}`;
    };
    return [...tableMarkets].sort((a, b) => rank(a).localeCompare(rank(b)));
  }, [tableMarkets]);

  const handleManageMarketOpen = useCallback(
    (marketId: string, m: DefinedMarket) => {
      void (async () => {
        const marketChainId =
          (m as DefinedMarket & { chainId?: number }).chainId ?? 1;
        const isReady = await ensureMarketWalletChain({
          isConnected,
          connectedChainId,
          marketChainId,
          switchChain,
          onSwitchRejected: (err) => {
            if (process.env.NODE_ENV === "development") {
              console.warn(
                "[Sail] Network switch rejected before opening manage modal:",
                err
              );
            }
          },
        });
        if (!isReady) return;

        setSelectedMarketId(marketId);
        setSelectedMarket(m);
        setManageModalTab("mint");
        setManageModalOpen(true);
      })();
    },
    [connectedChainId, isConnected, switchChain]
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col text-white max-w-[1300px] mx-auto font-sans relative w-full">
        <main className="container mx-auto px-4 sm:px-10 pb-6 pt-2 sm:pt-4">
          <div className="mb-2">
            <SailPageTitleSection />

            {!sailViewBasic && (
              <SailExtendedHero
                boostEndTimestamp={activeSailBoostEndTimestamp}
              />
            )}
          </div>

          {!sailViewBasic && (
            <>
              {isConnected && (
                <SailUserStatsCards
                  sailUserStats={sailUserStats}
                  pnlFromMarkets={pnlFromMarkets}
                  pnlSummaryLoading={sailPnLSummary.isLoading}
                />
              )}

              {sailMarksError && (
                <SailMarksSubgraphErrorBanner error={sailMarksError} />
              )}

              <SailLedgerMarksBar
                isLoadingSailMarks={isLoadingSailMarks}
                totalSailMarks={totalSailMarks}
                sailMarksPerDay={sailMarksPerDay}
              />
            </>
          )}

          {isLoadingReads ? null : isReadsError ? (
            <IndexMarketsLoadError onRetry={() => refetchReads()} />
          ) : (
            <SailMarketsSections
              toolbarProps={{
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
                metrics: [
                  {
                    label: "Your Deposits",
                    value: formatCompactUSD(sailUserStats.totalPositionsUSD || 0),
                  },
                ],
              }}
            >
              {sailViewBasic ? (
                <SailBasicMarketCardsGrid
                  activeMarkets={activeMarkets}
                  sailMarketIdToIndex={sailMarketIdToIndex}
                  marketOffsets={marketOffsets}
                  reads={reads}
                  minterConfigByMarketId={minterConfigByMarketId}
                  isConnected={isConnected}
                  onExploreMarket={handleManageMarketOpen}
                />
              ) : (
                <>
                  <SailMarketsTableHeader />
                  <div className="space-y-2">
                    {sortedTableMarkets.map(([id, m]) => {
                      const globalIndex = sailMarketIdToIndex.get(id);
                      if (globalIndex === undefined) return null;
                      const userDeposit = userDepositMap.get(globalIndex);
                      const baseOffset = marketOffsets.get(globalIndex) ?? 0;
                      const isComingSoonRow = isSailSoonUi(m);

                      const priceOracle = m.addresses?.collateralPrice as
                        | `0x${string}`
                        | undefined;
                      const leveragedTokenAddress = m.addresses
                        ?.leveragedToken as `0x${string}` | undefined;
                      const hasOracle = isValidContractAddress(priceOracle);
                      const hasToken = isValidContractAddress(
                        leveragedTokenAddress
                      );

                      const tokenPrices = tokenPricesByMarket[id];
                      const rowKey = `${m.leveragedToken?.symbol ?? id}::${harborMarketChainKey(m)}`;

                      return (
                        <SailMarketRow
                          key={rowKey}
                          id={id}
                          market={m}
                          baseOffset={baseOffset}
                          hasOracle={hasOracle}
                          hasToken={hasToken}
                          reads={reads}
                          userDeposit={userDeposit}
                          isExpanded={expandedMarkets.includes(id)}
                          onToggleExpand={handleToggleMarketExpand}
                          onManageClick={handleManageMarketOpen}
                          isConnected={isConnected}
                          isComingSoon={isComingSoonRow}
                          tokenPrices={tokenPrices}
                          minterConfigData={minterConfigByMarketId.get(id)}
                          rebalanceThresholdData={rebalanceThresholdByMarketId.get(
                            id
                          )}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </SailMarketsSections>
          )}
        </main>

        {selectedMarketId && selectedMarket && (
          <SailManageModal
            isOpen={manageModalOpen}
            onClose={() => {
              setManageModalOpen(false);
              setSelectedMarketId(null);
              setSelectedMarket(null);
            }}
            marketId={selectedMarketId}
            market={selectedMarket}
            initialTab={manageModalTab}
            onSuccess={async () => {
              setManageModalOpen(false);
              setSelectedMarketId(null);
              setSelectedMarket(null);
              await Promise.all([
                refetchReads(),
                refetchUserDeposits(),
                refetchMinterConfigs(),
                refetchRebalanceReads(),
              ]);
              queryClient.invalidateQueries({ queryKey: ["sailPositionPnL"] });
              queryClient.invalidateQueries({
                queryKey: ["sailPositionsPnLSummary"],
              });
              queryClient.invalidateQueries({
                queryKey: ["sailPositionsForPnL"],
              });
            }}
            leveragedTokenPriceUSD={
              tokenPricesByMarket[selectedMarketId]?.leveragedPriceUSD
            }
            ethPrice={sailPageEthPrice}
            wstETHPrice={sailPageWstETHPrice}
            fxSAVEPrice={sailPageFxSAVEPrice}
          />
        )}
      </div>
    </>
  );
}
