/** TIDE page — distributor, airdrop, and claim configuration. */

export const TIDE_CONFIG = {
  distributorAddress:
    "0x7C5791e6F37d2fFdd4DAbf17d170556828C20fCD" as `0x${string}`,
  tideTokenAddress:
    "0xDA187eB6F4D7eE3a0b8f5cd81eED8d347f5693aD" as `0x${string}`,
  baoTokenAddress:
    "0xCe391315b414D4c7555956120461D21808A69F3A" as `0x${string}`,
  veBaoAddress:
    "0x8Bf70DFE40F07a5ab715F7e888478d9D3680a2B6" as `0x${string}`,
  /** veBAO lock extension UI — increase_unlock_time / create_lock. */
  veBaoAppUrl: "https://app.baofinance.io",
  /** Customer-facing airdrop & claim schedule (production). */
  airdropClaimScheduleLabel: "starting first week of July 2026",
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
    /** Path 3 — standard merkle claim (claimStandard): veFXN & liquid wrapper. */
    standardAllocation: "/data/tide/vefxn_tide_allocation.json",
    /** Boosters bucket — score-weighted 15M TIDE (wallet mapping partial). */
    boosters: "/data/tide/boosters_tide_allocation.json",
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

export type TideBoostersScoreGroup = {
  rankLabel: string;
  score: number;
  amountTokens: number;
};

export type TideBoostersAllocationRow = {
  rank: number;
  score: number;
  address: string;
  amount: string;
  amountTokens: number;
};

export type TideBoostersSnapshot = {
  name?: string;
  description?: string;
  poolTokens: number;
  totalScore: number;
  recipientCount: number;
  mappedAddressCount: number;
  pendingAddressCount: number;
  scoreGroups: TideBoostersScoreGroup[];
  allocations: TideBoostersAllocationRow[];
};

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
