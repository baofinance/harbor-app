import type { FeeBand } from "@/utils/sailFeeBands";
import { formatRatio } from "@/utils/sailDisplayFormat";
import {
  HARBOR_FEE_BAND_RANGE_TEXT_CLASS,
  HARBOR_FEE_BAND_ROW_ACTIVE_CLASS,
  HARBOR_FEE_BAND_ROW_QUIET_CLASS,
  isCollateralRatioInFeeBandRow,
} from "@/lib/harborFeeBandStyles";
import { SailFeeBandBadge } from "./SailFeeBandBadge";

type SailFeeBandsPanelProps = {
  title: string;
  bands: FeeBand[] | undefined;
  collateralRatio: bigint | undefined;
  isMintSail?: boolean;
};

/** Tooltip body: CR line + stacked bands (mint or redeem). */
export function SailFeeBandsPanel({
  title,
  bands,
  collateralRatio,
  isMintSail = false,
}: SailFeeBandsPanelProps) {
  if (!bands || bands.length === 0) {
    return (
      <div className="bg-white p-2">
        <h5 className="font-semibold text-[10px] uppercase tracking-wider mb-1.5 text-[#1E4775]">
          {title}
        </h5>
        <div className="text-[10px] text-[#10141A]/55">Loading…</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-2">
      <h5 className="font-semibold text-[10px] uppercase tracking-wider mb-1.5 text-[#1E4775]">
        {title}
      </h5>
      <div className="space-y-1">
        {bands.map((b, idx) => {
          const active = isCollateralRatioInFeeBandRow(collateralRatio, b);
          const range = b.upperBound
            ? `${formatRatio(b.lowerBound)} – ${formatRatio(b.upperBound)}`
            : `> ${formatRatio(b.lowerBound)}`;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between rounded-lg text-[10px] px-2 py-1 ${
                active
                  ? HARBOR_FEE_BAND_ROW_ACTIVE_CLASS
                  : HARBOR_FEE_BAND_ROW_QUIET_CLASS
              }`}
            >
              <span className={HARBOR_FEE_BAND_RANGE_TEXT_CLASS}>{range}</span>
              <SailFeeBandBadge
                ratio={b.ratio}
                isMintSail={isMintSail}
                lowerBound={b.lowerBound}
                upperBound={b.upperBound}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
