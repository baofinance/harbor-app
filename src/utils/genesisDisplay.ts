/** Sail-style direction label for Maiden Voyage token strip (e.g. longETH-shortUSD). */
export function getMaidenVoyageLeveragedFlowLabel(
  collateralSymbol: string,
  pegTarget?: string
): string {
  const peg = (pegTarget ?? "USD").toUpperCase();
  const col = collateralSymbol.toLowerCase();
  const isEthCollateral =
    col.includes("steth") || col === "eth" || col === "weth";

  if (peg === "USD" && isEthCollateral) return "longETH-shortUSD";
  if (peg === "BTC" && isEthCollateral) return "longETH-shortBTC";
  if (peg === "EUR" && isEthCollateral) return "longETH-shortEUR";

  const longAsset = isEthCollateral
    ? "ETH"
    : collateralSymbol.replace(/^w/i, "").toUpperCase();
  return `long${longAsset}-short${peg}`;
}

/** Genesis table display: show "BTC-USD" / "STETH-USD" instead of "USD-BTC" / "USD-wstETH". Use STETH for wstETH to match other markets. */
export function formatGenesisMarketDisplayName(name: string): string {
  if (!name) return name;
  const m = name.match(/^USD-(.+)$/i);
  const base = m ? `${m[1]}-USD` : name;
  return base
    .replace(/^wsteth/i, "STETH")
    .replace(/hssteth/gi, "hsSTETH");
}
