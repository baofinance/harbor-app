"use client";

import { useEffect, useMemo, useState } from "react";

export type GenesisLedgerMarksCampaign = {
  label: string;
  isActive: boolean;
  marks: number;
  campaignId?: string;
};

export type GenesisLedgerMarksTotalsResult = {
  selectedCampaign: GenesisLedgerMarksCampaign | undefined;
  totalCurrentMarks: number;
  totalMarksPerDay: number;
  totalBonusAtEnd: number;
  anyInProcessing: boolean;
  allContractsEnded: boolean;
};

type MarksResult = {
  genesisAddress?: string;
  data?: { userHarborMarks?: unknown };
  errors?: unknown[];
};

/** Inline with GenesisCampaignStats props */
export type GenesisCampaignStatsPropsMarksResults = MarksResult[];

type GenesisMarketConfig = {
  addresses?: { genesis?: string };
  marksCampaign?: { label?: string; id?: string };
  genesis?: { endDate?: string };
};

function marketConfig(mkt: unknown): GenesisMarketConfig {
  return (mkt && typeof mkt === "object" ? mkt : {}) as GenesisMarketConfig;
}

/** Subgraph userHarborMarks row shape (partial). */
type HarborMarksRecord = {
  campaignLabel?: string;
  campaignId?: string;
  genesisEnded?: boolean;
  currentMarks?: string;
  currentDepositUSD?: string;
  genesisStartDate?: string;
  lastUpdated?: string;
  marksPerDay?: string;
  bonusMarks?: string;
};

function parseUserHarborMarks(raw: unknown): HarborMarksRecord | undefined {
  if (raw == null) return undefined;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (row && typeof row === "object") {
    return row as HarborMarksRecord;
  }
  return undefined;
}

/**
 * Pure campaign selection + Ledger Marks totals (same rules as GenesisCampaignStats).
 * `nowSec` is wall-clock seconds for extrapolation since last subgraph update.
 */
