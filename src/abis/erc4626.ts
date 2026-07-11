/** Minimal IERC-4626 reads used for admin reward pricing. */
export const ERC4626_ABI = [
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "convertToAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
