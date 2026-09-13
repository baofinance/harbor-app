"use client";

import type { ReactNode } from "react";
import { DEPOSIT_TRADE_PANEL_GRID_CLASS } from "@/components/deposit/depositFlowStyles";

export type ProductAdvancedLayoutShellProps = {
  /** Market / voyage header (selectors, wallet strips, etc.). */
  header: ReactNode;
  /** Optional banner above the trade grid (e.g. deposits paused, data error). */
  banner?: ReactNode;
  /** Chart column, or Genesis voyage card. */
  primary: ReactNode;
  /** Embedded trade / claim action panel. */
  action: ReactNode;
  /**
   * DOM id on the action column for scroll-into-view.
   * Omit when the action node already owns the id (Genesis).
   */
  tradePanelId?: string;
  /** Grid class — defaults to Earn/Sail chart | panel grid. */
  gridClassName?: string;
  /** Extra classes on the outer grid wrapper. */
  gridWrapperClassName?: string;
  /** Optional DOM id on the grid wrapper (e.g. Genesis voyage section). */
  gridId?: string;
  /** Extra classes on the action column. */
  actionClassName?: string;
  /** Extra classes on the primary column. */
  primaryClassName?: string;
  /** Metrics / collapsible under the grid. */
  metrics?: ReactNode;
  /** Mobile sticky trade bar. */
  mobileBar?: ReactNode;
  /** Education / info footer. */
  infoFooter?: ReactNode;
  /** Content below the shell (e.g. Genesis explorer). */
  children?: ReactNode;
  /** Outer wrapper class override. */
  className?: string;
};

const DEFAULT_SHELL_CLASS =
  "space-y-5 pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0";

const DEFAULT_ACTION_CLASS =
  "order-2 flex min-h-0 w-full min-w-0 flex-col scroll-mt-20 lg:order-none lg:h-full lg:self-stretch";

const DEFAULT_PRIMARY_CLASS =
  "order-1 flex min-h-0 flex-col gap-3 lg:order-none lg:h-full";

/**
 * Shared advanced trade layout: header → optional banner → primary | action
 * grid → metrics → mobile bar → info footer → children.
 */
export function ProductAdvancedLayoutShell({
  header,
  banner,
  primary,
  action,
  tradePanelId,
  gridClassName = DEPOSIT_TRADE_PANEL_GRID_CLASS,
  gridWrapperClassName,
  gridId,
  actionClassName = DEFAULT_ACTION_CLASS,
  primaryClassName = DEFAULT_PRIMARY_CLASS,
  metrics,
  mobileBar,
  infoFooter,
  children,
  className = DEFAULT_SHELL_CLASS,
}: ProductAdvancedLayoutShellProps) {
  return (
    <div className={className}>
      {header}
      {banner}
      <div className="space-y-4 pt-0.5">
        <div
          id={gridId}
          className={
            gridWrapperClassName
              ? `relative z-0 ${gridClassName} ${gridWrapperClassName}`
              : `relative z-0 ${gridClassName}`
          }
        >
          <div className={primaryClassName}>{primary}</div>
          {tradePanelId ? (
            <div id={tradePanelId} className={actionClassName}>
              {action}
            </div>
          ) : (
            <div className={actionClassName}>{action}</div>
          )}
        </div>
        {metrics}
      </div>
      {mobileBar}
      {infoFooter}
      {children}
    </div>
  );
}
