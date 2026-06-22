"use client";

export type DashboardModuleId = "portfolio" | "activity";

export const DASHBOARD_MODULE_LABELS: Record<DashboardModuleId, string> = {
  portfolio: "Portfolio",
  activity: "Recent Activity",
};

export const DEFAULT_DASHBOARD_MODULE_ORDER: DashboardModuleId[] = [
  "portfolio",
  "activity",
];

const STORAGE_KEY = "harbor:dashboard-module-order-v3";

function isModuleId(value: string): value is DashboardModuleId {
  return value in DASHBOARD_MODULE_LABELS;
}

function normalizeOrder(order: string[]): DashboardModuleId[] {
  const valid = order.filter(isModuleId);
  const missing = DEFAULT_DASHBOARD_MODULE_ORDER.filter((id) => !valid.includes(id));
  return [...valid, ...missing];
}

export function loadDashboardModuleOrder(): DashboardModuleId[] {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_MODULE_ORDER;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DASHBOARD_MODULE_ORDER;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return DEFAULT_DASHBOARD_MODULE_ORDER;
    return normalizeOrder(parsed);
  } catch {
    return DEFAULT_DASHBOARD_MODULE_ORDER;
  }
}

export function saveDashboardModuleOrder(order: DashboardModuleId[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

export function moveModule(
  order: DashboardModuleId[],
  id: DashboardModuleId,
  direction: "up" | "down",
): DashboardModuleId[] {
  const idx = order.indexOf(id);
  if (idx < 0) return order;
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= order.length) return order;
  const next = [...order];
  [next[idx], next[swap]] = [next[swap]!, next[idx]!];
  return next;
}
