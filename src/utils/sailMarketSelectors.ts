import type { DefinedMarket } from "@/config/markets";
import { isSailSoonUi } from "@/config/markets";
import { formatSailMarketPairTitle } from "@/utils/sailMarketDirectionLabels";

export type SailPairOption = {
  marketId: string;
  market: DefinedMarket;
  pairLabel: string;
  isComingSoon: boolean;
  isDepositsPaused?: boolean;
};

export type SailTokenGroup = {
  tokenKey: string;
  tokenLabel: string;
  representativeMarket: DefinedMarket;
  pairOptions: SailPairOption[];
};

/** hsFXUSD-ETH → hsFXUSD */
export function getSailTokenFamily(market: DefinedMarket): string {
  const sym = market.leveragedToken?.symbol ?? "";
  const dash = sym.indexOf("-");
  if (dash > 0) return sym.slice(0, dash);
  return sym || "hs";
}

export function getSailPairLabel(market: DefinedMarket): string {
  return formatSailMarketPairTitle(market);
}

export function buildSailTokenGroups(
  options: readonly {
    marketId: string;
    market: DefinedMarket;
    isComingSoon?: boolean;
    isDepositsPaused?: boolean;
  }[],
): SailTokenGroup[] {
  const byToken = new Map<string, SailPairOption[]>();

  for (const { marketId, market, isComingSoon, isDepositsPaused } of options) {
    const tokenKey = getSailTokenFamily(market);
    const entry: SailPairOption = {
      marketId,
      market,
      pairLabel: getSailPairLabel(market),
      isComingSoon: isComingSoon ?? isSailSoonUi(market),
      isDepositsPaused,
    };
    const list = byToken.get(tokenKey) ?? [];
    list.push(entry);
    byToken.set(tokenKey, list);
  }

  const groups: SailTokenGroup[] = [];
  for (const [tokenKey, pairOptions] of byToken) {
    pairOptions.sort((a, b) => a.pairLabel.localeCompare(b.pairLabel));
    groups.push({
      tokenKey,
      tokenLabel: tokenKey,
      representativeMarket: pairOptions[0]!.market,
      pairOptions,
    });
  }

  return groups.sort((a, b) => a.tokenLabel.localeCompare(b.tokenLabel));
}

export function findSailTokenGroupForMarket(
  groups: SailTokenGroup[],
  marketId: string | null,
): SailTokenGroup | undefined {
  if (!marketId) return groups[0];
  return groups.find((g) =>
    g.pairOptions.some((o) => o.marketId === marketId),
  );
}

export function pickDefaultSailPairMarketId(
  group: SailTokenGroup,
  hasPosition?: (marketId: string) => boolean,
): string | undefined {
  const withPosition = group.pairOptions.find(
    (o) => !o.isComingSoon && hasPosition?.(o.marketId),
  );
  if (withPosition) return withPosition.marketId;
  const live = group.pairOptions.find((o) => !o.isComingSoon);
  return live?.marketId ?? group.pairOptions[0]?.marketId;
}
