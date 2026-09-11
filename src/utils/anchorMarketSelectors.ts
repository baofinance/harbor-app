import type { DefinedMarket } from "@/config/markets";
import { isAnchorSoonUi } from "@/config/markets";

function marketChainKey(market: { chain?: { name?: string } }): string {
  return market.chain?.name ?? "Ethereum";
}

export type AnchorBackingOption = {
  marketId: string;
  market: DefinedMarket;
  backingLabel: string;
  chainKey: string;
  apyLabel?: string;
  isComingSoon: boolean;
};

export type AnchorPegGroup = {
  pegKey: string;
  /** Display label — haETH, haBTC, haEUR, … */
  pegLabel: string;
  haSymbol: string;
  pegTarget: string;
  /** Representative market for chain icon in the peg selector. */
  representativeMarket: DefinedMarket;
  backingOptions: AnchorBackingOption[];
  /** True when this peg has markets on more than one chain. */
  multiChain: boolean;
};

const PEG_SORT_ORDER = ["ETH", "BTC", "EUR", "USD", "GOLD", "SILVER", "MCAP"];

export function getAnchorPegLabel(market: DefinedMarket): string {
  return market.peggedToken?.symbol || `ha${market.pegTarget ?? ""}` || "—";
}

export function getAnchorPegTarget(market: DefinedMarket): string {
  return market.pegTarget || market.peggedToken?.symbol?.replace(/^ha/i, "") || "—";
}

export function getAnchorBackingLabel(market: DefinedMarket): string {
  return (
    market.collateral?.symbol ||
    market.collateral?.underlyingSymbol ||
    "—"
  );
}

function pegSortIndex(peg: string): number {
  const idx = PEG_SORT_ORDER.indexOf(peg);
  return idx >= 0 ? idx : PEG_SORT_ORDER.length;
}

/** Group displayed Anchor markets by peg target; backing rows carry APY + chain when needed. */
export function buildAnchorPegGroups(
  markets: readonly [string, DefinedMarket][],
  options?: {
    apyByMarketId?: Map<string, string | undefined>;
  },
): AnchorPegGroup[] {
  const byPeg = new Map<string, AnchorBackingOption[]>();

  for (const [marketId, market] of markets) {
    const pegLabel = getAnchorPegLabel(market);
    const pegKey = pegLabel;
    const entry: AnchorBackingOption = {
      marketId,
      market,
      backingLabel: getAnchorBackingLabel(market),
      chainKey: marketChainKey(market),
      apyLabel: options?.apyByMarketId?.get(marketId),
      isComingSoon: isAnchorSoonUi(market),
    };
    const list = byPeg.get(pegKey) ?? [];
    list.push(entry);
    byPeg.set(pegKey, list);
  }

  const groups: AnchorPegGroup[] = [];

  for (const [pegKey, backingOptions] of byPeg) {
    const chains = new Set(backingOptions.map((o) => o.chainKey));
    const multiChain = chains.size > 1;
    const sample = backingOptions.find((o) => !o.isComingSoon)?.market ?? backingOptions[0]?.market;
    if (!sample) continue;
    groups.push({
      pegKey,
      pegLabel: pegKey,
      haSymbol: pegKey,
      pegTarget: getAnchorPegTarget(sample),
      representativeMarket: sample,
      multiChain,
      backingOptions: [...backingOptions].sort((a, b) => {
        if (a.isComingSoon !== b.isComingSoon) {
          return a.isComingSoon ? 1 : -1;
        }
        const apyA = parseApySortValue(a.apyLabel);
        const apyB = parseApySortValue(b.apyLabel);
        if (apyA !== apyB) return apyB - apyA;
        return a.backingLabel.localeCompare(b.backingLabel);
      }),
    });
  }

  groups.sort(
    (a, b) =>
      pegSortIndex(a.pegTarget) - pegSortIndex(b.pegTarget) ||
      a.pegLabel.localeCompare(b.pegLabel),
  );

  return groups;
}

function parseApySortValue(apyLabel?: string): number {
  if (!apyLabel) return -1;
  const match = apyLabel.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : -1;
}

export function findPegGroupForMarket(
  groups: AnchorPegGroup[],
  marketId: string | null,
): AnchorPegGroup | undefined {
  if (!marketId) return groups[0];
  return groups.find((g) =>
    g.backingOptions.some((o) => o.marketId === marketId),
  );
}

export function pickDefaultBackingMarketId(
  group: AnchorPegGroup,
  hasPosition: (marketId: string) => boolean,
): string | null {
  for (const option of group.backingOptions) {
    if (!option.isComingSoon && hasPosition(option.marketId)) {
      return option.marketId;
    }
  }
  const live = group.backingOptions.find((o) => !o.isComingSoon);
  return live?.marketId ?? group.backingOptions[0]?.marketId ?? null;
}
