import { useMemo, useEffect } from "react";
import { useContractReads } from "wagmi";
import { MINTER_ABI, ERC20_ABI } from "@/abis/shared";
import { markets } from "@/config/markets";

const TOKEN_KIND_PEGGED = "pegged" as const;
const TOKEN_KIND_LEVERAGED = "leveraged" as const;

type TokenKind = typeof TOKEN_KIND_PEGGED | typeof TOKEN_KIND_LEVERAGED;

type TokenAddressMeta = {
  marketId: string;
  kind: TokenKind;
};

type TokenMeta = {
  peggedAddress?: `0x${string}`;
  leveragedAddress?: `0x${string}`;
  peggedSymbol?: string;
  peggedName?: string;
  leveragedSymbol?: string;
  leveragedName?: string;
};

/**
 * Hook to fetch token metadata (addresses, symbols, names) for anchor markets
 * Fetches pegged and leveraged token addresses from minter contracts,
 * then fetches symbol/name from ERC20 contracts
 * 
 * @param anchorMarkets - Array of [marketId, market] tuples
 * @returns Token metadata map and loading state
 */
export function useAnchorTokenMetadata(anchorMarkets: Array<[string, any]>) {
  // Step 1: Fetch token addresses from minter contracts
  const tokenAddressContracts = useMemo(() => {
    const contracts: any[] = [];
    const meta: TokenAddressMeta[] = [];

    anchorMarkets.forEach(([marketId, m]) => {
      const minter = (m as any).addresses?.minter as `0x${string}` | undefined;
      if (
        !minter ||
        typeof minter !== "string" ||
        !minter.startsWith("0x") ||
        minter.length !== 42
      ) {
        return;
      }
      contracts.push({
        address: minter,
        abi: MINTER_ABI,
        functionName: "PEGGED_TOKEN" as const,
      });
      meta.push({ marketId, kind: TOKEN_KIND_PEGGED });

      contracts.push({
        address: minter,
        abi: MINTER_ABI,
        functionName: "LEVERAGED_TOKEN" as const,
      });
      meta.push({ marketId, kind: TOKEN_KIND_LEVERAGED });
    });

    return { contracts, meta };
  }, [anchorMarkets]);

  const { data: tokenAddressReads } = useContractReads({
    contracts: tokenAddressContracts.contracts,
    query: {
      enabled: tokenAddressContracts.contracts.length > 0,
      staleTime: 300_000, // 5 minutes
    },
  });

  const tokenAddressesByMarket = useMemo(() => {
    const map = new Map<string, TokenMeta>();
    tokenAddressContracts.meta.forEach((meta, idx) => {
      const result = tokenAddressReads?.[idx];
      if (result?.status === "success" && result.result) {
        const addr = result.result as `0x${string}`;
        const entry = map.get(meta.marketId) || {};
        if (meta.kind === TOKEN_KIND_PEGGED) entry.peggedAddress = addr;
        if (meta.kind === TOKEN_KIND_LEVERAGED) entry.leveragedAddress = addr;
        map.set(meta.marketId, entry);
      }
    });
    return map;
  }, [tokenAddressContracts.meta, tokenAddressReads]);

  // Step 2: Fetch token symbols and names from ERC20 contracts
  const tokenMetaContracts = useMemo(() => {
    const contracts: any[] = [];
    const meta: Array<{
      marketId: string;
      kind: TokenKind;
      field: "symbol" | "name";
    }> = [];

    tokenAddressesByMarket.forEach((entry, marketId) => {
      if (entry.peggedAddress) {
        contracts.push({
          address: entry.peggedAddress,
          abi: ERC20_ABI,
          functionName: "symbol" as const,
        });
        meta.push({ marketId, kind: TOKEN_KIND_PEGGED, field: "symbol" });

        contracts.push({
          address: entry.peggedAddress,
          abi: ERC20_ABI,
          functionName: "name" as const,
        });
        meta.push({ marketId, kind: TOKEN_KIND_PEGGED, field: "name" });
      }

      if (entry.leveragedAddress) {
        contracts.push({
          address: entry.leveragedAddress,
          abi: ERC20_ABI,
          functionName: "symbol" as const,
        });
        meta.push({ marketId, kind: TOKEN_KIND_LEVERAGED, field: "symbol" });

        contracts.push({
          address: entry.leveragedAddress,
          abi: ERC20_ABI,
          functionName: "name" as const,
        });
        meta.push({ marketId, kind: TOKEN_KIND_LEVERAGED, field: "name" });
      }
    });

    return { contracts, meta };
  }, [tokenAddressesByMarket]);

  const { data: tokenMetaReads } = useContractReads({
    contracts: tokenMetaContracts.contracts,
    query: {
      enabled: tokenMetaContracts.contracts.length > 0,
      staleTime: 300_000,
    },
  });

  const tokenMetaByMarket = useMemo(() => {
    const map = new Map<string, TokenMeta>();
    tokenMetaContracts.meta.forEach((meta, idx) => {
      const result = tokenMetaReads?.[idx];
      if (result?.status === "success" && result.result) {
        const entry = map.get(meta.marketId) || {};
        if (meta.kind === TOKEN_KIND_PEGGED) {
          if (meta.field === "symbol")
            entry.peggedSymbol = result.result as string;
          if (meta.field === "name") entry.peggedName = result.result as string;
        } else {
          if (meta.field === "symbol")
            entry.leveragedSymbol = result.result as string;
          if (meta.field === "name")
            entry.leveragedName = result.result as string;
        }
        map.set(meta.marketId, entry);
      }
    });
    return map;
  }, [tokenMetaContracts.meta, tokenMetaReads]);

  // Mutate market config for display so all downstream render logic picks up the correct names/symbols
  useEffect(() => {
    tokenMetaByMarket.forEach((meta, marketId) => {
      const m = (markets as any)[marketId];
      if (!m) return;
      if (meta.peggedSymbol || meta.peggedName) {
        m.peggedToken = {
          ...(m.peggedToken || {}),
          symbol: meta.peggedSymbol || m.peggedToken?.symbol,
          name: meta.peggedName || m.peggedToken?.name,
        };
      }
      if (meta.leveragedSymbol || meta.leveragedName) {
        m.leveragedToken = {
          ...(m.leveragedToken || {}),
          symbol: meta.leveragedSymbol || m.leveragedToken?.symbol,
          name: meta.leveragedName || m.leveragedToken?.name,
        };
      }
    });
  }, [tokenMetaByMarket]);

  return {
    tokenMetaByMarket,
    tokenAddressesByMarket,
    isLoading: !tokenAddressReads && tokenAddressContracts.contracts.length > 0,
  };
}

