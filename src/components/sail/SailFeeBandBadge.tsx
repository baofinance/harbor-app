import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import {
  HARBOR_FEE_BAND_PILL_CLASS,
  resolveHarborFeeBandKind,
  type HarborFeeBandKind,
} from "@/lib/harborFeeBandStyles";
import {
  DEPOSIT_TAG_BLOCKED_CLASS,
  DEPOSIT_TAG_CORAL_CLASS,
  DEPOSIT_TAG_MINT_CLASS,
} from "@/components/deposit/depositFlowStyles";

/** Compact bordered tags — Earn / Sail trade modal footers. */
const HARBOR_FEE_BAND_MODAL_TAG_CLASS: Record<HarborFeeBandKind, string> = {
  blocked: DEPOSIT_TAG_BLOCKED_CLASS,
  free: DEPOSIT_TAG_MINT_CLASS,
  discount: DEPOSIT_TAG_MINT_CLASS,
  fee: DEPOSIT_TAG_CORAL_CLASS,
};

type SailFeeBandBadgeProps = {
  ratio: bigint;
  isMintSail?: boolean;
  lowerBound?: bigint;
  upperBound?: bigint;
  /** Table mint/redeem column: tooltip on parent; (? ) icon cue. */
  showHelp?: boolean;
  /** Table row only: show `1.00%` instead of `1.00% fee` (popups keep full text). */
  omitFeeSuffix?: boolean;
  /**
   * `band` — heavier ring pills (tables / fee panels).
   * `modal` — compact bordered tags matching Earn/Sail trade modals.
   */
  variant?: "band" | "modal";
};

/**
 * Fee-band badge — ring pills by default; modal variant matches trade-modal tags.
 */
export function SailFeeBandBadge({
  ratio,
  isMintSail = false,
  lowerBound = 0n,
  upperBound,
  showHelp = false,
  omitFeeSuffix = false,
  variant = "band",
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

  const surfaceClass =
    variant === "modal"
      ? HARBOR_FEE_BAND_MODAL_TAG_CLASS[kind]
      : HARBOR_FEE_BAND_PILL_CLASS[kind];

  /** Table badges: fixed width for `4.00%` + `[?]`; popup / modal badges auto-size. */
  const tableUniformClasses =
    variant === "band" && omitFeeSuffix
      ? "w-[calc(4.5rem-5px)] min-w-[calc(4.5rem-5px)] shrink-0 tabular-nums"
      : variant === "modal"
        ? "tabular-nums"
        : "";

  const layoutClass =
    variant === "modal"
      ? `inline-flex items-center gap-1 whitespace-nowrap ${surfaceClass} ${tableUniformClasses}`
      : `inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] whitespace-nowrap ${tableUniformClasses} ${surfaceClass}`;

  return (
    <span className={layoutClass}>
      {omitFeeSuffix && variant === "band" ? (
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
