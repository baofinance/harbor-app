/**
 * Central export for all hooks
 * Import from '@/hooks' instead of individual files
 */

// Core contract read hooks (simplified for mainnet)
export * from "./useContractRead";
export * from "./useContractReads";

// ERC20 hooks
export * from "./useErc20";

// Price hooks
export * from "./useOraclePriceHistory";
export * from "./useSailPriceHistory";

// Pool hooks
export * from "./usePoolData";
export * from "./usePools";
export * from "./usePoolRewardTokens";
export * from "./useProjectedAPR";

// Stability pool hooks
export * from "./useStabilityPoolRewards";
export * from "./useAllStabilityPoolRewards";

// Marks hooks
export * from "./useHarborMarks";
export * from "./useAnchorMarks";
export * from "./useAnchorLedgerMarks";

// Genesis hooks
export * from "./useGenesisClaim";
export * from "./useMultiMarketGenesisAdmin";

// Admin hooks
export * from "./useAdminAccess";

// Permit / approval hooks
export * from "./usePermitOrApproval";
export * from "./usePermitCapability";

// Other hooks
export * from "./useWithdrawalRequests";
