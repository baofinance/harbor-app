import { useMemo } from "react";
import { useAnvilContractReads } from "./useAnvilContractReads";
import { MINTER_ABI, ERC20_ABI } from "@/abis/shared";

export interface MinterTokenMetaResult {
  pegged?: { address: `0x${string}`; symbol?: string; name?: string };
  leveraged?: { address: `0x${string}`; symbol?: string; name?: string };
  isLoading: boolean;
  error?: unknown;
}

/**
 * Fetch pegged and leveraged token addresses from the minter, then fetch
 * name/symbol for each token.
 */
export function useMinterTokenMeta(
  minterAddress?: `0x${string}`
): MinterTokenMetaResult {
  // First read: token addresses
  const {
    data: addressReads,
    isLoading: isLoadingAddresses,
    error: addressErr,
  } = useAnvilContractReads({
    contracts: minterAddress
      ? ([
          {
            address: minterAddress,
            abi: MINTER_ABI,
            functionName: "PEGGED_TOKEN",
          },
          {
            address: minterAddress,
            abi: MINTER_ABI,
            functionName: "LEVERAGED_TOKEN",
          },
        ] as const)
      : [],
    enabled: !!minterAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Extract addresses more defensively
  const peggedAddr = useMemo(() => {
    if (!addressReads?.[0]) return undefined;
    const read = addressReads[0] as any;

    // Try to get result - handle different status values
    if (read?.result) {
      return read.result as `0x${string}`;
    }

    return undefined;
  }, [addressReads]);

  const leveragedAddr = useMemo(() => {
    if (!addressReads?.[1]) return undefined;
    const read = addressReads[1] as any;

    if (read?.result) {
      return read.result as `0x${string}`;
    }

    return undefined;
  }, [addressReads]);

  // Second read: token metadata
  const {
    data: metaReads,
    isLoading: isLoadingMeta,
    error: metaErr,
  } = useAnvilContractReads({
    contracts: [
      ...(peggedAddr
        ? ([
            {
              address: peggedAddr,
              abi: ERC20_ABI,
              functionName: "symbol" as const,
            },
            {
              address: peggedAddr,
              abi: ERC20_ABI,
              functionName: "name" as const,
            },
          ] as const)
        : []),
      ...(leveragedAddr
        ? ([
            {
              address: leveragedAddr,
              abi: ERC20_ABI,
              functionName: "symbol" as const,
            },
            {
              address: leveragedAddr,
              abi: ERC20_ABI,
              functionName: "name" as const,
            },
          ] as const)
        : []),
    ],
    enabled: !!peggedAddr || !!leveragedAddr,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const result = useMemo<MinterTokenMetaResult>(() => {
    const meta: MinterTokenMetaResult = { isLoading: false };
    if (peggedAddr) {
      meta.pegged = { address: peggedAddr };
    }
    if (leveragedAddr) {
      meta.leveraged = { address: leveragedAddr };
    }

    if (metaReads && metaReads.length > 0) {
      let idx = 0;
      if (peggedAddr && meta.pegged) {
        const sym = metaReads[idx++];
        const name = metaReads[idx++];
        // Handle different possible structures
        const symValue = typeof sym === "string" ? sym : sym?.result;
        const nameValue = typeof name === "string" ? name : name?.result;
        if (typeof symValue === "string") meta.pegged.symbol = symValue;
        if (typeof nameValue === "string") meta.pegged.name = nameValue;
      }
      if (leveragedAddr && meta.leveraged) {
        const sym = metaReads[idx++];
        const name = metaReads[idx++];
        // Handle different possible structures
        const symValue = typeof sym === "string" ? sym : sym?.result;
        const nameValue = typeof name === "string" ? name : name?.result;
        if (typeof symValue === "string") meta.leveraged.symbol = symValue;
        if (typeof nameValue === "string") meta.leveraged.name = nameValue;
      }
    }

    meta.isLoading = isLoadingAddresses || isLoadingMeta;
    meta.error = addressErr || metaErr;

    return meta;
  }, [
    peggedAddr,
    leveragedAddr,
    metaReads,
    isLoadingAddresses,
    isLoadingMeta,
    addressErr,
    metaErr,
    addressReads,
  ]);

  return result;
}
