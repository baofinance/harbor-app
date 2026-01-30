/**
 * Anchor modal–specific types and defaults.
 * Used by AnchorDepositWithdrawModal to avoid inline config and unify shapes.
 */

export type AnchorProgressMode = "collateral" | "direct" | "withdraw" | null;

/** Flow step for Anchor deposit/withdraw (progress modal step mapping). */
export type AnchorFlowStep =
  | "input"
  | "approving"
  | "approvingPegged"
  | "minting"
  | "depositing"
  | "withdrawal-method-selection"
  | "withdrawing"
  | "withdrawingCollateral"
  | "withdrawingSail"
  | "requestingCollateral"
  | "requestingSail"
  | "redeeming"
  | "success"
  | "error";

export type WithdrawalMethod = "immediate" | "request";

export interface AnchorProgressConfig {
  mode: AnchorProgressMode;
  includeApproveCollateral: boolean;
  includePermitCollateral: boolean;
  includeMint: boolean;
  includeApprovePegged: boolean;
  includeDeposit: boolean;
  includeDirectApprove: boolean;
  includeDirectDeposit: boolean;
  includeWithdrawCollateral: boolean;
  includeWithdrawSail: boolean;
  useZap: boolean;
  zapAsset: string | null;
  zapAndDeposit: boolean;
  wrappedZapAndDeposit: boolean;
  wrappedZapAsset: string | null;
  includeApproveRedeem: boolean;
  includeRedeem: boolean;
  withdrawCollateralLabel: string;
  withdrawSailLabel: string;
  title: string;
}

export const DEFAULT_ANCHOR_PROGRESS_CONFIG: AnchorProgressConfig = {
  mode: null,
  includeApproveCollateral: false,
  includePermitCollateral: false,
  includeMint: false,
  includeApprovePegged: false,
  includeDeposit: false,
  includeDirectApprove: false,
  includeDirectDeposit: false,
  includeWithdrawCollateral: false,
  includeWithdrawSail: false,
  useZap: false,
  zapAsset: null,
  zapAndDeposit: false,
  wrappedZapAndDeposit: false,
  wrappedZapAsset: null,
  includeApproveRedeem: false,
  includeRedeem: false,
  withdrawCollateralLabel: "Withdraw from collateral pool",
  withdrawSailLabel: "Withdraw from sail pool",
  title: "Processing",
};

export interface AnchorTxHashes {
  approveCollateral?: string;
  mint?: string;
  approvePegged?: string;
  deposit?: string;
  directApprove?: string;
  directDeposit?: string;
  withdrawCollateral?: string;
  withdrawSail?: string;
  requestCollateral?: string;
  requestSail?: string;
  approveRedeem?: string;
  redeem?: string;
}

export const DEFAULT_ANCHOR_TX_HASHES: AnchorTxHashes = {};

export interface AnchorWithdrawalMethods {
  collateralPool: WithdrawalMethod;
  sailPool: WithdrawalMethod;
}

export const DEFAULT_ANCHOR_WITHDRAWAL_METHODS: AnchorWithdrawalMethods = {
  collateralPool: "immediate",
  sailPool: "immediate",
};

export interface AnchorSelectedPositions {
  wallet: boolean;
  collateralPool: boolean;
  sailPool: boolean;
}

export const DEFAULT_ANCHOR_SELECTED_POSITIONS: AnchorSelectedPositions = {
  wallet: false,
  collateralPool: false,
  sailPool: false,
};

export interface AnchorPositionAmounts {
  wallet: string;
  collateralPool: string;
  sailPool: string;
}

/** Field key for position amount inputs (withdraw). */
export type PositionAmountField = keyof AnchorPositionAmounts;

/** Per-position balance-exceed flags (withdraw). */
export interface PositionExceedsBalance {
  wallet: boolean;
  collateralPool: boolean;
  sailPool: boolean;
}

export const DEFAULT_ANCHOR_POSITION_AMOUNTS: AnchorPositionAmounts = {
  wallet: "",
  collateralPool: "",
  sailPool: "",
};

/** Anchor deposit-tab options. */
export interface AnchorDepositOptions {
  mintOnly: boolean;
  depositInStabilityPool: boolean;
  stabilityPoolType: "collateral" | "sail";
}

export const DEFAULT_ANCHOR_DEPOSIT_OPTIONS: AnchorDepositOptions = {
  mintOnly: false,
  depositInStabilityPool: true,
  stabilityPoolType: "collateral",
};

/** Anchor withdraw-tab options. */
export interface AnchorWithdrawOptions {
  withdrawOnly: boolean;
  withdrawFromCollateralPool: boolean;
  withdrawFromSailPool: boolean;
}

export const DEFAULT_ANCHOR_WITHDRAW_OPTIONS: AnchorWithdrawOptions = {
  withdrawOnly: false,
  withdrawFromCollateralPool: false,
  withdrawFromSailPool: false,
};

/** Withdraw tab: filter pool list by collateral/reward type. Anchor-specific. */
export type WithdrawCollateralFilter = "all" | "fxSAVE" | "wstETH";

export const DEFAULT_WITHDRAW_COLLATERAL_FILTER: WithdrawCollateralFilter =
  "all";

/** Simple mode: stability pool selection (includes marketId and pool type). */
export interface SelectedStabilityPool {
  marketId: string;
  poolType: "none" | "collateral" | "sail";
}

/** Row shape for grouped pool positions (withdraw tab). */
export interface GroupedPoolPosition {
  key: string;
  marketId: string;
  market: unknown;
  poolType: "collateral" | "sail";
  poolAddress: string;
  balance: bigint;
}

/** Kind of pool for group-balance index map. */
export type GroupBalanceKind = "collateralPool" | "sailPool";

/** Stability pool entry (allStabilityPools). */
export interface StabilityPoolEntry {
  marketId: string;
  market: unknown;
  poolType: "collateral" | "sail";
  address: `0x${string}`;
  marketName: string;
}

/** Simple mode step (1: deposit token/amount, 2: reward token, 3: stability pool). */
export type SimpleModeStep = 1 | 2 | 3;

/** Early withdrawal fee entry (collateral/sail pool). */
export interface EarlyWithdrawalFeeEntry {
  poolType: "collateral" | "sail";
  amount: bigint;
  feePercent: number;
  withdrawalAmount: bigint;
}
