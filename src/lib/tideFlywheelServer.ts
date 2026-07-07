import type { PublicClient } from "viem";
import { ERC20_ABI } from "@/abis/shared";
import { UNISWAP_V2_PAIR_ABI } from "@/abis/uniswapV2Pair";
import {
  TIDE_FLYWHEEL_CONFIG,
  type TideFlywheelStage,
} from "@/config/tideFlywheel";
import { fetchTidePolV4Snapshot } from "@/lib/tidePolV4Server";
import {
  deriveFlywheelStage,
  isPolTargetReached,
  isTreasuryTargetReached,
} from "@/utils/tideFlywheelStage";
import {
  polTideOwnershipPct,
  supplyBurnedPct,
  tideReserveFromPair,
  treasuryOwnershipPct,
} from "@/utils/tidePolOwnership";

export type TideFlywheelLandingSnapshot = {
  treasuryOwnershipPct: number | null;
  polOwnershipPct: number | null;
  supplyBurnedPct: number | null;
  targets: {
    treasuryOwnershipPct: number;
    polOwnershipPct: number;
  };
  activeStage: TideFlywheelStage;
  treasuryTargetReached: boolean;
  polTargetReached: boolean;
  updatedAt: string;
};

function resolveStaticBurnPct(totalSupply: bigint | null): number | null {
  const { supplyBurnedPct: staticPct, tideTokensBurned } =
    TIDE_FLYWHEEL_CONFIG.staticBurn;

  if (staticPct > 0) return staticPct;

  if (tideTokensBurned > 0 && totalSupply != null && totalSupply > 0n) {
    const burnedWei = BigInt(
      Math.trunc(tideTokensBurned * 10 ** TIDE_FLYWHEEL_CONFIG.tideDecimals),
    );
    return supplyBurnedPct(burnedWei, totalSupply);
  }

  if (totalSupply != null) return 0;
  return staticPct > 0 ? staticPct : null;
}

async function fetchPolV2OwnershipPct(
  client: PublicClient,
  tideToken: `0x${string}`,
  polLp: `0x${string}`,
  treasury: `0x${string}`,
  totalSupply: bigint,
): Promise<number | null> {
  const [treasuryLp, lpTotalSupply, reserves, token0, token1] =
    await Promise.all([
      client.readContract({
        address: polLp,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: "balanceOf",
        args: [treasury],
      }),
      client.readContract({
        address: polLp,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: "totalSupply",
      }),
      client.readContract({
        address: polLp,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: "getReserves",
      }),
      client.readContract({
        address: polLp,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: "token0",
      }),
      client.readContract({
        address: polLp,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: "token1",
      }),
    ]);

  const tideReserve = tideReserveFromPair(
    token0,
    token1,
    tideToken,
    reserves[0],
    reserves[1],
  );
  if (tideReserve == null) return null;

  return polTideOwnershipPct({
    treasuryLpBalance: treasuryLp,
    lpTotalSupply,
    tideReserveInPool: tideReserve,
    totalTideSupply: totalSupply,
  });
}

/** Server-side TIDE flywheel metrics for landing page and public APIs. */
export async function fetchTideFlywheelSnapshot(
  client: PublicClient,
): Promise<TideFlywheelLandingSnapshot | null> {
  const tideToken = TIDE_FLYWHEEL_CONFIG.tideTokenAddress;
  if (!tideToken) return null;

  const treasury = TIDE_FLYWHEEL_CONFIG.treasuryAddress;
  const burnAddress = TIDE_FLYWHEEL_CONFIG.burnAddress;
  const polLp = TIDE_FLYWHEEL_CONFIG.polLpAddress;
  const targets = TIDE_FLYWHEEL_CONFIG.targets;

  const reads: Promise<unknown>[] = [
    client.readContract({
      address: tideToken,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [treasury],
    }),
    client.readContract({
      address: tideToken,
      abi: ERC20_ABI,
      functionName: "totalSupply",
    }),
  ];

  if (burnAddress) {
    reads.push(
      client.readContract({
        address: tideToken,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [burnAddress],
      }),
    );
  }

  if (TIDE_FLYWHEEL_CONFIG.polV4) {
    reads.push(fetchTidePolV4Snapshot(client));
  }

  const results = await Promise.all(reads);

  const treasuryBalance = results[0] as bigint;
  const totalSupply = results[1] as bigint;

  let readIndex = 2;
  let burnedBalance: bigint | undefined;
  if (burnAddress) {
    burnedBalance = results[readIndex] as bigint;
    readIndex += 1;
  }

  let polV4Pct: number | null = null;
  if (TIDE_FLYWHEEL_CONFIG.polV4) {
    const polSnapshot = results[readIndex] as Awaited<
      ReturnType<typeof fetchTidePolV4Snapshot>
    >;
    polV4Pct = polSnapshot?.ownershipPct ?? null;
  }

  const treasuryOwnershipPctValue = treasuryOwnershipPct(
    treasuryBalance,
    totalSupply,
  );

  let polOwnershipPctValue = polV4Pct;
  if (polOwnershipPctValue == null && polLp) {
    polOwnershipPctValue = await fetchPolV2OwnershipPct(
      client,
      tideToken,
      polLp,
      treasury,
      totalSupply,
    );
  }

  let supplyBurnedPctValue: number | null = null;
  if (burnedBalance != null) {
    supplyBurnedPctValue = supplyBurnedPct(burnedBalance, totalSupply);
  } else {
    supplyBurnedPctValue = resolveStaticBurnPct(totalSupply);
  }

  return {
    treasuryOwnershipPct: treasuryOwnershipPctValue,
    polOwnershipPct: polOwnershipPctValue,
    supplyBurnedPct: supplyBurnedPctValue,
    targets: {
      treasuryOwnershipPct: targets.treasuryOwnershipPct,
      polOwnershipPct: targets.polOwnershipPct,
    },
    activeStage: deriveFlywheelStage(
      treasuryOwnershipPctValue,
      polOwnershipPctValue,
    ),
    treasuryTargetReached: isTreasuryTargetReached(treasuryOwnershipPctValue),
    polTargetReached: isPolTargetReached(polOwnershipPctValue),
    updatedAt: new Date().toISOString(),
  };
}
