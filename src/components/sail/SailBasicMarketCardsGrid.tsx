"use client";

import { useEffect, useMemo, useState } from "react";
import { isSailSoonUi, type DefinedMarket } from "@/config/markets";
import { buildSailMarketCardModel } from "@/utils/sailMarketCardModel";
import type { SailContractReads } from "@/types/sail";
import { BASIC_MARKET_CARDS_GRID_CLASS } from "@/components/market-cards/harborBasicMarketTokens";
import {
  harborChainsFromMarkets,
  harborMarketChainKey,
} from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import { SailBasicMarketCard } from "./SailBasicMarketCard";
import { getLongSide, getShortSide } from "@/utils/marketSideLabels";
import { buildSailUserPositionLabel } from "@/utils/sailUserPositionLabel";
import { formatCompactUSD } from "@/utils/anchor";

export type SailBasicMarketCardsGridProps = {
  activeMarkets: Array<[string, DefinedMarket]>;
  sailMarketIdToIndex: Map<string, number>;
  marketOffsets: Map<number, number>;
  reads: SailContractReads;
  minterConfigByMarketId: Map<string, unknown>;
  isConnected: boolean;
  onExploreMarket: (marketId: string, m: DefinedMarket) => void;
  userDepositMap: Map<number, bigint | undefined>;
  tokenPricesByMarket: Record<
    string,
    { leveragedPriceUSD?: number } | undefined
  >;
};

type SailCardRow = {
  id: string;
  market: DefinedMarket;
  model: ReturnType<typeof buildSailMarketCardModel>;
  isComingSoon: boolean;
  userDeposit?: bigint;
  positionLabel?: string;
};

function isValidContractAddress(addr: unknown): boolean {
  return (
    typeof addr === "string" && addr.startsWith("0x") && addr.length === 42
  );
}

function buildPositionLabel(
  market: DefinedMarket,
  userDeposit: bigint | undefined,
  leveragedPriceUSD: number | undefined
): { hasPosition: boolean; label?: string } {
  const info = buildSailUserPositionLabel(
    market,
    userDeposit,
    leveragedPriceUSD
  );
  return { hasPosition: info.hasPosition, label: info.label };
}

function buildRows(
  activeMarkets: SailBasicMarketCardsGridProps["activeMarkets"],
  sailMarketIdToIndex: Map<string, number>,
  marketOffsets: Map<number, number>,
  reads: SailContractReads,
  minterConfigByMarketId: Map<string, unknown>,
  userDepositMap: Map<number, bigint | undefined>,
  tokenPricesByMarket: SailBasicMarketCardsGridProps["tokenPricesByMarket"]
): SailCardRow[] {
  return activeMarkets.flatMap(([id, m]) => {
    const globalIndex = sailMarketIdToIndex.get(id);
    if (globalIndex === undefined) return [];
    const baseOffset = marketOffsets.get(globalIndex) ?? 0;
    const userDeposit = userDepositMap.get(globalIndex);
    const leveragedPriceUSD = tokenPricesByMarket[id]?.leveragedPriceUSD;
    const { hasPosition, label: positionLabel } = buildPositionLabel(
      m,
      userDeposit,
      leveragedPriceUSD
    );

    const priceOracle = m.addresses?.collateralPrice;
    const leveragedTokenAddress = m.addresses?.leveragedToken;
    const hasOracle = isValidContractAddress(priceOracle);
    const hasToken = isValidContractAddress(leveragedTokenAddress);

    const isComingSoon = isSailSoonUi(m);
    if (isComingSoon) {
      return [
        {
          id,
          market: m,
          model: {
            leverageRatio: 10n ** 18n,
            collateralRatio: undefined,
            longSide: getLongSide(m),
            shortSide: getShortSide(m),
            mintFeeRatio: 10n ** 18n,
            redeemFeeRatio: 10n ** 18n,
            activeMintBand: undefined,
            activeRedeemBand: undefined,
            mintBands: undefined,
            redeemBands: undefined,
            direction: "LONG",
            collateralSymbol: m.collateral?.symbol || "",
          },
          isComingSoon: true,
          userDeposit,
          positionLabel,
        },
      ];
    }

    const model = buildSailMarketCardModel(
      m,
      reads,
      baseOffset,
      hasOracle,
      hasToken,
      minterConfigByMarketId.get(id)
    );

    return [
      {
        id,
        market: m,
        model,
        isComingSoon: false,
        userDeposit,
        positionLabel,
      },
    ];
  });
}

