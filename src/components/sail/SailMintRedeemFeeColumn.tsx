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
    <div className="inline-grid w-full max-w-[260px] grid-cols-[1fr_1px_1fr] items-stretch justify-center">
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
        <span className="cursor-help inline-flex w-full justify-center">
          <span className="flex w-full flex-col items-center justify-center gap-1 px-3 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/70">
              Mint Fee
            </span>
            <SailFeeRatioCell
              ratio={mintFeeRatio}
              isMintSail
              activeBand={activeMintBand}
              showHelp
            />
          </span>
        </span>
      </SimpleTooltip>

      <span className="w-px self-stretch bg-[#1E4775]/25" aria-hidden="true" />

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
        <span className="cursor-help inline-flex w-full justify-center">
          <span className="flex w-full flex-col items-center justify-center gap-1 px-3 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/70">
              Redeem Fee
            </span>
            <SailFeeRatioCell
              ratio={redeemFeeRatio}
              isMintSail={false}
              activeBand={activeRedeemBand}
              showHelp
            />
          </span>
        </span>
      </SimpleTooltip>
    </div>
  );
}
