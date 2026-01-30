/**
 * Utility functions for Anchor page and AnchorDepositWithdrawModal.
 */

/**
 * Priority for matching a deposit asset to a market (higher = better fit).
 * Used when resolving deposit asset -> market in multi-market ha tokens.
 */
export function getAssetMarketPriority(
  assetSymbol: string,
  m: { collateral?: { symbol?: string; underlyingSymbol?: string } }
): number {
  const sym = assetSymbol?.toLowerCase?.() ?? "";
  const collateralSym = m?.collateral?.symbol?.toLowerCase?.() ?? "";
  const underlyingSym = m?.collateral?.underlyingSymbol?.toLowerCase?.() ?? "";

  if (collateralSym && sym === collateralSym) return 100;
  if (underlyingSym && sym === underlyingSym) return 90;

  if (
    (sym === "eth" || sym === "steth" || sym === "wsteth") &&
    collateralSym === "wsteth"
  ) {
    return 80;
  }
  if (
    (sym === "fxusd" || sym === "fxsave" || sym === "usdc") &&
    collateralSym === "fxsave"
  ) {
    return 80;
  }

  return 0;
}

/**
 * Format collateral ratio as percentage
 */
export function formatRatio(value: bigint | undefined): string {
  if (value === undefined || value === null) return "-";
  // Handle 0n explicitly - show "0.00%" instead of "-"
  if (value === 0n) return "0.00%";
  const percentage = Number(value) / 1e16;
  return `${percentage.toFixed(2)}%`;
}

/**
 * Format APR values
 */
export function formatAPR(apr: number | undefined, hasRewardsNoTVL?: boolean): string {
  if (hasRewardsNoTVL && apr !== undefined && apr >= 10000) return "10k%+";
  if (apr === undefined || isNaN(apr)) return "-";
  if (apr >= 10000) return "10k%+";
  return `${apr.toFixed(2)}%`;
}

/**
 * Format USD values compactly (e.g., $1.2k, $3.5m, $1.2b)
 */
export function formatCompactUSD(value: number): string {
  if (value === 0) return "$0";
  if (value < 0) return `-${formatCompactUSD(-value)}`;

  const absValue = Math.abs(value);

  if (absValue >= 1e9) {
    return `$${(absValue / 1e9).toFixed(2)}b`;
  }
  if (absValue >= 1e6) {
    return `$${(absValue / 1e6).toFixed(2)}m`;
  }
  if (absValue >= 1e3) {
    return `$${(absValue / 1e3).toFixed(2)}k`;
  }

  return `$${absValue.toFixed(2)}`;
}

/**
 * Calculate the adverse price movement between collateral and pegged token needed to reach below 100% collateral ratio (depeg point).
 *
 * This measures protection against relative price changes (e.g., ETH price spike for ETH-pegged token with USD collateral).
 *
 * This accounts for stability pools that can rebalance and improve the CR:
 * - Collateral Pool: Burns pegged tokens → receives collateral (reduces both debt AND collateral)
 * - Sail Pool: Burns pegged tokens → receives leveraged tokens (reduces ONLY debt, more effective)
 *
 * The sail pool is more effective because leveraged tokens represent the excess collateral
 * above 100% CR, so converting pegged→leveraged only reduces debt while collateral stays.
 */
