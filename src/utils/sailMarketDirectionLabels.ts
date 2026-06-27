import type { DefinedMarket } from "@/config/markets";

const PAIR_BY_HS_SYMBOL: Record<string, { long: string; short: string }> = {
  "HSFXUSD-ETH": { long: "USD", short: "ETH" },
  "HSFXUSD-BTC": { long: "USD", short: "BTC" },
  "HSSTETH-BTC": { long: "ETH", short: "BTC" },
  "HSSTETH-EUR": { long: "ETH", short: "EUR" },
  "HSFXUSD-EUR": { long: "USD", short: "EUR" },
  "HSSTETH-USD": { long: "ETH", short: "USD" },
};

export function normalizeSailSideLabel(value: string): string {
  const v = (value || "").trim().toLowerCase();
  if (!v) return "";
  if (v.includes("fxusd") || v.includes("fxsave") || v === "usd") return "USD";
  if (v.includes("wsteth") || v.includes("steth") || v === "eth") return "ETH";
  if (v.includes("btc")) return "BTC";
  if (v.includes("eur")) return "EUR";
  return value.trim().toUpperCase();
}

export function resolveHsSymbol(
  market: DefinedMarket,
  longSide: string,
  shortSide: string
): string {
  const fromLong = (longSide || "").toLowerCase().startsWith("hs") ? longSide : "";
  const fromShort = (shortSide || "").toLowerCase().startsWith("hs") ? shortSide : "";
  return fromLong || fromShort || market.leveragedToken?.symbol || "hs";
}

export function getSailDirectionChipLabels(
  market: DefinedMarket,
  longSide: string,
  shortSide: string
): { longLabel: string; shortLabel: string } {
  const hsSymbol = resolveHsSymbol(market, longSide, shortSide);
  const mapped = PAIR_BY_HS_SYMBOL[hsSymbol.toUpperCase()];
  return {
    longLabel: mapped?.long ?? normalizeSailSideLabel(longSide),
    shortLabel: mapped?.short ?? normalizeSailSideLabel(shortSide),
  };
}

/** Primary Sail market title — e.g. "Short BTC · Long USD". */
export function formatSailMarketDirectionTitle(
  market: DefinedMarket,
  longSide = "",
  shortSide = ""
): string {
  const { longLabel, shortLabel } = getSailDirectionChipLabels(
    market,
    longSide,
    shortSide
  );
  return `Short ${shortLabel} · Long ${longLabel}`;
}

/** Dropdown / picker title — e.g. "Long USD vs ETH". */
export function formatSailMarketDropdownTitle(
  market: DefinedMarket,
  longSide = "",
  shortSide = ""
): string {
  const { longLabel, shortLabel } = getSailDirectionChipLabels(
    market,
    longSide,
    shortSide
  );
  return `Long ${longLabel} vs ${shortLabel}`;
}

export function getSailMarketTokenSymbol(market: DefinedMarket): string {
  return market.leveragedToken?.symbol?.trim() || "—";
}
