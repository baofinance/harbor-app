import InfoTooltip from "@/components/InfoTooltip";
import { HarborStatTile } from "@/components/shared/HarborStatTile";
import {
  HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS,
  HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS,
  HARBOR_STAT_TILE_INTRO_TITLE_CLASS,
} from "@/components/shared/harborStatTileStyles";

export type SailLedgerMarksBarProps = {
  isLoadingSailMarks: boolean;
  totalSailMarks: number;
  sailMarksPerDay: number;
};

const SAIL_MARKS_TOOLTIP = (
  <div className="space-y-3">
    <div>
      <h3 className="mb-2 text-lg font-bold">Anchor Ledger Marks</h3>
      <p className="leading-relaxed text-white/90">
        Anchor Ledger Marks are earned by holding anchor tokens and depositing
        into stability pools.
      </p>
    </div>

    <div className="border-t border-white/20 pt-3">
      <p className="mb-2 leading-relaxed text-white/90">
        Each mark represents your contribution to stabilizing Harbor markets
        through token holdings and pool deposits.
      </p>
    </div>

    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-white/70">•</span>
        <p className="leading-relaxed text-white/90">
          The more you contribute, the deeper your mark on the ledger.
        </p>
      </div>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-white/70">•</span>
        <p className="leading-relaxed text-white/90">
          When $TIDE surfaces, these marks will convert into your share of
          rewards and governance power.
        </p>
      </div>
    </div>

    <div className="border-t border-white/20 pt-3">
      <p className="italic leading-relaxed text-white/80">
        Think of them as a record of your journey — every mark, a line in
        Harbor&apos;s logbook.
      </p>
    </div>
  </div>
);

/**
 * Sail Marks summary tiles — Extended layout.
 */
export function SailLedgerMarksBar({
  isLoadingSailMarks,
  totalSailMarks,
  sailMarksPerDay,
}: SailLedgerMarksBarProps) {
  return (
    <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
      <HarborStatTile variant="intro">
        <div className="flex items-center justify-center gap-2">
          <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>Sail Marks</h2>
          <InfoTooltip centerOnMobile label={SAIL_MARKS_TOOLTIP} side="right" />
        </div>
      </HarborStatTile>

      <HarborStatTile variant="intro">
        <div className="flex flex-col items-center justify-center text-center">
          <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
            Current Sail Marks
          </div>
          <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
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
      </HarborStatTile>

      <HarborStatTile variant="intro">
        <div className="flex flex-col items-center justify-center text-center">
          <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
            Sail Marks per Day
          </div>
          <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
            {isLoadingSailMarks
              ? "-"
              : sailMarksPerDay > 0
                ? sailMarksPerDay.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "0"}
          </div>
        </div>
      </HarborStatTile>
    </div>
  );
}
