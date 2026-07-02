export type DepositPrimaryVariant = "mint" | "navy";

export type DepositPrimaryAction =
  | { kind: "connect" }
  | { kind: "enter_amount" }
  | { kind: "exceeds_balance" }
  | { kind: "submit"; label: string; variant?: DepositPrimaryVariant }
  | { kind: "retry" };

export function depositPrimaryActionLabel(action: DepositPrimaryAction): string {
  switch (action.kind) {
    case "connect":
      return "Connect wallet";
    case "enter_amount":
      return "Enter an amount";
    case "exceeds_balance":
      return "Insufficient balance";
    case "submit":
      return action.label;
    case "retry":
      return "Try again";
  }
}

export function isDepositPrimaryActionDisabled(
  action: DepositPrimaryAction,
): boolean {
  return action.kind === "enter_amount" || action.kind === "exceeds_balance";
}

export function depositPrimaryActionVariant(
  action: DepositPrimaryAction,
): DepositPrimaryVariant {
  if (action.kind === "submit" && action.variant) {
    return action.variant;
  }
  return "mint";
}
