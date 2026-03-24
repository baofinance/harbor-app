"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
} from "@/components/sail";
import { isBasicPageLayout } from "@/utils/pageLayoutView";
import type { DefinedMarket } from "@/config/markets";

export default function SailPage() {
  const searchParams = useSearchParams();
  /** Nav toggle: Basic = title + markets only (no hero cards, stats strips, Sail Marks bar). See `pageLayoutView`. */
  const sailViewBasic = isBasicPageLayout(searchParams);

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
  } = useSailPageData();

  const [expandedMarkets, setExpandedMarkets] = useState<string[]>([]);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<DefinedMarket | null>(
    null
  );
  const [manageModalTab, setManageModalTab] = useState<"mint" | "redeem">(
    "mint"
  );

  const queryClient = useQueryClient();

  const handleToggleMarketExpand = useCallback((marketId: string) => {
    setExpandedMarkets((prev) =>
      prev.includes(marketId)
        ? prev.filter((x) => x !== marketId)
        : [...prev, marketId]
    );
  }, []);

  const handleManageMarketOpen = useCallback(
    (marketId: string, m: DefinedMarket) => {
      setSelectedMarketId(marketId);
      setSelectedMarket(m);
      setManageModalTab("mint");
      setManageModalOpen(true);
    },
    []
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col text-white max-w-[1300px] mx-auto font-sans relative w-full">
        <main className="container mx-auto px-4 sm:px-10 pb-6">
          <div className="mb-2">
            <SailPageTitleSection />

            {sailViewBasic && (
              <div className="border-t border-white/10 my-3" aria-hidden />
            )}

            {!sailViewBasic && (
              <SailExtendedHero
                boostEndTimestamp={activeSailBoostEndTimestamp}
              />
            )}
          </div>

          {!sailViewBasic && (
            <>
              <div className="border-t border-white/10 my-2" />

              {isConnected && (
                <SailUserStatsCards
                  sailUserStats={sailUserStats}
                  pnlFromMarkets={pnlFromMarkets}
                  pnlSummaryLoading={sailPnLSummary.isLoading}
                />
              )}

              {sailMarksError && <SailMarksSubgraphErrorBanner />}

              <SailLedgerMarksBar
                isLoadingSailMarks={isLoadingSailMarks}
                totalSailMarks={totalSailMarks}
                sailMarksPerDay={sailMarksPerDay}
              />

              <div className="border-t border-white/10 mb-3" />
            </>
          )}

          {isLoadingReads ? null : isReadsError ? (
            <div className="bg-[#17395F] border border-white/10 p-6 rounded-lg text-center">
              <p className="text-white text-lg font-medium mb-4">
                Error loading markets
              </p>
              <button
                type="button"
                onClick={() => refetchReads()}
                className="px-4 py-2 bg-[#FF8A7A] text-white rounded hover:bg-[#FF6B5A] transition-colors"
              >
                Try again
              </button>
            </div>
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
              }}
            >
              <SailMarketsTableHeader />
              <div className="space-y-2">
                {activeMarkets.map(([id, m]) => {
                  const globalIndex = sailMarketIdToIndex.get(id);
                  if (globalIndex === undefined) return null;
                  const userDeposit = userDepositMap.get(globalIndex);
                  const baseOffset = marketOffsets.get(globalIndex) ?? 0;

                  const priceOracle = m.addresses?.collateralPrice as
                    | `0x${string}`
                    | undefined;
                  const leveragedTokenAddress = m.addresses?.leveragedToken as
                    | `0x${string}`
                    | undefined;
                  const isValidAddress = (addr: unknown): boolean =>
                    typeof addr === "string" &&
                    addr.startsWith("0x") &&
                    addr.length === 42;
                  const hasOracle = isValidAddress(priceOracle);
                  const hasToken = isValidAddress(leveragedTokenAddress);

                  const tokenPrices = tokenPricesByMarket[id];

                  return (
                    <SailMarketRow
                      key={id}
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
                      tokenPrices={tokenPrices}
                      minterConfigData={minterConfigByMarketId.get(id)}
                      rebalanceThresholdData={rebalanceThresholdByMarketId.get(
                        id
                      )}
                    />
                  );
                })}
              </div>
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
