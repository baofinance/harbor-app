import { useQuery } from "@tanstack/react-query";
import { Address, formatUnits, parseUnits } from "viem";

// Use 1inch API for swap quotes - more reliable and well-documented
const ONEINCH_API_URL = "https://api.1inch.dev/swap/v6.0/1"; // Chain ID 1 = Ethereum Mainnet
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeeEeE" as Address;

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

export function useDefiLlamaSwap(
  fromToken: Address | "ETH",
  toToken: Address,
  amount: string,
  enabled: boolean = true,
  fromTokenDecimals?: number // Optional: pass decimals if already known
) {
  return useQuery({
    queryKey: ["defillamaSwap", fromToken, toToken, amount, fromTokenDecimals],
    queryFn: async (): Promise<SwapQuote> => {
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error("Invalid amount");
      }

      const fromTokenAddress = fromToken === "ETH" ? ETH_ADDRESS : fromToken;
      
      // Use provided decimals or default to 18
      // DefiLlama API expects amount as a string in wei (token's native decimals)
      const decimals = fromTokenDecimals ?? 18;
      const amountInWei = parseUnits(amount, decimals);

      const url = `${ONEINCH_API_URL}/quote`;
      const params = new URLSearchParams({
        src: fromTokenAddress,
        dst: toToken,
        amount: amountInWei.toString(),
      });

      console.log("[1inch] Fetching swap quote:", {
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
        console.error("[1inch] API error:", errorText);
        throw new Error(`Failed to fetch swap quote: ${errorText}`);
      }

      const data: OneInchQuoteResponse = await response.json();
      
      console.log("[1inch] Swap quote received:", data);

      // Calculate slippage and price impact
      const fromAmount = BigInt(data.srcAmount);
      const toAmount = BigInt(data.dstAmount);
      
      // Estimate price impact and slippage (1inch doesn't provide these directly in quote endpoint)
      // Typical slippage is 0.3-1%, we'll estimate 0.5%
      const estimatedSlippage = 0.5;
      const estimatedPriceImpact = 0.1;
      
      // Extract route from protocols
      const route: string[] = [];
      if (data.protocols && data.protocols.length > 0) {
        data.protocols[0]?.forEach(pathPart => {
          pathPart.forEach(protocol => {
            if (protocol.name && !route.includes(protocol.name)) {
              route.push(protocol.name);
            }
          });
        });
      }

      // Calculate fee (typically 0.3-1% for DEXs)
      const fee = 0.5; // Estimate 0.5% average fee
      const feeAmount = (toAmount * BigInt(Math.round(fee * 100))) / 10000n;

      return {
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        estimatedGas: BigInt(data.gas || "150000"),
        slippage: estimatedSlippage,
        priceImpact: estimatedPriceImpact,
        route,
        fee,
        feeAmount,
      };
    },
    enabled: enabled && !!amount && parseFloat(amount) > 0 && !!fromToken && !!toToken,
    staleTime: 10000, // Quotes expire quickly (10 seconds)
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: 2,
  });
}

// Helper to get swap transaction data for execution
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
  
  const url = `${ONEINCH_API_URL}/swap`;
  const params = new URLSearchParams({
    src: fromTokenAddress,
    dst: toToken,
    amount: amount.toString(),
    from: fromAddress,
    slippage: slippage.toString(),
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get swap transaction: ${errorText}`);
  }

  const data = await response.json();

  return {
    to: data.tx.to as Address,
    data: data.tx.data as `0x${string}`,
    value: BigInt(data.tx.value || "0"),
    gas: BigInt(data.tx.gas || "150000"),
  };
}

