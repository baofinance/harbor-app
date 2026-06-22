import harborTideDistributorJson from "./harborTideDistributor.json";

/** Full HarborTideDistributor_v1 ABI — see bao-claim/src/tide/FRONTEND.md */
export const HARBOR_TIDE_DISTRIBUTOR_ABI = harborTideDistributorJson;

export type VeClaimStatus = {
  veEnd: bigint;
  lockedAmount: bigint;
  baoRequired: bigint;
  minUnlockTime: bigint;
  canClaimNow: boolean;
  alreadyClaimed: boolean;
  poolCapAvailable: boolean;
};

/** Wagmi may return the struct fields directly or under `status`. */
export function normalizeVeClaimStatus(
  raw: VeClaimStatus | readonly [bigint, bigint, bigint, bigint, boolean, boolean, boolean] | { status: VeClaimStatus } | undefined
): VeClaimStatus | undefined {
  if (!raw) return undefined;
  if (typeof raw === "object" && "status" in raw) {
    return raw.status as VeClaimStatus;
  }
  if (Array.isArray(raw)) {
    return {
      veEnd: raw[0],
      lockedAmount: raw[1],
      baoRequired: raw[2],
      minUnlockTime: raw[3],
      canClaimNow: raw[4],
      alreadyClaimed: raw[5],
      poolCapAvailable: raw[6],
    };
  }
  return raw as VeClaimStatus;
}
