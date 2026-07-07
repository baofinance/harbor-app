"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { markets, getGenesisStatus, type Market } from "@/config/markets";
import { resolveFeaturedActiveMarketIds } from "@/config/maidenVoyageFeatured";
import { readContractRowResult } from "@/components/genesis/readContractRow";
import { useGenesisContractReads } from "@/hooks/useGenesisContractReads";
import { useGenesisPageData } from "@/hooks/useGenesisPageData";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import {
  deriveActiveVoyageStatus,
  getActiveVoyageStatusLabel,
  type ActiveVoyageStatus,
  type GenesisPhase,
} from "@/utils/activeVoyageStatus";
import { formatGenesisMarketDisplayName } from "@/utils/genesisDisplay";
import { resolveGenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";

export type DashboardActiveVoyageSnapshot = {
  marketId: string;
  voyageLabel: string;
  flowLabel: string;
  filledPct: number | null;
  capCurrentUsd: number | null;
  capTotalUsd: number | null;
  status: ActiveVoyageStatus;
  statusLabel: string;
  userDepositUsd: number | null;
  isLoading: boolean;
};

export function useDashboardActiveVoyage(): DashboardActiveVoyageSnapshot | null {
  const { address, isConnected } = useAccount();
  const {
    genesisMarkets,
    maidenVoyageCampaignResults,
    marksResults,
    isLoadingMaidenVoyageIndex,
  } = useGenesisPageData();

  const featuredIds = useMemo(
    () => resolveFeaturedActiveMarketIds(genesisMarkets.map(([id]) => id)),
    [genesisMarkets],
  );

  const activeMarketEntry = useMemo((): [string, GenesisMarketConfig] | null => {
    const id = featuredIds[0];
    if (!id) return null;
    const fromList = genesisMarkets.find(([marketId]) => marketId === id);
    if (fromList) return fromList as [string, GenesisMarketConfig];
    const mkt = markets[id as keyof typeof markets] as GenesisMarketConfig | undefined;
    if (mkt?.addresses?.genesis) return [id, mkt];
    return null;
  }, [genesisMarkets, featuredIds]);

  const singleMarket = useMemo(
    () => (activeMarketEntry ? [activeMarketEntry] : []),
    [activeMarketEntry],
  );

  const { reads, totalDepositsReads } = useGenesisContractReads(
    singleMarket,
    isConnected,
    address,
  );

  return useMemo(() => {
    if (!activeMarketEntry) return null;
    const [marketId, mkt] = activeMarketEntry;
    const baseOffset = 0;
    const onChainEnded =
      readContractRowResult<boolean>(reads, baseOffset) ?? false;
    const genesisStatus = getGenesisStatus(mkt as Market, onChainEnded);
    const genesisPhase = genesisStatus.phase as GenesisPhase;

    const claimableResult = isConnected
      ? readContractRowResult<[bigint, bigint]>(reads, baseOffset + 2)
      : undefined;
    const hasClaimable =
      (claimableResult?.[0] ?? 0n) > 0n || (claimableResult?.[1] ?? 0n) > 0n;

    const collateralSymbol = mkt.collateral?.symbol || "Collateral";
    const peggedSymbol = mkt.peggedToken?.symbol ?? "Anchor";
    const peggedNoPrefix = peggedSymbol.toLowerCase().startsWith("ha")
      ? peggedSymbol.slice(2)
      : peggedSymbol;

    const totalDeposits = readContractRowResult<bigint>(totalDepositsReads, 0);
    const totalDepositsAmount =
      totalDeposits && totalDeposits > 0n ? Number(formatEther(totalDeposits)) : 0;

    const capResolve = resolveGenesisVoyageCapDisplay({
      genesisAddress: mkt.addresses?.genesis,
      collateralSymbol,
      totalDepositsAmount,
      totalDepositsUsd: 0,
      maidenVoyageCampaignResults: maidenVoyageCampaignResults ?? [],
      marksResults: marksResults ?? [],
      genesisTokenCapAmount: mkt.genesisTokenCapAmount,
      readsLoaded: !!reads,
      isLoadingCapIndex: isLoadingMaidenVoyageIndex,
    });

    const status = deriveActiveVoyageStatus({
      market: mkt,
      onChainEnded,
      hasClaimable,
      genesisPhase,
      capDisplay: capResolve.cap,
    });

    const userDeposit = isConnected
      ? readContractRowResult<bigint>(reads, baseOffset + 1)
      : undefined;

    const rowLeveragedSymbol = mkt.leveragedToken?.symbol;
    const rawDisplayMarketName =
      rowLeveragedSymbol && rowLeveragedSymbol.toLowerCase().startsWith("hs")
        ? rowLeveragedSymbol.slice(2)
        : rowLeveragedSymbol || mkt.name || "Market";

    return {
      marketId,
      voyageLabel: formatGenesisMarketDisplayName(rawDisplayMarketName),
      flowLabel: `${collateralSymbol} → ${peggedNoPrefix}`,
      filledPct: capResolve.cap?.filledPct ?? null,
      capCurrentUsd: capResolve.cap?.capCurrentUsd ?? null,
      capTotalUsd: capResolve.cap?.capTotalUsd ?? null,
      status,
      statusLabel: getActiveVoyageStatusLabel(status),
      userDepositUsd:
        userDeposit && userDeposit > 0n ? Number(formatEther(userDeposit)) : null,
      isLoading: capResolve.isLoading,
    };
  }, [
    activeMarketEntry,
    reads,
    totalDepositsReads,
    isConnected,
    maidenVoyageCampaignResults,
    marksResults,
    isLoadingMaidenVoyageIndex,
  ]);
}
