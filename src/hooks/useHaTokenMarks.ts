"use client";

import { useAnchorLedgerMarks } from "./useAnchorLedgerMarks";

/**
 * Legacy hook for ha tokens only
 * Now uses the combined anchor ledger marks hook and filters to ha tokens
 */
export function useHaTokenMarks(options?: { enabled?: boolean; graphUrl?: string }) {
  const { haBalances, estimatedMarks, marksPerDay, loading, error } =
    useAnchorLedgerMarks(options);

  // Calculate totals from ha token balances only
  const totalMarks = haBalances.reduce(
    (sum, balance) => sum + balance.estimatedMarks,
    0
  );

  const totalMarksPerDay = haBalances.reduce(
    (sum, balance) => sum + balance.marksPerDay,
    0
  );

  const totalBalanceUSD = haBalances.reduce(
    (sum, balance) => sum + balance.balanceUSD,
    0
  );

  return {
    balances: haBalances,
    totalMarks,
    totalMarksPerDay,
    totalBalanceUSD,
    loading,
    error,
  };
}

/**
 * Legacy formatter - now just returns the balances from the hook
 */
export function formatHaTokenMarks(data: any) {
  // This function is kept for backwards compatibility
  // But the hook now returns formatted data directly
  return {
    balances: [],
    totalMarks: 0,
    totalMarksPerDay: 0,
    totalBalanceUSD: 0,
  };
}

