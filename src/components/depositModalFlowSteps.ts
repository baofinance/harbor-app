/** Shared flow labels for Anchor / Genesis / Sail manage modals. */
export const DEPOSIT_MODAL_STEP = {
  buyMint: "Buy",
  deposit: "Deposit",
  withdraw: "Withdraw",
  sellRedeem: "Sell",
  depositCollateralAmount: "Deposit Collateral & Amount",
  rewardToken: "Reward token",
  stabilityPool: "Stability pool",
  withdrawStabilityPoolAmount: "Withdraw from Stability Pool & Enter Amount",
  redeemCollateral: "Sell for collateral",
  withdrawCollateralAmount: "Withdraw Collateral & Amount",
  redeemCollateralAmount: "Sell Token & Amount",
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

/** Simple-mode deposit: mint then deposit (unless mint-only). */
export function anchorSimpleDepositFlowParts(mintOnly: boolean): string[] {
  if (mintOnly) return ["Mint"];
  return ["Mint", DEPOSIT_MODAL_STEP.deposit];
}

/** Simple-mode withdraw: withdraw then redeem (unless withdraw-only). */
export function anchorSimpleWithdrawFlowParts(withdrawOnly: boolean): string[] {
  if (withdrawOnly) return [DEPOSIT_MODAL_STEP.withdraw];
  return [DEPOSIT_MODAL_STEP.withdraw, "Redeem"];
}

/** Simple-mode redeem-only: wallet redeem. */
export function anchorSimpleSellFlowParts(): string[] {
  return ["Redeem"];
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
    "Redeem for collateral",
  ];
}
