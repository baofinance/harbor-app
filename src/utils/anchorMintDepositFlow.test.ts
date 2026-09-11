import { describe, expect, it } from "vitest";
import {
  buildCollateralMintProgressFields,
  permitToApproveCombinedPoolPatch,
  separatePoolProgressPatch,
} from "./anchorMintDepositFlow";

describe("buildCollateralMintProgressFields", () => {
  const base = {
    shouldDepositToPool: true,
    permitEligible: true,
    needsZapApproval: false,
    needsDirectApproval: false,
    useZap: true,
    zapAssetName: "USDC",
    wrappedZapAssetName: null,
    useCombinedPoolZap: true,
  };

  it("uses 2-step combined pool zap with permit", () => {
    const fields = buildCollateralMintProgressFields(base);
    expect(fields.includePermitCollateral).toBe(true);
    expect(fields.includeApproveCollateral).toBe(false);
    expect(fields.includeMint).toBe(true);
    expect(fields.includeApprovePegged).toBe(false);
    expect(fields.includeDeposit).toBe(false);
    expect(fields.zapAndDeposit).toBe(true);
  });

  it("uses 2-step combined pool zap with approve when permit is off", () => {
    const fields = buildCollateralMintProgressFields({
      ...base,
      permitEligible: false,
      needsZapApproval: true,
    });
    expect(fields.includePermitCollateral).toBe(false);
    expect(fields.includeApproveCollateral).toBe(true);
    expect(fields.includeApprovePegged).toBe(false);
    expect(fields.includeDeposit).toBe(false);
    expect(fields.zapAndDeposit).toBe(true);
  });

  it("uses 4-step separate path when combined pool zap is unavailable", () => {
    const fields = buildCollateralMintProgressFields({
      ...base,
      useCombinedPoolZap: false,
    });
    expect(fields.includeApprovePegged).toBe(true);
    expect(fields.includeDeposit).toBe(true);
    expect(fields.zapAndDeposit).toBe(false);
  });

  it("uses mint-only 2-step path without stability pool", () => {
    const fields = buildCollateralMintProgressFields({
      ...base,
      shouldDepositToPool: false,
    });
    expect(fields.includeApprovePegged).toBe(false);
    expect(fields.includeDeposit).toBe(false);
    expect(fields.zapAndDeposit).toBe(false);
    expect(fields.title).toBe("Mint anchor token");
  });

  it("uses wrapped combined pool zap for wstETH/fxSAVE", () => {
    const fields = buildCollateralMintProgressFields({
      ...base,
      useZap: false,
      zapAssetName: null,
      wrappedZapAssetName: "wstETH",
      useZapWrappedToPoolAndDeposit: true,
    });
    expect(fields.wrappedZapAndDeposit).toBe(true);
    expect(fields.includeApprovePegged).toBe(false);
    expect(fields.includeDeposit).toBe(false);
  });
});

describe("permitToApproveCombinedPoolPatch", () => {
  it("switches permit to approve while preserving combined zap", () => {
    expect(
      permitToApproveCombinedPoolPatch({
        needsApproval: true,
        combinedPoolZap: true,
      }),
    ).toEqual({
      includePermitCollateral: false,
      includeApproveCollateral: true,
      zapAndDeposit: true,
      wrappedZapAndDeposit: true,
      includeApprovePegged: false,
      includeDeposit: false,
    });
  });
});

describe("separatePoolProgressPatch", () => {
  it("expands to mint + approve pegged + deposit after combined zap fails", () => {
    const patch = separatePoolProgressPatch();
    expect(patch.includeApproveCollateral).toBe(false);
    expect(patch.includeMint).toBe(true);
    expect(patch.zapAndDeposit).toBe(false);
    expect(patch.includeApprovePegged).toBe(true);
    expect(patch.includeDeposit).toBe(true);
  });
});
