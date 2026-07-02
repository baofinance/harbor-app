import type { DepositPrimaryAction } from "@/utils/depositFormState";
export type { DepositPrimaryAction as SailTradePrimaryAction };

export type SailTradeTab = "mint" | "redeem";

export type SailTradeModalStep =
  | "input"
  | "approving"
  | "minting"
  | "redeeming"
  | "success"
  | "error";

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
): DepositPrimaryAction {
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
    variant: activeTab === "mint" ? "mint" : "navy",
  };
}

export {
  depositPrimaryActionLabel as sailTradePrimaryActionLabel,
  isDepositPrimaryActionDisabled as isSailTradePrimaryActionDisabled,
} from "@/utils/depositFormState";
