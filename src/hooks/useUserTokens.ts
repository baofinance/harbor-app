import { useAccount, useBalance } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Address, formatUnits, parseUnits } from "viem";
import { useContractReads, useContractRead } from "wagmi";
import { ERC20_ABI } from "@/abis";

export interface TokenInfo {
  address: Address | "ETH";
  symbol: string;
  name: string;
  balance: bigint;
  balanceFormatted: string;
  decimals: number;
  logoURI?: string;
}

// Common tokens that users might have
// This list can be expanded or fetched from a token list API
const COMMON_TOKENS: Array<{
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
}> = [
  { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address, symbol: "USDC", name: "USD Coin", decimals: 6 },
  { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" as Address, symbol: "USDT", name: "Tether USD", decimals: 6 },
  { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F" as Address, symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address, symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" as Address, symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
  { address: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0" as Address, symbol: "wstETH", name: "Wrapped Staked ETH", decimals: 18 },
  { address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84" as Address, symbol: "stETH", name: "Lido Staked Ether", decimals: 18 },
  // Add more common tokens as needed
];

export function useUserTokens() {
  const { address, isConnected } = useAccount();
  
  // Fetch ETH balance
  const { data: ethBalance, isLoading: isLoadingEth } = useBalance({ 
    address,
    enabled: isConnected,
  });
  
  // Fetch balances for common ERC20 tokens
  const tokenContracts = COMMON_TOKENS.map(token => ({
    address: token.address,
    abi: ERC20_ABI,
    functionName: "balanceOf" as const,
    args: [address as Address],
  }));

  const { data: tokenBalances, isLoading: isLoadingTokens } = useContractReads({
    contracts: tokenContracts,
    enabled: isConnected && !!address,
    allowFailure: true,
  });

  const tokens = useQuery({
    queryKey: [
      "userTokens", 
      address,
      // Convert BigInt values to strings for query key serialization
      tokenBalances?.map(b => b.status === "success" && b.result ? b.result.toString() : null),
      ethBalance?.value ? ethBalance.value.toString() : null,
    ],
    queryFn: (): TokenInfo[] => {
      const result: TokenInfo[] = [];

      // Add ETH if balance > 0
      if (ethBalance && ethBalance.value > 0n) {
        result.push({
          address: "ETH",
          symbol: "ETH",
          name: "Ethereum",
          balance: ethBalance.value,
          balanceFormatted: formatUnits(ethBalance.value, 18),
          decimals: 18,
        });
      }

      // Add ERC20 tokens with balance > 0
      tokenBalances?.forEach((balanceResult, index) => {
        if (balanceResult.status === "success" && balanceResult.result) {
          const balance = balanceResult.result as bigint;
          if (balance > 0n) {
            const token = COMMON_TOKENS[index];
            result.push({
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              balance,
              balanceFormatted: formatUnits(balance, token.decimals),
              decimals: token.decimals,
            });
          }
        }
      });

      // Sort by balance (USD value would be better, but we'll keep it simple)
      return result.sort((a, b) => {
        // Normalize to 18 decimals for comparison
        const aNormalized = a.balance * (10n ** BigInt(18 - a.decimals));
        const bNormalized = b.balance * (10n ** BigInt(18 - b.decimals));
        return aNormalized > bNormalized ? -1 : 1;
      });
    },
    enabled: isConnected && !!address && (tokenBalances !== undefined || ethBalance !== undefined),
  });

  return {
    tokens: tokens.data || [],
    isLoading: isLoadingEth || isLoadingTokens || tokens.isLoading,
    error: tokens.error,
    refetch: tokens.refetch,
  };
}

// Helper to get token address from symbol
export function getTokenAddress(symbol: string): Address | "ETH" {
  if (symbol === "ETH") return "ETH";
  const token = COMMON_TOKENS.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
  return token?.address || ("0x0000000000000000000000000000000000000000" as Address);
}

// Helper to get token info from address or symbol
export function getTokenInfo(addressOrSymbol: Address | "ETH" | string): TokenInfo | null {
  if (addressOrSymbol === "ETH") {
    return {
      address: "ETH",
      symbol: "ETH",
      name: "Ethereum",
      balance: 0n,
      balanceFormatted: "0",
      decimals: 18,
    };
  }
  
  const token = COMMON_TOKENS.find(
    t => t.address.toLowerCase() === (addressOrSymbol as string).toLowerCase() ||
         t.symbol.toUpperCase() === (addressOrSymbol as string).toUpperCase()
  );
  
  if (!token) return null;
  
  return {
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    balance: 0n,
    balanceFormatted: "0",
    decimals: token.decimals,
  };
}

// Hook to fetch token decimals dynamically
export function useTokenDecimals(tokenAddress: Address | "ETH" | undefined) {
  const { data: decimals, isLoading, error } = useContractRead({
    address: tokenAddress && tokenAddress !== "ETH" ? tokenAddress : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: !!tokenAddress && tokenAddress !== "ETH",
      retry: 1,
      allowFailure: true,
    },
  });

  return {
    decimals: tokenAddress === "ETH" ? 18 : (decimals ? Number(decimals) : 18), // Default to 18 if not available
    isLoading,
    error,
  };
}

