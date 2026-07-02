import type { DepositPrimaryAction } from "@/utils/depositFormState";

export type AnchorDepositModalStep =
  | "input"
  | "approving"
  | "minting"
  | "depositing"
  | "error"
  | string;

export type ResolveAnchorDepositStep1ActionInput = {
  isConnected: boolean;
  amount: string;
  parsedAmount: bigint | undefined;
  currentBalance: bigint | null | undefined;
  selectedDepositAsset: string | null | undefined;
  step: AnchorDepositModalStep;
  mintOnly: boolean;
  isDirectPeggedDeposit: boolean;
  skipRewardStep: boolean;
  rewardTokenOptionsCount: number;
};

function continueLabel(input: ResolveAnchorDepositStep1ActionInput): string {
  if (input.mintOnly) {
    return "Mint";
  }
  if (input.isDirectPeggedDeposit) {
    return input.rewardTokenOptionsCount > 1 && !input.skipRewardStep
      ? "Continue to Step 2 →"
      : "Continue to Stability Pool →";
  }
  return input.skipRewardStep
    ? "Continue to Stability Pool →"
    : "Continue to Step 2 →";
}

export function resolveAnchorDepositStep1PrimaryAction(
  input: ResolveAnchorDepositStep1ActionInput,
): DepositPrimaryAction {
  const {
    isConnected,
    amount,
    parsedAmount,
    currentBalance,
    selectedDepositAsset,
    step,
  } = input;

  if (step === "error") {
    return { kind: "retry" };
  }

  if (!isConnected) {
    return { kind: "connect" };
  }

  if (!selectedDepositAsset) {
    return { kind: "enter_amount" };
  }

  const numericAmount = parseFloat(amount);
  const parsed = parsedAmount ?? 0n;
  const hasAmount = amount.length > 0 && numericAmount > 0 && parsed > 0n;

  if (!hasAmount) {
    return { kind: "enter_amount" };
  }

  if (currentBalance != null && parsed > currentBalance) {
    return { kind: "exceeds_balance" };
  }

  return {
    kind: "submit",
    label: continueLabel(input),
    variant: "navy",
  };
}
