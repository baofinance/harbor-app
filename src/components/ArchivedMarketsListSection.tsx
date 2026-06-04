"use client";

import type { ReactNode } from "react";
import {
  MarketArchivedBadge,
  WithdrawOnlyTag,
} from "@/components/MarketMaintenanceTag";

const DEFAULT_ARCHIVED_SUBTITLE =
  "New deposits disabled · withdrawals and redeems still available";

export type ArchivedMarketsListSectionProps = {
  markets: Array<[string, { name?: string }]>;
  showSection: boolean;
  onToggleShow: () => void;
  onManage?: (marketId: string) => void;
  className?: string;
  /** Section `id` for scroll-into-view (e.g. toolbar “View archived”). */
  sectionId?: string;
  /** Toggle title — default “Archived markets”. */
  heading?: string;
  subtitle?: string;
  /** When set, replaces the default compact market list (e.g. Maiden Voyage table rows). */
  expandedContent?: ReactNode;
};

/**
 * Collapsible list of archived markets with withdraw/redeem entry only.
 */
export function ArchivedMarketsListSection({
  markets,
  showSection,
  onToggleShow,
  onManage,
  className = "",
  sectionId,
  heading = "Archived markets",
  subtitle = DEFAULT_ARCHIVED_SUBTITLE,
  expandedContent,
}: ArchivedMarketsListSectionProps) {
  if (markets.length === 0) return null;

  return (
    <section
      id={sectionId}
      className={`space-y-3 mt-8 ${className}`}
    >
      <button
        type="button"
        onClick={onToggleShow}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-left hover:bg-white/10 transition-colors"
      >
        <div>
          <h2 className="text-xs font-medium text-white/80 uppercase tracking-wider">
            {heading}
          </h2>
          <p className="text-[11px] text-white/50 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-xs text-white/60 shrink-0">
          {showSection ? "Hide" : "Show"} ({markets.length})
        </span>
      </button>

      {showSection ? (
        expandedContent ?? (
          <ul className="space-y-2">
            {markets.map(([id, mkt]) => (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-white truncate">
                    {mkt.name ?? id}
                  </span>
                  <MarketArchivedBadge compact />
                  <WithdrawOnlyTag />
                </div>
                <button
                  type="button"
                  onClick={() => onManage?.(id)}
                  className="shrink-0 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15 transition-colors"
                >
                  Manage
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
