import { markets, isMarketArchived } from "@/config/markets";

export type AdminPoolKind = "collateral" | "leveraged";

export type MarketPoolVisibilityFilter = "active" | "archived" | "all";

export function poolKindLabel(kind: AdminPoolKind) {
  return kind === "collateral" ? "Anchor Pool" : "Sail Pool";
}

function isAnchorPoolActiveInConfig(marketId: string): boolean {
  const mkt = markets[marketId as keyof typeof markets];
  if (!mkt || isMarketArchived(mkt)) return false;
  return (mkt as { anchorActive?: boolean | "soon" }).anchorActive === true;
}

function isSailPoolActiveInConfig(marketId: string): boolean {
  const mkt = markets[marketId as keyof typeof markets];
  if (!mkt || isMarketArchived(mkt)) return false;
  return (mkt as { sailActive?: boolean | "soon" }).sailActive === true;
}

function isPoolArchivedInConfig(marketId: string, poolKind: AdminPoolKind): boolean {
  const mkt = markets[marketId as keyof typeof markets];
  if (!mkt) return true;
  if (isMarketArchived(mkt)) return true;
  return poolKind === "collateral"
    ? !isAnchorPoolActiveInConfig(marketId)
    : !isSailPoolActiveInConfig(marketId);
}

export function poolMatchesVisibilityFilter(
  marketId: string,
  poolKind: AdminPoolKind,
  filter: MarketPoolVisibilityFilter,
): boolean {
  switch (filter) {
    case "active":
      return poolKind === "collateral"
        ? isAnchorPoolActiveInConfig(marketId)
        : isSailPoolActiveInConfig(marketId);
    case "archived":
      return isPoolArchivedInConfig(marketId, poolKind);
    case "all":
      return true;
  }
}
