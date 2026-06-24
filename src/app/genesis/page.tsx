"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { formatEther } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { GenesisManageModal } from "@/components/GenesisManageModal";
import { GenesisErrorBanner } from "@/components/GenesisErrorBanner";
import { useMultipleCollateralPrices } from "@/hooks/useCollateralPrice";
import { useSortedGenesisMarkets } from "@/hooks/useSortedGenesisMarkets";
import {
  GenesisClaimProgressModal,
  GenesisMaidenVoyageComingSoon,
  GenesisMaidenVoyageExplorer,
  GenesisMaidenVoyageFaq,
  GenesisMaidenVoyageFeaturedSection,
  GenesisMaidenVoyageLifecycle,
  GenesisMaidenVoyageStatsBar,
  GenesisRevenueShareSection,
  GenesisVoyageFooterNotice,
  GenesisYieldShareRulesCard,
} from "@/components/genesis";
import { GenesisHeaderSummary } from "@/components/GenesisHeaderSummary";
import { GenesisPageTitleSection } from "@/components/genesis/GenesisPageTitleSection";
import { MV_DETAILS_PANEL } from "@/components/genesis/maidenVoyageLayoutStyles";
import { computeMaidenVoyageConfidenceStats } from "@/utils/maidenVoyageConfidenceStats";
import { computeMaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import { useGenesisClaimMarket } from "@/hooks/useGenesisClaimMarket";
import { useGenesisPageData } from "@/hooks/useGenesisPageData";
import { useOpenMarketManageModal } from "@/hooks/useOpenMarketManageModal";
import { useGenesisContractReads } from "@/hooks/useGenesisContractReads";
import { useGenesisManageRefetch } from "@/hooks/useGenesisManageRefetch";
import {
  FEATURED_ACTIVE_MARKET_ID,
  getNextFeaturedActiveMarketId,
  resolveFeaturedActiveMarketIds,
} from "@/config/maidenVoyageFeatured";
import { maidenVoyageYieldOwnerSharePercent } from "@/config/maidenVoyageYield";
import {
  getGenesisStatus,
  isMarketArchived,
  markets,
  type Market,
} from "@/config/markets";
import { useCoinGeckoPrices } from "@/hooks/useCoinGeckoPrice";
import { computeGenesisRowUsdPricing } from "@/utils/genesisRowPricing";
import { formatToken, formatUSD } from "@/utils/formatters";
import { resolveGenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";
import {
  deriveActiveVoyageStatus,
  type GenesisPhase,
} from "@/utils/activeVoyageStatus";
import { formatGenesisMarketDisplayName } from "@/utils/genesisDisplay";
import { readContractRowResult } from "@/components/genesis/readContractRow";
import { usePageLayoutPreference } from "@/contexts/PageLayoutPreferenceContext";
import { HarborPageShell } from "@/components/shared/HarborPageShell";

const SHOW_MAIDEN_VOYAGE_COMING_SOON =
  process.env.NEXT_PUBLIC_SHOW_MAIDEN_VOYAGE_COMING_SOON === "true";

export default function GenesisIndexPage() {
  /** Nav toggle: Basic (UI) = hero + sidebar + ongoing/upcoming filters; Extended (UI+) = full page. */
  const { isBasic: genesisViewBasic } = usePageLayoutPreference();

  const { address, isConnected } = useAccount();
  const connectedChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [manageModal, setManageModal] = useState<{
    marketId: string;
    market: GenesisMarketConfig;
    initialTab?: "deposit" | "withdraw";
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [claimingMarket, setClaimingMarket] = useState<string | null>(null);
  const [claimModal, setClaimModal] = useState<{
    open: boolean;
    status: "pending" | "success" | "error";
    marketId?: string | null;
    errorMessage?: string;
  }>({ open: false, status: "pending", marketId: null });
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    marketName?: string;
    peggedSymbol?: string;
  }>({ open: false });
  const [featuredMarketId, setFeaturedMarketId] = useState<string>(
    FEATURED_ACTIVE_MARKET_ID,
  );

  const openManageModalBase = useOpenMarketManageModal<{
    marketId: string;
    market: GenesisMarketConfig;
    initialTab?: "deposit" | "withdraw";
  }>({
    isConnected,
    connectedChainId,
    switchChain,
    setManageModal,
    logLabel: "Genesis",
  });

  const openManageModal = useCallback(
    async (
      marketId: string,
      market: GenesisMarketConfig,
      initialTab: "deposit" | "withdraw" = "deposit",
    ) => {
      const resolvedTab =
        isMarketArchived(market) && initialTab === "deposit"
          ? "withdraw"
          : initialTab;
      await openManageModalBase({
        marketId,
        market,
        initialTab: resolvedTab,
      });
    },
    [openManageModalBase],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    genesisMarkets,
    genesisAddresses,
    marksResults,
    refetchMarks,
    marksError,
    maidenVoyageCampaignResults,
    isLoadingMaidenVoyageIndex,
    combinedHasIndexerErrors,
    combinedMarketsWithIndexerErrors,
    combinedHasAnyErrors,
    combinedMarketsWithOtherErrors,
    hasOraclePricingError,
    marketsWithOraclePricingError,
    getMarketName,
    comingSoonMarkets,
  } = useGenesisPageData();

  const queryClient = useQueryClient();

  const {
    reads,
    refetchReads,
    refetchCollateralTokens,
    refetchTotalDeposits,
    totalDepositsReads,
  } = useGenesisContractReads(
    genesisMarkets as Array<[string, GenesisMarketConfig]>,
    isConnected,
    address,
  );

  const onGenesisManageSuccess = useGenesisManageRefetch({
    refetchCollateralTokens,
    refetchReads,
    refetchTotalDeposits,
    refetchMarks,
  });

  const { claimMarket } = useGenesisClaimMarket({
    setClaimingMarket,
    setClaimModal,
    setShareModal,
    refetchReads,
    refetchTotalDeposits,
  });

  const handleOpenManageModal = useCallback(
    async (
      marketId: string,
      market: GenesisMarketConfig,
      initialTab: "deposit" | "withdraw" = "deposit",
    ) => {
      await openManageModal(marketId, market, initialTab);
    },
    [openManageModal],
  );

  const collateralOracleAddresses = useMemo(() => {
    return genesisMarkets.map(
      ([_, mkt]) =>
        (mkt as GenesisMarketConfig).addresses?.collateralPrice as
          | `0x${string}`
          | undefined,
    );
  }, [genesisMarkets]);

  const { prices: collateralPricesMap } = useMultipleCollateralPrices(
    collateralOracleAddresses,
    {
      refetchInterval: 120000,
      enabled: true,
    },
  );

  const coinGeckoIds = useMemo(() => {
    const ids = genesisMarkets
      .map(([_, mkt]) => (mkt as GenesisMarketConfig)?.coinGeckoId)
      .filter((id): id is string => !!id);
    const hasWstETH = genesisMarkets.some(
      ([_, mkt]) =>
        (mkt as GenesisMarketConfig)?.collateral?.symbol?.toLowerCase() ===
        "wsteth",
    );
    if (hasWstETH && !ids.includes("lido-staked-ethereum-steth")) {
      ids.push("lido-staked-ethereum-steth");
    }
    return ids;
  }, [genesisMarkets]);

  const { prices: coinGeckoPrices, isLoading: coinGeckoLoading } =
    useCoinGeckoPrices(coinGeckoIds, 120000);

  useEffect(() => {
    if (!reads || !isConnected) return;

    const anyEnded = genesisMarkets.some(([_, __], mi) => {
      const baseOffset = mi * (isConnected ? 3 : 1);
      return (reads?.[baseOffset]?.result as boolean) ?? false;
    });

    if (anyEnded) {
      const marksInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["allHarborMarks"] });
        refetchMarks();
      }, 30000);
      return () => clearInterval(marksInterval);
    }
  }, [reads, isConnected, genesisMarkets, queryClient, refetchMarks]);

  const { archivedCompletedMarkets } = useSortedGenesisMarkets({
    genesisMarkets,
    reads,
    isConnected,
    marksResults,
  });

  const hasArchivedUserDeposit = useMemo(() => {
    if (!reads || !isConnected) return false;
    const archivedIds = new Set(archivedCompletedMarkets.map(([id]) => id));
    return genesisMarkets.some(([id], marketIndex) => {
      if (!archivedIds.has(id)) return false;
      const baseOffset = marketIndex * 3;
      const userDeposit = reads?.[baseOffset + 1]?.result as bigint | undefined;
      return userDeposit != null && userDeposit > 0n;
    });
  }, [reads, isConnected, genesisMarkets, archivedCompletedMarkets]);

  const featuredActiveMarketIds = useMemo(
    () => resolveFeaturedActiveMarketIds(genesisMarkets.map(([id]) => id)),
    [genesisMarkets],
  );

  useEffect(() => {
    if (featuredActiveMarketIds.length === 0) return;
    if (!featuredActiveMarketIds.includes(featuredMarketId as (typeof featuredActiveMarketIds)[number])) {
      setFeaturedMarketId(featuredActiveMarketIds[0]!);
    }
  }, [featuredActiveMarketIds, featuredMarketId]);

  const activeMarketEntry = useMemo((): [string, GenesisMarketConfig] | null => {
    const resolvedId =
      featuredActiveMarketIds.includes(
        featuredMarketId as (typeof featuredActiveMarketIds)[number],
      )
        ? featuredMarketId
        : featuredActiveMarketIds[0] ?? FEATURED_ACTIVE_MARKET_ID;

    const fromList = genesisMarkets.find(([id]) => id === resolvedId);
    if (fromList) return fromList as [string, GenesisMarketConfig];
    const mkt = markets[resolvedId as keyof typeof markets] as
      | GenesisMarketConfig
      | undefined;
    if (mkt?.addresses?.genesis) {
      return [resolvedId, mkt];
    }
    return null;
  }, [genesisMarkets, featuredMarketId, featuredActiveMarketIds]);

  const handleNextFeaturedMarket = useCallback(() => {
    setFeaturedMarketId((current) =>
      getNextFeaturedActiveMarketId(current, featuredActiveMarketIds),
    );
  }, [featuredActiveMarketIds]);

  const activeMarketData = useMemo(() => {
    if (!activeMarketEntry) return null;
    const [marketId, mkt] = activeMarketEntry;
    const mi = genesisMarkets.findIndex(([id]) => id === marketId);
    const marketIndex = mi >= 0 ? mi : 0;
    const baseOffset = marketIndex * (isConnected ? 3 : 1);
    const onChainEnded =
      readContractRowResult<boolean>(reads, baseOffset) ?? false;
    const genesisStatus = getGenesisStatus(mkt as Market, onChainEnded);
    const genesisPhase = genesisStatus.phase as GenesisPhase;

    const claimableResult = isConnected
      ? readContractRowResult<[bigint, bigint]>(reads, baseOffset + 2)
      : undefined;
    const claimablePegged = claimableResult?.[0] || 0n;
    const claimableLeveraged = claimableResult?.[1] || 0n;
    const hasClaimable =
      claimablePegged > 0n || claimableLeveraged > 0n;

    const collateralSymbol = mkt.collateral?.symbol || "wstETH";
    const oracleAddress = mkt.addresses?.collateralPrice as
      | `0x${string}`
      | undefined;
    const collateralPriceData = oracleAddress
      ? collateralPricesMap.get(oracleAddress.toLowerCase())
      : undefined;
    const underlyingSymbol =
      mkt.collateral?.underlyingSymbol || collateralSymbol;
    const { collateralPriceUSD } = computeGenesisRowUsdPricing({
      underlyingSymbol,
      pegTarget: mkt.pegTarget,
      marketCoinGeckoId: mkt.coinGeckoId,
      coinGeckoPrices,
      collateralPriceData,
      chainlinkBtcPrice: null,
      coinGeckoLoading,
      collateralSymbol,
    });

    const totalDeposits = readContractRowResult<bigint>(
      totalDepositsReads,
      marketIndex,
    );
    const totalDepositsAmount =
      totalDeposits && totalDeposits > 0n
        ? Number(formatEther(totalDeposits))
        : 0;
    const totalDepositsUsd =
      totalDepositsAmount > 0 && collateralPriceUSD > 0
        ? totalDepositsAmount * collateralPriceUSD
        : 0;

    const capResolve = resolveGenesisVoyageCapDisplay({
      genesisAddress: mkt.addresses?.genesis,
      collateralSymbol,
      totalDepositsAmount,
      totalDepositsUsd,
      maidenVoyageCampaignResults:
        (maidenVoyageCampaignResults ?? []) as Parameters<
          typeof resolveGenesisVoyageCapDisplay
        >[0]["maidenVoyageCampaignResults"],
      marksResults: (marksResults ?? []) as Parameters<
        typeof resolveGenesisVoyageCapDisplay
      >[0]["marksResults"],
      genesisTokenCapAmount: mkt.genesisTokenCapAmount,
      readsLoaded: mounted && !!reads,
      isLoadingCapIndex: isLoadingMaidenVoyageIndex,
    });
    const capDisplay = capResolve.cap;

    const voyageStatus = deriveActiveVoyageStatus({
      market: mkt,
      onChainEnded,
      hasClaimable,
      genesisPhase,
      capDisplay,
    });

    const rowLeveragedSymbol = mkt.leveragedToken?.symbol;
    const rawDisplayMarketName =
      rowLeveragedSymbol && rowLeveragedSymbol.toLowerCase().startsWith("hs")
        ? rowLeveragedSymbol.slice(2)
        : rowLeveragedSymbol || mkt.name || "Market";
    const displayMarketName = formatGenesisMarketDisplayName(rawDisplayMarketName);
    const peggedSymbol = mkt.peggedToken?.symbol || "ha";
    const peggedNoPrefix =
      peggedSymbol.toLowerCase().startsWith("ha")
        ? peggedSymbol.slice(2)
        : peggedSymbol;

    const userDeposit = isConnected
      ? readContractRowResult<bigint>(reads, baseOffset + 1)
      : undefined;
    const userDepositUsd =
      userDeposit && userDeposit > 0n && collateralPriceUSD > 0
        ? Number(formatEther(userDeposit)) * collateralPriceUSD
        : null;
    const userDepositDisplay =
      userDepositUsd != null && userDepositUsd > 0
        ? formatUSD(userDepositUsd)
        : userDeposit && userDeposit > 0n
          ? `${formatToken(userDeposit)} ${collateralSymbol}`
          : undefined;

    const genesisAddress = mkt.addresses?.genesis;
    const yieldRevSharePct =
      capDisplay?.yieldRevSharePct ??
      maidenVoyageYieldOwnerSharePercent(genesisAddress?.toLowerCase() ?? null);

    return {
      marketId,
      mkt,
      onChainEnded,
      capDisplay,
      capLoading: capResolve.isLoading,
      capUnavailable: capResolve.isUnavailable,
      voyageStatus,
      userDepositDisplay,
      userDepositUsd,
      displayMarketName,
      peggedNoPrefix,
      genesisAddress,
      yieldRevSharePct,
    };
  }, [
    activeMarketEntry,
    genesisMarkets,
    reads,
    isConnected,
    collateralPricesMap,
    coinGeckoPrices,
    coinGeckoLoading,
    maidenVoyageCampaignResults,
    marksResults,
    totalDepositsReads,
    mounted,
    isLoadingMaidenVoyageIndex,
  ]);

  const confidenceStats = useMemo(
    () =>
      computeMaidenVoyageConfidenceStats({
        genesisMarkets: genesisMarkets as Array<[string, GenesisMarketConfig]>,
        reads,
        totalDepositsReads,
        isConnected,
        collateralPricesMap,
        coinGeckoPrices,
        coinGeckoLoading,
        chainlinkBtcPrice: null,
      }),
    [
      genesisMarkets,
      reads,
      totalDepositsReads,
      isConnected,
      collateralPricesMap,
      coinGeckoPrices,
      coinGeckoLoading,
    ],
  );

  const statsBarData = useMemo(
    () =>
      computeMaidenVoyageStatsBarData({
        confidenceStats,
        activeDepositsUsd:
          activeMarketData?.capDisplay?.capCurrentUsd ?? null,
        activeCapTotalUsd:
          activeMarketData?.capDisplay?.capTotalUsd ?? null,
      }),
    [
      confidenceStats,
      activeMarketData?.capDisplay?.capCurrentUsd,
      activeMarketData?.capDisplay?.capTotalUsd,
    ],
  );

  const buildShareMessage = (
    marketName: string,
    peggedSymbolNoPrefix: string,
  ) => {
    return `The ${marketName} market is live on @0xharborfi — Maiden voyage 2.0. Become a shareholder: ${peggedSymbolNoPrefix} and leveraged ${marketName} at harborfinance.io\n\n$TIDE airdrop and ledger marks for early Harbor liquidity.`;
  };

  const openShareIntent = (marketName: string, peggedSymbol: string) => {
    const msg = buildShareMessage(marketName, peggedSymbol);
    const encoded = encodeURIComponent(msg);
    const url = `https://x.com/intent/tweet?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (SHOW_MAIDEN_VOYAGE_COMING_SOON) {
    return <GenesisMaidenVoyageComingSoon />;
  }

  return (
    <>
    <HarborPageShell>
        {genesisViewBasic ? (
          <GenesisPageTitleSection />
        ) : (
          <GenesisHeaderSummary />
        )}

        {combinedHasIndexerErrors ? (
          <GenesisErrorBanner
            tone="warning"
            title="Indexer delay"
            message="Some markets may show stale marks data."
            markets={combinedMarketsWithIndexerErrors.map(getMarketName)}
          />
        ) : null}
        {combinedHasAnyErrors && !combinedHasIndexerErrors ? (
          <GenesisErrorBanner
            tone="warning"
            title="Data warning"
            message="Issues detected for some markets."
            markets={combinedMarketsWithOtherErrors.map(getMarketName)}
          />
        ) : null}
        {hasOraclePricingError ? (
          <GenesisErrorBanner
            tone="warning"
            title="Pricing"
            message="Oracle pricing is unavailable for some markets."
            markets={marketsWithOraclePricingError.map(getMarketName)}
          />
        ) : null}
        {!genesisViewBasic && marksError ? (
          <div className="mb-4">
            <GenesisErrorBanner
              tone="danger"
              title="Marks unavailable"
              message="Ledger marks could not be loaded. Deposits and claims still work on-chain."
            />
          </div>
        ) : null}

        {!genesisViewBasic ? (
          <GenesisMaidenVoyageStatsBar stats={statsBarData} />
        ) : null}

        <GenesisMaidenVoyageFeaturedSection
          yieldRevSharePct={activeMarketData?.yieldRevSharePct ?? null}
          activeCard={
            activeMarketData
              ? {
                  market: activeMarketData.mkt,
                  marketId: activeMarketData.marketId,
                  stats: statsBarData,
                  capDisplay: activeMarketData.capDisplay,
                  capLoading: activeMarketData.capLoading,
                  capUnavailable: activeMarketData.capUnavailable,
                  voyageStatus: activeMarketData.voyageStatus,
                  endDate: activeMarketData.mkt.genesis?.endDate,
                  yieldRevSharePct: activeMarketData.yieldRevSharePct,
                  genesisAddress: activeMarketData.genesisAddress,
                  userDepositDisplay: activeMarketData.userDepositDisplay,
                  userDepositUsd: activeMarketData.userDepositUsd,
                  isConnected,
                  isClaiming: claimingMarket === activeMarketData.marketId,
                  onDeposit: () =>
                    void handleOpenManageModal(
                      activeMarketData.marketId,
                      activeMarketData.mkt,
                      "deposit",
                    ),
                  onClaim: () =>
                    void claimMarket({
                      marketId: activeMarketData.marketId,
                      genesisAddress: activeMarketData.genesisAddress,
                      displayMarketName: activeMarketData.displayMarketName,
                      peggedSymbolForShare: activeMarketData.peggedNoPrefix,
                    }),
                  onNextMarket:
                    featuredActiveMarketIds.length > 1
                      ? handleNextFeaturedMarket
                      : undefined,
                }
              : null
          }
        />

        <GenesisMaidenVoyageExplorer
          viewBasic={genesisViewBasic}
          genesisMarkets={genesisMarkets as Array<[string, GenesisMarketConfig]>}
          comingSoonMarkets={
            comingSoonMarkets as Array<[string, GenesisMarketConfig]>
          }
          reads={reads}
          totalDepositsReads={totalDepositsReads}
          isConnected={isConnected}
          address={address}
          claimingMarket={claimingMarket}
          collateralPricesMap={collateralPricesMap}
          coinGeckoPrices={coinGeckoPrices}
          coinGeckoLoading={coinGeckoLoading}
          chainlinkBtcPrice={null}
          onClaim={claimMarket}
          onManage={handleOpenManageModal}
          defaultArchivedExpanded={
            genesisViewBasic ? false : hasArchivedUserDeposit
          }
        />

        {!genesisViewBasic ? <GenesisVoyageFooterNotice /> : null}

        {!genesisViewBasic ? (
        <section
          id="maiden-voyage-learn"
          className="mt-10 border-t border-white/10 pt-8"
          aria-label="Learn more"
        >
          <h2 className="mb-6 text-xs font-medium uppercase tracking-wider text-white/50">
            Learn more
          </h2>
          <details className={`mb-4 ${MV_DETAILS_PANEL} px-4 py-3`}>
            <summary className="cursor-pointer text-sm font-semibold text-white/90">
              How a voyage works
            </summary>
            <div className="mt-4">
              <GenesisMaidenVoyageLifecycle />
            </div>
          </details>
          <details className={`mb-4 ${MV_DETAILS_PANEL} px-4 py-3`}>
            <summary className="cursor-pointer text-sm font-semibold text-white/90">
              Revenue &amp; rules
            </summary>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <GenesisRevenueShareSection />
              <GenesisYieldShareRulesCard
                yieldRevSharePct={activeMarketData?.yieldRevSharePct ?? null}
              />
            </div>
          </details>
          <details className={`${MV_DETAILS_PANEL} px-4 py-3`}>
            <summary className="cursor-pointer text-sm font-semibold text-white/90">
              FAQ
            </summary>
            <div className="mt-4">
              <GenesisMaidenVoyageFaq />
            </div>
          </details>
        </section>
        ) : null}
    </HarborPageShell>

      {manageModal ? (
        <GenesisManageModal
          isOpen={!!manageModal}
          onClose={() => setManageModal(null)}
          marketId={manageModal.marketId}
          market={manageModal.market}
          initialTab={manageModal.initialTab}
          onSuccess={onGenesisManageSuccess}
        />
      ) : null}

      <GenesisClaimProgressModal
        open={claimModal.open}
        status={claimModal.status}
        errorMessage={claimModal.errorMessage}
        marketName={shareModal.marketName}
        peggedSymbolNoPrefix={shareModal.peggedSymbol}
        onClose={() =>
          setClaimModal({ open: false, status: "pending", marketId: null })
        }
        onShare={
          shareModal.marketName && shareModal.peggedSymbol
            ? () =>
                openShareIntent(
                  shareModal.marketName || "Market",
                  shareModal.peggedSymbol || "token",
                )
            : undefined
        }
      />
    </>
  );
}
