import { describe, expect, it } from "vitest";
import { resolveAnchorDepositStep1PrimaryAction, resolveAnchorDepositStep2PrimaryAction, resolveAnchorDepositStep3PrimaryAction, resolveAnchorWithdrawPrimaryAction } from "./anchorDepositFormState";
import {
  depositPrimaryActionLabel,
  isDepositPrimaryActionDisabled,
} from "./depositFormState";

const base = {
  isConnected: true,
  amount: "1",
  parsedAmount: 1_000_000_000_000_000_000n,
  currentBalance: 2_000_000_000_000_000_000n,
  selectedDepositAsset: "fxSAVE",
  step: "input" as const,
  mintOnly: false,
  isDirectPeggedDeposit: false,
  skipRewardStep: false,
  rewardTokenOptionsCount: 2,
};

describe("anchorDepositFormState", () => {
  it("returns connect when disconnected", () => {
    const action = resolveAnchorDepositStep1PrimaryAction({
      ...base,
      isConnected: false,
    });
    expect(action).toEqual({ kind: "connect" });
    expect(isDepositPrimaryActionDisabled(action)).toBe(false);
  });

  it("returns enter_amount when empty", () => {
    const action = resolveAnchorDepositStep1PrimaryAction({
      ...base,
      amount: "",
      parsedAmount: undefined,
    });
    expect(action).toEqual({ kind: "enter_amount" });
    expect(isDepositPrimaryActionDisabled(action)).toBe(true);
  });

  it("returns continue to step 2 by default", () => {
    const action = resolveAnchorDepositStep1PrimaryAction(base);
    expect(action).toEqual({
      kind: "submit",
      label: "Continue to Step 2 →",
      variant: "navy",
    });
  });

  it("returns mint only label", () => {
    const action = resolveAnchorDepositStep1PrimaryAction({
      ...base,
      mintOnly: true,
    });
    expect(depositPrimaryActionLabel(action)).toBe("Mint");
  });

  it("returns stability pool when skipping reward step", () => {
    const action = resolveAnchorDepositStep1PrimaryAction({
      ...base,
      skipRewardStep: true,
    });
    expect(depositPrimaryActionLabel(action)).toBe("Continue to Stability Pool →");
  });
});

describe("resolveAnchorDepositStep2PrimaryAction", () => {
  const step2Base = {
    step: "input" as const,
    selectedDepositAsset: "fxSAVE",
    amount: "1",
    error: null as string | null,
    selectedRewardToken: null as string | null,
  };

  it("returns continue to stability pool when reward token selected", () => {
    const action = resolveAnchorDepositStep2PrimaryAction({
      ...step2Base,
      selectedRewardToken: "TIDE",
    });
    expect(action).toEqual({
      kind: "submit",
      label: "Continue to Stability Pool →",
      variant: "navy",
    });
  });

  it("returns mint without pool when no reward token", () => {
    const action = resolveAnchorDepositStep2PrimaryAction(step2Base);
    expect(depositPrimaryActionLabel(action)).toBe(
      "Mint (no stability pool deposit)",
    );
  });

  it("returns enter_amount when amount missing", () => {
    const action = resolveAnchorDepositStep2PrimaryAction({
      ...step2Base,
      amount: "",
    });
    expect(action).toEqual({ kind: "enter_amount" });
    expect(isDepositPrimaryActionDisabled(action)).toBe(true);
  });
});

describe("resolveAnchorDepositStep3PrimaryAction", () => {
  const step3Base = {
    step: "input" as const,
    selectedDepositAsset: "fxSAVE",
    amount: "1",
    error: null as string | null,
    selectedRewardToken: "TIDE",
    selectedStabilityPool: {
      marketId: "eth-fxusd",
      poolType: "collateral" as const,
    },
    isDirectPeggedDeposit: false,
  };

  it("returns mint and deposit when pool selected", () => {
    const action = resolveAnchorDepositStep3PrimaryAction(step3Base);
    expect(depositPrimaryActionLabel(action)).toBe("Mint & Deposit");
  });

  it("returns select pool when reward token chosen but pool missing", () => {
    const action = resolveAnchorDepositStep3PrimaryAction({
      ...step3Base,
      selectedStabilityPool: null,
    });
    expect(action).toEqual({
      kind: "enter_amount",
      label: "Select a stability pool",
    });
  });
});

describe("resolveAnchorWithdrawPrimaryAction", () => {
  it("returns proceed when selection is valid", () => {
    const action = resolveAnchorWithdrawPrimaryAction({
      step: "input",
      isConnected: true,
      hasValidSelection: true,
    });
    expect(depositPrimaryActionLabel(action)).toBe("Proceed");
  });

  it("returns connect when disconnected", () => {
    const action = resolveAnchorWithdrawPrimaryAction({
      step: "input",
      isConnected: false,
      hasValidSelection: true,
    });
    expect(action).toEqual({ kind: "connect" });
  });
});
