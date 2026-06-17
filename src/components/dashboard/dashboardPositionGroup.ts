import type { ReactNode } from "react";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import type { DashboardEmptyStateConfig } from "./DashboardPositionsList";

export type DashboardPositionGroup = {
  id: string;
  title: string;
  rows: DashboardPositionRow[];
  loading: boolean;
  error: string | null;
  emptyState: DashboardEmptyStateConfig;
  /** @deprecated Use emptyState */
  emptyHint?: ReactNode;
};

export const DASHBOARD_EMPTY_STATES = {
  maiden: {
    title: "No active voyage participation",
    message: "Explore current voyages and earn founding rewards.",
    href: "/genesis",
    linkLabel: "Explore maiden voyages",
  },
  earn: {
    title: "No active Earn positions",
    message: "Deposit into a stability pool to start earning.",
    href: "/anchor",
    linkLabel: "Open Anchor",
  },
  sail: {
    title: "No Sail positions",
    message: "Gain leveraged market exposure with Sail.",
    href: "/sail",
    linkLabel: "Open Sail",
  },
  archived: {
    title: "No archived positions",
    message: "Past maiden voyage deposits appear here after a voyage ends.",
    href: "/genesis",
    linkLabel: "View genesis history",
  },
} as const satisfies Record<string, DashboardEmptyStateConfig>;
