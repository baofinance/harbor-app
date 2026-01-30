/**
 * Zap permit & stability-pool zap ABI extensions.
 * Append to base zap ABIs for permit-based zaps and stability pool zaps.
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

/**
 * Stability Pool Zap ABI Extensions
 * Functions for zapping directly to stability pools (mint + deposit in one transaction)
 */
export const STABILITY_POOL_ZAP_ABI = [
  // ETH zap to stability pool
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
  // stETH zap to stability pool
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
  // wstETH zap to stability pool
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
  // USDC zap to stability pool
  // Flow: USDC → fxSAVE → pegged → stability pool
  // Note: minFxSaveOut is the minimum fxSAVE output from USDC conversion
  // Calculation: Scale USDC from 6 to 18 decimals, then divide by wrappedRate
  // Formula: expectedFxSaveOut = (usdcAmount * 10^12 * 1e18) / wrappedRate
  // Apply 1% slippage: minFxSaveOut = (expectedFxSaveOut * 99) / 100
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
  // fxUSD zap to stability pool
  // Flow: fxUSD → fxSAVE → pegged → stability pool
  // Note: minFxSaveOut is the minimum fxSAVE output from fxUSD conversion
  // Calculation: Both fxUSD and wrappedRate are in 18 decimals
  // Formula: expectedFxSaveOut = (fxUsdAmount * 1e18) / wrappedRate
  // Apply 1% slippage: minFxSaveOut = (expectedFxSaveOut * 99) / 100
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
  // fxSAVE zap to stability pool
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

/**
 * Stability Pool Zap Permit ABI Extensions
 * Permit versions of stability pool zap functions
 */
export const STABILITY_POOL_ZAP_PERMIT_ABI = [
  // stETH zap to stability pool with permit
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
  // wstETH zap to stability pool with permit
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
  // USDC zap to stability pool with permit
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
  // fxUSD zap to stability pool with permit
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
  // fxSAVE zap to stability pool with permit
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