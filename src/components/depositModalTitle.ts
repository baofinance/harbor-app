/** Title line for manage modals, e.g. `Anchor · haBTC — Withdraw`. */
export function buildDepositModalTitle(
  protocolName: string,
  tokenSymbol: string,
  actionLabel: string,
  secondaryTokenSymbol?: string
): string {
  const tokenPart =
    secondaryTokenSymbol &&
    secondaryTokenSymbol.trim() !== "" &&
    secondaryTokenSymbol !== tokenSymbol
      ? `${tokenSymbol} + ${secondaryTokenSymbol}`
      : tokenSymbol;
  return `${protocolName} · ${tokenPart} — ${actionLabel}`;
}
