/**
 * Environment detection utilities
 * Simplified for mainnet-only deployment
 */

/**
 * @deprecated Anvil is no longer used. This always returns false.
 * Kept for backward compatibility during migration.
 */
export function shouldUseAnvil(): boolean {
  return false;
}

/**
 * Get the target chain ID - always returns mainnet (1)
 */
export function getTargetChainId(): number {
  return 1;
}