function SailBasicMarketCardGroup({
  hsSymbol,
  entries,
  isConnected,
  onExploreMarket,
  tokenPricesByMarket,
}: {
  hsSymbol: string;
  entries: SailCardRow[];
  isConnected: boolean;
  onExploreMarket: (marketId: string, m: DefinedMarket) => void;
  tokenPricesByMarket: SailBasicMarketCardsGridProps["tokenPricesByMarket"];
}) {
  const chains = useMemo(
    () => harborChainsFromMarkets(entries.map((e) => e.market)),
    [entries]
  );
  const isMultichain = chains.length > 1;

  const [selectedChainKey, setSelectedChainKey] = useState(() =>
    harborMarketChainKey(entries[0]?.market ?? {})
  );
  const [selectedMarketId, setSelectedMarketId] = useState(
    () => entries[0]?.id ?? ""
  );

  useEffect(() => {
    const entry = entries.find((e) => e.id === selectedMarketId);
    if (entry) {
      setSelectedChainKey(harborMarketChainKey(entry.market));
    }
  }, [selectedMarketId, entries]);

  const selected =
    entries.find((e) => e.id === selectedMarketId) ??
    entries.find((e) => harborMarketChainKey(e.market) === selectedChainKey) ??
    entries[0];

  const handleChainSelect = (chainKey: string) => {
    setSelectedChainKey(chainKey);
    const onChain = entries.find(
      (e) => harborMarketChainKey(e.market) === chainKey
    );
    if (onChain) setSelectedMarketId(onChain.id);
  };

  if (!selected) return null;

  const groupPositionLabel = useMemo(() => {
    let usd = 0;
    let hasPosition = false;
    for (const entry of entries) {
      if (!entry.userDeposit || entry.userDeposit === 0n) continue;
      hasPosition = true;
      const price = tokenPricesByMarket[entry.id]?.leveragedPriceUSD ?? 0;
      if (price > 0) {
        usd += (Number(entry.userDeposit) / 1e18) * price;
      }
    }
    if (!hasPosition) return undefined;
    return usd > 0
      ? `Your position · ${formatCompactUSD(usd)}`
      : "Your position";
  }, [entries, tokenPricesByMarket]);

  return (
    <SailBasicMarketCard
      key={hsSymbol}
      marketId={selected.id}
      market={selected.market}
      model={selected.model}
      isConnected={isConnected}
      onExploreMarket={onExploreMarket}
      isComingSoon={selected.isComingSoon}
      positionLabel={groupPositionLabel}
      networkChains={chains}
      selectedChainKey={isMultichain ? selectedChainKey : undefined}
      onChainSelect={isMultichain ? handleChainSelect : undefined}
    />
  );
}

export function SailBasicMarketCardsGrid({
  activeMarkets,
  sailMarketIdToIndex,
  marketOffsets,
  reads,
  minterConfigByMarketId,
  isConnected,
  onExploreMarket,
  userDepositMap,
  tokenPricesByMarket,
}: SailBasicMarketCardsGridProps) {
  const rows = useMemo(
    () =>
      buildRows(
        activeMarkets,
        sailMarketIdToIndex,
        marketOffsets,
        reads,
        minterConfigByMarketId,
        userDepositMap,
        tokenPricesByMarket
      ),
    [
      activeMarkets,
      sailMarketIdToIndex,
      marketOffsets,
      reads,
      minterConfigByMarketId,
      userDepositMap,
      tokenPricesByMarket,
    ]
  );

  const groups = useMemo(() => {
    const bySymbol = new Map<string, SailCardRow[]>();
    for (const row of rows) {
      const sym =
        row.market.leveragedToken?.symbol?.toUpperCase() || row.id;
      const list = bySymbol.get(sym) ?? [];
      list.push(row);
      bySymbol.set(sym, list);
    }
    return Array.from(bySymbol.entries()).map(([hsSymbol, list]) => ({
      hsSymbol,
      list,
    }));
  }, [rows]);

  return (
    <div className={BASIC_MARKET_CARDS_GRID_CLASS}>
      {groups.map(({ hsSymbol, list }) =>
        list.length === 1 ? (
          <SailBasicMarketCard
            key={list[0].id}
            marketId={list[0].id}
            market={list[0].market}
            model={list[0].model}
            isConnected={isConnected}
            onExploreMarket={onExploreMarket}
            isComingSoon={list[0].isComingSoon}
            positionLabel={list[0].positionLabel}
          />
        ) : (
          <SailBasicMarketCardGroup
            key={hsSymbol}
            hsSymbol={hsSymbol}
            entries={list}
            isConnected={isConnected}
            onExploreMarket={onExploreMarket}
            tokenPricesByMarket={tokenPricesByMarket}
          />
        )
      )}
    </div>
  );
}
