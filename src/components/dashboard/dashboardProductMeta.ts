import type { ComponentType } from "react";
import {
  ArchiveBoxIcon,
  ChartBarIcon,
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
  viewAllHref?: string;
  viewAllLabel?: string;
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
      viewAllHref: "/genesis",
      viewAllLabel: "Go",
      icon: SparklesIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_MV_CLASS,
      accentBarClass: DASHBOARD_PRODUCT_ACCENT_MV_CLASS,
    },
    earn: {
      id: "earn",
      title: "Earn",
      icon: CurrencyDollarIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_EARN_CLASS,
      accentBarClass: DASHBOARD_PRODUCT_ACCENT_EARN_CLASS,
    },
    sail: {
      id: "sail",
      title: "Sail",
      icon: WalletIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_SAIL_CLASS,
      accentBarClass: DASHBOARD_PRODUCT_ACCENT_SAIL_CLASS,
    },
    archived: {
      id: "archived",
      title: "Archived",
      icon: ArchiveBoxIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_ARCHIVED_CLASS,
      accentBarClass: DASHBOARD_PRODUCT_ACCENT_ARCHIVED_CLASS,
      tone: "muted",
    },
    yield: {
      id: "yield",
      title: "Revenue share",
      featured: true,
      icon: ChartBarIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_YIELD_FEATURED_CLASS,
      accentBarClass: DASHBOARD_PRODUCT_ACCENT_YIELD_FEATURED_CLASS,
    },
  };
