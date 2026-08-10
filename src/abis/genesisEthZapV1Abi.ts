/**
 * GenesisETHZap_v1 write + preview ABI (haUSD / stETH and future ETH-rail genesis zaps).
 * @see harbor-zap-contracts/docs/zap-v3-v4-migration.md
 */
export const GENESIS_ETH_ZAP_V1_ABI = [
  {
    inputs: [
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minWrappedCollateralOut", type: "uint256" },
      { internalType: "uint256", name: "minBaseAssetEquivalentOut", type: "uint256" },
    ],
    name: "zapNativeAsset",
    outputs: [{ internalType: "uint256", name: "sharesOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "collateralAmount", type: "uint256" },
      { internalType: "uint256", name: "minWrappedCollateralOut", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
    ],
    name: "zapCollateral",
    outputs: [{ internalType: "uint256", name: "sharesOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "collateralAmount", type: "uint256" },
      { internalType: "uint256", name: "minWrappedCollateralOut", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapCollateralWithPermit",
    outputs: [{ internalType: "uint256", name: "sharesOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "baseAssetAmount", type: "uint256" }],
    name: "previewWrappedCollateralFromBase",
    outputs: [
      { internalType: "uint256", name: "wrappedCollateralAmount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "collateralAmount", type: "uint256" }],
    name: "previewWrappedCollateralFromCollateral",
    outputs: [
      { internalType: "uint256", name: "wrappedCollateralAmount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "baseAssetAmount", type: "uint256" }],
    name: "previewSharesFromBase",
    outputs: [
      { internalType: "uint256", name: "sharesOut", type: "uint256" },
      { internalType: "uint256", name: "wrappedCollateralAmount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "collateralAmount", type: "uint256" }],
    name: "previewSharesFromCollateral",
    outputs: [
      { internalType: "uint256", name: "sharesOut", type: "uint256" },
      { internalType: "uint256", name: "wrappedCollateralAmount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
