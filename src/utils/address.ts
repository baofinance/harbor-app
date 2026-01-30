/**
 * Shared address validation helpers.
 * Use for minter, pool, and token address checks across modals and pages.
 */

/**
 * Type guard: true if value is a non-empty 0x-prefixed 42-char string (20 bytes).
 */
export function isValidEthAddress(
  value: unknown
): value is `0x${string}` {
  if (value == null) return false;
  if (typeof value !== "string") return false;
  return value.startsWith("0x") && value.length === 42;
}
