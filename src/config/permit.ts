/**
 * Permit support configuration
 *
 * Tokens that support EIP-2612 permit even when using smart contract
 * or delegated wallets (e.g. MetaMask Smart Accounts).
 *
 * stETH and wstETH do NOT work with permit on smart/delegated wallets -
 * keep permit off when these are the deposit asset.
 */

/** Token symbols (lowercase) that support permit on smart/delegated wallets */
export const PERMIT_ON_SMART_WALLET_TOKENS = [
  "usdc",
  "fxusd",
  "fxsave",
] as const;

/** Token symbols (lowercase) that do NOT support permit on smart/delegated wallets */
export const NO_PERMIT_ON_SMART_WALLET_TOKENS = [
  "steth",
  "wsteth",
] as const;

/** ETH is payable - no permit needed */
export const PAYABLE_TOKENS = ["eth"] as const;

/**
 * Check if a token supports permit when using a smart contract / delegated wallet.
 * Returns true only for tokens in the allowlist (USDC, FXUSD, FXSAVE).
 * stETH, wstETH and unknown tokens return false.
 */
export function tokenPermitOnSmartWallet(symbol: string | null | undefined): boolean {
  if (!symbol || !symbol.trim()) return false;
  const s = symbol.toLowerCase().trim();
  if (NO_PERMIT_ON_SMART_WALLET_TOKENS.includes(s as (typeof NO_PERMIT_ON_SMART_WALLET_TOKENS)[number])) {
    return false;
  }
  return PERMIT_ON_SMART_WALLET_TOKENS.includes(s as (typeof PERMIT_ON_SMART_WALLET_TOKENS)[number]);
}
