"use client";

import {
  MarketArchivedBadge,
  WithdrawOnlyTag,
} from "@/components/MarketMaintenanceTag";

export type ArchivedMarketsListSectionProps = {
  markets: Array<[string, { name?: string }]>;
  showSection: boolean;
  onToggleShow: () => void;
  onManage: (marketId: string) => void;
  className?: string;
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
}: ArchivedMarketsListSectionProps) {
  if (markets.length === 0) return null;

  return (
    <section className={`space-y-3 mt-8 ${className}`}>
      <button
        type="button"
        onClick={onToggleShow}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-left hover:bg-white/10 transition-colors"
      >
        <div>
          <h2 className="text-xs font-medium text-white/80 uppercase tracking-wider">
            Archived markets
          </h2>
          <p className="text-[11px] text-white/50 mt-0.5">
            New deposits disabled · withdrawals and redeems still available
          </p>
        </div>
        <span className="text-xs text-white/60 shrink-0">
          {showSection ? "Hide" : "Show"} ({markets.length})
        </span>
      </button>

      {showSection ? (
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
                onClick={() => onManage(id)}
                className="shrink-0 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15 transition-colors"
              >
                Manage
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
