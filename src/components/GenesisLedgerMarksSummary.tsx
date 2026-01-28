import React from "react";
import { ClockIcon } from "@heroicons/react/24/outline";
import InfoTooltip from "@/components/InfoTooltip";
import SimpleTooltip from "@/components/SimpleTooltip";

interface SelectedCampaign {
  label: string;
  campaignId?: string;
  isActive: boolean;
  marks: number;
}

interface GenesisLedgerMarksSummaryProps {
  selectedCampaign: SelectedCampaign | null;
  mounted: boolean;
  isLoadingMarks: boolean;
  totalCurrentMarks: number;
  totalMarksPerDay: number;
  anyInProcessing: boolean;
  allContractsEnded: boolean;
  isConnected: boolean;
  totalBonusAtEnd: number;
  totalEarlyBonusEstimate: number;
  totalEarlyBonusMarks: number;
}

export const GenesisLedgerMarksSummary = ({
  selectedCampaign,
  mounted,
  isLoadingMarks,
  totalCurrentMarks,
  totalMarksPerDay,
  anyInProcessing,
  allContractsEnded,
  isConnected,
  totalBonusAtEnd,
  totalEarlyBonusEstimate,
  totalEarlyBonusMarks,
}: GenesisLedgerMarksSummaryProps) => {
  const extractCampaignName = (label: string): string =>
    label.replace(/\s+Maiden Voyage\s*$/i, "").trim();

  return (
    <div className="mb-2">
      <div className="bg-black/30 backdrop-blur-sm rounded-none overflow-visible border border-white/50">
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y divide-white/15 md:divide-y-0 md:divide-x md:divide-white/20">
          {/* Header */}
          <div className="p-3 flex items-center justify-center gap-2">
            <h2 className="font-bold font-mono text-white text-lg leading-tight text-center">
              Ledger Marks
            </h2>
            <InfoTooltip
              label={
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-lg mb-2">Ledger Marks</h3>
                    <p className="text-white/90 leading-relaxed">
                      A ledger is both a record of truth and a core DeFi symbol
                      — and a mark is what every sailor leaves behind on a
                      voyage.
                    </p>
                  </div>
                  <div className="border-t border-white/20 pt-3">
                    <p className="text-white/90 leading-relaxed mb-2">
                      Each Ledger Mark is proof that you were here early,
                      helping stabilize the first Harbor markets and guide them
                      through calm launch conditions.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-white/70 mt-0.5">•</span>
                      <p className="text-white/90 leading-relaxed">
                        The more you contribute, the deeper your mark on the
                        ledger.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-white/70 mt-0.5">•</span>
                      <p className="text-white/90 leading-relaxed">
                        When $TIDE surfaces, these marks will convert into your
                        share of rewards and governance power.
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-white/20 pt-3">
                    <p className="text-white/80 italic leading-relaxed">
                      Think of them as a record of your journey — every mark, a
                      line in Harbor's logbook.
                    </p>
                  </div>
                </div>
              }
              side="right"
            />
          </div>

          <div className="p-3 flex flex-col items-center justify-center text-center">
            <div className="text-[11px] text-white/80 uppercase tracking-widest">
              {(() => {
                if (!selectedCampaign) {
                  return "Current Maiden Voyage Marks";
                }
                const campaignName = extractCampaignName(selectedCampaign.label);
                return `${campaignName} Maiden Voyage Marks`;
              })()}
            </div>
            <div className="text-sm font-semibold text-white font-mono mt-1">
              {!mounted || isLoadingMarks ? (
                <span className="text-white/50">-</span>
              ) : totalCurrentMarks > 0 ? (
                totalCurrentMarks.toLocaleString(undefined, {
                  minimumFractionDigits: totalCurrentMarks < 100 ? 2 : 0,
                  maximumFractionDigits: totalCurrentMarks < 100 ? 2 : 0,
                })
              ) : (
                "0"
              )}
            </div>
          </div>

          <div className="p-3 flex flex-col items-center justify-center text-center">
            <div className="text-[11px] text-white/80 uppercase tracking-widest">
              Marks per Day
            </div>
            <div className="text-sm font-semibold text-white font-mono mt-1">
              {!mounted || isLoadingMarks ? (
                <span className="text-white/50">-</span>
              ) : totalMarksPerDay > 0 ? (
                totalMarksPerDay.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              ) : (
                "0"
              )}
            </div>
          </div>

          <div className="p-3 flex flex-col items-center justify-center text-center">
            <div className="text-[11px] text-white/80 uppercase tracking-widest flex items-center justify-center gap-1">
              Bonus at end
              {anyInProcessing && (
                <SimpleTooltip label="Bonus marks will be applied once processing is complete and tokens are claimable.">
                  <ClockIcon className="w-3 h-3 text-yellow-400 cursor-help" />
                </SimpleTooltip>
              )}
            </div>
            <div className="text-sm font-semibold text-white font-mono mt-1">
              {!mounted || isLoadingMarks ? (
                <span className="text-white/50">-</span>
              ) : allContractsEnded && isConnected && totalCurrentMarks > 0 ? (
                <span className="text-white/60">Applied</span>
              ) : totalBonusAtEnd > 0 ? (
                totalBonusAtEnd.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })
              ) : (
                "0"
              )}
            </div>
            {mounted && !isLoadingMarks && (
              <>
                {!allContractsEnded && totalEarlyBonusEstimate > 0 && (
                  <div className="text-[10px] text-green-300 mt-0.5">
                    Early deposit bonus: +
                    {totalEarlyBonusEstimate.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                )}
                {allContractsEnded && totalEarlyBonusMarks > 0 && (
                  <div className="text-[10px] text-green-300 mt-0.5">
                    Early deposit bonus:{" "}
                    {totalEarlyBonusMarks.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
