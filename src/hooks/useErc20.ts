import { useAnvilContractRead } from "./useContractRead";
import { useAnvilContractReads } from "./useContractReads";

/**
 * Shared ERC20 ABI - minimal set for common operations
 */
export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface UseErc20BalanceOptions {
  tokenAddress: `0x${string}` | undefined;
  account: `0x${string}` | undefined;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook to get ERC20 token balance
 */
export function useErc20Balance({
  tokenAddress,
  account,
  enabled = true,
  refetchInterval = 30000,
}: UseErc20BalanceOptions) {
  const { data, isLoading, error, refetch } = useAnvilContractRead({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    enabled: enabled && !!tokenAddress && !!account,
    refetchInterval,
  });

  return {
    balance: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}

interface UseErc20AllowanceOptions {
  tokenAddress: `0x${string}` | undefined;
  owner: `0x${string}` | undefined;
  spender: `0x${string}` | undefined;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook to get ERC20 token allowance
 */
export function useErc20Allowance({
  tokenAddress,
  owner,
  spender,
  enabled = true,
  refetchInterval = 30000,
}: UseErc20AllowanceOptions) {
  const { data, isLoading, error, refetch } = useAnvilContractRead({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    enabled: enabled && !!tokenAddress && !!owner && !!spender,
    refetchInterval,
  });

  return {
    allowance: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}

interface UseErc20BalanceAndAllowanceOptions {
  tokenAddress: `0x${string}` | undefined;
  account: `0x${string}` | undefined;
  spender: `0x${string}` | undefined;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook to get both balance and allowance in a single batch
 */
export function useErc20BalanceAndAllowance({
  tokenAddress,
  account,
  spender,
  enabled = true,
  refetchInterval = 30000,
}: UseErc20BalanceAndAllowanceOptions) {
  const { data, isLoading, error, refetch } = useAnvilContractReads({
    contracts: [
      {
        address: tokenAddress!,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: account ? [account] : undefined,
      },
      {
        address: tokenAddress!,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: account && spender ? [account, spender] : undefined,
      },
    ],
    enabled: enabled && !!tokenAddress && !!account && !!spender,
    refetchInterval,
  });

  return {
    balance: data?.[0]?.result as bigint | undefined,
    allowance: data?.[1]?.result as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}

interface UseTokenInfoOptions {
  tokenAddress: `0x${string}` | undefined;
  enabled?: boolean;
}

/**
 * Hook to get token metadata (symbol, decimals)
 * Uses a longer cache since this data rarely changes
 */
export function useTokenInfo({
  tokenAddress,
  enabled = true,
}: UseTokenInfoOptions) {
  const { data, isLoading, error } = useAnvilContractReads({
    contracts: [
      {
        address: tokenAddress!,
        abi: ERC20_ABI,
        functionName: "symbol",
      },
      {
        address: tokenAddress!,
        abi: ERC20_ABI,
        functionName: "decimals",
      },
    ],
    enabled: enabled && !!tokenAddress,
    // Token info doesn't change, so we can use a very long interval
    refetchInterval: 300000, // 5 minutes
  });

  return {
    symbol: data?.[0]?.result as string | undefined,
    decimals: data?.[1]?.result as number | undefined,
    isLoading,
    error,
  };
}





