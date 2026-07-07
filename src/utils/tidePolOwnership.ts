/**
 * Pure ownership math for TIDE flywheel treasury and POL metrics.
 */

export function treasuryOwnershipPct(
  treasuryBalance: bigint,
  totalSupply: bigint,
): number | null {
  return tokenShareOfSupplyPct(treasuryBalance, totalSupply);
}

/** Share of total supply held by an address (treasury, burn sink, etc.). */
export function tokenShareOfSupplyPct(
  balance: bigint,
  totalSupply: bigint,
): number | null {
  if (totalSupply <= 0n) return null;
  if (balance < 0n) return null;
  return (Number(balance) / Number(totalSupply)) * 100;
}

/** Alias — burned tokens as % of total supply. */
export function supplyBurnedPct(
  burnedBalance: bigint,
  totalSupply: bigint,
): number | null {
  return tokenShareOfSupplyPct(burnedBalance, totalSupply);
}

export type PolTideOwnershipInput = {
  treasuryLpBalance: bigint;
  lpTotalSupply: bigint;
  tideReserveInPool: bigint;
  totalTideSupply: bigint;
};

/** Uniswap V2-style: treasury LP share × TIDE reserve / total TIDE supply. */
export function polTideOwnershipPct(input: PolTideOwnershipInput): number | null {
  const {
    treasuryLpBalance,
    lpTotalSupply,
    tideReserveInPool,
    totalTideSupply,
  } = input;
  if (
    lpTotalSupply <= 0n ||
    totalTideSupply <= 0n ||
    treasuryLpBalance < 0n ||
    tideReserveInPool < 0n
  ) {
    return null;
  }
  const tideInPol =
    (Number(treasuryLpBalance) / Number(lpTotalSupply)) *
    Number(tideReserveInPool);
  return (tideInPol / Number(totalTideSupply)) * 100;
}

/** Pick TIDE-side reserve from pair reserves given token0/token1 addresses. */
export function tideReserveFromPair(
  token0: `0x${string}`,
  token1: `0x${string}`,
  tideToken: `0x${string}`,
  reserve0: bigint,
  reserve1: bigint,
): bigint | null {
  const tide = tideToken.toLowerCase();
  if (token0.toLowerCase() === tide) return reserve0;
  if (token1.toLowerCase() === tide) return reserve1;
  return null;
}
