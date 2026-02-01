/**
 * Zap permit ABIs - Anchor/Sail permit-based zap functions
 * Consolidated from utils/permit.ts
 */

export const STETH_ZAP_PERMIT_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "stEthAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapStEthToPeggedWithPermit",
    outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "stEthAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minLeveragedOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapStEthToLeveragedWithPermit",
    outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const USDC_ZAP_PERMIT_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "usdcAmount", type: "uint256" },
      { internalType: "uint256", name: "minFxSaveOut", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapUsdcToPeggedWithPermit",
    outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "usdcAmount", type: "uint256" },
      { internalType: "uint256", name: "minFxSaveOut", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minLeveragedOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapUsdcToLeveragedWithPermit",
    outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "fxUsdAmount", type: "uint256" },
      { internalType: "uint256", name: "minFxSaveOut", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapFxUsdToPeggedWithPermit",
    outputs: [{ internalType: "uint256", name: "peggedOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "fxUsdAmount", type: "uint256" },
      { internalType: "uint256", name: "minFxSaveOut", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minLeveragedOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapFxUsdToLeveragedWithPermit",
    outputs: [{ internalType: "uint256", name: "leveragedOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const STABILITY_POOL_ZAP_ABI = [
  {
    inputs: [
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
    ],
    name: "zapEthToStabilityPool",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "stEthAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
    ],
    name: "zapStEthToStabilityPool",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "wstEthAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
    ],
    name: "zapWstEthToStabilityPool",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "usdcAmount", type: "uint256" },
      { internalType: "uint256", name: "minFxSaveOut", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
    ],
    name: "zapUsdcToStabilityPool",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "fxUsdAmount", type: "uint256" },
      { internalType: "uint256", name: "minFxSaveOut", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
    ],
    name: "zapFxUsdToStabilityPool",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "fxSaveAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
    ],
    name: "zapFxSaveToStabilityPool",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const STABILITY_POOL_ZAP_PERMIT_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "stEthAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapStEthToStabilityPoolWithPermit",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "wstEthAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapWstEthToStabilityPoolWithPermit",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "usdcAmount", type: "uint256" },
      { internalType: "uint256", name: "minFxSaveOut", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapUsdcToStabilityPoolWithPermit",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "fxUsdAmount", type: "uint256" },
      { internalType: "uint256", name: "minFxSaveOut", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapFxUsdToStabilityPoolWithPermit",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "fxSaveAmount", type: "uint256" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "minPeggedOut", type: "uint256" },
      { internalType: "address", name: "stabilityPool", type: "address" },
      { internalType: "uint256", name: "minStabilityPoolOut", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "zapFxSaveToStabilityPoolWithPermit",
    outputs: [
      { internalType: "uint256", name: "peggedOut", type: "uint256" },
      { internalType: "uint256", name: "deposited", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
