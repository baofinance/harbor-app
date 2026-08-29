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

/** Simple-mode deposit: buy then deposit (unless buy-only). */
export function anchorSimpleDepositFlowParts(mintOnly: boolean): string[] {
  if (mintOnly) return [DEPOSIT_MODAL_STEP.buyMint];
  return [DEPOSIT_MODAL_STEP.buyMint, DEPOSIT_MODAL_STEP.deposit];
}

/** Simple-mode withdraw: withdraw then sell (unless withdraw-only). */
export function anchorSimpleWithdrawFlowParts(withdrawOnly: boolean): string[] {
  if (withdrawOnly) return [DEPOSIT_MODAL_STEP.withdraw];
  return [DEPOSIT_MODAL_STEP.withdraw, DEPOSIT_MODAL_STEP.sellRedeem];
}

/** Simple-mode sell tab: wallet sell only. */
export function anchorSimpleSellFlowParts(): string[] {
  return [DEPOSIT_MODAL_STEP.sellRedeem];
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
