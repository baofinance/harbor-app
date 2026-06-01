"use client";

import { useMemo } from "react";
import IndexToolbarSegmentedToggle from "@/components/shared/IndexToolbarSegmentedToggle";

export type DashboardPositionTabId = "maiden" | "earn" | "sail" | "archived";

const TAB_LABELS: Record<DashboardPositionTabId, string> = {
  maiden: "Maiden Voyage",
  earn: "Earn",
  sail: "Sail",
  archived: "Archived",
};

export type DashboardPositionTabsProps = {
  value: DashboardPositionTabId;
  onChange: (id: DashboardPositionTabId) => void;
  showArchived: boolean;
};

export function DashboardPositionTabs({
  value,
  onChange,
  showArchived,
}: DashboardPositionTabsProps) {
  const options = useMemo(() => {
    const ids: DashboardPositionTabId[] = showArchived
      ? ["maiden", "earn", "sail", "archived"]
      : ["maiden", "earn", "sail"];
    return ids.map((id) => ({ id, label: TAB_LABELS[id] }));
  }, [showArchived]);

  return (
    <IndexToolbarSegmentedToggle
      label="Product"
      value={value}
      options={options}
      hideLabel
      onChange={(id) => onChange(id as DashboardPositionTabId)}
      ariaLabel="Position product"
    />
  );
}

export function pickDefaultPositionTab(
  counts: Record<DashboardPositionTabId, number>,
  showArchived: boolean
): DashboardPositionTabId {
  const order: DashboardPositionTabId[] = showArchived
    ? ["maiden", "earn", "sail", "archived"]
    : ["maiden", "earn", "sail"];
  for (const id of order) {
    if (counts[id] > 0) return id;
  }
  return "maiden";
}
