import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import {
  HARBOR_FEE_BAND_PILL_CLASS,
  resolveHarborFeeBandKind,
} from "@/lib/harborFeeBandStyles";

type SailFeeBandBadgeProps = {
  ratio: bigint;
  isMintSail?: boolean;
  lowerBound?: bigint;
  upperBound?: bigint;
  /** Table mint/redeem column: tooltip on parent; (? ) icon cue. */
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
  const kind = resolveHarborFeeBandKind(
    ratio,
    isMintSail,
    lowerBound,
    upperBound
  );

  const label =
    kind === "blocked"
      ? "Blocked"
      : kind === "free"
        ? "Free"
        : kind === "discount"
          ? `${pct.toFixed(2)}% discount`
          : omitFeeSuffix
            ? `${pct.toFixed(2)}%`
            : `${pct.toFixed(2)}% fee`;

  const className = HARBOR_FEE_BAND_PILL_CLASS[kind];

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
        <QuestionMarkCircleIcon
          className="h-3.5 w-3.5 shrink-0 opacity-90"
          aria-hidden
        />
      ) : null}
    </span>
  );
}
