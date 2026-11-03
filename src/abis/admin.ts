/**
 * Admin-specific ABIs for protocol management
 */
export const MINTER_FEES_READS_ABI = [
  {
    inputs: [],
    name: "harvestable",
    outputs: [{ name: "wrappedAmount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeReceiver",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "WRAPPED_COLLATERAL_TOKEN",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ADMIN_MINTER_ABI = [
  {
    inputs: [{ name: "config_", type: "tuple" }],
    name: "updateConfig",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "feeReceiver_", type: "address" }],
    name: "updateFeeReceiver",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "reservePool_", type: "address" }],
    name: "updateReservePool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "priceOracle_", type: "address" }],
    name: "updatePriceOracle",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "ZERO_FEE_ROLE",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "collateralIn", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "freeMintPeggedToken",
    outputs: [{ type: "uint256", name: "peggedOut" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "peggedIn", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "freeRedeemPeggedToken",
    outputs: [{ type: "uint256", name: "collateralOut" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "peggedIn", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "freeSwapPeggedForLeveraged",
    outputs: [{ type: "uint256", name: "leveragedOut" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "collateralIn", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "freeMintLeveragedToken",
    outputs: [{ type: "uint256", name: "leveragedOut" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "leveragedIn", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "freeRedeemLeveragedToken",
    outputs: [{ type: "uint256", name: "collateralOut" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const MOCK_PRICE_FEED_ABI = [
  {
    inputs: [],
    name: "updatePrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const STABILITY_POOL_REWARDS_ABI = [
  {
    type: "function",
    name: "activeRewardTokens",
    inputs: [],
    outputs: [{ name: "", type: "address[]", internalType: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "rewardData",
    inputs: [{ name: "rewardToken", type: "address", internalType: "address" }],
    outputs: [
      { name: "lastUpdate", type: "uint256", internalType: "uint256" },
      { name: "finishAt", type: "uint256", internalType: "uint256" },
      { name: "rate", type: "uint256", internalType: "uint256" },
      { name: "queued", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;
