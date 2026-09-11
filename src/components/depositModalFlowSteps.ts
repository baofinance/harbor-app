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
  review: "Review",
} as const;

export function genesisDepositFlowParts(): string[] {
  return ["Amount"];
}

export function genesisWithdrawFlowParts(): string[] {
  return ["Amount"];
}

export function sailMintFlowParts(): string[] {
  return ["Amount"];
}

export function sailRedeemFlowParts(): string[] {
  return ["Amount"];
}

/**
 * Simple-mode deposit crumbs.
 * Mint-only: Mint → Review
 * Mint + deposit: Mint → Deposit → Review
 */
export function anchorSimpleDepositFlowParts(
  mintOnly: boolean,
  flowPage: 1 | 2 | 3 = 1,
): string[] {
  if (mintOnly) {
    if (flowPage === 1) return ["Mint"];
    return ["Mint", DEPOSIT_MODAL_STEP.review];
  }
  if (flowPage === 1) return ["Mint"];
  if (flowPage === 2) return ["Mint", DEPOSIT_MODAL_STEP.deposit];
  return ["Mint", DEPOSIT_MODAL_STEP.deposit, DEPOSIT_MODAL_STEP.review];
}

/** Simple-mode withdraw: withdraw then redeem (unless withdraw-only). */
export function anchorSimpleWithdrawFlowParts(withdrawOnly: boolean): string[] {
  if (withdrawOnly) return [DEPOSIT_MODAL_STEP.withdraw];
  return [DEPOSIT_MODAL_STEP.withdraw, "Redeem"];
}

/**
 * Position-first Earn redeem crumbs.
 * Always ends with Review. Optional Redeem to sits between Confirm and Review.
 */
export function anchorSimpleRedeemPositionFlowParts(
  flowPage: 1 | 2 | 3 | 4,
  options: {
    confirmLabel?: "Redeem" | "Request" | "Confirm";
    includeRouteStep?: boolean;
  } = {},
): string[] {
  const confirmLabel = options.confirmLabel ?? "Confirm";
  const includeRouteStep = options.includeRouteStep ?? false;

  if (flowPage === 1) return ["Choose position"];

  if (includeRouteStep) {
    if (flowPage === 2) return ["Choose position", confirmLabel];
    if (flowPage === 3) {
      return ["Choose position", confirmLabel, "Redeem to"];
    }
    return [
      "Choose position",
      confirmLabel,
      "Redeem to",
      DEPOSIT_MODAL_STEP.review,
    ];
  }

  if (flowPage === 2) return ["Choose position", confirmLabel];
  return ["Choose position", confirmLabel, DEPOSIT_MODAL_STEP.review];
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
