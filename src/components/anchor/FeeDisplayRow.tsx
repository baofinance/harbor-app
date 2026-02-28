"use client";

const HIGH_FEE_THRESHOLD = 2;

export interface FeeDisplayRowProps {
  label?: string;
  feePercentage: number;
  feeAmount: number;
  feeSymbol: string;
  feeUSD: number;
  showWarning?: boolean;
}

export function FeeDisplayRow({
  label = "Mint fee:",
  feePercentage,
  feeAmount,
  feeSymbol,
  feeUSD,
  showWarning = feePercentage > HIGH_FEE_THRESHOLD,
}: FeeDisplayRowProps) {
  const isHighFee = showWarning;
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-[#1E4775]/70">{label}</span>
      <span
        className={`font-bold font-mono ${
          isHighFee ? "text-red-600" : "text-[#1E4775]"
        }`}
      >
        {feePercentage.toFixed(2)}% -{" "}
        {feeAmount > 0 ? `${feeAmount.toFixed(6)} ${feeSymbol}` : "..."} (
        {feeUSD > 0
          ? `$${feeUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : "..."}
        )
        {isHighFee && " ⚠️"}
      </span>
    </div>
  );
}
