/**
 * Centralized polling interval configuration
 *
 * Use these constants instead of hardcoding intervals to:
 * 1. Ensure consistent behavior across the app
 * 2. Make it easy to tune performance
 * 3. Document why certain intervals are used
 */

export const POLLING_INTERVALS = {
  /**
   * For data that changes very frequently and is critical for UX
   * Examples: Transaction status, pending operations
   */
  FAST: 5000, // 5 seconds

  /**
   * For data that changes frequently but isn't critical for immediate UX
   * Examples: Token balances, allowances after user opens a modal
   */
  NORMAL: 15000, // 15 seconds

  /**
   * For data that changes occasionally
   * Examples: Pool APRs, reward rates, oracle prices
   */
  SLOW: 30000, // 30 seconds

  /**
   * For data that rarely changes
   * Examples: Total pool supplies, contract addresses, token symbols
   */
  RARE: 60000, // 1 minute

  /**
   * For static data that essentially never changes
   * Examples: Token decimals, contract names, token symbols
   */
  STATIC: 300000, // 5 minutes

  /**
   * Disabled polling - fetch once on mount
   * Use for truly static data or when manual refetch is preferred
   */
  DISABLED: false as const,
} as const;

/**
 * Recommended intervals by data type
 * Reference this when choosing an interval
 */
export const RECOMMENDED_INTERVALS = {
  // User-specific data (changes based on user actions)
  tokenBalance: POLLING_INTERVALS.NORMAL,
  tokenAllowance: POLLING_INTERVALS.NORMAL,
  userDeposit: POLLING_INTERVALS.NORMAL,
  claimableRewards: POLLING_INTERVALS.NORMAL,

  // Market/pool data (changes based on all users)
  totalSupply: POLLING_INTERVALS.SLOW,
  poolAPR: POLLING_INTERVALS.SLOW,
  rewardRates: POLLING_INTERVALS.SLOW,

  // Oracle data (external updates)
  oraclePrice: POLLING_INTERVALS.SLOW,

  // Genesis-specific (need to catch end event)
  genesisStatus: POLLING_INTERVALS.FAST,

  // Marks/points (updated by subgraph)
  harborMarks: POLLING_INTERVALS.SLOW,

  // Static contract data
  tokenMetadata: POLLING_INTERVALS.STATIC,
  contractAddresses: POLLING_INTERVALS.STATIC,

  // Transaction-related (while modal is open)
  pendingTransaction: POLLING_INTERVALS.FAST,
} as const;

/**
 * Helper to get interval based on modal state
 * Use slower intervals when modal is closed
 */
export function getModalPollingInterval(
  isModalOpen: boolean,
  dataType: keyof typeof RECOMMENDED_INTERVALS
): number | false {
  if (!isModalOpen) {
    // When modal is closed, use slower polling or disable
    return POLLING_INTERVALS.RARE;
  }
  return RECOMMENDED_INTERVALS[dataType];
}









