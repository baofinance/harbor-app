/**
 * Environment detection utilities
 * Determines if we're running on local Anvil or production networks
 */

// Chain ID for local Anvil
export const ANVIL_CHAIN_ID = 31337;

/**
 * Check if we should use Anvil-specific behavior
 * This can be controlled via environment variable or chain ID detection
 */
export function shouldUseAnvil(): boolean {
  // Allow explicit override via environment variable
  if (process.env.NEXT_PUBLIC_USE_ANVIL === "false") {
    return false;
  }
  if (process.env.NEXT_PUBLIC_USE_ANVIL === "true") {
    return true;
  }

  // Default: use Anvil in development mode
  // In production, this will be false unless explicitly set
  return process.env.NODE_ENV === "development";
}

/**
 * Get the target chain ID based on environment
 */
export function getTargetChainId(): number {
  if (shouldUseAnvil()) {
    return ANVIL_CHAIN_ID;
  }
  // Default to mainnet (1) for production
  return 1;
}



