/**
 * Shared ABIs used across multiple components
 * Consolidating here to reduce bundle size and improve maintainability
 */

/**
 * Minimal ERC20 ABI for common operations
 */
export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Standard Chainlink price feed ABI
 */
export const CHAINLINK_ORACLE_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ type: "int256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { type: "uint80", name: "roundId" },
      { type: "int256", name: "answer" },
      { type: "uint256", name: "startedAt" },
      { type: "uint256", name: "updatedAt" },
      { type: "uint80", name: "answeredInRound" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Genesis contract ABI - core functions
 */
export const GENESIS_ABI = [
  {
    inputs: [],
    name: "genesisIsEnded",
    outputs: [{ type: "bool", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "depositor", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "depositor", type: "address" }],
    name: "claimable",
    outputs: [
      { type: "uint256", name: "peggedAmount" },
      { type: "uint256", name: "leveragedAmount" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "WRAPPED_COLLATERAL_TOKEN",
    outputs: [{ type: "address", name: "token" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "PEGGED_TOKEN",
    outputs: [{ type: "address", name: "token" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LEVERAGED_TOKEN",
    outputs: [{ type: "address", name: "token" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "collateralIn", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "withdraw",
    outputs: [{ type: "uint256", name: "collateralOut" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "receiver", type: "address" }],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ type: "address", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "endGenesis",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * Stability Pool ABI - core functions
 */
export const STABILITY_POOL_ABI = [
  // Custom errors (add as we encounter them so viem can decode revert reasons)
  {
    type: "error",
    name: "DepositAmountLessThanMinimum",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "minimum", type: "uint256" },
    ],
  },
  {
    inputs: [],
    name: "ASSET_TOKEN",
    outputs: [{ name: "token", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssetSupply",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Minimum total supply floor (public immutable in StabilityPool implementation).
  // When totalAssetSupply is at this floor, withdraw() will clamp withdrawals to 0.
  {
    inputs: [],
    name: "MIN_TOTAL_ASSET_SUPPLY",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ name: "assets", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "assetBalanceOf",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "rewardToken", type: "address" }],
    name: "rewardData",
    outputs: [
      { name: "lastUpdate", type: "uint256" },
      { name: "finishAt", type: "uint256" },
      { name: "rate", type: "uint256" },
      { name: "queued", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_PERIOD_LENGTH",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "assetIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minAmount", type: "uint256" },
    ],
    name: "deposit",
    outputs: [{ name: "sharesOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "sharesIn", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "redeem",
    outputs: [{ name: "assetsOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "receiver", type: "address" }],
    name: "claim",
    outputs: [
      { name: "rewardTokens", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "rewardToken", type: "address" },
    ],
    name: "claimable",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getEarlyWithdrawalFee",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getWithdrawalWindow",
    outputs: [
      { name: "startDelay", type: "uint64" },
      { name: "endWindow", type: "uint64" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "requestWithdrawal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getWithdrawalRequest",
    outputs: [
      { name: "start", type: "uint64" },
      { name: "end", type: "uint64" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "receiver", type: "address" },
      { name: "minAmount", type: "uint256" },
    ],
    name: "withdrawEarly",
    outputs: [{ name: "sharesBurned", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "receiver", type: "address" },
      { name: "minAmount", type: "uint256" },
    ],
    name: "executeWithdraw",
    outputs: [{ name: "sharesBurned", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "assetAmount", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minAmount", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [{ name: "sharesBurned", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "withdrawRequest",
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "requestedAt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Stability Pool Manager ABI
 */
export const STABILITY_POOL_MANAGER_ABI = [
  {
    inputs: [],
    name: "harvestBountyRatio",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "harvestCutRatio",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rebalanceThreshold",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * wstETH specific ABI
 */
export const WSTETH_ABI = [
  {
    inputs: [],
    name: "stEthPerToken",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "stETHAmount", type: "uint256" }],
    name: "getWstETHByStETH",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * stETH specific ABI
 */
export const STETH_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "ethAmount", type: "uint256" }],
    name: "getSharesByPooledEth",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Minter ABI - core functions
 */
export const MINTER_ABI = [
  // Token address getters (ensure present for viem reads)
  {
    inputs: [],
    name: "PEGGED_TOKEN",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LEVERAGED_TOKEN",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "harvestable",
    outputs: [{ name: "wrappedAmount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "WRAPPED_COLLATERAL_TOKEN",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "collateralTokenBalance",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalCollateralValue",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalPeggedValue",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalLeveragedValue",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "collateralRatio",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "peggedTokenBalance",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "peggedTokenPrice",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  // Leveraged token dry run functions for fee prediction
  {
    inputs: [{ name: "wrappedCollateralIn", type: "uint256" }],
    name: "mintLeveragedTokenDryRun",
    outputs: [
      { name: "incentiveRatio", type: "int256" },
      { name: "wrappedFee", type: "uint256" },
      { name: "wrappedDiscount", type: "uint256" },
      { name: "wrappedCollateralUsed", type: "uint256" },
      { name: "leveragedMinted", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "rate", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "leveragedIn", type: "uint256" }],
    name: "redeemLeveragedTokenDryRun",
    outputs: [
      { name: "incentiveRatio", type: "int256" },
      { name: "wrappedFee", type: "uint256" },
      { name: "leveragedRedeemed", type: "uint256" },
      { name: "wrappedCollateralReturned", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "rate", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // Leveraged token mint/redeem functions
  {
    inputs: [
      { name: "wrappedCollateralIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minLeveragedOut", type: "uint256" },
    ],
    name: "mintLeveragedToken",
    outputs: [{ name: "leveragedOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "leveragedIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minWrappedCollateralOut", type: "uint256" },
    ],
    name: "redeemLeveragedToken",
    outputs: [{ name: "wrappedCollateralOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * Extended Minter ABI for anchor page operations (mint/redeem functions)
 * This extends the base MINTER_ABI with additional functions needed for transactions
 */
export const MINTER_ABI_EXTENDED = [
  ...MINTER_ABI,
  {
    inputs: [],
    name: "leveragedTokenBalance",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "leveragedTokenPrice",
    outputs: [{ type: "uint256", name: "nav", internalType: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "config",
    outputs: [
      {
        components: [
          {
            components: [
              { name: "collateralRatioBandUpperBounds", type: "uint256[]" },
              { name: "incentiveRates", type: "uint256[]" },
            ],
            name: "mintPeggedIncentiveConfig",
            type: "tuple",
          },
          {
            components: [
              { name: "collateralRatioBandUpperBounds", type: "uint256[]" },
              { name: "incentiveRates", type: "uint256[]" },
            ],
            name: "redeemPeggedIncentiveConfig",
            type: "tuple",
          },
          {
            components: [
              { name: "collateralRatioBandUpperBounds", type: "uint256[]" },
              { name: "incentiveRates", type: "uint256[]" },
            ],
            name: "mintLeveragedIncentiveConfig",
            type: "tuple",
          },
          {
            components: [
              { name: "collateralRatioBandUpperBounds", type: "uint256[]" },
              { name: "incentiveRates", type: "uint256[]" },
            ],
            name: "redeemLeveragedIncentiveConfig",
            type: "tuple",
          },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "collateralIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minPeggedOut", type: "uint256" },
    ],
    name: "mintPeggedToken",
    outputs: [{ type: "uint256", name: "peggedAmount" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "collateralAmount", type: "uint256" }],
    name: "calculateMintPeggedTokenOutput",
    outputs: [{ type: "uint256", name: "peggedAmount" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "wrappedCollateralIn", type: "uint256" }],
    name: "mintPeggedTokenDryRun",
    outputs: [
      { name: "incentiveRatio", type: "int256" },
      { name: "wrappedFee", type: "uint256" },
      { name: "wrappedCollateralTaken", type: "uint256" },
      { name: "peggedMinted", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "rate", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "leveragedIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minCollateralOut", type: "uint256" },
    ],
    name: "redeemLeveragedToken",
    outputs: [{ type: "uint256", name: "collateralAmount" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "leveragedAmount", type: "uint256" }],
    name: "calculateRedeemLeveragedTokenOutput",
    outputs: [{ type: "uint256", name: "collateralAmount" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Wrapped Price Oracle ABI (IWrappedPriceOracle)
 * Used for fxUSD and other wrapped collateral price feeds
 */
export const WRAPPED_PRICE_ORACLE_ABI = [
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [
      { type: "uint256", name: "minUnderlyingPrice" },
      { type: "uint256", name: "maxUnderlyingPrice" },
      { type: "uint256", name: "minWrappedRate" },
      { type: "uint256", name: "maxWrappedRate" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPrice",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Alias for backwards compatibility
 */
export const CHAINLINK_ORACLE_ABI_EXTENDED = WRAPPED_PRICE_ORACLE_ABI;
