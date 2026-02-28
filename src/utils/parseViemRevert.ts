import { BaseError, ContractFunctionRevertedError } from "viem";

/**
 * Extract revert reason from a Viem error.
 * Returns the ContractFunctionRevertedError's errorName, or null if not a known revert.
 */
export function getRevertReason(err: unknown): {
  errorName: string;
  args?: readonly unknown[];
} | null {
  if (!(err instanceof BaseError)) return null;
  const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
  if (!(revert instanceof ContractFunctionRevertedError)) return null;
  const errorName = revert.data?.errorName || "";
  const args = (revert.data as { args?: readonly unknown[] })?.args;
  return errorName ? { errorName, args } : null;
}
