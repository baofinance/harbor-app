export type FounderParticipant = {
  user: string;
  finalMaidenVoyageOwnershipShare?: string | null;
  maidenVoyageBoostMultiplier?: string | null;
};

export type FounderWalletMetricInput = {
  wallet: string;
  participants: FounderParticipant[];
  cumulativeYieldUSD: number;
  paidUSD: number;
};

export type FounderWalletMetric = {
  /** Boost-weighted share of the founder yield pool (0–100). */
  yieldSharePct: number;
  /** Post–genesis-end ownership of the MV cap, from subgraph (0–100). */
  ownershipSharePct: number;
  totalEarnedUSD: number;
  paidUSD: number;
  outstandingUSD: number;
};

/**
 * Derive wallet founder metrics using the same weighting model as admin:
 * poolShare = (ownershipShare * boost) / sum(ownershipShare * boost)
 */
export function deriveFounderWalletMetric(
  input: FounderWalletMetricInput
): FounderWalletMetric {
  const walletLower = input.wallet.toLowerCase();
  const withWeights = input.participants.map((p) => {
    const share = Number.parseFloat(p.finalMaidenVoyageOwnershipShare || "0");
    const boost = Number.parseFloat(p.maidenVoyageBoostMultiplier || "1");
    const weight = Number.isFinite(share * boost) ? share * boost : 0;
    return { wallet: p.user.toLowerCase(), share, weight };
  });

  const totalWeight = withWeights.reduce((sum, r) => sum + r.weight, 0);
  const totalShare = withWeights.reduce((sum, r) => sum + r.share, 0);

  const target = withWeights.find((r) => r.wallet === walletLower);
  const targetWeight = target?.weight ?? 0;
  const targetShare = target?.share ?? 0;

  const poolShare =
    totalWeight > 0
      ? targetWeight / totalWeight
      : totalShare > 0
      ? targetShare / totalShare
      : 0;

  const totalEarnedUSD =
    totalWeight > 0
      ? input.cumulativeYieldUSD * poolShare
      : input.cumulativeYieldUSD * targetShare;

  return {
    yieldSharePct: poolShare * 100,
    ownershipSharePct: targetShare * 100,
    totalEarnedUSD,
    paidUSD: input.paidUSD,
    outstandingUSD: totalEarnedUSD - input.paidUSD,
  };
}

