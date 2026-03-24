import InfoTooltip from "@/components/InfoTooltip";

export type SailLedgerMarksBarProps = {
  isLoadingSailMarks: boolean;
  totalSailMarks: number;
  sailMarksPerDay: number;
};

/**
 * Sail Marks summary strip (current marks + per day) — Extended layout.
 */
export function SailLedgerMarksBar({
  isLoadingSailMarks,
  totalSailMarks,
  sailMarksPerDay,
}: SailLedgerMarksBarProps) {
  return (
    <div className="mb-2">
      <div className="bg-black/30 backdrop-blur-sm rounded-md overflow-visible border border-white/40">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y divide-white/15 md:divide-y-0 md:divide-x md:divide-white/20">
          <div className="p-3 flex items-center justify-center gap-2">
            <h2 className="font-bold font-mono text-white text-lg leading-tight text-center">
              Sail Marks
            </h2>
            <InfoTooltip
              centerOnMobile
              label={
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-lg mb-2">Anchor Ledger Marks</h3>
                    <p className="text-white/90 leading-relaxed">
                      Anchor Ledger Marks are earned by holding anchor tokens and
                      depositing into stability pools.
                    </p>
                  </div>

                  <div className="border-t border-white/20 pt-3">
                    <p className="text-white/90 leading-relaxed mb-2">
                      Each mark represents your contribution to stabilizing Harbor
                      markets through token holdings and pool deposits.
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
                      line in Harbor&apos;s logbook.
                    </p>
                  </div>
                </div>
              }
              side="right"
            />
          </div>

          <div className="p-3 flex flex-col items-center justify-center text-center">
            <div className="text-[11px] text-white/80 uppercase tracking-widest">
              Current Sail Marks
            </div>
            <div className="text-sm font-semibold text-white font-mono mt-1">
              {isLoadingSailMarks
                ? "-"
                : totalSailMarks > 0
                  ? totalSailMarks.toLocaleString(undefined, {
                      minimumFractionDigits: totalSailMarks < 100 ? 2 : 0,
                      maximumFractionDigits: totalSailMarks < 100 ? 2 : 0,
                    })
                  : "0"}
            </div>
          </div>

          <div className="p-3 flex flex-col items-center justify-center text-center">
            <div className="text-[11px] text-white/80 uppercase tracking-widest">
              Sail Marks per Day
            </div>
            <div className="text-sm font-semibold text-white font-mono mt-1">
              {isLoadingSailMarks
                ? "-"
                : sailMarksPerDay > 0
                  ? sailMarksPerDay.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
                  : "0"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
