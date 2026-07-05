"use client";

import { useCallback, useEffect, useState } from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import {
  DASHBOARD_MODULE_LABELS,
  DEFAULT_DASHBOARD_MODULE_ORDER,
  loadDashboardModuleOrder,
  moveModule,
  saveDashboardModuleOrder,
  type DashboardModuleId,
} from "./dashboardModuleLayout";
import { ENGAGEMENT_CARD_CLASS, ENGAGEMENT_MUTED_CLASS } from "./engagementStyles";

export type DashboardModuleLayoutControlsProps = {
  order: DashboardModuleId[];
  onOrderChange: (order: DashboardModuleId[]) => void;
};

export function useDashboardModuleLayout() {
  const [order, setOrder] = useState<DashboardModuleId[]>(loadDashboardModuleOrder);

  useEffect(() => {
    saveDashboardModuleOrder(order);
  }, [order]);

  const move = useCallback((id: DashboardModuleId, direction: "up" | "down") => {
    setOrder((prev) => moveModule(prev, id, direction));
  }, []);

  const reset = useCallback(() => {
    setOrder([...DEFAULT_DASHBOARD_MODULE_ORDER]);
  }, []);

  return { order, setOrder, move, reset };
}

export function DashboardModuleLayoutControls({
  order,
  onOrderChange,
}: DashboardModuleLayoutControlsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex justify-end">
      <button
        type="button"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-medium text-white/80 transition hover:border-white/25 hover:bg-white/[0.1] sm:px-2.5 sm:py-1.5 sm:text-xs"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" aria-hidden />
        Customize layout
      </button>

      {open ? (
        <div
          className={`${ENGAGEMENT_CARD_CLASS} absolute right-3 top-12 z-20 w-[min(100%,20rem)] shadow-xl sm:right-10`}
          role="dialog"
          aria-label="Dashboard module order"
        >
          <p className="text-sm font-semibold text-white/95">Module order</p>
          <p className={`${ENGAGEMENT_MUTED_CLASS} mt-1`}>
            Reorder sections to match how you use Harbor.
          </p>
          <ul className="mt-3 space-y-1">
            {order.map((id, idx) => (
              <li
                key={id}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-[#0a1929]/40 px-2.5 py-2"
              >
                <span className="text-sm text-white/85">{DASHBOARD_MODULE_LABELS[id]}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/70 disabled:opacity-30"
                    onClick={() => onOrderChange(moveModule(order, id, "up"))}
                    aria-label={`Move ${DASHBOARD_MODULE_LABELS[id]} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={idx === order.length - 1}
                    className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/70 disabled:opacity-30"
                    onClick={() => onOrderChange(moveModule(order, id, "down"))}
                    aria-label={`Move ${DASHBOARD_MODULE_LABELS[id]} down`}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
