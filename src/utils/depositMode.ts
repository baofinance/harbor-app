/**
 * Deposit mode is driven by market config (zapper, anyswap), not by chain.
 * Use this in modals and market overview to show collateral-only vs collateral + zapper + any-token swap.
 */

const MAINNET_CHAIN_ID = 1;
const MEGAETH_CHAIN_ID = 4326;

export interface DepositMode {
  /** If true, show zapper flows (e.g. ETH/stETH → wstETH). */
  supportsZapper: boolean;
  /** If true, show any-token swap (other ERC20s via Velora/ParaSwap). */
  supportsAnyswap: boolean;
  /** Collateral-only: no zapper, no any-token swap. */
  collateralOnly: boolean;
  /** Display label for native token (e.g. "Mega ETH" on MegaETH, "ETH" on mainnet). */
  nativeTokenLabel: string;
  /** True when market is on MegaETH (chainId 4326) for "Mega ETH" label. */
  isMegaEth: boolean;
}

/**
 * Market with optional deposit-mode flags. When omitted, we fall back to chainId (mainnet = both true).
 */
export type MarketWithDepositMode = {
  chainId?: number;
  zapper?: boolean;
  anyswap?: boolean;
  [key: string]: unknown;
};

/**
 * Returns deposit mode for a market from config (zapper, anyswap).
 * Default: mainnet (chainId 1) → zapper true, anyswap true; other chains → false, false.
 */
export function getDepositMode(market: MarketWithDepositMode | null | undefined): DepositMode {
  const chainId = market?.chainId ?? MAINNET_CHAIN_ID;
  const isMegaEth = chainId === MEGAETH_CHAIN_ID;
  const nativeTokenLabel = isMegaEth ? "Mega ETH" : "ETH";

  if (!market) {
    return {
      supportsZapper: chainId === MAINNET_CHAIN_ID,
      supportsAnyswap: chainId === MAINNET_CHAIN_ID,
      collateralOnly: chainId !== MAINNET_CHAIN_ID,
      nativeTokenLabel,
      isMegaEth,
    };
  }

  const supportsZapper = market.zapper !== undefined ? market.zapper : chainId === MAINNET_CHAIN_ID;
  const supportsAnyswap = market.anyswap !== undefined ? market.anyswap : chainId === MAINNET_CHAIN_ID;
  const collateralOnly = !supportsZapper && !supportsAnyswap;

  return {
    supportsZapper,
    supportsAnyswap,
    collateralOnly,
    nativeTokenLabel,
    isMegaEth,
  };
}
