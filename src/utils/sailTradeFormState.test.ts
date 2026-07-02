import { describe, expect, it } from "vitest";
import {
  isSailTradePrimaryActionDisabled,
  resolveSailTradePrimaryAction,
  sailTradePrimaryActionLabel,
} from "./sailTradeFormState";

const base = {
  isConnected: true,
  amount: "1",
  parsedAmount: 1_000_000_000_000_000_000n,
  currentBalance: 2_000_000_000_000_000_000n,
  activeTab: "mint" as const,
  step: "input" as const,
};

describe("sailTradeFormState", () => {
  it("returns connect when wallet is disconnected", () => {
    const action = resolveSailTradePrimaryAction({
      ...base,
      isConnected: false,
    });
    expect(action).toEqual({ kind: "connect" });
    expect(sailTradePrimaryActionLabel(action)).toBe("Connect wallet");
    expect(isSailTradePrimaryActionDisabled(action)).toBe(false);
  });

  it("returns enter_amount when amount is empty", () => {
    const action = resolveSailTradePrimaryAction({
      ...base,
      amount: "",
      parsedAmount: 0n,
    });
    expect(action).toEqual({ kind: "enter_amount" });
    expect(isSailTradePrimaryActionDisabled(action)).toBe(true);
  });

  it("returns exceeds_balance when amount exceeds balance", () => {
    const action = resolveSailTradePrimaryAction({
      ...base,
      currentBalance: 1n,
    });
    expect(action).toEqual({ kind: "exceeds_balance" });
    expect(sailTradePrimaryActionLabel(action)).toBe("Insufficient balance");
  });

  it("returns submit Buy on mint tab when ready", () => {
    const action = resolveSailTradePrimaryAction(base);
    expect(action).toEqual({ kind: "submit", label: "Buy" });
    expect(isSailTradePrimaryActionDisabled(action)).toBe(false);
  });

  it("returns submit Sell on redeem tab when ready", () => {
    const action = resolveSailTradePrimaryAction({
      ...base,
      activeTab: "redeem",
    });
    expect(action).toEqual({ kind: "submit", label: "Sell" });
  });

  it("returns retry on error step", () => {
    const action = resolveSailTradePrimaryAction({
      ...base,
      step: "error",
    });
    expect(action).toEqual({ kind: "retry" });
    expect(sailTradePrimaryActionLabel(action)).toBe("Try again");
  });
});
