"use client";

import { useMemo } from "react";
import type { TransactionStep } from "@/types/modal";
import type {
  AnchorProgressConfig,
  AnchorTxHashes,
  AnchorFlowStep,
} from "@/types/anchor";
import {
  computeCurrentStepIndex,
  applyStepStatusesWithSuccess,
} from "@/utils/progress";

export interface UseAnchorProgressStepsParams {
  progressConfig: AnchorProgressConfig;
  txHashes: AnchorTxHashes;
  step: AnchorFlowStep;
  lastNonErrorStepRef: React.MutableRefObject<AnchorFlowStep>;
}

/**
 * Build TransactionStep[] from Anchor progress config + tx hashes,
 * map flow step -> current index, apply statuses, and compute display index.
 * Use in AnchorDepositWithdrawModal with TransactionProgressModal.
 */
export function useAnchorProgressSteps({
  progressConfig,
  txHashes,
  step,
  lastNonErrorStepRef,
}: UseAnchorProgressStepsParams): {
  steps: TransactionStep[];
  currentIndex: number;
} {
  return useMemo(() => {
    if (!progressConfig.mode) {
      return { steps: [], currentIndex: 0 };
    }

    const steps: TransactionStep[] = [];
    const addStep = (id: string, label: string, txHash?: string) =>
      steps.push({ id, label, status: "pending" as const, txHash });

    if (progressConfig.mode === "collateral") {
      if (progressConfig.includePermitCollateral) {
        const permitLabel =
          (progressConfig.useZap && progressConfig.zapAsset) ||
          (progressConfig.wrappedZapAndDeposit && progressConfig.wrappedZapAsset)
            ? `Permit ${(progressConfig.zapAsset || progressConfig.wrappedZapAsset)!.toUpperCase()} for zap`
            : "Permit collateral token";
        addStep("permit-collateral", permitLabel);
      }
      if (progressConfig.includeApproveCollateral) {
        const approveLabel =
          (progressConfig.useZap && progressConfig.zapAsset) ||
          (progressConfig.wrappedZapAndDeposit && progressConfig.wrappedZapAsset)
            ? `Approve ${(progressConfig.zapAsset || progressConfig.wrappedZapAsset)!.toUpperCase()} for zap`
            : "Approve collateral token";
        addStep(
          "approve-collateral",
          approveLabel,
          txHashes.approveCollateral
        );
      }
      if (progressConfig.includeMint) {
        const mintLabel =
          (progressConfig.zapAndDeposit && progressConfig.useZap && progressConfig.zapAsset) ||
          (progressConfig.wrappedZapAndDeposit && progressConfig.wrappedZapAsset)
            ? `Zap ${(progressConfig.zapAsset || progressConfig.wrappedZapAsset)!.toUpperCase()} & deposit to stability pool`
            : progressConfig.useZap && progressConfig.zapAsset
              ? `Zap ${progressConfig.zapAsset.toUpperCase()} to pegged token`
              : "Mint pegged token";
        addStep("mint", mintLabel, txHashes.mint);
      }
      if (progressConfig.includeApprovePegged) {
        addStep(
          "approve-pegged",
          "Approve pegged token",
          txHashes.approvePegged
        );
      }
      if (progressConfig.includeDeposit) {
        addStep("deposit", "Deposit to stability pool", txHashes.deposit);
      }
    } else if (progressConfig.mode === "direct") {
      if (progressConfig.includeDirectApprove) {
        addStep("approve-direct", "Approve ha token", txHashes.directApprove);
      }
      if (progressConfig.includeDirectDeposit) {
        addStep(
          "deposit-direct",
          "Deposit to stability pool",
          txHashes.directDeposit
        );
      }
    } else if (progressConfig.mode === "withdraw") {
      const hasWithdrawCollateralTx = !!(txHashes.withdrawCollateral || txHashes.requestCollateral);
      const hasWithdrawSailTx = !!(txHashes.withdrawSail || txHashes.requestSail);
      const hasApproveRedeemTx = !!txHashes.approveRedeem;
      const hasRedeemTx = !!txHashes.redeem;

      if (progressConfig.includeWithdrawCollateral || hasWithdrawCollateralTx) {
        addStep(
          "withdraw-collateral",
          progressConfig.withdrawCollateralLabel ||
            "Withdraw from collateral pool",
          txHashes.withdrawCollateral || txHashes.requestCollateral
        );
      }
      if (progressConfig.includeWithdrawSail || hasWithdrawSailTx) {
        addStep(
          "withdraw-sail",
          progressConfig.withdrawSailLabel || "Withdraw from sail pool",
          txHashes.withdrawSail || txHashes.requestSail
        );
      }
      if (progressConfig.includeApproveRedeem || hasApproveRedeemTx) {
        addStep("approve-redeem", "Approve ha token", txHashes.approveRedeem);
      }
      if (progressConfig.includeRedeem || hasRedeemTx) {
        addStep("redeem", "Redeem ha for collateral", txHashes.redeem);
      }
    }

    const stepForIndex = step === "error" ? lastNonErrorStepRef.current : step;
    const permitCollateralIndex = steps.findIndex((s) => s.id === "permit-collateral");
    const approveCollateralIndex = steps.findIndex((s) => s.id === "approve-collateral");
    const approveDirectIndex = steps.findIndex((s) => s.id === "approve-direct");
    const mintIndex = steps.findIndex((s) => s.id === "mint");
    const approvePeggedIndex = steps.findIndex((s) => s.id === "approve-pegged");
    const depositIndex = steps.findIndex((s) => s.id.startsWith("deposit"));
    const withdrawCollateralIndex = steps.findIndex((s) => s.id === "withdraw-collateral");
    const withdrawSailIndex = steps.findIndex((s) => s.id === "withdraw-sail");
    const approveRedeemIndex = steps.findIndex((s) => s.id === "approve-redeem");
    const redeemIndex = steps.findIndex((s) => s.id === "redeem");

    const getCurrentIndex = (): number => {
      if (stepForIndex === "minting") return mintIndex >= 0 ? mintIndex : 0;
      if (stepForIndex === "approvingPegged")
        return approvePeggedIndex >= 0
          ? approvePeggedIndex
          : depositIndex >= 0
            ? depositIndex - 1
            : steps.length - 1;
      if (stepForIndex === "depositing")
        return depositIndex >= 0 ? depositIndex : steps.length - 1;
      if (
        stepForIndex === "withdrawing" ||
        stepForIndex === "withdrawingCollateral" ||
        stepForIndex === "requestingCollateral"
      ) {
        if (withdrawCollateralIndex >= 0) return withdrawCollateralIndex;
        if (withdrawSailIndex >= 0) return withdrawSailIndex;
      }
      if (stepForIndex === "withdrawingSail" || stepForIndex === "requestingSail") {
        if (withdrawSailIndex >= 0) return withdrawSailIndex;
        if (withdrawCollateralIndex >= 0) return withdrawCollateralIndex;
      }
      if (stepForIndex === "redeeming")
        return redeemIndex >= 0 ? redeemIndex : steps.length - 1;
      if (stepForIndex === "approving") {
        if (permitCollateralIndex >= 0) return permitCollateralIndex;
        if (approveCollateralIndex >= 0) return approveCollateralIndex;
        if (approveDirectIndex >= 0) return approveDirectIndex;
        if (approveRedeemIndex >= 0) return approveRedeemIndex;
        if (redeemIndex >= 0) return Math.max(redeemIndex - 1, 0);
        return 0;
      }
      if (stepForIndex === "success") return steps.length - 1;
      return 0;
    };

    const currentIdx = Math.max(0, getCurrentIndex());
    const isError = step === "error";
    const isSuccess = step === "success";
    applyStepStatusesWithSuccess(steps, currentIdx, isError, isSuccess);

    const currentIndex = computeCurrentStepIndex(steps);
    return { steps, currentIndex };
    // lastNonErrorStepRef.current read when step === "error"; ref identity stable, step triggers re-run
  }, [progressConfig, txHashes, step]);
}
