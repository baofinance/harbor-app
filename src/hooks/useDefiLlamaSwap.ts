import { useQuery } from "@tanstack/react-query";
import { Address, formatUnits, parseUnits } from "viem";

const DEFILLAMA_SWAP_API = "https://api.llama.fi/swap/v1/quote";
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeeEeE" as Address;

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

interface DefiLlamaQuoteResponse {
  fromTokenAmount: string;
  toTokenAmount: string;
  estimatedGas: string;
  estimatedPrice: string;
  spotPrice: string;
  priceImpact: string;
  route: Array<{
    name: string;
    part: number;
    fromTokenAddress: string;
    toTokenAddress: string;
  }>;
}

export function useDefiLlamaSwap(
  fromToken: Address | "ETH",
  toToken: Address,
  amount: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["defillamaSwap", fromToken, toToken, amount],
    queryFn: async (): Promise<SwapQuote> => {
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error("Invalid amount");
      }

      // Convert amount to wei
      // DefiLlama expects amount in the token's native decimals
      // For now, we'll use 18 decimals (most tokens) and let DefiLlama handle conversion
      // In a production environment, you'd fetch token decimals first
      const fromTokenAddress = fromToken === "ETH" ? ETH_ADDRESS : fromToken;
      
      // Parse amount - DefiLlama API expects the amount as a string in the token's native format
      // We'll pass it as a decimal string and let DefiLlama parse it
      // For ETH and most ERC20s, this is 18 decimals
      const amountInWei = parseUnits(amount, 18);

      const url = new URL(DEFILLAMA_SWAP_API);
      url.searchParams.set("fromTokenAddress", fromTokenAddress);
      url.searchParams.set("toTokenAddress", toToken);
      url.searchParams.set("amount", amountInWei.toString());
      url.searchParams.set("fromAddress", "0x0000000000000000000000000000000000000000");
      url.searchParams.set("slippage", "1"); // 1% default slippage tolerance

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch swap quote: ${errorText}`);
      }

      const data: DefiLlamaQuoteResponse = await response.json();

      // Calculate slippage: difference between spot price and estimated price
      const spotPrice = parseFloat(data.spotPrice);
      const estimatedPrice = parseFloat(data.estimatedPrice);
      const slippage = spotPrice > 0 
        ? Math.abs(((spotPrice - estimatedPrice) / spotPrice) * 100)
        : 0;

      // Price impact from API
      const priceImpact = parseFloat(data.priceImpact || "0");

      // Extract route
      const route = data.route?.map(r => r.name) || [];

      // Calculate fee (typically 0.3% for most DEXs, but can vary)
      // DefiLlama doesn't always provide fee directly, so we estimate
      // Fee is usually embedded in the price difference
      const fee = Math.max(0, slippage - priceImpact); // Fee is slippage minus price impact
      const feeAmount = (BigInt(data.toTokenAmount) * BigInt(Math.round(fee * 100))) / 10000n;

      return {
        fromToken,
        toToken,
        fromAmount: BigInt(data.fromTokenAmount),
        toAmount: BigInt(data.toTokenAmount),
        estimatedGas: BigInt(data.estimatedGas || "0"),
        slippage,
        priceImpact,
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
  
  const url = new URL("https://api.llama.fi/swap/v1/swap");
  url.searchParams.set("fromTokenAddress", fromTokenAddress);
  url.searchParams.set("toTokenAddress", toToken);
  url.searchParams.set("amount", amount.toString());
  url.searchParams.set("fromAddress", fromAddress);
  url.searchParams.set("slippage", slippage.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get swap transaction: ${errorText}`);
  }

  const data = await response.json();

  return {
    to: data.tx.to as Address,
    data: data.tx.data as `0x${string}`,
    value: BigInt(data.tx.value || "0"),
    gas: BigInt(data.tx.gas || "21000"),
  };
}

