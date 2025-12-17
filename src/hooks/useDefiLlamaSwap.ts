import { useQuery } from "@tanstack/react-query";
import { Address, formatUnits, parseUnits } from "viem";
import { useCoinGeckoPrices } from "./useCoinGeckoPrice";

// Note: External swap APIs (DefiLlama, 1inch) require authentication or have CORS issues
// We'll estimate the swap using CoinGecko prices instead
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeeEeE" as Address;
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;

// Helper to fetch token decimals (with caching)
const tokenDecimalsCache = new Map<string, number>();

export async function fetchTokenDecimals(
  tokenAddress: Address | "ETH",
  publicClient: any
): Promise<number> {
  if (tokenAddress === "ETH") return 18;
  
  const cacheKey = tokenAddress.toLowerCase();
  if (tokenDecimalsCache.has(cacheKey)) {
    return tokenDecimalsCache.get(cacheKey)!;
  }
  
  try {
    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: [
        {
          inputs: [],
          name: "decimals",
          outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "decimals",
    });
    
    const decimalsNum = Number(decimals);
    tokenDecimalsCache.set(cacheKey, decimalsNum);
    return decimalsNum;
  } catch (error) {
    // Default to 18 if we can't fetch decimals
    console.warn(`Failed to fetch decimals for ${tokenAddress}, defaulting to 18`);
    tokenDecimalsCache.set(cacheKey, 18);
    return 18;
  }
}

export interface SwapQuote {
  fromToken: Address | "ETH";
  toToken: Address;
  fromAmount: bigint;
  toAmount: bigint;
  estimatedGas: bigint;
  slippage: number; // Slippage percentage
  priceImpact: number; // Price impact percentage
  route: string[]; // Token path
  fee: number; // Fee percentage
  feeAmount: bigint; // Fee in output token
}

interface OneInchQuoteResponse {
  dstAmount: string; // Output amount
  srcAmount: string; // Input amount (may differ from requested due to rounding)
  gas: string;
  protocols: Array<Array<Array<{
    name: string;
    part: number;
    fromTokenAddress: string;
    toTokenAddress: string;
  }>>>;
}

// Map token addresses to CoinGecko IDs
const TOKEN_TO_COINGECKO_ID: Record<string, string> = {
  [ETH_ADDRESS.toLowerCase()]: "ethereum",
  [USDC_ADDRESS.toLowerCase()]: "usd-coin",
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "weth", // WETH
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "wrapped-bitcoin", // WBTC
  "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0": "wrapped-steth", // wstETH
  "0xae78736cd615f374d3085123a210448e74fc6393": "rocket-pool-eth", // rETH
};

export function useDefiLlamaSwap(
  fromToken: Address | "ETH",
  toToken: Address,
  amount: string,
  enabled: boolean = true,
  fromTokenDecimals?: number // Optional: pass decimals if already known
) {
  const fromTokenAddress = fromToken === "ETH" ? ETH_ADDRESS : fromToken;
  
  // Get CoinGecko IDs for both tokens
  const fromCoinGeckoId = TOKEN_TO_COINGECKO_ID[fromTokenAddress.toLowerCase()] || "ethereum";
  const toCoinGeckoId = TOKEN_TO_COINGECKO_ID[toToken.toLowerCase()] || "usd-coin";
  
  // Fetch prices for both tokens
  const { prices, isLoading: isPricesLoading } = useCoinGeckoPrices(
    [fromCoinGeckoId, toCoinGeckoId],
    30000 // 30 second refresh
  );
  
  return useQuery({
    queryKey: ["estimatedSwap", fromToken, toToken, amount, fromTokenDecimals, prices],
    queryFn: async (): Promise<SwapQuote> => {
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error("Invalid amount");
      }

      if (!prices || !prices[fromCoinGeckoId] || !prices[toCoinGeckoId]) {
        throw new Error("Prices not available");
      }

      const fromPriceUSD = prices[fromCoinGeckoId];
      const toPriceUSD = prices[toCoinGeckoId];
      
      // Use provided decimals or default to 18
      const decimals = fromTokenDecimals ?? 18;
      const amountInWei = parseUnits(amount, decimals);
      
      // Calculate conversion using USD prices
      const fromAmountUSD = (Number(amountInWei) / (10 ** decimals)) * fromPriceUSD;
      
      // USDC has 6 decimals
      const toDecimals = toToken.toLowerCase() === USDC_ADDRESS.toLowerCase() ? 6 : 18;
      const toAmountRaw = (fromAmountUSD / toPriceUSD) * (10 ** toDecimals);
      
      // Apply estimated slippage and fees (typically 0.5-1%)
      const slippage = 0.5; // 0.5% slippage
      const fee = 0.3; // 0.3% DEX fee
      const totalCost = slippage + fee; // 0.8% total
      
      const toAmountAfterCosts = toAmountRaw * (1 - totalCost / 100);
      const toAmount = BigInt(Math.floor(toAmountAfterCosts));
      
      const feeAmount = BigInt(Math.floor(toAmountRaw * (fee / 100)));
      
      console.log("[EstimatedSwap] Calculated swap:", {
        fromToken: fromTokenAddress,
        toToken,
        amount,
        amountInWei: amountInWei.toString(),
        fromPriceUSD,
        toPriceUSD,
        fromAmountUSD,
        toAmountRaw,
        toAmountAfterCosts,
        toAmount: toAmount.toString(),
        slippage,
        fee,
      });

      return {
        fromToken,
        toToken,
        fromAmount: amountInWei,
        toAmount,
        estimatedGas: BigInt("150000"), // Estimated gas
        slippage,
        priceImpact: 0.1, // Estimated price impact
        route: ["Estimated via CoinGecko prices"],
        fee,
        feeAmount,
      };
    },
    enabled: enabled && !!amount && parseFloat(amount) > 0 && !!fromToken && !!toToken && !isPricesLoading && !!prices,
    staleTime: 10000, // Quotes expire quickly (10 seconds)
    refetchInterval: 30000, // Refresh every 30 seconds (matching CoinGecko refresh)
    retry: 2,
  });
}

// Helper to get swap transaction data for execution
// Note: This requires server-side implementation or a DEX aggregator that supports client-side calls
// For now, this is a placeholder that should be replaced with actual swap routing
export async function getDefiLlamaSwapTx(
  fromToken: Address | "ETH",
  toToken: Address,
  amount: bigint,
  fromAddress: Address,
  slippage: number = 1.0
): Promise<{
  to: Address;
  data: `0x${string}`;
  value: bigint;
  gas: bigint;
}> {
  // This function needs to be implemented with a proper DEX aggregator
  // Options:
  // 1. Use 1inch API with server-side proxy
  // 2. Use Uniswap SDK to build swap transaction
  // 3. Use ParaSwap or other aggregator with client support
  
  throw new Error("Swap execution not yet implemented. Please use a supported token (USDC, fxUSD, or fxSAVE) for now.");
}

