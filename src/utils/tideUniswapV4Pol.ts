import {
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  type Hex,
} from "viem";
import type { UniswapV4PoolKey } from "@/abis/uniswapV4";
import { tokenShareOfSupplyPct } from "@/utils/tidePolOwnership";

const Q96 = 2n ** 96n;

/** PoolId = keccak256(abi.encode(PoolKey)). */
export function uniswapV4PoolIdFromKey(poolKey: UniswapV4PoolKey): Hex {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters(
        "address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks",
      ),
      [
        poolKey.currency0,
        poolKey.currency1,
        poolKey.fee,
        poolKey.tickSpacing,
        poolKey.hooks,
      ],
    ),
  );
}

function signExtend24(value: bigint): number {
  const masked = Number(value & 0xffffffn);
  return masked >= 0x800000 ? masked - 0x1000000 : masked;
}

/** Decode tick bounds from Uniswap v4 PositionInfo bytes32. */
export function decodeUniswapV4PositionTicks(info: Hex): {
  tickLower: number;
  tickUpper: number;
} {
  const n = BigInt(info);
  return {
    tickLower: signExtend24(n >> 8n),
    tickUpper: signExtend24(n >> 32n),
  };
}

/** Uniswap v3/v4 sqrt ratio at tick (Q64.96). */
export function getSqrtRatioAtTick(tick: bigint): bigint {
  const absTick = tick < 0n ? -tick : tick;
  let ratio =
    (absTick & 0x1n) !== 0n
      ? 0xfffcb933bd6fad37aa2d162d1a594001n
      : 0x100000000000000000000000000000000n;
  if ((absTick & 0x2n) !== 0n) {
    ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
  }
  if ((absTick & 0x4n) !== 0n) {
    ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
  }
  if ((absTick & 0x8n) !== 0n) {
    ratio = (ratio * 0xffe5caca7e10e4e61c36298e098fc45n) >> 128n;
  }
  if ((absTick & 0x10n) !== 0n) {
    ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
  }
  if ((absTick & 0x20n) !== 0n) {
    ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
  }
  if ((absTick & 0x40n) !== 0n) {
    ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
  }
  if ((absTick & 0x80n) !== 0n) {
    ratio = (ratio * 0xfe31f8aa2a1e128ea5bcf7565b6f1e0n) >> 128n;
  }
  if ((absTick & 0x100n) !== 0n) {
    ratio = (ratio * 0xfdcb9a911374d0a7e8c256d1e9630d0n) >> 128n;
  }
  if ((absTick & 0x200n) !== 0n) {
    ratio = (ratio * 0xf9730ca27cecf2e55139230f7e8d15e0n) >> 128n;
  }
  if ((absTick & 0x400n) !== 0n) {
    ratio = (ratio * 0xf2f8ab1792452b8755fc8e683149279n) >> 128n;
  }
  if ((absTick & 0x800n) !== 0n) {
    ratio = (ratio * 0xe715f725d314e1bc3c964cc0967e62c8n) >> 128n;
  }
  if ((absTick & 0x1000n) !== 0n) {
    ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
  }
  if ((absTick & 0x2000n) !== 0n) {
    ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
  }
  if ((absTick & 0x4000n) !== 0n) {
    ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
  }
  if ((absTick & 0x8000n) !== 0n) {
    ratio = (ratio * 0x31be135f97d08fd981cb24801c2f48c7n) >> 128n;
  }
  if ((absTick & 0x10000n) !== 0n) {
    ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
  }
  if ((absTick & 0x20000n) !== 0n) {
    ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
  }
  if ((absTick & 0x40000n) !== 0n) {
    ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
  }
  if ((absTick & 0x80000n) !== 0n) {
    ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;
  }
  if (tick > 0n) {
    ratio = (2n ** 256n - 1n) / ratio;
  }
  return ratio >> 32n;
}

function getAmount0ForLiquidity(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }
  return (
    (liquidity * Q96 * (sqrtRatioBX96 - sqrtRatioAX96)) /
    sqrtRatioBX96 /
    sqrtRatioAX96
  );
}

function getAmount1ForLiquidity(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }
  return (liquidity * (sqrtRatioBX96 - sqrtRatioAX96)) / Q96;
}

/** Token amounts (currency0, currency1) for a concentrated liquidity position. */
export function getUniswapV4PositionAmounts(input: {
  liquidity: bigint;
  tickLower: number;
  tickUpper: number;
  sqrtPriceX96: bigint;
}): { amount0: bigint; amount1: bigint } {
  const { liquidity, tickLower, tickUpper, sqrtPriceX96 } = input;
  const sqrtLower = getSqrtRatioAtTick(BigInt(tickLower));
  const sqrtUpper = getSqrtRatioAtTick(BigInt(tickUpper));

  if (sqrtPriceX96 <= sqrtLower) {
    return {
      amount0: getAmount0ForLiquidity(sqrtLower, sqrtUpper, liquidity),
      amount1: 0n,
    };
  }
  if (sqrtPriceX96 >= sqrtUpper) {
    return {
      amount0: 0n,
      amount1: getAmount1ForLiquidity(sqrtLower, sqrtUpper, liquidity),
    };
  }
  return {
    amount0: getAmount0ForLiquidity(sqrtPriceX96, sqrtUpper, liquidity),
    amount1: getAmount1ForLiquidity(sqrtLower, sqrtPriceX96, liquidity),
  };
}

export function tideAmountFromV4Position(input: {
  poolKey: UniswapV4PoolKey;
  amount0: bigint;
  amount1: bigint;
  tideToken: `0x${string}`;
}): bigint {
  const tide = input.tideToken.toLowerCase();
  if (input.poolKey.currency0.toLowerCase() === tide) return input.amount0;
  if (input.poolKey.currency1.toLowerCase() === tide) return input.amount1;
  return 0n;
}

export function polOwnershipPctFromTideInPol(
  tideInPol: bigint,
  totalTideSupply: bigint,
): number | null {
  return tokenShareOfSupplyPct(tideInPol, totalTideSupply);
}
