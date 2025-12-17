import { useQuery } from "@tanstack/react-query";
import { Address, formatUnits, parseUnits } from "viem";

// Use ParaSwap API - has good client-side support without requiring authentication
const PARASWAP_API_URL = "https://apiv5.paraswap.io";
const ETHEREUM_CHAIN_ID = 1;
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

interface ParaSwapPriceResponse {
  priceRoute: {
    srcToken: string;
    srcDecimals: number;
    srcAmount: string;
    destToken: string;
    destDecimals: number;
    destAmount: string;
    gasCost: string;
    bestRoute: Array<{
      percent: number;
      swaps: Array<{
        srcToken: string;
        destToken: string;
        swapExchanges: Array<{
          exchange: string;
          srcAmount: string;
          destAmount: string;
          percent: number;
        }>;
      }>;
    }>;
  };
}

export function useDefiLlamaSwap(
  fromToken: Address | "ETH",
  toToken: Address,
  amount: string,
  enabled: boolean = true,
  fromTokenDecimals?: number // Optional: pass decimals if already known
) {
  return useQuery({
    queryKey: ["paraswapQuote", fromToken, toToken, amount, fromTokenDecimals],
    queryFn: async (): Promise<SwapQuote> => {
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error("Invalid amount");
      }

      const fromTokenAddress = fromToken === "ETH" ? ETH_ADDRESS : fromToken;
      
      // Use provided decimals or default to 18
      const decimals = fromTokenDecimals ?? 18;
      const amountInWei = parseUnits(amount, decimals);

      // ParaSwap API endpoint for price quotes
      const url = `${PARASWAP_API_URL}/prices`;
      const params = new URLSearchParams({
        srcToken: fromTokenAddress,
        destToken: toToken,
        amount: amountInWei.toString(),
        srcDecimals: decimals.toString(),
        destDecimals: "6", // USDC has 6 decimals
        side: "SELL",
        network: ETHEREUM_CHAIN_ID.toString(),
      });

      console.log("[ParaSwap] Fetching swap quote:", {
        fromToken: fromTokenAddress,
        toToken,
        amount,
        amountInWei: amountInWei.toString(),
        decimals,
        url: `${url}?${params.toString()}`,
      });

      const response = await fetch(`${url}?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ParaSwap] API error:", errorText);
        throw new Error(`Failed to fetch swap quote: ${errorText}`);
      }

      const data: ParaSwapPriceResponse = await response.json();
      
      console.log("[ParaSwap] Swap quote received:", data);

      const priceRoute = data.priceRoute;
      const fromAmount = BigInt(priceRoute.srcAmount);
      const toAmount = BigInt(priceRoute.destAmount);
      
      // Calculate slippage (ParaSwap provides optimal route, typical slippage 0.3-1%)
      const estimatedSlippage = 0.5; // 0.5% estimated slippage
      
      // Extract exchanges from best route
      const route: string[] = [];
      priceRoute.bestRoute?.forEach(routePart => {
        routePart.swaps?.forEach(swap => {
          swap.swapExchanges?.forEach(exchange => {
            if (exchange.exchange && !route.includes(exchange.exchange)) {
              route.push(exchange.exchange);
            }
          });
        });
      });

      // Calculate fee (typically 0.3% for most DEXs)
      const fee = 0.3;
      const feeAmount = (toAmount * BigInt(Math.round(fee * 100))) / 10000n;

      // Price impact is minimal for liquid pairs, estimate 0.1%
      const priceImpact = 0.1;

      return {
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        estimatedGas: BigInt(priceRoute.gasCost || "150000"),
        slippage: estimatedSlippage,
        priceImpact,
        route: route.length > 0 ? route : ["ParaSwap"],
        fee,
        feeAmount,
      };
    },
    enabled: enabled && !!amount && parseFloat(amount) > 0 && !!fromToken && !!toToken,
    staleTime: 10000, // Quotes expire quickly (10 seconds)
    refetchInterval: 15000, // Refresh every 15 seconds
    retry: 2,
  });
}

// Helper to get swap transaction data for execution using ParaSwap
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
  const fromTokenAddress = fromToken === "ETH" ? ETH_ADDRESS : fromToken;
  
  // First, get the price route
  const priceUrl = `${PARASWAP_API_URL}/prices`;
  const priceParams = new URLSearchParams({
    srcToken: fromTokenAddress,
    destToken: toToken,
    amount: amount.toString(),
    srcDecimals: "18", // Assume 18 for most tokens, USDC is 6 but we're swapping TO USDC
    destDecimals: "6", // USDC decimals
    side: "SELL",
    network: ETHEREUM_CHAIN_ID.toString(),
  });

  console.log("[ParaSwap] Fetching price route for transaction:", {
    fromToken: fromTokenAddress,
    toToken,
    amount: amount.toString(),
    fromAddress,
    url: `${priceUrl}?${priceParams.toString()}`,
  });

  const priceResponse = await fetch(`${priceUrl}?${priceParams.toString()}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!priceResponse.ok) {
    const errorText = await priceResponse.text();
    console.error("[ParaSwap] Price API error:", errorText);
    throw new Error(`Failed to get price route: ${errorText}`);
  }

  const priceData: ParaSwapPriceResponse = await priceResponse.json();
  
  // Now build the transaction
  const txUrl = `${PARASWAP_API_URL}/transactions/${ETHEREUM_CHAIN_ID}`;
  const txPayload = {
    srcToken: fromTokenAddress,
    destToken: toToken,
    srcAmount: priceData.priceRoute.srcAmount,
    destAmount: priceData.priceRoute.destAmount,
    priceRoute: priceData.priceRoute,
    userAddress: fromAddress,
    slippage: Math.floor(slippage * 100), // ParaSwap expects slippage in basis points (100 = 1%)
  };

  console.log("[ParaSwap] Building transaction:", txPayload);

  const txResponse = await fetch(txUrl, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(txPayload),
  });

  if (!txResponse.ok) {
    const errorText = await txResponse.text();
    console.error("[ParaSwap] Transaction API error:", errorText);
    throw new Error(`Failed to build swap transaction: ${errorText}`);
  }

  const txData = await txResponse.json();
  
  console.log("[ParaSwap] Transaction built:", txData);

  return {
    to: txData.to as Address,
    data: txData.data as `0x${string}`,
    value: BigInt(txData.value || "0"),
    gas: BigInt(txData.gas || priceData.priceRoute.gasCost || "150000"),
  };
}

