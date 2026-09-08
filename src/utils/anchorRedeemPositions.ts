import type { DefinedMarket } from "@/config/markets";

export type AnchorRedeemPositionKind = "wallet" | "pool";

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

/** Build selectable redeem positions: non-zero pools + wallet ha when present. */
export function buildAnchorRedeemPositions(input: {
  peggedBalance: bigint;
  poolRows: readonly GroupedPoolPositionRow[];
  windowOpenByPoolAddress?: ReadonlyMap<string, boolean>;
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
    positions.push({
      key: row.key,
      kind: "pool",
      marketId: row.marketId,
      market: row.market,
      poolType: row.poolType,
      poolAddress: row.poolAddress,
      balance: row.balance,
      windowOpen: input.windowOpenByPoolAddress?.get(addr) === true,
    });
  }

  // Pin ready-to-withdraw pool rows first (after wallet).
  positions.sort((a, b) => {
    if (a.kind === "wallet") return -1;
    if (b.kind === "wallet") return 1;
    const aReady = a.windowOpen ? 0 : 1;
    const bReady = b.windowOpen ? 0 : 1;
    return aReady - bReady;
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
  const poolLabel = position.poolType === "sail" ? "sail pool" : "collateral pool";
  return `${marketName} ${poolLabel}`;
}

export function redeemPositionSubtitle(
  position: AnchorRedeemPosition,
): string | undefined {
  if (position.kind === "wallet") return undefined;
  return undefined;
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
