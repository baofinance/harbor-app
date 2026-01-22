export const GENESIS_STETH_ZAP_PERMIT_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "stEthAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minWstEthOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapStEthWithPermit",
    outputs: [{ internalType: "uint256", name: "sharesOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const GENESIS_USDC_ZAP_PERMIT_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "fxUsdAmount", type: "uint256" },
      { internalType: "uint256", name: "minFxSaveOut", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapFxUsdToGenesisWithPermit",
    outputs: [{ internalType: "uint256", name: "collateralAmount", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "usdcAmount", type: "uint256" },
      { internalType: "uint256", name: "minFxSaveOut", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapUsdcToGenesisWithPermit",
    outputs: [{ internalType: "uint256", name: "collateralAmount", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
