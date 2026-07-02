import { describe, expect, it } from "vitest";
import { resolveAnchorDepositStep1PrimaryAction } from "./anchorDepositFormState";
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
