import { WAD } from "@/utils/sailFeeBands";

type SailFeeBandBadgeProps = {
  ratio: bigint;
  isMintSail?: boolean;
  lowerBound?: bigint;
  upperBound?: bigint;
  /** Table mint/redeem column: append [?] inside the tag (tooltip on parent). */
  showHelp?: boolean;
  /** Table row only: show `1.00%` instead of `1.00% fee` (popups keep full text). */
  omitFeeSuffix?: boolean;
};

/**
 * Pill for a single incentive ratio (table cells and fee-band list rows).
 */
export function SailFeeBandBadge({
  ratio,
  isMintSail = false,
  lowerBound = 0n,
  upperBound,
  showHelp = false,
  omitFeeSuffix = false,
}: SailFeeBandBadgeProps) {
  const pct = Number(ratio) / 1e16;
  const isZeroToHundredRange = lowerBound === 0n && upperBound !== undefined;
  const tolerance = 10n ** 14n;
  const ratioAbs = ratio < 0n ? -ratio : ratio;
  const is100PercentOrClose = ratioAbs >= WAD - tolerance && ratioAbs <= WAD;
  const shouldBlockMintSail =
    isMintSail && isZeroToHundredRange && is100PercentOrClose;

  const isBlocked = ratio >= WAD || shouldBlockMintSail;
  const isDiscount = ratio < 0n;
  const isFree = ratio === 0n;

  const className = isBlocked
    ? "bg-red-500/30 text-red-700 font-semibold"
    : isDiscount
      ? "bg-green-500/30 text-green-700 font-semibold"
      : isFree
        ? "bg-blue-500/30 text-blue-700 font-semibold"
        : "bg-orange-500/30 text-orange-700 font-semibold";

  const label = isBlocked
    ? "Blocked"
    : isFree
      ? "Free"
      : isDiscount
        ? `${pct.toFixed(2)}% discount`
        : omitFeeSuffix
          ? `${pct.toFixed(2)}%`
          : `${pct.toFixed(2)}% fee`;

  /** Table badges: fixed width for `4.00%` + `[?]` (5px narrower than 4.5rem); popup badges unchanged. */
  const tableUniformClasses = omitFeeSuffix
    ? "w-[calc(4.5rem-5px)] min-w-[calc(4.5rem-5px)] shrink-0 tabular-nums"
    : "";

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] whitespace-nowrap ${tableUniformClasses} ${className}`}
    >
      {omitFeeSuffix ? (
        <span className="min-w-0 flex-1 truncate text-center">{label}</span>
      ) : (
        label
      )}
      {showHelp ? (
        <span className="text-inherit font-semibold opacity-90 shrink-0">[?]</span>
      ) : null}
    </span>
  );
}
