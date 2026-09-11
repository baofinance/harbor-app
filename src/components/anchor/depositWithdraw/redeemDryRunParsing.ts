export function parseRedeemDryRunTuple(data: unknown) {
  if (!data || !Array.isArray(data) || data.length < 5) return null;
  const [, fee, , peggedRedeemed, wrappedCollateralReturned] = data as [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
  ];
  return {
    fee: BigInt(fee),
    peggedRedeemed: BigInt(peggedRedeemed),
    wrappedCollateralReturned: BigInt(wrappedCollateralReturned),
  };
}

export function parseRedeemFeePercentage(data: unknown): number | undefined {
  if (!data || !Array.isArray(data) || data.length < 1) return undefined;
  const incentiveRatioBN = BigInt(data[0] as bigint);
  if (incentiveRatioBN === 1000000000000000000n) return undefined;
  if (incentiveRatioBN > 0n) return Number(incentiveRatioBN) / 1e16;
  return 0;
}

export function isRedeemAmountCapped(
  redeemInputAmount: bigint,
  peggedRedeemed: bigint,
) {
  if (peggedRedeemed <= 0n) return false;
  const tolerance = peggedRedeemed / 1000n;
  return redeemInputAmount > peggedRedeemed + tolerance;
}
