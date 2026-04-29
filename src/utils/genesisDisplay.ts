/** Genesis table display: show "BTC-USD" / "STETH-USD" instead of "USD-BTC" / "USD-wstETH". Use STETH for wstETH to match other markets. */
export function formatGenesisMarketDisplayName(name: string): string {
  if (!name) return name;
  const m = name.match(/^USD-(.+)$/i);
  const base = m ? `${m[1]}-USD` : name;
  return base.replace(/^wsteth/i, "STETH");
}
