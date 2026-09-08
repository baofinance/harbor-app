import type { DefinedMarket } from "@/config/markets";

export type AnchorRedeemPositionKind = "wallet" | "pool";

export type AnchorRedeemRequestStatus = {
  /** pending = waiting for window; open = fee-free window active */
  state: "pending" | "open";
  /** Short badge/countdown copy, e.g. "Opens in 42m" / "2h left" */
  label: string;
  windowStart: bigint;
  windowEnd: bigint;
};

export type AnchorRedeemPoolPosition = {
  key: string;
  kind: "pool";
  marketId: string;
  market: DefinedMarket;
  poolType: "collateral" | "sail";
  poolAddress: string;
  balance: bigint;
  /** Fee-free withdrawal window currently open (optional badge). */
  windowOpen?: boolean;
  requestStatus?: AnchorRedeemRequestStatus;
  /** Optional display enrichment */
  usdValue?: number;
  apr?: number;
};

export type AnchorRedeemWalletPosition = {
  key: "wallet";
  kind: "wallet";
  balance: bigint;
  usdValue?: number;
  /** Wallet holdings do not earn pool APR. */
  apr?: undefined;
};

export type AnchorRedeemStepActionKind =
  | "redeem"
  | "request"
  | "withdrawAndRedeem";

export type AnchorRedeemPosition =
  | AnchorRedeemWalletPosition
  | AnchorRedeemPoolPosition;

export type GroupedPoolPositionRow = {
  key: string;
  marketId: string;
  market: DefinedMarket;
  poolType: "collateral" | "sail";
  poolAddress: string;
  balance: bigint;
};

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "0m";
  const totalMinutes = Math.ceil(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 48) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

/** Derive pending/open request status from getWithdrawalRequest [start, end]. */
export function deriveRedeemRequestStatus(
  request: readonly [bigint, bigint] | undefined,
  nowSec: number = Math.floor(Date.now() / 1000),
): AnchorRedeemRequestStatus | undefined {
  if (!request) return undefined;
  const [start, end] = request;
  if (start === 0n && end === 0n) return undefined;
  const now = BigInt(nowSec);
  if (now < start) {
    return {
      state: "pending",
      label: `Opens in ${formatCountdown(Number(start - now))}`,
      windowStart: start,
      windowEnd: end,
    };
  }
  if (now <= end) {
    return {
      state: "open",
      label: `${formatCountdown(Number(end - now))} left`,
      windowStart: start,
      windowEnd: end,
    };
  }
  return undefined;
}

/** Build selectable redeem positions: non-zero pools + wallet ha when present. */
export function buildAnchorRedeemPositions(input: {
  peggedBalance: bigint;
  poolRows: readonly GroupedPoolPositionRow[];
  windowOpenByPoolAddress?: ReadonlyMap<string, boolean>;
  requestStatusByPoolAddress?: ReadonlyMap<
    string,
    AnchorRedeemRequestStatus | undefined
  >;
}): AnchorRedeemPosition[] {
  const positions: AnchorRedeemPosition[] = [];

  if (input.peggedBalance > 0n) {
    positions.push({
      key: "wallet",
      kind: "wallet",
      balance: input.peggedBalance,
    });
  }

  for (const row of input.poolRows) {
    if (row.balance <= 0n) continue;
    const addr = row.poolAddress.toLowerCase();
    const requestStatus = input.requestStatusByPoolAddress?.get(addr);
    positions.push({
      key: row.key,
      kind: "pool",
      marketId: row.marketId,
      market: row.market,
      poolType: row.poolType,
      poolAddress: row.poolAddress,
      balance: row.balance,
      windowOpen:
        requestStatus?.state === "open" ||
        input.windowOpenByPoolAddress?.get(addr) === true,
      requestStatus,
    });
  }

  // Pin ready / pending request pools first (after wallet).
  positions.sort((a, b) => {
    if (a.kind === "wallet") return -1;
    if (b.kind === "wallet") return 1;
    const rank = (p: AnchorRedeemPoolPosition) => {
      if (p.requestStatus?.state === "open" || p.windowOpen) return 0;
      if (p.requestStatus?.state === "pending") return 1;
      return 2;
    };
    return rank(a) - rank(b);
  });

  return positions;
}

export function redeemPositionTitle(
  position: AnchorRedeemPosition,
  _peggedSymbol?: string,
): string {
  if (position.kind === "wallet") {
    return "Wallet";
  }
  const marketName = position.market?.name || position.marketId;
  const poolLabel =
    position.poolType === "sail" ? "sail pool" : "collateral pool";
  return `${marketName} ${poolLabel}`;
}

export function redeemPositionSubtitle(
  _position: AnchorRedeemPosition,
): string | undefined {
  return undefined;
}

/** Format getWithdrawalWindow [startDelay, endWindow] for user copy. */
export function formatWithdrawalWindowTiming(
  window: readonly [bigint, bigint] | undefined,
): { delayLabel: string; durationLabel: string } {
  if (!window) {
    return { delayLabel: "1 hour", durationLabel: "24 hours" };
  }
  const [startDelay, endWindow] = window;
  const delayHours = Number(startDelay) / 3600;
  const durationHours = Number(endWindow) / 3600;
  const formatHours = (h: number) => {
    if (!Number.isFinite(h) || h <= 0) return "soon";
    if (Math.abs(h - Math.round(h)) < 0.05) {
      const n = Math.round(h);
      return `${n} hour${n === 1 ? "" : "s"}`;
    }
    if (h < 1) {
      const m = Math.max(1, Math.round(h * 60));
      return `${m} minute${m === 1 ? "" : "s"}`;
    }
    return `${h.toFixed(1)} hours`;
  };
  return {
    delayLabel: formatHours(delayHours),
    durationLabel: formatHours(durationHours),
  };
}

/** Attach USD value + pool APR for display rows. */
export function enrichAnchorRedeemPositions(
  positions: readonly AnchorRedeemPosition[],
  input: {
    peggedPriceUSD: number;
    aprByPoolAddress?: ReadonlyMap<string, number | undefined>;
  },
): AnchorRedeemPosition[] {
  const price = input.peggedPriceUSD;
  return positions.map((position) => {
    const balanceNum = Number(position.balance) / 1e18;
    const usdValue =
      price > 0 && Number.isFinite(balanceNum)
        ? balanceNum * price
        : undefined;
    if (position.kind === "wallet") {
      return { ...position, usdValue, apr: undefined };
    }
    const apr = input.aprByPoolAddress?.get(
      position.poolAddress.toLowerCase(),
    );
    return {
      ...position,
      usdValue,
      apr: apr !== undefined && Number.isFinite(apr) ? apr : undefined,
    };
  });
}
