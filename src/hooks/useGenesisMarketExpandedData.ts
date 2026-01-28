import { useContractReads } from "wagmi";
import { GENESIS_ABI as GENESIS_READ_ABI, ERC20_ABI } from "@/abis/shared";

interface UseGenesisMarketExpandedDataParams {
  genesisAddress?: string;
  market: any;
  peggedSymbol?: string;
  leveragedSymbol?: string;
}

export const useGenesisMarketExpandedData = ({
  genesisAddress,
  market,
  peggedSymbol,
  leveragedSymbol,
}: UseGenesisMarketExpandedDataParams) => {
  const isValidGenesisAddress =
    !!genesisAddress &&
    typeof genesisAddress === "string" &&
    genesisAddress.startsWith("0x") &&
    genesisAddress.length === 42;

  // Fetch contract data for expanded view
  const { data: expandedReads, error: expandedReadsError } = useContractReads({
    contracts: isValidGenesisAddress
      ? [
          {
            address: genesisAddress as `0x${string}`,
            abi: GENESIS_READ_ABI,
            functionName: "PEGGED_TOKEN" as const,
          },
          {
            address: genesisAddress as `0x${string}`,
            abi: GENESIS_READ_ABI,
            functionName: "LEVERAGED_TOKEN" as const,
          },
          {
            address: genesisAddress as `0x${string}`,
            abi: GENESIS_READ_ABI,
            functionName: "WRAPPED_COLLATERAL_TOKEN" as const,
          },
        ]
      : [],
    query: {
      enabled: isValidGenesisAddress,
      retry: 1,
      retryOnMount: false,
    },
  });

  const peggedTokenAddress = expandedReads?.[0]?.result as
    | `0x${string}`
    | undefined;
  const leveragedTokenAddress = expandedReads?.[1]?.result as
    | `0x${string}`
    | undefined;
  const collateralTokenAddress = expandedReads?.[2]?.result as
    | `0x${string}`
    | undefined;

  const isValidTokenAddress = (address?: string) =>
    !!address &&
    typeof address === "string" &&
    address.startsWith("0x") &&
    address.length === 42;

  // Get token symbols
  const { data: tokenSymbols, error: tokenSymbolsError } = useContractReads({
    contracts: [
      ...(isValidTokenAddress(peggedTokenAddress)
        ? [
            {
              address: peggedTokenAddress,
              abi: ERC20_ABI,
              functionName: "symbol" as const,
            },
          ]
        : []),
      ...(isValidTokenAddress(leveragedTokenAddress)
        ? [
            {
              address: leveragedTokenAddress,
              abi: ERC20_ABI,
              functionName: "symbol" as const,
            },
          ]
        : []),
      ...(isValidTokenAddress(collateralTokenAddress)
        ? [
            {
              address: collateralTokenAddress,
              abi: ERC20_ABI,
              functionName: "symbol" as const,
            },
          ]
        : []),
    ],
    query: {
      enabled:
        isValidTokenAddress(peggedTokenAddress) ||
        isValidTokenAddress(leveragedTokenAddress) ||
        isValidTokenAddress(collateralTokenAddress),
      retry: 1,
      retryOnMount: false,
    },
  });

  const peggedTokenSymbol =
    peggedSymbol ||
    (peggedTokenAddress && tokenSymbols?.[0]?.result
      ? (tokenSymbols[0].result as string)
      : market.peggedToken?.symbol) ||
    "ha";
  const leveragedTokenSymbol =
    leveragedSymbol ||
    (leveragedTokenAddress && tokenSymbols?.[1]?.result
      ? (tokenSymbols[1].result as string)
      : market.leveragedToken?.symbol) ||
    "hs";
  const collateralTokenSymbol =
    collateralTokenAddress && tokenSymbols?.[2]?.result
      ? (tokenSymbols[2].result as string)
      : market.collateral?.symbol || "ETH";

  return {
    peggedTokenAddress,
    leveragedTokenAddress,
    collateralTokenAddress,
    peggedTokenSymbol,
    leveragedTokenSymbol,
    collateralTokenSymbol,
    expandedReadsError,
    tokenSymbolsError,
  };
};
