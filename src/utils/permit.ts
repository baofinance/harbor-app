/**
 * EIP-2612 Permit Utility Functions
 * 
 * Provides utilities for checking token permit support and generating permit signatures
 * for gasless approvals using EIP-2612 standard.
 */

import { type Address, type PublicClient, type WalletClient } from "viem";
import { ERC20_PERMIT_READS_ABI } from "@/abis/permit";

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
        abi: ERC20_PERMIT_READS_ABI,
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
      abi: ERC20_PERMIT_READS_ABI,
      functionName: "nonces",
      args: [nonceOwner],
    });
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get permit nonce for a token owner
 */
export async function getPermitNonce(
  publicClient: PublicClient,
  tokenAddress: Address,
  owner: Address
): Promise<bigint> {
  try {
    const nonce = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_PERMIT_READS_ABI,
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
      abi: ERC20_PERMIT_READS_ABI,
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
      abi: ERC20_PERMIT_READS_ABI,
      functionName: "name",
    });

    // Get chain ID
    const chainId = await publicClient.getChainId();

    // For most tokens, version is "1", but we can try to read it if available
    let version = "1";
    try {
      const versionResult = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_PERMIT_READS_ABI,
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

/** Re-export zap permit ABIs from consolidated abis folder */
export {
  STETH_ZAP_PERMIT_ABI,
  USDC_ZAP_PERMIT_ABI,
  STABILITY_POOL_ZAP_ABI,
  STABILITY_POOL_ZAP_PERMIT_ABI,
} from "@/abis/permitZaps";
