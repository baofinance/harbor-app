/** True when `addr` is a 0x-prefixed 20-byte hex address. */
export function isValidContractAddress(addr: unknown): addr is `0x${string}` {
  return (
    typeof addr === "string" && addr.startsWith("0x") && addr.length === 42
  );
}
