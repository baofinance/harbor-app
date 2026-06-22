/** TIDE page — distributor, airdrop, and claim configuration. */

export const TIDE_CONFIG = {
  distributorAddress:
    "0x1169dd8b75f2b752f8989911da5be29eede89256" as `0x${string}`,
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
    airdrop: "/data/tide/vebao_tide_airdrop.json",
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
