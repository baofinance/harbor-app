import type { ComponentType } from "react";
import {
  ArchiveBoxIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import {
  DASHBOARD_PRODUCT_ICON_ARCHIVED_CLASS,
  DASHBOARD_PRODUCT_ICON_EARN_CLASS,
  DASHBOARD_PRODUCT_ICON_MV_CLASS,
  DASHBOARD_PRODUCT_ICON_SAIL_CLASS,
  DASHBOARD_PRODUCT_ICON_YIELD_FEATURED_CLASS,
  DASHBOARD_PRODUCT_ACCENT_ARCHIVED_CLASS,
  DASHBOARD_PRODUCT_ACCENT_EARN_CLASS,
  DASHBOARD_PRODUCT_ACCENT_MV_CLASS,
  DASHBOARD_PRODUCT_ACCENT_SAIL_CLASS,
  DASHBOARD_PRODUCT_ACCENT_YIELD_FEATURED_CLASS,
  DASHBOARD_PRODUCT_TITLE_CLASS,
  DASHBOARD_PRODUCT_TITLE_FEATURED_CLASS,
  DASHBOARD_STAT_CHIP_BORDER_ARCHIVED_CLASS,
  DASHBOARD_STAT_CHIP_BORDER_EARN_CLASS,
  DASHBOARD_STAT_CHIP_BORDER_MAIDEN_CLASS,
  DASHBOARD_STAT_CHIP_BORDER_SAIL_CLASS,
  DASHBOARD_STAT_CHIP_BORDER_YIELD_CLASS,
} from "./dashboardStyles";

export function dashboardProductStatChipBorderClass(
  id: DashboardProductId,
): string {
  switch (id) {
    case "earn":
      return DASHBOARD_STAT_CHIP_BORDER_EARN_CLASS;
    case "sail":
      return DASHBOARD_STAT_CHIP_BORDER_SAIL_CLASS;
    case "archived":
      return DASHBOARD_STAT_CHIP_BORDER_ARCHIVED_CLASS;
    case "maiden":
      return DASHBOARD_STAT_CHIP_BORDER_MAIDEN_CLASS;
    case "yield":
      return DASHBOARD_STAT_CHIP_BORDER_YIELD_CLASS;
  }
}

export type DashboardProductId =
  | "maiden"
  | "earn"
  | "sail"
  | "archived"
  | "yield";

export type DashboardProductMeta = {
  id: DashboardProductId;
  title: string;
  titleClass?: string;
  headerHref?: string;
  icon: ComponentType<{ className?: string }>;
  iconBadgeClass: string;
  accentBarClass: string;
  tone?: "default" | "muted";
  featured?: boolean;
};

export const DASHBOARD_PRODUCT_META: Record<DashboardProductId, DashboardProductMeta> =
  {
    maiden: {
      id: "maiden",
      title: "Maiden Voyage",
      headerHref: "/genesis",
      icon: SparklesIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_MV_CLASS,
      accentBarClass: DASHBOARD_PRODUCT_ACCENT_MV_CLASS,
    },
    earn: {
      id: "earn",
      title: "Earn",
      headerHref: "/earn",
      icon: CurrencyDollarIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_EARN_CLASS,
      accentBarClass: DASHBOARD_PRODUCT_ACCENT_EARN_CLASS,
    },
    sail: {
      id: "sail",
      title: "Sail",
      headerHref: "/sail",
      icon: WalletIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_SAIL_CLASS,
      accentBarClass: DASHBOARD_PRODUCT_ACCENT_SAIL_CLASS,
    },
    archived: {
      id: "archived",
      title: "Archived",
      titleClass: "text-xs font-semibold uppercase tracking-normal text-white/60",
      icon: ArchiveBoxIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_ARCHIVED_CLASS,
      accentBarClass: DASHBOARD_PRODUCT_ACCENT_ARCHIVED_CLASS,
      tone: "muted",
    },
    yield: {
      id: "yield",
      title: "Maiden Voyage",
      titleClass: DASHBOARD_PRODUCT_TITLE_FEATURED_CLASS,
      headerHref: "/genesis",
      icon: SparklesIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_YIELD_FEATURED_CLASS,
      accentBarClass: DASHBOARD_PRODUCT_ACCENT_YIELD_FEATURED_CLASS,
      featured: true,
    },
  };

export function dashboardProductTitleClass(meta: DashboardProductMeta): string {
  return meta.titleClass ?? DASHBOARD_PRODUCT_TITLE_CLASS;
}
