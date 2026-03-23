"use client";

/**
 * Campaign stats strip for Genesis: subgraph marks error, Ledger Marks summary, and GraphQL/oracle error banners.
 * @see src/app/genesis/README.md
 */
import React from "react";
import { GenesisLedgerMarksSummary } from "@/components/GenesisLedgerMarksSummary";
import { GenesisErrorBanner } from "@/components/GenesisErrorBanner";
import { useGenesisLedgerMarksTotals } from "@/hooks/useGenesisLedgerMarksTotals";

export type GenesisCampaignStatsProps = {
  marksError: unknown;
  marksResults: Array<{
    genesisAddress?: string;
    data?: { userHarborMarks?: unknown };
    errors?: unknown[];
  }>;
  genesisAddresses: string[];
  genesisMarkets: Array<[string, unknown]>;
  reads:
    | Array<{ status?: string; result?: unknown } | undefined>
    | undefined;
  isConnected: boolean;
  isLoadingMarks: boolean;
  mounted: boolean;
  combinedHasIndexerErrors: boolean;
  combinedMarketsWithIndexerErrors: string[];
  combinedHasAnyErrors: boolean;
  combinedMarketsWithOtherErrors: string[];
  hasOraclePricingError: boolean;
  marketsWithOraclePricingError: string[];
  getMarketName: (genesisAddress: string) => string;
};

export function GenesisCampaignStats({
  marksError,
  marksResults,
  genesisMarkets,
  reads,
  isConnected,
  isLoadingMarks,
  mounted,
  combinedHasIndexerErrors,
  combinedMarketsWithIndexerErrors,
  combinedHasAnyErrors,
  combinedMarketsWithOtherErrors,
  hasOraclePricingError,
  marketsWithOraclePricingError,
  getMarketName,
}: GenesisCampaignStatsProps) {
  const ledgerMarks = useGenesisLedgerMarksTotals({
    marksResults,
    genesisMarkets,
    reads,
    isConnected,
    isLoadingMarks,
  });

  return (
    <>
      {/* Subgraph Error Banner */}
      {marksError && (
        <div className="bg-[#FF8A7A]/10 border border-[#FF8A7A]/30 rounded-md p-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="text-[#FF8A7A] text-xl mt-0.5">⚠️</div>
            <div className="flex-1">
              <p className="text-[#FF8A7A] font-semibold text-sm mb-1">
                Harbor Marks Subgraph Error
              </p>
              <p className="text-white/70 text-xs">
                Unable to load Harbor Marks data. This may be due to rate
                limiting or service issues. Your deposits and core functionality
                remain unaffected.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Marks Section */}
      <GenesisLedgerMarksSummary
        selectedCampaign={ledgerMarks.selectedCampaign ?? null}
        mounted={mounted}
        isLoadingMarks={isLoadingMarks}
        totalCurrentMarks={ledgerMarks.totalCurrentMarks}
        totalMarksPerDay={ledgerMarks.totalMarksPerDay}
        anyInProcessing={ledgerMarks.anyInProcessing}
        allContractsEnded={ledgerMarks.allContractsEnded}
        isConnected={isConnected}
        totalBonusAtEnd={ledgerMarks.totalBonusAtEnd}
        totalEarlyBonusEstimate={ledgerMarks.totalEarlyBonusEstimate}
        totalEarlyBonusMarks={ledgerMarks.totalEarlyBonusMarks}
      />

      {combinedHasIndexerErrors && (
        <GenesisErrorBanner
          tone="danger"
          title="Temporary Service Issue"
          message="The Graph Network indexers are temporarily unavailable for some markets. Your Harbor Marks are safe and will display correctly once the service is restored. This is a temporary infrastructure issue, not a problem with your account."
          markets={combinedMarketsWithIndexerErrors.map(getMarketName)}
        />
      )}
      {combinedHasAnyErrors && !combinedHasIndexerErrors && (
        <GenesisErrorBanner
          tone="warning"
          title="Harbor Marks Data Unavailable"
          message="Unable to load Harbor Marks data for some markets. Your positions and core functionality remain unaffected. Please try refreshing the page."
          markets={combinedMarketsWithOtherErrors.map(getMarketName)}
        />
      )}
      {hasOraclePricingError && (
        <GenesisErrorBanner
          tone="danger"
          title="Price oracle unavailable"
          message="The price oracle for some markets is not available. Harbor Marks cannot be calculated until the oracle is working. Your deposit is safe."
          markets={marketsWithOraclePricingError.map(getMarketName)}
        />
      )}
    </>
  );
}
