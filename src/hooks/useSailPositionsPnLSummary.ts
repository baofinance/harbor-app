"use client";

import {
  useSailPositionsForIndex,
  type SailPositionsPnLSummary,
} from "@/hooks/useSailPositionsForIndex";

export type { SailPositionsPnLSummary };

/**
 * Thin wrapper over the shared Sail index positions query.
 * Prefer `useSailPositionsForIndex` when you also need per-position rows.
 */
export function useSailPositionsPnLSummary(
  enabled: boolean = true
): SailPositionsPnLSummary {
  const { sailPnLSummary } = useSailPositionsForIndex(enabled);
  return sailPnLSummary;
}
