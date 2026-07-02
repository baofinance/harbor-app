"use client";

export type DepositReceivePreviewProps = {
  visible: boolean;
  receiveLabel?: string;
  primaryAmount: string;
  primarySymbol: string;
  usdValue?: number;
  detailsLine?: string;
};

/** Compact receive line — hidden when `visible` is false. */
export function DepositReceivePreview({
  visible,
  receiveLabel = "You receive",
  primaryAmount,
  primarySymbol,
  usdValue,
  detailsLine,
}: DepositReceivePreviewProps) {
  if (!visible) return null;

  return (
    <div className="space-y-0.5 px-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-[#1E4775]/65">{receiveLabel}</span>
        <div className="text-right">
          <p className="font-mono text-base font-semibold tabular-nums text-[#1E4775]">
            {primaryAmount} {primarySymbol}
          </p>
          {usdValue != null && usdValue > 0 ? (
            <p className="font-mono text-[11px] tabular-nums text-[#1E4775]/50">
              ${usdValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          ) : null}
        </div>
      </div>
      {detailsLine ? (
        <p className="text-right text-[11px] italic text-[#1E4775]/45">{detailsLine}</p>
      ) : null}
    </div>
  );
}
