/**
 * EIP-2612 Permit Utility Functions
 * 
 * Provides utilities for checking token permit support and generating permit signatures
 * for gasless approvals using EIP-2612 standard.
 */

import { type Address, type PublicClient, type WalletClient } from "viem";

/**
 * EIP-2612 Permit Type Definition
 * Standard structure for permit signatures
 */
export interface PermitData {
  owner: Address;
  spender: Address;
  value: bigint;
  nonce: bigint;
  deadline: bigint;
}

/**
 * Check if a token contract supports EIP-2612 permit
 * By checking if DOMAIN_SEPARATOR and nonces functions exist
 */
export async function checkPermitSupport(
  publicClient: PublicClient,
  tokenAddress: Address,
  owner?: Address
): Promise<boolean> {
  try {
    // Best-effort check for DOMAIN_SEPARATOR (some tokens may behave differently)
    try {
      await publicClient.readContract({
        address: tokenAddress,
        abi: [
          {
            inputs: [],
            name: "DOMAIN_SEPARATOR",
            outputs: [{ type: "bytes32", name: "" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "DOMAIN_SEPARATOR",
      });
    } catch {
      // We still allow permit if nonces are present.
    }

    // Check for nonces function (required for EIP-2612)
    const nonceOwner =
      owner || ("0x0000000000000000000000000000000000000000" as Address);
    await publicClient.readContract({
      address: tokenAddress,
      abi: [
        {
          inputs: [{ type: "address", name: "owner" }],
          name: "nonces",
          outputs: [{ type: "uint256", name: "" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "nonces",
      args: [nonceOwner],
    });
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current EIP-2612 permit nonce for a token owner from the chain.
 * Always call this when building a permit—never hardcode 0.
 * - First permit: contract returns 0.
 * - After each use the token increments it; next permit must use the new value (1, 2, …).
 * So the second permit uses nonce 1, third uses 2, etc.
 */
export async function getPermitNonce(
  publicClient: PublicClient,
  tokenAddress: Address,
  owner: Address
): Promise<bigint> {
  try {
    const nonce = await publicClient.readContract({
      address: tokenAddress,
      abi: [
        {
          inputs: [{ type: "address", name: "owner" }],
          name: "nonces",
          outputs: [{ type: "uint256", name: "" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "nonces",
      args: [owner],
    });
    return nonce as bigint;
  } catch {
    return 0n;
  }
}

/**
 * Get token domain separator for EIP-712 signing
 */
export async function getDomainSeparator(
  publicClient: PublicClient,
  tokenAddress: Address
): Promise<string | null> {
  try {
    const domainSeparator = await publicClient.readContract({
      address: tokenAddress,
      abi: [
        {
          inputs: [],
          name: "DOMAIN_SEPARATOR",
          outputs: [{ type: "bytes32", name: "" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "DOMAIN_SEPARATOR",
    });
    return domainSeparator as string;
  } catch {
    return null;
  }
}

/**
 * Build EIP-712 domain for permit signature
 * This is typically derived from DOMAIN_SEPARATOR, but we construct it manually
 * for compatibility with viem's signTypedData
 */
export async function buildPermitDomain(
  publicClient: PublicClient,
  tokenAddress: Address
): Promise<{
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
} | null> {
  try {
    // Read token name
    const name = await publicClient.readContract({
      address: tokenAddress,
      abi: [
        {
          inputs: [],
          name: "name",
          outputs: [{ type: "string", name: "" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "name",
    });

    // Get chain ID
    const chainId = await publicClient.getChainId();

    // For most tokens, version is "1", but we can try to read it if available
    let version = "1";
    try {
      const versionResult = await publicClient.readContract({
        address: tokenAddress,
        abi: [
          {
            inputs: [],
            name: "version",
            outputs: [{ type: "string", name: "" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "version",
      });
      version = versionResult as string;
    } catch {
      // Version defaults to "1" if not available
    }

    return {
      name: name as string,
      version,
      chainId,
      verifyingContract: tokenAddress,
    };
  } catch {
    return null;
  }
}

/**
 * Generate permit signature using wallet client
 */
export async function signPermit(
  walletClient: WalletClient,
  tokenAddress: Address,
  permitData: PermitData,
  domain?: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: Address;
  }
): Promise<{ v: number; r: `0x${string}`; s: `0x${string}` } | null> {
  try {
    if (!walletClient) return null;

    // Build domain if not provided
    let permitDomain = domain;
    if (!permitDomain) {
      const chainId = await walletClient.getChainId();
      // Default domain structure - this should be improved by reading actual domain from token
      permitDomain = {
        name: "Token", // Will be overridden if we can read it
        version: "1",
        chainId,
        verifyingContract: tokenAddress,
      };
    }

    // EIP-712 types for permit
    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const message = {
      owner: permitData.owner,
      spender: permitData.spender,
      value: permitData.value,
      nonce: permitData.nonce,
      deadline: permitData.deadline,
    };

    // Request signature from wallet
    const signature = await walletClient.signTypedData({
      account: walletClient.account ?? permitData.owner,
      domain: permitDomain,
      types,
      primaryType: "Permit",
      message,
    });

    // Parse signature into r, s, v components using helper function
    const parsed = parseSignature(signature);
    if (!parsed) {
      console.error("Failed to parse signature");
      return null;
    }

    return parsed;
  } catch (error: any) {
    // Check for EIP-7702 related errors
    const errorMessage = error?.message?.toLowerCase() || "";
    const isEIP7702Error = 
      errorMessage.includes("7702") ||
      errorMessage.includes("delegation") ||
      errorMessage.includes("eip-7702") ||
      error?.code === -32603; // RPC errors
    
    if (isEIP7702Error) {
      console.warn("Permit signing failed due to EIP-7702 delegation or similar issue, falling back to approval:", error);
    } else {
      console.error("Error signing permit:", error);
    }
    return null;
  }
}

/**
 * Parse signature string into r, s, v components
 * Helper function for parsing signatures from signTypedData or other sources
 */
export function parseSignature(signature: string): { v: number; r: `0x${string}`; s: `0x${string}` } | null {
  if (!signature) {
    return null;
  }

  // Remove 0x prefix if present
  const hexSignature = signature.startsWith("0x") ? signature.slice(2) : signature;
  
  // Signature should be 130 hex characters (65 bytes: 32 + 32 + 1)
  if (hexSignature.length !== 130) {
    console.error(`Invalid signature length: ${hexSignature.length} (expected 130 hex chars)`);
    return null;
  }

  // Validate hex characters
  if (!/^[0-9a-fA-F]+$/.test(hexSignature)) {
    console.error("Signature contains invalid hex characters");
    return null;
  }

  // Extract r, s, v components
  const rHex = hexSignature.slice(0, 64);
  const sHex = hexSignature.slice(64, 128);
  const vHex = hexSignature.slice(128, 130);
  
  const r = `0x${rHex}` as `0x${string}`;
  const s = `0x${sHex}` as `0x${string}`;
  const v = parseInt(vHex, 16);
  
  // Validate v is in expected range
  // Standard ECDSA recovery uses 27 or 28, but some contracts normalize to 0/1
  if (v !== 27 && v !== 28 && v !== 0 && v !== 1) {
    console.warn(`Unexpected v value: ${v} (typical values are 27, 28, 0, or 1)`);
  }

  return { v, r, s };
}

/**
 * Calculate permit deadline (current time + buffer)
 */
export function calculateDeadline(bufferSeconds: number = 3600): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + bufferSeconds);
}

/**
 * Zap ABI Extensions for Permit Functions
 * These are appended to existing zap ABIs to support permit-based zaps
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
