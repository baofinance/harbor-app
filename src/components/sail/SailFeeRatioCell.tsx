import type { FeeBand } from "@/utils/sailFeeBands";
import { SailFeeBandBadge } from "./SailFeeBandBadge";

type SailFeeRatioCellProps = {
  ratio: bigint | undefined;
  isMintSail: boolean;
  activeBand: FeeBand | undefined;
  showHelp?: boolean;
};

/** Mint/redeem column: same pill tags as fee popups (`SailFeeBandBadge`). */
export function SailFeeRatioCell({
  ratio,
  isMintSail,
  activeBand,
  showHelp = false,
}: SailFeeRatioCellProps) {
  if (ratio === undefined) {
    return (
      <span className="text-[#1E4775] font-medium text-[10px] font-mono">-</span>
    );
  }
  return (
    <SailFeeBandBadge
      ratio={ratio}
      isMintSail={isMintSail}
      lowerBound={activeBand?.lowerBound ?? 0n}
      upperBound={activeBand?.upperBound}
      showHelp={showHelp}
      omitFeeSuffix
    />
  );
}