export function computeGenesisLedgerMarksTotals(
  nowSec: number,
  {
    marksResults,
    genesisMarkets,
    reads,
    isConnected,
    isLoadingMarks,
  }: {
    marksResults: MarksResult[] | undefined;
    genesisMarkets: Array<[string, unknown]>;
    reads:
      | Array<{ status?: string; result?: unknown } | undefined>
      | undefined;
    isConnected: boolean;
    isLoadingMarks: boolean;
  }
): GenesisLedgerMarksTotalsResult {
  const campaignInfo = new Map<string, GenesisLedgerMarksCampaign>();

  if (marksResults && marksResults.length > 0 && !isLoadingMarks) {
    marksResults.forEach((result) => {
      const marks = parseUserHarborMarks(result.data?.userHarborMarks);

      const market = genesisMarkets.find(
        ([, mkt]) =>
          marketConfig(mkt).addresses?.genesis?.toLowerCase() ===
          result.genesisAddress?.toLowerCase()
      );

      if (!market) return;

      const cfg = marketConfig(market[1]);
      const campaignLabel =
        cfg.marksCampaign?.label || marks?.campaignLabel;
      const campaignId = cfg.marksCampaign?.id || marks?.campaignId;

      if (!campaignLabel) return;

      let contractSaysEnded: boolean | undefined;
      const marketIndex = genesisMarkets.findIndex(([id]) => id === market[0]);
      if (marketIndex >= 0) {
        const baseOffset = marketIndex * (isConnected ? 3 : 1);
        const contractReadResult = reads?.[baseOffset];
        contractSaysEnded =
          contractReadResult?.status === "success"
            ? (contractReadResult.result as boolean)
            : undefined;
      }

      const genesisEnded =
        contractSaysEnded !== undefined
          ? contractSaysEnded
          : marks?.genesisEnded || false;

      const originalCurrentMarks = parseFloat(marks?.currentMarks || "0");
      const currentDepositUSD = parseFloat(marks?.currentDepositUSD || "0");
      const genesisStartDate = parseInt(marks?.genesisStartDate || "0");
      const lastUpdated = parseInt(marks?.lastUpdated || "0");

      let currentMarks = originalCurrentMarks;
      if (!genesisEnded && currentDepositUSD > 0 && genesisStartDate > 0) {
        const timeElapsed = nowSec - lastUpdated;
        const daysElapsed = Math.max(0, timeElapsed / 86400);
        const marksAccumulated = currentDepositUSD * 10 * daysElapsed;
        currentMarks = currentMarks + marksAccumulated;
      }

      const existing = campaignInfo.get(campaignLabel) || {
        label: campaignLabel,
        isActive: false,
        marks: 0,
        campaignId: campaignId,
      };
      existing.isActive = existing.isActive || !genesisEnded;
      existing.marks += currentMarks;
      campaignInfo.set(campaignLabel, existing);
    });
  }

  const campaigns = Array.from(campaignInfo.values());
  const activeCampaigns = campaigns.filter((c) => c.isActive);
  const campaignsToConsider =
    activeCampaigns.length > 0 ? activeCampaigns : campaigns;
  campaignsToConsider.sort((a, b) => b.marks - a.marks);
  const selectedCampaign = campaignsToConsider[0];
  const selectedCampaignId = selectedCampaign?.campaignId;

  let totalCurrentMarks = 0;
  let totalMarksPerDay = 0;
  let totalBonusAtEnd = 0;
  const allContractsEnded = genesisMarkets.every((_, mi) => {
    const baseOffset = mi * (isConnected ? 3 : 1);
    const contractSaysEnded = reads?.[baseOffset]?.result as
      | boolean
      | undefined;
    return contractSaysEnded === true;
  });

  const anyInProcessing = genesisMarkets.some((entry, mi) => {
    const baseOffset = mi * (isConnected ? 3 : 1);
    const contractSaysEnded = reads?.[baseOffset]?.result as
      | boolean
      | undefined;
    const endDate = marketConfig(entry[1]).genesis?.endDate;
    const timeHasExpired = endDate
      ? new Date(endDate).getTime() <= Date.now()
      : false;
    return timeHasExpired && !contractSaysEnded;
  });

  if (marksResults && marksResults.length > 0 && !isLoadingMarks) {
    marksResults.forEach((result) => {
      const marks = parseUserHarborMarks(result.data?.userHarborMarks);

      if (marks) {
        const market = genesisMarkets.find(
          ([, mkt]) =>
            marketConfig(mkt).addresses?.genesis?.toLowerCase() ===
            result.genesisAddress?.toLowerCase()
        );

        const cfg = market ? marketConfig(market[1]) : undefined;
        const marketCampaignId = cfg?.marksCampaign?.id || marks?.campaignId;

        if (selectedCampaignId && marketCampaignId !== selectedCampaignId) {
          return;
        }

        const originalCurrentMarks = parseFloat(marks.currentMarks || "0");

        let contractSaysEnded: boolean | undefined;
        if (market) {
          const marketIndex = genesisMarkets.findIndex(
            ([id]) => id === market[0]
          );
          if (marketIndex >= 0) {
            const baseOffset = marketIndex * (isConnected ? 3 : 1);
            const contractReadResult = reads?.[baseOffset];
            contractSaysEnded =
              contractReadResult?.status === "success"
                ? (contractReadResult.result as boolean)
                : undefined;
          }
        }

        const genesisEnded =
          contractSaysEnded !== undefined
            ? contractSaysEnded
            : marks.genesisEnded || false;

        const genesisStartDate = parseInt(marks.genesisStartDate || "0");
        const lastUpdated = parseInt(marks.lastUpdated || "0");

        const currentDepositUSD = parseFloat(marks.currentDepositUSD || "0");
        const marksPerDay = parseFloat(marks.marksPerDay || "0");

        let currentMarks = originalCurrentMarks;

        if (genesisEnded) {
          // use subgraph
        } else if (currentDepositUSD > 0 && genesisStartDate > 0) {
          const timeElapsed = nowSec - lastUpdated;
          const daysElapsed = Math.max(0, timeElapsed / 86400);
          const marksAccumulated = currentDepositUSD * 10 * daysElapsed;
          currentMarks = currentMarks + marksAccumulated;
        }

        totalCurrentMarks += currentMarks;
        totalMarksPerDay += marksPerDay;

        if (!genesisEnded && currentDepositUSD > 0) {
          const bonusAtEnd = currentDepositUSD * 100;
          totalBonusAtEnd += bonusAtEnd;
        } else if (genesisEnded) {
          const bonusMarks = parseFloat(marks.bonusMarks || "0");
          totalBonusAtEnd += bonusMarks;
        }

      }
    });
  }

  return {
    selectedCampaign,
    totalCurrentMarks,
    totalMarksPerDay,
    totalBonusAtEnd,
    anyInProcessing,
    allContractsEnded,
  };
}

/**
 * Campaign selection + Ledger Marks strip totals for Genesis.
 * Recomputes when marks/reads change; `nowSec` ticks every 60s so extrapolated marks stay fresh.
 */
export function useGenesisLedgerMarksTotals({
  marksResults,
  genesisMarkets,
  reads,
  isConnected,
  isLoadingMarks,
}: {
  marksResults: GenesisCampaignStatsPropsMarksResults;
  genesisMarkets: Array<[string, unknown]>;
  reads:
    | Array<{ status?: string; result?: unknown } | undefined>
    | undefined;
  isConnected: boolean;
  isLoadingMarks: boolean;
}): GenesisLedgerMarksTotalsResult {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(
    () =>
      computeGenesisLedgerMarksTotals(nowSec, {
        marksResults,
        genesisMarkets,
        reads,
        isConnected,
        isLoadingMarks,
      }),
    [
      nowSec,
      marksResults,
      genesisMarkets,
      reads,
      isConnected,
      isLoadingMarks,
    ]
  );
}
