"use client";

import { ArchiveBoxIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { MV_ARCHIVED_PILL, MV_COMPLETED_PILL } from "./maidenVoyageLayoutStyles";

export function GenesisVoyageCompletedBadge() {
  return (
    <span className={MV_COMPLETED_PILL}>
      <CheckCircleIcon
        className="h-3.5 w-3.5 shrink-0"
        strokeWidth={2.5}
        aria-hidden
      />
      Completed
    </span>
  );
}

/** Short-chip styling; archive box reads clearer than a stop sign for “stored / disabled”. */
export function GenesisVoyageArchivedBadge() {
  return (
    <span className={MV_ARCHIVED_PILL}>
      <ArchiveBoxIcon
        className="h-3.5 w-3.5 shrink-0"
        strokeWidth={2.5}
        aria-hidden
      />
      Archived
    </span>
  );
}
