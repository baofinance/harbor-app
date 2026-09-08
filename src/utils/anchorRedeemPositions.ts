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
};

export type AnchorRedeemWalletPosition = {
  key: "wallet";
  kind: "wallet";
  balance: bigint;
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
  peggedSymbol: string,
): string {
  if (position.kind === "wallet") {
    return "In wallet";
  }
  if (position.poolType === "sail") {
    return "Earn · Sail";
  }
  const collateral =
    position.market?.collateral?.symbol ||
    (position.market as { wrappedCollateralToken?: { symbol?: string } })
      ?.wrappedCollateralToken?.symbol ||
    "Collateral";
  return `Earn · ${collateral}`;
}

export function redeemPositionSubtitle(
  position: AnchorRedeemPosition,
): string | undefined {
  if (position.kind === "wallet") return undefined;
  return position.market?.name || position.marketId;
}
