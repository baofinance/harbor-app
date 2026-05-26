import React from "react";
import { ArchiveBoxIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";

/**
 * Same visual language as transparency `HealthBadge` (Healthy / Warning / Critical):
 * tinted background, semantic text, small icon + label.
 */
const maintenanceBadgeStyle = {
  bg: "bg-orange-500/20",
  text: "text-orange-800",
} as const;

export function MarketMaintenanceBadge({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { bg, text } = maintenanceBadgeStyle;
  const Icon = WrenchScrewdriverIcon;
  const label = "Maintenance";

  if (compact) {
    return (
      <span
        title="This market is in maintenance"
        className={`inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-[10px] font-medium ${bg} ${text} ${className}`}
      >
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </span>
    );
  }

  return (
    <span
      title="This market is in maintenance"
      className={`inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-xs font-medium ${bg} ${text} ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}

/** Same as `MarketMaintenanceBadge` with `compact={false}` (matches non-compact Health badge). */
export function MarketMaintenanceTag({
  className = "",
}: {
  className?: string;
}) {
  return <MarketMaintenanceBadge compact={false} className={className} />;
}

/** Grey pill: rewards can be claimed, but compounding/mint paths are blocked during maintenance. */
export function ClaimOnlyTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-none border border-gray-400/60 bg-gray-200/90 px-2 py-0.5 text-[10px] font-semibold text-gray-700 ${className}`}
      title="While this market is in maintenance you can claim rewards to your wallet; compounding is unavailable"
    >
      Claim only
    </span>
  );
}

/** @deprecated Use `ClaimOnlyTag` */
export const MintOnlyTag = ClaimOnlyTag;

/** Pair shown on collateral pools + mint fee rows when the minter market is in maintenance. */
export function MaintenanceClaimOnlyTags({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-end gap-1 ${className}`}
    >
      <MarketMaintenanceBadge compact />
      <ClaimOnlyTag />
    </div>
  );
}

/** @deprecated Use `MaintenanceClaimOnlyTags` */
export const MaintenanceMintOnlyTags = MaintenanceClaimOnlyTags;

const archivedBadgeStyle = {
  bg: "bg-gray-500/20",
  text: "text-gray-600",
} as const;

export function MarketArchivedBadge({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { bg, text } = archivedBadgeStyle;
  const Icon = ArchiveBoxIcon;
  const label = "Archived";

  if (compact) {
    return (
      <span
        title="This market is archived"
        className={`inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-[10px] font-medium ${bg} ${text} ${className}`}
      >
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </span>
    );
  }

  return (
    <span
      title="This market is archived"
      className={`inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-xs font-medium ${bg} ${text} ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}

export function MarketArchivedTag({ className = "" }: { className?: string }) {
  return <MarketArchivedBadge compact={false} className={className} />;
}

/** Grey pill: withdrawals/redeems allowed; new deposits/mints disabled. */
export function WithdrawOnlyTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-none border border-gray-400/60 bg-gray-200/90 px-2 py-0.5 text-[10px] font-semibold text-gray-700 ${className}`}
      title="This market is archived. New deposits are disabled; you can still withdraw existing balances."
    >
      Withdraw only
    </span>
  );
}

export function ArchivedWithdrawOnlyTags({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-end gap-1 ${className}`}>
      <MarketArchivedBadge compact />
      <WithdrawOnlyTag />
    </div>
  );
}
