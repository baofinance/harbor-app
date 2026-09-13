const DEBUG_TX =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_DEBUG_TX === "true";

export function debugTx(label: string, data?: unknown) {
  if (!DEBUG_TX) return;
  // eslint-disable-next-line no-console
  console.log(`[AnchorTx] ${label}`, data ?? "");
}
