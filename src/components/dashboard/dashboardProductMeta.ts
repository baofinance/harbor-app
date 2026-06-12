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
  DASHBOARD_PRODUCT_ICON_YIELD_CLASS,
} from "./dashboardStyles";

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
  tone?: "default" | "muted";
};

export const DASHBOARD_PRODUCT_META: Record<DashboardProductId, DashboardProductMeta> =
  {
    maiden: {
      id: "maiden",
      title: "Maiden Voyage",
      viewAllHref: "/genesis",
      viewAllLabel: "View all",
      icon: SparklesIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_MV_CLASS,
    },
    earn: {
      id: "earn",
      title: "Earn",
      viewAllHref: "/anchor",
      viewAllLabel: "View all",
      icon: CurrencyDollarIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_EARN_CLASS,
    },
    sail: {
      id: "sail",
      title: "Sail",
      viewAllHref: "/sail",
      viewAllLabel: "View all",
      icon: WalletIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_SAIL_CLASS,
    },
    archived: {
      id: "archived",
      title: "Archived",
      viewAllHref: "/genesis",
      viewAllLabel: "View all",
      icon: ArchiveBoxIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_ARCHIVED_CLASS,
      tone: "muted",
    },
    yield: {
      id: "yield",
      title: "Yield share",
      icon: ChartBarIcon,
      iconBadgeClass: DASHBOARD_PRODUCT_ICON_YIELD_CLASS,
    },
  };
