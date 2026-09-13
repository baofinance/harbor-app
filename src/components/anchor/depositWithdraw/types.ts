import type { DefinedMarket } from "@/config/markets";

export type AnchorDepositWithdrawTab = "deposit" | "withdraw" | "sell";

export type AnchorTopTab = "mint" | "redeem";

export type AnchorRedeemFlowMode =
  | "withdrawAndRedeem"
  | "withdrawOnly"
  | "redeemOnly";

export type AnchorDepositWithdrawInitialTab =
  | AnchorDepositWithdrawTab
  | "mint"
  | "redeem"
  | "deposit-mint"
  | "withdraw-redeem";

export type AnchorDepositWithdrawStep =
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

export type AnchorDepositWithdrawTransactionStatus = {
  id: string;
  label: string;
  status: "pending" | "processing" | "success" | "error";
  hash?: string;
  error?: string;
};

export type AnchorDepositWithdrawModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Inline panel on Earn advanced layout (no modal overlay). */
  embedded?: boolean;
  marketId: string;
  market: DefinedMarket;
  /** Parent may pass legacy Sail-style tab names; mapped to deposit/withdraw internally. */
  initialTab?: AnchorDepositWithdrawInitialTab;
  onSuccess?: () => void;
  simpleMode?: boolean;
  bestPoolType?: "collateral" | "sail";
  /** For simple mode: all markets for the same ha token */
  allMarkets?: Array<{ marketId: string; market: DefinedMarket }>;
  initialDepositAsset?: string;
  /** Contract-based pool balances (marketId -> collateral/sail). Used for "Your position" in withdraw list when subgraph is empty. */
  positionsMap?: Record<
    string,
    { collateralPool: bigint; sailPool: bigint } | undefined
  >;
};
