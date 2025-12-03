"use client";

import { useAnchorLedgerMarks } from "./useAnchorLedgerMarks";

/**
 * Legacy hook for stability pool marks only
 * Now uses the combined anchor ledger marks hook and filters to stability pools
 */
export function useStabilityPoolMarks(options?: {
  enabled?: boolean;
  graphUrl?: string;
}) {
  const { poolDeposits, estimatedMarks, marksPerDay, loading, error } =
    useAnchorLedgerMarks(options);

  // Calculate totals from stability pool deposits only
  const totalMarks = poolDeposits.reduce(
    (sum, deposit) => sum + deposit.estimatedMarks,
    0
  );

  const totalMarksPerDay = poolDeposits.reduce(
    (sum, deposit) => sum + deposit.marksPerDay,
    0
  );

  const totalBalanceUSD = poolDeposits.reduce(
    (sum, deposit) => sum + deposit.balanceUSD,
    0
  );

  return {
    deposits: poolDeposits,
    totalMarks,
    totalMarksPerDay,
    totalBalanceUSD,
    loading,
    error,
  };
}

/**
 * Legacy formatter - now just returns the deposits from the hook
 */
export function formatStabilityPoolMarks(data: any) {
  // This function is kept for backwards compatibility
  // But the hook now returns formatted data directly
  return {
    deposits: [],
    totalMarks: 0,
    totalMarksPerDay: 0,
    totalBalanceUSD: 0,
  };
}

