import { describe, expect, it } from "vitest";
import {
  MINT_DISALLOWED_INCENTIVE_RATIO,
  mintValidationBlocksSubmit,
  mintValidationCtaLabel,
  parseMintDryRunResult,
  resolveMintValidation,
} from "./anchorMintValidation";

describe("parseMintDryRunResult", () => {
  it("parses tuple arrays", () => {
    const parsed = parseMintDryRunResult([
      25n * 10n ** 14n,
      1n,
      10n ** 18n,
      9n * 10n ** 17n,
      0n,
      0n,
    ]);
    expect(parsed?.wrappedCollateralTaken).toBe(10n ** 18n);
    expect(parsed?.peggedMinted).toBe(9n * 10n ** 17n);
  });

  it("parses object form with legacy discount key", () => {
    const parsed = parseMintDryRunResult({
      incentiveRatio: MINT_DISALLOWED_INCENTIVE_RATIO,
      fee: 0n,
      discount: 0n,
      peggedMinted: 0n,
    });
    expect(parsed?.incentiveRatio).toBe(MINT_DISALLOWED_INCENTIVE_RATIO);
    expect(parsed?.wrappedCollateralTaken).toBe(0n);
  });
});

describe("resolveMintValidation", () => {
  const okDryRun = {
    incentiveRatio: 25n * 10n ** 14n, // 0.25%
    wrappedFee: 0n,
    wrappedCollateralTaken: 10n ** 18n,
    peggedMinted: 10n ** 18n,
  };

  it("returns na for direct pegged deposits", () => {
    expect(
      resolveMintValidation({
        isDirectPeggedDeposit: true,
        hasAmount: true,
        isLoading: false,
        hasDryRunError: false,
        dryRun: okDryRun,
        inputAmountWrapped: 10n ** 18n,
      }).status,
    ).toBe("na");
  });

  it("returns pending while loading without a result", () => {
    const v = resolveMintValidation({
      isDirectPeggedDeposit: false,
      hasAmount: true,
      isLoading: true,
      hasDryRunError: false,
      dryRun: null,
      inputAmountWrapped: 10n ** 18n,
    });
    expect(v.status).toBe("pending");
    expect(mintValidationBlocksSubmit(v)).toBe(true);
    expect(mintValidationCtaLabel(v)).toBe("Checking mint…");
  });

  it("blocks when incentive ratio is 100%", () => {
    const v = resolveMintValidation({
      isDirectPeggedDeposit: false,
      hasAmount: true,
      isLoading: false,
      hasDryRunError: false,
      dryRun: {
        ...okDryRun,
        incentiveRatio: MINT_DISALLOWED_INCENTIVE_RATIO,
        wrappedCollateralTaken: 0n,
        peggedMinted: 0n,
      },
      inputAmountWrapped: 10n ** 18n,
    });
    expect(v.status).toBe("blocked");
    expect(v.isDisallowed).toBe(true);
    expect(mintValidationCtaLabel(v)).toBe("Mint unavailable");
  });

  it("blocks on dry-run error", () => {
    const v = resolveMintValidation({
      isDirectPeggedDeposit: false,
      hasAmount: true,
      isLoading: false,
      hasDryRunError: true,
      dryRun: null,
      inputAmountWrapped: 10n ** 18n,
    });
    expect(v.status).toBe("blocked");
  });

  it("marks capped when taken ratio is low", () => {
    const v = resolveMintValidation({
      isDirectPeggedDeposit: false,
      hasAmount: true,
      isLoading: false,
      hasDryRunError: false,
      dryRun: {
        ...okDryRun,
        wrappedCollateralTaken: 5n * 10n ** 17n,
      },
      inputAmountWrapped: 10n ** 18n,
    });
    expect(v.status).toBe("capped");
    expect(mintValidationBlocksSubmit(v)).toBe(false);
  });

  it("returns ok for healthy dry-run", () => {
    const v = resolveMintValidation({
      isDirectPeggedDeposit: false,
      hasAmount: true,
      isLoading: false,
      hasDryRunError: false,
      dryRun: okDryRun,
      inputAmountWrapped: 10n ** 18n,
    });
    expect(v.status).toBe("ok");
    expect(v.feePercentage).toBeCloseTo(0.25);
  });
});
