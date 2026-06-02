/** Shared flow labels for Anchor / Genesis / Sail manage modals. */
export const DEPOSIT_MODAL_STEP = {
  depositCollateralAmount: "Deposit Collateral & Amount",
  rewardToken: "Reward token",
  stabilityPool: "Stability pool",
  withdrawStabilityPoolAmount: "Withdraw from Stability Pool & Enter Amount",
  redeemCollateral: "Redeem collateral",
  withdrawCollateralAmount: "Withdraw Collateral & Amount",
  redeemCollateralAmount: "Redeem Collateral & Amount",
} as const;

export function genesisDepositFlowParts(): string[] {
  return [DEPOSIT_MODAL_STEP.depositCollateralAmount];
}

export function genesisWithdrawFlowParts(): string[] {
  return [DEPOSIT_MODAL_STEP.withdrawCollateralAmount];
}

export function sailMintFlowParts(): string[] {
  return [DEPOSIT_MODAL_STEP.depositCollateralAmount];
}

export function sailRedeemFlowParts(): string[] {
  return [DEPOSIT_MODAL_STEP.redeemCollateralAmount];
}

export function anchorDepositFlowParts(options: {
  mintOnly: boolean;
  skipRewardStep: boolean;
}): string[] {
  const parts: string[] = [DEPOSIT_MODAL_STEP.depositCollateralAmount];
  if (options.mintOnly) return parts;
  if (!options.skipRewardStep) {
    parts.push(DEPOSIT_MODAL_STEP.rewardToken);
  }
  parts.push(DEPOSIT_MODAL_STEP.stabilityPool);
  return parts;
}

export function anchorWithdrawFlowParts(withdrawOnly: boolean): string[] {
  if (withdrawOnly) {
    return [DEPOSIT_MODAL_STEP.withdrawStabilityPoolAmount];
  }
  return [
    DEPOSIT_MODAL_STEP.withdrawStabilityPoolAmount,
    DEPOSIT_MODAL_STEP.redeemCollateral,
  ];
}
