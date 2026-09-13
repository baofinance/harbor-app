/**
 * Shared parameter types for the `useAnchorDepositWithdrawModal` concern modules.
 *
 * Market objects reaching this modal are enriched at runtime (`wrappedRate`, `chainId`)
 * beyond the static `DefinedMarket` config union, so the module boundaries read them
 * loosely — the same way the composed hook did before the split.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnchorModalMarket = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

export type AnchorModalMarketEntry = {
  marketId: string;
  market: AnchorModalMarket;
};

/** One stability-pool position row of the ha-token market group (collateral or sail side). */
export type AnchorModalPoolPositionRow = {
  key: string;
  marketId: string;
  market: AnchorModalMarket;
  poolType: "collateral" | "sail";
  poolAddress: string;
  balance: bigint;
};

export type AnchorModalWithdrawalMethods = {
  collateralPool: "immediate" | "request";
  sailPool: "immediate" | "request";
};

export type AnchorModalPositionAmounts = {
  wallet: string;
  collateralPool: string;
  sailPool: string;
};

export type AnchorModalFlowPage = 1 | 2 | 3 | 4;
