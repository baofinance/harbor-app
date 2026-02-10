/**
 * Minter ABI for pegged token operations (Anchor ha token mint/redeem)
 * Dry run functions with fee/discount output structure
 */
export const MINTER_PEGGED_ABI = [
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
    inputs: [
      { name: "peggedIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minCollateralOut", type: "uint256" },
    ],
    name: "redeemPeggedToken",
    outputs: [{ type: "uint256", name: "collateralAmount" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "peggedAmount", type: "uint256" }],
    name: "calculateRedeemPeggedTokenOutput",
    outputs: [{ type: "uint256", name: "collateralAmount" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "peggedTokenPrice",
    outputs: [{ type: "uint256", name: "nav", internalType: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "wrappedCollateralIn", type: "uint256" }],
    name: "mintPeggedTokenDryRun",
    outputs: [
      { name: "incentiveRatio", type: "int256" },
      { name: "fee", type: "uint256" },
      { name: "discount", type: "uint256" },
      { name: "peggedMinted", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "rate", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "peggedIn", type: "uint256" }],
    name: "redeemPeggedTokenDryRun",
    outputs: [
      { name: "incentiveRatio", type: "int256" },
      { name: "fee", type: "uint256" },
      { name: "discount", type: "uint256" },
      { name: "peggedRedeemed", type: "uint256" },
      { name: "wrappedCollateralReturned", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "rate", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
