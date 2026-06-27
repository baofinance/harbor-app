export type FounderParticipant = {
  user: string;
  finalMaidenVoyageOwnershipShare?: string | null;
  maidenVoyageBoostMultiplier?: string | null;
  maidenVoyageDepositCountedUSD?: string | null;
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
  /** Current MV retention boost from indexer; null if this wallet has no marks row for that genesis. */
  boostMultiplier: number | null;
  /** Counted maiden-voyage deposit USD from subgraph (0 if never deposited). */
  depositCountedUsd: number;
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

  const participant = input.participants.find((p) => p.user.toLowerCase() === walletLower);
  const depositCountedUsd = participant
    ? Number.parseFloat(participant.maidenVoyageDepositCountedUSD || "0") || 0
    : 0;
  const ownershipSharePct = targetShare * 100;
  const hasGenesisDeposit = founderMetricRowHasGenesisDeposit({
    ownershipSharePct,
    depositCountedUsd,
  });

  let boostMultiplier: number | null = null;
  if (participant && hasGenesisDeposit) {
    const b = Number.parseFloat(participant.maidenVoyageBoostMultiplier || "1");
    boostMultiplier = Number.isFinite(b) && b > 0 ? b : 1;
  }

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
    ownershipSharePct,
    boostMultiplier,
    depositCountedUsd,
    totalEarnedUSD,
    paidUSD: input.paidUSD,
    outstandingUSD: totalEarnedUSD - input.paidUSD,
  };
}

/** True when this wallet had a counted maiden-voyage deposit or non-zero ownership. */
export function founderMetricRowHasGenesisDeposit(row: {
  ownershipSharePct: number;
  depositCountedUsd: number;
}): boolean {
  if (row.depositCountedUsd > 0) return true;
  return Number(row.ownershipSharePct.toFixed(2)) > 0;
}

/** Hide revenue-share rows that would display as 0% pool share (incl. float dust). */
export function founderMetricRowHasRevenueShare(row: {
  yieldSharePct: number;
}): boolean {
  return Number(row.yieldSharePct.toFixed(2)) > 0;
}

