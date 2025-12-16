import { useContractReads } from "./useContractReads";

/**
 * Standard Chainlink-style price oracle ABI
 */
export const CHAINLINK_ORACLE_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ type: "int256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Harbor-style price oracle ABI that returns tuple
 */
export const HARBOR_ORACLE_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [
      { type: "uint256", name: "minUnderlyingPrice" },
      { type: "uint256", name: "maxUnderlyingPrice" },
      { type: "uint256", name: "minWrappedRate" },
      { type: "uint256", name: "maxWrappedRate" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface UsePriceOracleOptions {
  oracleAddress: `0x${string}` | string | undefined;
  enabled?: boolean;
  refetchInterval?: number;
  /**
   * If true, expects Harbor-style tuple return; otherwise standard Chainlink
   */
  isHarborOracle?: boolean;
  /**
   * Default decimals to use if oracle doesn't have decimals() function
   */
  defaultDecimals?: number;
}

interface PriceOracleResult {
  price: number;
  priceRaw: bigint | undefined;
  decimals: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch price from an oracle contract
 * Supports both standard Chainlink and Harbor-style oracles
 */
export function usePriceOracle({
  oracleAddress,
  enabled = true,
  refetchInterval = 30000,
  isHarborOracle = false,
  defaultDecimals = 18,
}: UsePriceOracleOptions): PriceOracleResult {
  const abi = isHarborOracle ? HARBOR_ORACLE_ABI : CHAINLINK_ORACLE_ABI;

  const { data, isLoading, error, refetch } = useContractReads({
    contracts: [
      {
        address: oracleAddress as `0x${string}`,
        abi,
        functionName: "decimals",
      },
      {
        address: oracleAddress as `0x${string}`,
        abi,
        functionName: "latestAnswer",
      },
    ],
    enabled: enabled && !!oracleAddress,
    refetchInterval,
  });

  // Parse decimals
  let decimals = defaultDecimals;
  if (data?.[0]?.status === "success" && data[0].result !== undefined) {
    decimals = Number(data[0].result);
  }

  // Parse price
  let priceRaw: bigint | undefined;
  let price = 0;
  let errorMsg: string | null = null;

  if (data?.[1]?.status === "success" && data[1].result !== undefined) {
    if (isHarborOracle) {
      // Harbor oracle returns tuple - use maxUnderlyingPrice (index 1)
      const result = data[1].result as [bigint, bigint, bigint, bigint];
      if (Array.isArray(result) && result.length >= 2) {
        priceRaw = result[1];
      }
    } else {
      // Standard Chainlink - single int256
      priceRaw = data[1].result as bigint;
    }

    if (priceRaw !== undefined) {
      // Handle negative values
      const priceValue = priceRaw < 0n ? -priceRaw : priceRaw;
      if (priceValue > 0n) {
        price = Number(priceValue) / 10 ** decimals;
      }
    }
  } else if (data?.[1]?.status === "failure") {
    errorMsg = `Failed to read price: ${
      data[1].error?.message || "Unknown error"
    }`;
  }

  return {
    price,
    priceRaw,
    decimals,
    isLoading,
    error: error ? String(error) : errorMsg,
    refetch,
  };
}

/**
 * Hook to fetch multiple prices at once
 */
export function useMultiplePriceOracles(
  oracles: Array<{
    address: `0x${string}` | string | undefined;
    isHarborOracle?: boolean;
    defaultDecimals?: number;
  }>,
  options: { enabled?: boolean; refetchInterval?: number } = {}
) {
  const { enabled = true, refetchInterval = 30000 } = options;

  const contracts = oracles.flatMap((oracle) => {
    if (!oracle.address) return [];
    const abi = oracle.isHarborOracle
      ? HARBOR_ORACLE_ABI
      : CHAINLINK_ORACLE_ABI;
    return [
      {
        address: oracle.address as `0x${string}`,
        abi,
        functionName: "decimals" as const,
      },
      {
        address: oracle.address as `0x${string}`,
        abi,
        functionName: "latestAnswer" as const,
      },
    ];
  });

  const { data, isLoading, refetch } = useContractReads({
    contracts,
    enabled: enabled && contracts.length > 0,
    refetchInterval,
  });

  // Parse results
  const prices = oracles.map((oracle, index) => {
    if (!oracle.address) {
      return {
        price: 0,
        priceRaw: undefined,
        decimals: oracle.defaultDecimals ?? 18,
      };
    }

    const baseIndex = index * 2;
    const decimalsResult = data?.[baseIndex];
    const priceResult = data?.[baseIndex + 1];

    let decimals = oracle.defaultDecimals ?? 18;
    if (
      decimalsResult?.status === "success" &&
      decimalsResult.result !== undefined
    ) {
      decimals = Number(decimalsResult.result);
    }

    let priceRaw: bigint | undefined;
    let price = 0;

    if (priceResult?.status === "success" && priceResult.result !== undefined) {
      if (oracle.isHarborOracle) {
        const result = priceResult.result as [bigint, bigint, bigint, bigint];
        if (Array.isArray(result) && result.length >= 2) {
          priceRaw = result[1];
        }
      } else {
        priceRaw = priceResult.result as bigint;
      }

      if (priceRaw !== undefined) {
        const priceValue = priceRaw < 0n ? -priceRaw : priceRaw;
        if (priceValue > 0n) {
          price = Number(priceValue) / 10 ** decimals;
        }
      }
    }

    return { price, priceRaw, decimals };
  });

  return {
    prices,
    isLoading,
    refetch,
  };
}
