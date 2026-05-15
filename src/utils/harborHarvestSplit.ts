/** 1e18 — matches `1 ether` in StabilityPoolManager_v1 harvest math. */
export const HARBOR_HARVEST_WAD = 10n ** 18n;

export type HarborHarvestSplit = {
  bounty: bigint;
  cut: bigint;
  toPools: bigint;
  /** Share of harvestable (0–100), rounded; the three sum to 100 when harvestable > 0. */
  bountyPct: number;
  cutPct: number;
  poolsPct: number;
  /** On-chain ratios as configured (0–100 each); may exceed 100 combined. */
  configuredBountyPct: number;
  configuredCutPct: number;
  /** True when bountyRatio + cutRatio > WAD (harvest would revert). */
  ratiosExceedHarvestable: boolean;
};

function wadRatioToPercent(ratio: bigint): number {
  if (ratio <= 0n) return 0;
  return Number((ratio * 10000n) / HARBOR_HARVEST_WAD) / 100;
}

/**
 * Preview StabilityPoolManager.harvest() splits (bounty and cut are each taken from
 * full harvestable, then the remainder goes to stability pools).
 */
export function computeHarborHarvestSplit(
  harvestable: bigint,
  bountyRatio: bigint,
  cutRatio: bigint
): HarborHarvestSplit {
  const configuredBountyPct = wadRatioToPercent(bountyRatio);
  const configuredCutPct = wadRatioToPercent(cutRatio);
  const ratiosExceedHarvestable =
    harvestable > 0n && bountyRatio + cutRatio > HARBOR_HARVEST_WAD;

  if (harvestable <= 0n) {
    return {
      bounty: 0n,
      cut: 0n,
      toPools: 0n,
      bountyPct: 0,
      cutPct: 0,
      poolsPct: 0,
      configuredBountyPct,
      configuredCutPct,
      ratiosExceedHarvestable,
    };
  }

  const bounty = (harvestable * bountyRatio) / HARBOR_HARVEST_WAD;
  let cut = (harvestable * cutRatio) / HARBOR_HARVEST_WAD;
  if (bounty + cut > harvestable) {
    cut = harvestable > bounty ? harvestable - bounty : 0n;
  }
  const toPools =
    harvestable > bounty + cut ? harvestable - bounty - cut : 0n;

  // Integer bps of harvestable so displayed shares sum to 100%.
  const bountyBps = (bounty * 10000n) / harvestable;
  const cutBps = (cut * 10000n) / harvestable;
  const poolsBps = 10000n - bountyBps - cutBps;

  return {
    bounty,
    cut,
    toPools,
    bountyPct: Number(bountyBps) / 100,
    cutPct: Number(cutBps) / 100,
    poolsPct: Number(poolsBps) / 100,
    configuredBountyPct,
    configuredCutPct,
    ratiosExceedHarvestable,
  };
}
