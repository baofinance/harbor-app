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
    return "Buy";
  }
  if (input.isDirectPeggedDeposit) {
    return "Continue to Deposit →";
  }
  return "Continue to Deposit →";
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

export type ResolveAnchorDepositStep2ActionInput = {
  step: AnchorDepositModalStep;
  selectedDepositAsset: string | null | undefined;
  amount: string;
  error: string | null;
  selectedRewardToken: string | null;
};

export function resolveAnchorDepositStep2PrimaryAction(
  input: ResolveAnchorDepositStep2ActionInput,
): DepositPrimaryAction {
  const { step, selectedDepositAsset, amount, error, selectedRewardToken } =
    input;

  if (step === "error") {
    return { kind: "retry" };
  }

  const numericAmount = parseFloat(amount);
  const hasAmount =
    Boolean(selectedDepositAsset) &&
    amount.length > 0 &&
    numericAmount > 0 &&
    !error;

  if (!hasAmount) {
    return { kind: "enter_amount" };
  }

  if (selectedRewardToken) {
    return {
      kind: "submit",
      label: "Continue to Stability Pool →",
      variant: "navy",
    };
  }

  return {
    kind: "submit",
    label: "Buy (no stability pool deposit)",
    variant: "navy",
  };
}

export type ResolveAnchorDepositStep3ActionInput = {
  step: AnchorDepositModalStep;
  selectedDepositAsset: string | null | undefined;
  amount: string;
  error: string | null;
  selectedRewardToken: string | null;
  selectedStabilityPool: {
    marketId: string;
    poolType: "collateral" | "sail";
  } | null;
  isDirectPeggedDeposit: boolean;
};

export function resolveAnchorDepositStep3PrimaryAction(
  input: ResolveAnchorDepositStep3ActionInput,
): DepositPrimaryAction {
  const {
    step,
    selectedDepositAsset,
    amount,
    error,
    selectedRewardToken,
    selectedStabilityPool,
    isDirectPeggedDeposit,
  } = input;

  if (step === "error") {
    return { kind: "retry" };
  }

  const numericAmount = parseFloat(amount);
  const hasAmount =
    Boolean(selectedDepositAsset) &&
    amount.length > 0 &&
    numericAmount > 0 &&
    !error;

  if (!hasAmount) {
    return { kind: "enter_amount" };
  }

  if (selectedRewardToken && !selectedStabilityPool) {
    return { kind: "enter_amount", label: "Select a stability pool" };
  }

  if (isDirectPeggedDeposit && selectedStabilityPool) {
    return { kind: "submit", label: "Deposit", variant: "navy" };
  }

  if (selectedStabilityPool) {
    return { kind: "submit", label: "Buy & Deposit", variant: "navy" };
  }

  return { kind: "submit", label: "Buy", variant: "navy" };
}

export type ResolveAnchorWithdrawPrimaryActionInput = {
  step: AnchorDepositModalStep;
  isConnected: boolean;
  hasValidSelection: boolean;
};

export function resolveAnchorWithdrawPrimaryAction(
  input: ResolveAnchorWithdrawPrimaryActionInput,
): DepositPrimaryAction {
  const { step, isConnected, hasValidSelection } = input;

  if (step === "error") {
    return { kind: "retry" };
  }

  if (!isConnected) {
    return { kind: "connect" };
  }

  if (!hasValidSelection) {
    return { kind: "enter_amount", label: "Select amount" };
  }

  return { kind: "submit", label: "Proceed", variant: "navy" };
}

export function hasAnchorWithdrawValidSelection(input: {
  selectedPositions: {
    wallet: boolean;
    collateralPool: boolean;
    sailPool: boolean;
  };
  withdrawalMethods: {
    collateralPool: "immediate" | "request";
    sailPool: "immediate" | "request";
  };
  positionAmounts: {
    wallet: string;
    collateralPool: string;
    sailPool: string;
  };
}): boolean {
  const hasRequestSelected =
    (input.selectedPositions.collateralPool &&
      input.withdrawalMethods.collateralPool === "request") ||
    (input.selectedPositions.sailPool &&
      input.withdrawalMethods.sailPool === "request");

  return (
    (input.selectedPositions.wallet &&
      input.positionAmounts.wallet &&
      parseFloat(input.positionAmounts.wallet) > 0) ||
    (input.selectedPositions.collateralPool &&
      input.withdrawalMethods.collateralPool !== "request" &&
      input.positionAmounts.collateralPool &&
      parseFloat(input.positionAmounts.collateralPool) > 0) ||
    (input.selectedPositions.sailPool &&
      input.withdrawalMethods.sailPool !== "request" &&
      input.positionAmounts.sailPool &&
      parseFloat(input.positionAmounts.sailPool) > 0) ||
    hasRequestSelected
  );
}
