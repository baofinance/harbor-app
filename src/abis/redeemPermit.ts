/**
 * Optional permit-enabled redeem function ABIs.
 * These are used with graceful fallback to approve+redeem when unavailable.
 */

export const REDEEM_PEGGED_WITH_PERMIT_ABI = [
  {
    inputs: [
      { name: "peggedIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minWrappedCollateralOut", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    name: "redeemPeggedTokenWithPermit",
    outputs: [{ name: "wrappedCollateralOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const REDEEM_LEVERAGED_WITH_PERMIT_ABI = [
  {
    inputs: [
      { name: "leveragedIn", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "minWrappedCollateralOut", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    name: "redeemLeveragedTokenWithPermit",
    outputs: [{ name: "wrappedCollateralOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

