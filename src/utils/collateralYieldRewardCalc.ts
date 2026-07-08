export type CollateralYieldRewardInput = {
  collateralValueUsd: number;
  apyPct: number;
  periodDays: number;
  rewardTokenPriceUsd: number;
  anchorSplitPct: number;
  sailSplitPct: number;
};

export type CollateralYieldRewardResult = {
  annualYieldUsd: number;
  periodYieldUsd: number;
  totalRewardTokens: number;
  anchorRewardTokens: number;
  sailRewardTokens: number;
};

export function computeCollateralYieldRewards(
  input: CollateralYieldRewardInput
): CollateralYieldRewardResult | { error: string } {
  const {
    collateralValueUsd,
    apyPct,
    periodDays,
    rewardTokenPriceUsd,
    anchorSplitPct,
    sailSplitPct,
  } = input;

  if (!Number.isFinite(collateralValueUsd) || collateralValueUsd <= 0) {
    return { error: "Collateral value must be greater than zero." };
  }
  if (!Number.isFinite(apyPct) || apyPct <= 0) {
    return { error: "APY must be greater than zero." };
  }
  if (!Number.isFinite(periodDays) || periodDays <= 0) {
    return { error: "Reward period must be greater than zero." };
  }
  if (!Number.isFinite(rewardTokenPriceUsd) || rewardTokenPriceUsd <= 0) {
    return { error: "Reward token price must be set." };
  }

  const splitTotal = anchorSplitPct + sailSplitPct;
  if (!Number.isFinite(splitTotal) || Math.abs(splitTotal - 100) > 0.01) {
    return { error: "Anchor and Sail percentages must sum to 100." };
  }

  const annualYieldUsd = collateralValueUsd * (apyPct / 100);
  const periodYieldUsd = annualYieldUsd * (periodDays / 365);
  const totalRewardTokens = periodYieldUsd / rewardTokenPriceUsd;
  const anchorRewardTokens = totalRewardTokens * (anchorSplitPct / 100);
  const sailRewardTokens = totalRewardTokens * (sailSplitPct / 100);

  return {
    annualYieldUsd,
    periodYieldUsd,
    totalRewardTokens,
    anchorRewardTokens,
    sailRewardTokens,
  };
}

export function formatRewardTokenAmount(amount: number, maxDecimals = 6): string {
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  const rounded = Number(amount.toFixed(maxDecimals));
  return rounded.toString();
}

export function poolTvlSplitPercentages(
  anchorTvlUsd: number,
  sailTvlUsd: number
): { anchorPct: number; sailPct: number } | null {
  const total = anchorTvlUsd + sailTvlUsd;
  if (!Number.isFinite(total) || total <= 0) return null;
  const anchorPct = (anchorTvlUsd / total) * 100;
  const sailPct = (sailTvlUsd / total) * 100;
  return { anchorPct, sailPct };
}
