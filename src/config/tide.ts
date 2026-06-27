/** TIDE page — distributor, airdrop, and claim configuration. */

export const TIDE_CONFIG = {
  distributorAddress:
    "0x8FfbE3917D83E77459c27910690Bbea73E7E38b9" as `0x${string}`,
  tideTokenAddress:
    "0xB324bA448Ac468015cB86039314ada42E198aA5c" as `0x${string}`,
  baoTokenAddress:
    "0xCe391315b414D4c7555956120461D21808A69F3A" as `0x${string}`,
  veBaoAddress:
    "0x8Bf70DFE40F07a5ab715F7e888478d9D3680a2B6" as `0x${string}`,
  /** 1 BAO = 1758 / 10000 TIDE (on-chain). */
  tideNumerator: 1758,
  rateDenominator: 10_000,
  baoDecimals: 18,
  tideDecimals: 18,
  chainId: 1,
  dataPaths: {
    airdrop: "/data/tide/tide_airdrop.json",
    /** Path 2 — veBAO merkle claim (claimVeBao). */
    veBaoAllocation: "/data/tide/vebao_tide_allocation.json",
    /** Path 3 — standard merkle claim (claimStandard). Same file on test deploy; split for production. */
    standardAllocation: "/data/tide/vebao_tide_allocation.json",
  },
} as const;

export type TideAllocationRow = {
  address: string;
  /** TIDE amount in wei (must match merkle leaf exactly). */
  amount: string;
  amountTokens: number;
  proof?: string[];
};

export type TideAllocationSnapshot = {
  name?: string;
  description?: string;
  merkleRoot?: string;
  snapshotBlock?: number;
  allocations: TideAllocationRow[];
};

export type TideClaimAllocation = TideAllocationRow;

/** Airdrop eligibility buckets — amounts are TIDE (not wei unless `amount` is set). */
export const TIDE_AIRDROP_BUCKETS = [
  { key: "veBaoSnapshot", label: "veBAO" },
  { key: "boosters", label: "Boosters" },
  { key: "raise", label: "Raise" },
  { key: "ledgerMarks", label: "Marks" },
] as const;

export type TideAirdropBucketKey = (typeof TIDE_AIRDROP_BUCKETS)[number]["key"];

/** Boosters bucket — ranks and TIDE amounts known; wallet mapping pending. */
export const TIDE_BOOSTERS_RANK_ALLOCATIONS = [
  2_189_781,
  1_532_846,
  1_094_890,
  766_423,
  766_423,
  547_445,
  547_445,
  547_445,
  547_445,
  547_445,
  328_467,
  328_467,
  328_467,
  328_467,
  328_467,
  328_467,
  328_467,
  328_467,
  328_467,
  328_467,
  175_182,
  175_182,
  175_182,
  175_182,
  175_182,
  175_182,
  175_182,
  175_182,
  175_182,
  175_182,
  175_182,
  175_182,
  175_182,
  175_182,
  175_182,
] as const;

/** Grouped for tooltip display (consecutive ranks share the same amount). */
export const TIDE_BOOSTERS_RANK_GROUPS = [
  { rankLabel: "1", amountTokens: 2_189_781 },
  { rankLabel: "2", amountTokens: 1_532_846 },
  { rankLabel: "3", amountTokens: 1_094_890 },
  { rankLabel: "4–5", amountTokens: 766_423 },
  { rankLabel: "6–10", amountTokens: 547_445 },
  { rankLabel: "11–20", amountTokens: 328_467 },
  { rankLabel: "21–35", amountTokens: 175_182 },
] as const;

export const TIDE_BOOSTERS = {
  /** Set false once booster wallet addresses are in tide_airdrop.json. */
  pending: true,
  poolTokens: 15_000_000,
  recipientCount: TIDE_BOOSTERS_RANK_ALLOCATIONS.length,
} as const;

export function tideBoostersTotalTokens(): number {
  return TIDE_BOOSTERS.poolTokens;
}

export function tideBoostersAverageTokens(): number {
  return TIDE_BOOSTERS.poolTokens / TIDE_BOOSTERS.recipientCount;
}

export function tideBoostersAmountForRank(rank: number): number | undefined {
  if (rank < 1 || rank > TIDE_BOOSTERS_RANK_ALLOCATIONS.length) return undefined;
  return TIDE_BOOSTERS_RANK_ALLOCATIONS[rank - 1];
}

export type TideAirdropBucketAmount = {
  /** Optional wei string when known; UI uses amountTokens. */
  amount?: string;
  amountTokens: number;
};

export type TideAirdropAllocationRow = {
  address: string;
  /** Legacy row: veBAO snapshot total when `buckets` is omitted. */
  amount?: string;
  amountTokens?: number;
  buckets?: Partial<Record<TideAirdropBucketKey, TideAirdropBucketAmount>>;
};

export type TideAirdropSnapshot = {
  name?: string;
  description?: string;
  snapshotBlock?: number;
  /** Optional pool sizes per bucket (informational). */
  bucketPools?: Partial<Record<TideAirdropBucketKey, number>>;
  allocations: TideAirdropAllocationRow[];
};
