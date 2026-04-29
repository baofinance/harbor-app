import type { FeeBand } from "@/utils/sailFeeBands";
import { formatRatio } from "@/utils/sailDisplayFormat";
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
        <h5 className="text-[#1E4775] font-semibold text-[10px] uppercase tracking-wider mb-1.5">
          {title}
        </h5>
        <div className="text-[10px] text-[#1E4775]/60">Loading…</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-2">
      <h5 className="text-[#1E4775] font-semibold text-[10px] uppercase tracking-wider mb-1.5">
        {title}
      </h5>
      <div className="space-y-1">
        {bands.map((b, idx) => {
          const active =
            collateralRatio &&
            collateralRatio >= b.lowerBound &&
            (b.upperBound === undefined || collateralRatio <= b.upperBound);
          const range = b.upperBound
            ? `${formatRatio(b.lowerBound)} – ${formatRatio(b.upperBound)}`
            : `> ${formatRatio(b.lowerBound)}`;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between text-[10px] px-2 py-1 rounded ${
                active
                  ? "bg-[#1E4775]/10 border border-[#1E4775]/30"
                  : "bg-[#1E4775]/5"
              }`}
            >
              <span className="text-[#1E4775]/70 font-mono">{range}</span>
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
