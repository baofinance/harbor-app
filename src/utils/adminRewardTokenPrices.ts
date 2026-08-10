import { markets } from "@/config/markets";

export type PegTargetUsdPrices = {
  ethPrice: number | null;
  btcPrice: number | null;
  eurPrice: number | null;
  goldPrice: number | null;
  silverPrice: number | null;
};

export type CoinGeckoRewardPrices = {
  fxSAVEPrice: number | null;
  wstETHPrice: number | null;
};

const PRIMARY_REWARD_SYMBOLS = new Set(["fxsave", "wsteth"]);

/** Scan markets config for pegged token address → peg target. */
export function buildPeggedTokenAddressMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of Object.values(markets)) {
    const addr = (m as { addresses?: { peggedToken?: string } }).addresses
      ?.peggedToken;
    const pegTarget = (m as { pegTarget?: string }).pegTarget;
    if (typeof addr === "string" && typeof pegTarget === "string") {
      map[addr.toLowerCase()] = pegTarget;
    }
  }
  return map;
}

/** Map peg target string to USD price from feeds. */
export function resolvePegTargetUsdPrice(
  pegTarget: string,
  pegPrices: PegTargetUsdPrices,
): number | null {
  const target = pegTarget.trim().toLowerCase();
  if (target === "usd" || target === "fxusd") return 1;
  if (target === "eth" || target === "ethereum") return pegPrices.ethPrice;
  if (target === "btc" || target === "bitcoin") return pegPrices.btcPrice;
  if (target === "eur" || target === "euro") return pegPrices.eurPrice;
  if (target === "gold") return pegPrices.goldPrice;
  if (target === "silver") return pegPrices.silverPrice;
  return null;
}

/** Infer peg target from ha* symbol when address map misses (e.g. haETH → ETH). */
export function inferPegTargetFromHaSymbol(symbol: string): string | null {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized.startsWith("HA")) return null;
  const suffix = normalized.slice(2);
  if (suffix === "USD") return "USD";
  if (suffix === "ETH") return "ETH";
  if (suffix === "BTC") return "BTC";
  if (suffix === "EUR") return "EUR";
  if (suffix === "GOLD") return "GOLD";
  if (suffix === "SILVER") return "SILVER";
  return suffix || null;
}

/** USD price for ha* deposit tokens from underlying feed. */
export function resolveHaTokenUsdPrice(
  symbol: string,
  pegTarget: string | null | undefined,
  pegPrices: PegTargetUsdPrices,
): number | null {
  const normalizedSymbol = symbol.trim().toLowerCase();
  if (!normalizedSymbol.startsWith("ha")) return null;

  const target =
    pegTarget?.trim() ||
    inferPegTargetFromHaSymbol(symbol) ||
    null;
  if (!target) return null;

  return resolvePegTargetUsdPrice(target, pegPrices);
}

/** USD price for primary reward tokens (fxSAVE, wstETH). */
export function resolveRewardTokenUsdPrice(
  symbol: string,
  cgPrices: CoinGeckoRewardPrices,
): number | null {
  const normalized = symbol.trim().toLowerCase();
  if (normalized === "fxsave") return cgPrices.fxSAVEPrice;
  if (normalized === "wsteth") return cgPrices.wstETHPrice;
  return null;
}

export function isPrimaryRewardTokenSymbol(symbol: string): boolean {
  return PRIMARY_REWARD_SYMBOLS.has(symbol.trim().toLowerCase());
}

export function isHaDepositTokenSymbol(symbol: string): boolean {
  return symbol.trim().toLowerCase().startsWith("ha");
}

export function formatAdminPriceUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "";
  return value.toFixed(2);
}

/** Reward tokens (fxSAVE, wstETH) need finer precision than ha* deposit prices. */
export function formatAdminRewardPriceUsd(
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "";
  return value.toFixed(6);
}

export type BuildSuggestedPricesInput = {
  depositTokenAddresses: string[];
  rewardTokenAddresses: string[];
  tokenSymbolByAddress: Record<string, string>;
  peggedTokenAddressMap?: Record<string, string>;
  pegPrices: PegTargetUsdPrices;
  cgPrices: CoinGeckoRewardPrices;
};

/** Build suggested price maps for deposit (ha*) and primary reward tokens. */
export function buildSuggestedAdminTokenPrices(
  input: BuildSuggestedPricesInput,
): {
  suggestedDepositPrices: Record<string, string>;
  suggestedRewardPrices: Record<string, string>;
} {
  const peggedMap = input.peggedTokenAddressMap ?? buildPeggedTokenAddressMap();
  const suggestedDepositPrices: Record<string, string> = {};
  const suggestedRewardPrices: Record<string, string> = {};

  for (const addr of input.depositTokenAddresses) {
    const symbol = input.tokenSymbolByAddress[addr] ?? "";
    if (!isHaDepositTokenSymbol(symbol)) continue;
    const pegTarget = peggedMap[addr];
    const usd = resolveHaTokenUsdPrice(symbol, pegTarget, input.pegPrices);
    const formatted = formatAdminPriceUsd(usd);
    if (formatted) suggestedDepositPrices[addr] = formatted;
  }

  for (const addr of input.rewardTokenAddresses) {
    const symbol = input.tokenSymbolByAddress[addr] ?? "";
    if (!isPrimaryRewardTokenSymbol(symbol)) continue;
    const usd = resolveRewardTokenUsdPrice(symbol, input.cgPrices);
    const formatted = formatAdminRewardPriceUsd(usd);
    if (formatted) suggestedRewardPrices[addr] = formatted;
  }

  return { suggestedDepositPrices, suggestedRewardPrices };
}