export function calculateVolatilityProtection(
  collateralRatio: bigint | undefined,
  totalDebt: bigint | undefined,
  collateralPoolTVL: bigint | undefined,
  sailPoolTVL: bigint | undefined
): string {
  // Need both CR and debt to calculate
  if (!collateralRatio || !totalDebt || totalDebt === 0n) return "-";

  // Calculate collateral value from CR and debt
  // collateralRatio is in 18 decimals (e.g., 2e18 = 200% CR)
  // collateralValue = CR * debt / 1e18
  // Convert each BigInt to Number first, then multiply and divide
  const collateralValueNum = (Number(collateralRatio) * Number(totalDebt)) / 1e18;
  // Handle NaN case - return early if calculation is invalid
  if (isNaN(collateralValueNum) || !isFinite(collateralValueNum)) {
    return "-";
  }
  const collateralValue = BigInt(Math.floor(collateralValueNum));

  // Pool TVLs (in pegged tokens)
  const collateralPoolAbsorption = collateralPoolTVL || 0n;
  const sailPoolAbsorption = sailPoolTVL || 0n;

  // Total debt reduction from both pools
  const totalDebtReduction = collateralPoolAbsorption + sailPoolAbsorption;

  // Cap debt reduction at total debt
  const effectiveDebtReduction =
    totalDebtReduction > totalDebt ? totalDebt : totalDebtReduction;

  // Collateral reduction: ONLY from collateral pool (sail pool doesn't remove collateral)
  const effectiveCollateralReduction =
    collateralPoolAbsorption > collateralValue
      ? collateralValue
      : collateralPoolAbsorption;

  // Effective values after full rebalancing
  const effectiveDebt = totalDebt - effectiveDebtReduction;
  const effectiveCollateral = collateralValue - effectiveCollateralReduction;

  // If all debt can be absorbed by pools, infinite protection
  if (effectiveDebt === 0n) return ">100%";

  // If no collateral left after pool drain, already at risk
  if (effectiveCollateral === 0n) return "0%";

  // Calculate price drop needed to reach 100% CR
  // At 100% CR: effectiveCollateral * (1 - X) = effectiveDebt
  // X = 1 - (effectiveDebt / effectiveCollateral)
  const debtNum = Number(effectiveDebt);
  const collateralNum = Number(effectiveCollateral);

  if (debtNum >= collateralNum) return "0%"; // Already at or below 100% CR

  const priceDropPercent = (1 - debtNum / collateralNum) * 100;

  if (priceDropPercent <= 0) return "0%";
  if (priceDropPercent >= 100) return ">100%";

  return `${priceDropPercent.toFixed(1)}%`;
}

/** Withdrawal window helpers (Anchor stability pool request/window UI). */

export function formatDuration(seconds: bigint | number): string {
  const totalSeconds = Number(seconds);
  const hours = Math.round(totalSeconds / 3600);
  if (hours === 0) {
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  return `${hours} hour${hours !== 1 ? "s" : ""}`;
}

export function formatTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getFeeFreeDisplay(
  request: readonly [bigint, bigint] | undefined,
  feePercent: number | undefined
): string {
  if (!request || feePercent == null) {
    return `${feePercent != null ? feePercent.toFixed(0) : "1"}%`;
  }
  const [start, end] = request;
  if (start === 0n && end === 0n) return `${feePercent.toFixed(0)}%`;
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now >= start && now <= end) return "(free)";
  return `${feePercent.toFixed(0)}%`;
}

export function getRequestStatusText(
  request: readonly [bigint, bigint] | undefined
): string {
  if (!request) return "";
  const [start, end] = request;
  if (start === 0n && end === 0n) return "";
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now >= start && now <= end) return " (open)";
  if (start > now) return " (pending)";
  return "";
}

export type WithdrawWindowBanner =
  | { type: "coming" | "open"; message: string }
  | null;

export function getWindowBannerInfo(
  request: readonly [bigint, bigint] | undefined,
  window: readonly [bigint, bigint] | undefined
): WithdrawWindowBanner {
  if (!request || !window) return null;
  const [start, end] = request;
  if (start === 0n && end === 0n) return null;
  const now = BigInt(Math.floor(Date.now() / 1000));

  if (now >= start && now <= end) {
    const remainingSeconds = Number(end - now);
    const remainingHours = remainingSeconds / 3600;
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    const startTimeStr = formatTime(start);
    const endTimeStr = formatTime(end);
    const timeRemaining =
      remainingHours < 1
        ? `${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""} remaining`
        : (() => {
            const h = Math.floor(remainingHours);
            return `${h} hour${h !== 1 ? "s" : ""} remaining`;
          })();
    return {
      type: "open",
      message: `Window open from ${startTimeStr} to ${endTimeStr} (${timeRemaining})`,
    };
  }
  if (start > now) {
    const secondsUntilStart = Number(start - now);
    const minutesUntilStart = Math.floor(secondsUntilStart / 60);
    const startTimeStr = formatTime(start);
    return {
      type: "coming",
      message: `Withdraw window opens at ${startTimeStr} in ${minutesUntilStart} minute${minutesUntilStart !== 1 ? "s" : ""}`,
    };
  }
  return null;
}


