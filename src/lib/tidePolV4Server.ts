import {
  parseAbiItem,
  type Hex,
  type PublicClient,
} from "viem";
import {
  UNISWAP_V4_POSITION_MANAGER_ABI,
  UNISWAP_V4_STATE_VIEW_ABI,
  type UniswapV4PoolKey,
} from "@/abis/uniswapV4";
import { ERC20_ABI } from "@/abis/shared";
import { TIDE_FLYWHEEL_CONFIG } from "@/config/tideFlywheel";
import {
  decodeUniswapV4PositionTicks,
  getUniswapV4PositionAmounts,
  polOwnershipPctFromTideInPol,
  tideAmountFromV4Position,
  uniswapV4PoolIdFromKey,
} from "@/utils/tideUniswapV4Pol";

export type TidePolV4Snapshot = {
  ownershipPct: number | null;
  tideInPolWei: string;
  positionCount: number;
  poolId: Hex;
  updatedAt: number;
};

async function fetchTreasuryPositionTokenIds(
  client: PublicClient,
  positionManager: `0x${string}`,
  treasury: `0x${string}`,
  fromBlock: bigint,
): Promise<bigint[]> {
  const logs = await client.getLogs({
    address: positionManager,
    event: parseAbiItem(
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    ),
    args: { to: treasury },
    fromBlock,
    toBlock: "latest",
  });

  const ids = new Set<bigint>();
  for (const log of logs) {
    if (log.args.tokenId != null) ids.add(log.args.tokenId);
  }
  return [...ids];
}

async function tideInPolForPosition(
  client: PublicClient,
  input: {
    tokenId: bigint;
    positionManager: `0x${string}`;
    stateView: `0x${string}`;
    targetPoolId: Hex;
    tideToken: `0x${string}`;
  },
): Promise<bigint> {
  const [liquidity, poolAndInfo, slot0] = await Promise.all([
    client.readContract({
      address: input.positionManager,
      abi: UNISWAP_V4_POSITION_MANAGER_ABI,
      functionName: "getPositionLiquidity",
      args: [input.tokenId],
    }),
    client.readContract({
      address: input.positionManager,
      abi: UNISWAP_V4_POSITION_MANAGER_ABI,
      functionName: "getPoolAndPositionInfo",
      args: [input.tokenId],
    }),
    client.readContract({
      address: input.stateView,
      abi: UNISWAP_V4_STATE_VIEW_ABI,
      functionName: "getSlot0",
      args: [input.targetPoolId],
    }),
  ]);

  const poolKey = poolAndInfo[0] as UniswapV4PoolKey;
  const poolId = uniswapV4PoolIdFromKey(poolKey);
  if (poolId.toLowerCase() !== input.targetPoolId.toLowerCase()) {
    return 0n;
  }

  if (liquidity === 0n) return 0n;

  const { tickLower, tickUpper } = decodeUniswapV4PositionTicks(
    poolAndInfo[1] as Hex,
  );
  const { amount0, amount1 } = getUniswapV4PositionAmounts({
    liquidity,
    tickLower,
    tickUpper,
    sqrtPriceX96: slot0[0],
  });

  return tideAmountFromV4Position({
    poolKey,
    amount0,
    amount1,
    tideToken: input.tideToken,
  });
}

export async function fetchTidePolV4Snapshot(
  client: PublicClient,
): Promise<TidePolV4Snapshot | null> {
  const polV4 = TIDE_FLYWHEEL_CONFIG.polV4;
  const tideToken = TIDE_FLYWHEEL_CONFIG.tideTokenAddress;
  if (!polV4 || !tideToken) return null;

  const treasury = TIDE_FLYWHEEL_CONFIG.treasuryAddress;
  const tokenIds = await fetchTreasuryPositionTokenIds(
    client,
    polV4.positionManagerAddress,
    treasury,
    BigInt(polV4.positionScanFromBlock),
  );

  const [totalSupply, ...positionTideAmounts] = await Promise.all([
    client.readContract({
      address: tideToken,
      abi: ERC20_ABI,
      functionName: "totalSupply",
    }),
    ...tokenIds.map((tokenId) =>
      tideInPolForPosition(client, {
        tokenId,
        positionManager: polV4.positionManagerAddress,
        stateView: polV4.stateViewAddress,
        targetPoolId: polV4.poolId,
        tideToken,
      }),
    ),
  ]);

  const tideInPol = positionTideAmounts.reduce((sum, amount) => sum + amount, 0n);
  const ownershipPct = polOwnershipPctFromTideInPol(tideInPol, totalSupply);

  return {
    ownershipPct,
    tideInPolWei: tideInPol.toString(),
    positionCount: tokenIds.length,
    poolId: polV4.poolId,
    updatedAt: Date.now(),
  };
}
