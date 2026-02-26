/**
 * Check if an error is an RPC-style error (has code or RPC in name).
 */
export function isRpcError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const obj = err as Record<string, unknown>;
  if (obj.code !== undefined) return true;
  const name = typeof obj.name === "string" ? obj.name : "";
  return name.includes("Rpc") || name.includes("RPC");
}

/**
 * Map common RPC error codes to user-friendly messages.
 * Returns null if the error does not look like an RPC error.
 */
export function formatRpcErrorMessage(err: unknown): string | null {
  if (!isRpcError(err)) return null;

  const obj = err as { code?: number; shortMessage?: string; message?: string };
  const rpcCode = obj.code;

  if (rpcCode !== undefined) {
    switch (rpcCode) {
      case -32000:
        return "Transaction execution failed. Please check your balance and try again.";
      case -32002:
        return "Transaction already pending. Please wait for the previous transaction to complete.";
      case -32003:
        return "Transaction was rejected by the network.";
      case -32602:
        return "Invalid transaction parameters.";
      case -32603:
        return "Internal RPC error. Please try again later.";
      default:
        if (obj.shortMessage) return obj.shortMessage;
        if (obj.message) return obj.message;
        return `RPC error (code: ${rpcCode}). Please try again.`;
    }
  }

  if (obj.shortMessage) return obj.shortMessage;
  if (obj.message) return obj.message;
  return "RPC error occurred. Please try again.";
}
