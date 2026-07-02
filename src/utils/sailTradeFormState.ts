export type SailTradeTab = "mint" | "redeem";

export type SailTradeModalStep =
  | "input"
  | "approving"
  | "minting"
  | "redeeming"
  | "success"
  | "error";

export type SailTradePrimaryAction =
  | { kind: "connect" }
  | { kind: "enter_amount" }
  | { kind: "exceeds_balance" }
  | { kind: "submit"; label: "Buy" | "Sell" }
  | { kind: "retry" };

export type ResolveSailTradePrimaryActionInput = {
  isConnected: boolean;
  amount: string;
  parsedAmount: bigint | null | undefined;
  currentBalance: bigint | undefined;
  activeTab: SailTradeTab;
  step: SailTradeModalStep;
};

export function resolveSailTradePrimaryAction(
  input: ResolveSailTradePrimaryActionInput,
): SailTradePrimaryAction {
  const { isConnected, amount, parsedAmount, currentBalance, activeTab, step } =
    input;

  if (step === "error") {
    return { kind: "retry" };
  }

  if (!isConnected) {
    return { kind: "connect" };
  }

  const parsed = parsedAmount ?? 0n;
  const numericAmount = parseFloat(amount);
  const hasAmount = amount.length > 0 && numericAmount > 0 && parsed > 0n;

  if (!hasAmount) {
    return { kind: "enter_amount" };
  }

  if (currentBalance != null && parsed > currentBalance) {
    return { kind: "exceeds_balance" };
  }

  return {
    kind: "submit",
    label: activeTab === "mint" ? "Buy" : "Sell",
  };
}

export function sailTradePrimaryActionLabel(action: SailTradePrimaryAction): string {
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

export function isSailTradePrimaryActionDisabled(
  action: SailTradePrimaryAction,
): boolean {
  return (
    action.kind === "enter_amount" ||
    action.kind === "exceeds_balance"
  );
}
