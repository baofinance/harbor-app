import SimpleTooltip from "@/components/SimpleTooltip";
import type { FeeBand } from "@/utils/sailFeeBands";
import { formatRatio } from "@/utils/sailDisplayFormat";
import { SailFeeBandsPanel } from "./SailFeeBandsPanel";
import { SailFeeRatioCell } from "./SailFeeRatioCell";

type SailMintRedeemFeeColumnProps = {
  collateralRatio: bigint | undefined;
  mintFeeRatio: bigint | undefined;
  redeemFeeRatio: bigint | undefined;
  activeMintBand: FeeBand | undefined;
  activeRedeemBand: FeeBand | undefined;
  mintBands: FeeBand[] | undefined;
  redeemBands: FeeBand[] | undefined;
};

/** Desktop table cell: mint / redeem fee tooltips with shared CR header. */
export function SailMintRedeemFeeColumn({
  collateralRatio,
  mintFeeRatio,
  redeemFeeRatio,
  activeMintBand,
  activeRedeemBand,
  mintBands,
  redeemBands,
}: SailMintRedeemFeeColumnProps) {
  const crLine = (
    <div className="text-[10px] text-white/80">
      Current CR:{" "}
      <span className="font-mono font-semibold">
        {formatRatio(collateralRatio)}
      </span>
    </div>
  );

  return (
    <div className="flex items-center justify-center gap-0 whitespace-nowrap max-w-full">
      <SimpleTooltip
        side="left"
        maxHeight="none"
        maxWidth={720}
        label={
          <div className="space-y-1.5">
            {crLine}
            <div className="min-w-[260px]">
              <SailFeeBandsPanel
                title="Mint Fees"
                bands={mintBands}
                collateralRatio={collateralRatio}
                isMintSail
              />
            </div>
          </div>
        }
      >
        <span className="cursor-help inline-flex shrink-0">
          <SailFeeRatioCell
            ratio={mintFeeRatio}
            isMintSail
            activeBand={activeMintBand}
            showHelp
          />
        </span>
      </SimpleTooltip>
      <span
        className="text-[#1E4775]/50 text-[9px] font-bold shrink-0 select-none leading-none px-1"
        aria-hidden="true"
      >
        /
      </span>
      <SimpleTooltip
        side="left"
        maxHeight="none"
        maxWidth={720}
        label={
          <div className="space-y-1.5">
            {crLine}
            <div className="min-w-[260px]">
              <SailFeeBandsPanel
                title="Redeem Fees"
                bands={redeemBands}
                collateralRatio={collateralRatio}
              />
            </div>
          </div>
        }
      >
        <span className="cursor-help inline-flex shrink-0">
          <SailFeeRatioCell
            ratio={redeemFeeRatio}
            isMintSail={false}
            activeBand={activeRedeemBand}
            showHelp
          />
        </span>
      </SimpleTooltip>
    </div>
  );
}
