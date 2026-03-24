/** Display helpers used by Sail market row and expanded panel (table-specific, not global `formatUSD`). */

export function formatUSD(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return "-";
  if (value === 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatToken(
  value: bigint | undefined,
  decimals = 18,
  maxFrac = 4,
  minFrac?: number
): string {
  if (!value) return "0";
  const n = Number(value) / 10 ** decimals;
  if (n > 0 && n < 1 / 10 ** maxFrac)
    return `<${(1 / 10 ** maxFrac).toFixed(maxFrac)}`;
  const min = minFrac ?? 0;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: min,
    maximumFractionDigits: maxFrac,
  });
}

export function formatRatio(value: bigint | undefined): string {
  if (value === undefined) return "-";
  const percentage = Number(value) / 1e16;
  return `${percentage.toFixed(2)}%`;
}

export function formatLeverage(value: bigint | undefined): string {
  if (!value) return "-";
  const leverage = Number(value) / 1e18;
  return `${leverage.toFixed(2)}x`;
}

export function formatPnL(value: number): { text: string; color: string } {
  const isPositive = value >= 0;
  const sign = isPositive ? "+" : "-";
  const text = `${sign}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const color = isPositive ? "text-green-600" : "text-red-600";
  return { text, color };
}
