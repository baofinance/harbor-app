/** WAD (1e18) for minter fee ratios and collateral ratios. */
export const WAD = 10n ** 18n;

export type FeeBand = {
  lowerBound: bigint;
  upperBound?: bigint;
  ratio: bigint;
};

/** Build ordered fee bands from minter incentive config (on-chain shape). */
export function bandsFromConfig(config: unknown): FeeBand[] {
  if (!config || typeof config !== "object") return [];
  const c = config as Record<string, unknown>;
  const boundsRaw = c.collateralRatioBandUpperBounds;
  const bounds: bigint[] = Array.isArray(boundsRaw)
    ? (boundsRaw as bigint[])
    : [];
  const ratiosRaw = c.incentiveRatios ?? c.incentiveRates;
  const ratios: bigint[] = Array.isArray(ratiosRaw) ? (ratiosRaw as bigint[]) : [];
  if (ratios.length === 0) return [];

  const bands: FeeBand[] = [];
  let prev = 0n;
  for (let i = 0; i < ratios.length; i++) {
    const isLast = i === ratios.length - 1;
    const upper = !isLast ? bounds[i] : undefined;
    bands.push({ lowerBound: prev, upperBound: upper, ratio: ratios[i] });
    if (upper !== undefined) prev = upper;
  }
  return bands;
}

export function getCurrentFee(
  bands: FeeBand[] | undefined,
  currentCR?: bigint
): bigint | undefined {
  if (!bands || bands.length === 0 || !currentCR) return undefined;
  return (
    bands.find(
      (b) =>
        currentCR >= b.lowerBound &&
        (b.upperBound === undefined || currentCR <= b.upperBound)
    )?.ratio ?? bands[bands.length - 1]?.ratio
  );
}

/** Same band as `getCurrentFee` (for mint-sail block rules on current CR). */
export function getActiveFeeBand(
  bands: FeeBand[] | undefined,
  currentCR?: bigint
): FeeBand | undefined {
  if (!bands || bands.length === 0 || !currentCR) return undefined;
  return (
    bands.find(
      (b) =>
        currentCR >= b.lowerBound &&
        (b.upperBound === undefined || currentCR <= b.upperBound)
    ) ?? bands[bands.length - 1]
  );
}
