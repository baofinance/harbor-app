export function floorTokenWei(amount: bigint, decimals: number): bigint {
  if (decimals <= 0) return amount;
  const unit = 10n ** BigInt(decimals);
  return (amount / unit) * unit;
}
