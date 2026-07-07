import { TIDE_CONFIG } from "@/config/tide";
import { TIDE_FLYWHEEL_CONFIG } from "@/config/tideFlywheel";

/** wstETH — the non-TIDE leg of the Harbor POL Uniswap v4 pool. */
export const TIDE_POL_PAIR_TOKEN =
  "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0" as `0x${string}`;

export const TIDE_POL_SWAP_CONFIG = {
  tideToken: TIDE_CONFIG.tideTokenAddress,
  /** Swap rewards to this token first (when needed), then route through POL v4 pool. */
  pairToken: TIDE_POL_PAIR_TOKEN,
  poolKey: {
    currency0: TIDE_POL_PAIR_TOKEN,
    currency1: TIDE_CONFIG.tideTokenAddress,
    fee: 3000,
    tickSpacing: 60,
    hooks: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
  poolId: TIDE_FLYWHEEL_CONFIG.polV4!.poolId,
  universalRouter:
    "0x66a9893cc07d91d95644aedd05d03f95e1dba8af" as `0x${string}`,
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`,
  v4Quoter: "0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203" as `0x${string}`,
  stateView: TIDE_FLYWHEEL_CONFIG.polV4!.stateViewAddress,
  /** ParaSwap TokenTransferProxy (Velora). */
  paraswapTransferProxy:
    "0x216b4b4ba9f3e719726886d34a177484278bfcae" as `0x${string}`,
  slippagePct: 1.0,
  chainId: TIDE_CONFIG.chainId,
  uniswapPoolUrl: TIDE_FLYWHEEL_CONFIG.polV4!.uniswapPoolUrl,
} as const;
