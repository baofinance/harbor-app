import type { ReactNode } from "react";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";

export type DashboardPositionGroup = {
  id: string;
  title: string;
  rows: DashboardPositionRow[];
  loading: boolean;
  error: string | null;
  emptyHint: ReactNode;
};
