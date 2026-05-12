"use client";

import { useMemo } from "react";
import { useAccount, useContractReads } from "wagmi";
import { markets } from "@/config/markets";
import type { DefinedMarket, Market } from "@/config/markets";
import type { SailContractReads, SailMarketTuple } from "@/types/sail";
import { minterABI } from "@/abis/minter";
import {
  ERC20_ABI,
  WRAPPED_PRICE_ORACLE_ABI,
  STABILITY_POOL_MANAGER_ABI,
} from "@/abis/shared";
import { useMultipleTokenPrices } from "@/hooks/useTokenPrices";
import { buildTokenPriceInput } from "@/utils/tokenPriceInput";

const erc20ABI = ERC20_ABI;
const erc20MetadataABI = ERC20_ABI;
const wrappedPriceOracleABI = WRAPPED_PRICE_ORACLE_ABI;

/**
 * Wagmi contract reads + derived maps for the Sail index (main batch, minter config,
 * rebalance threshold, token USD prices, user leveraged-token balances).
 * Composed by `useSailPageData`.
 */
export function useSailContractReads() {
  const { address } = useAccount();

  const sailMarkets = useMemo((): SailMarketTuple[] => {
    return (Object.entries(markets) as [string, DefinedMarket][]).filter(
      ([, m]) => Boolean(m.leveragedToken)
    );
  }, []);

  const sailMarketIdToIndex = useMemo(() => {
    const m = new Map<string, number>();
    sailMarkets.forEach(([id], idx) => m.set(id, idx));
    return m;
  }, [sailMarkets]);

  const {
    data: reads,
    isLoading: isLoadingReads,
    isError: isReadsError,
    refetch: refetchReads,
  } = useContractReads({
    contracts: sailMarkets.flatMap(([_, m]) => {
      const mktChainId = (m as Market & { chainId?: number }).chainId ?? 1;
      const minter = m.addresses?.minter as `0x${string}` | undefined;
      const priceOracle = m.addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      const leveragedTokenAddress = m.addresses?.leveragedToken as
        | `0x${string}`
        | undefined;

      const isValidAddress = (addr: unknown): addr is `0x${string}` =>
        !!addr &&
        typeof addr === "string" &&
        addr.startsWith("0x") &&
        addr.length === 42;

      if (!isValidAddress(minter)) {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- wagmi batch contract union is verbose to name inline
      const contracts: any[] = [
        {
          address: minter,
          abi: minterABI,
          functionName: "leverageRatio" as const,
          chainId: mktChainId,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "leveragedTokenPrice" as const,
          chainId: mktChainId,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "collateralRatio" as const,
          chainId: mktChainId,
        },
        {
          address: minter,
          abi: minterABI,
          functionName: "collateralTokenBalance" as const,
          chainId: mktChainId,
        },
      ];

      if (isValidAddress(priceOracle)) {
        contracts.push({
          address: priceOracle,
          abi: wrappedPriceOracleABI,
          functionName: "latestAnswer" as const,
          chainId: mktChainId,
        });

        const collateralSymbol =
          m.collateral?.symbol?.toLowerCase() || "";
        const isFxUSDMarket =
          collateralSymbol === "fxusd" || collateralSymbol === "fxsave";
        if (isFxUSDMarket) {
          contracts.push({
            address: priceOracle,
            abi: wrappedPriceOracleABI,
            functionName: "getPrice" as const,
            chainId: mktChainId,
          });
        }
      }

      if (isValidAddress(leveragedTokenAddress)) {
        contracts.push({
          address: leveragedTokenAddress,
          abi: erc20MetadataABI,
          functionName: "name" as const,
          chainId: mktChainId,
        });
        contracts.push({
          address: leveragedTokenAddress,
          abi: erc20MetadataABI,
          functionName: "totalSupply" as const,
          chainId: mktChainId,
        });
      }

      return contracts;
    }),
    query: {
      enabled: sailMarkets.length > 0,
      retry: 1,
      retryOnMount: false,
      allowFailure: true,
    },
  });

  const marketOffsets = useMemo(() => {
    const offsets = new Map<number, number>();
    let currentOffset = 0;

    sailMarkets.forEach(([_, m], index) => {
      offsets.set(index, currentOffset);

      const minter = m.addresses?.minter as `0x${string}` | undefined;
      const priceOracle = m.addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      const leveragedTokenAddress = m.addresses?.leveragedToken as
        | `0x${string}`
        | undefined;

      const isValidAddress = (addr: unknown): boolean =>
        !!addr &&
        typeof addr === "string" &&
        (addr as string).startsWith("0x") &&
        (addr as string).length === 42;

      if (!isValidAddress(minter)) {
        return;
      }

      currentOffset += 4;

      if (isValidAddress(priceOracle)) {
        currentOffset += 1;

        const collateralSymbol =
          m.collateral?.symbol?.toLowerCase() || "";
        const isFxUSDMarket =
          collateralSymbol === "fxusd" || collateralSymbol === "fxsave";
        if (isFxUSDMarket) {
          currentOffset += 1;
        }
      }

      if (isValidAddress(leveragedTokenAddress)) {
        currentOffset += 2;
      }
    });

    return offsets;
  }, [sailMarkets]);

  const minterConfigContracts = useMemo(() => {
    return sailMarkets.flatMap(([_, m]) => {
      const minter = m.addresses?.minter as `0x${string}` | undefined;
      const mktChainId = (m as Market & { chainId?: number }).chainId ?? 1;
      const isValidAddress = (addr: unknown): addr is `0x${string}` =>
        !!addr &&
        typeof addr === "string" &&
        addr.startsWith("0x") &&
        addr.length === 42;
      if (!isValidAddress(minter)) return [];
      return [
        {
          address: minter,
          abi: minterABI,
          functionName: "config" as const,
          chainId: mktChainId,
        },
      ];
    });
  }, [sailMarkets]);

  const { data: minterConfigReadsData, refetch: refetchMinterConfigs } =
    useContractReads({
      contracts: minterConfigContracts,
      query: {
        enabled: minterConfigContracts.length > 0,
        retry: 1,
        retryOnMount: false,
        allowFailure: true,
      },
    });

  const minterConfigByMarketId = useMemo(() => {
    const map = new Map<string, unknown>();
    let idx = 0;
    sailMarkets.forEach(([id, m]) => {
      const minter = m.addresses?.minter as `0x${string}` | undefined;
      const isValidAddress = (addr: unknown): addr is `0x${string}` =>
        !!addr &&
        typeof addr === "string" &&
        addr.startsWith("0x") &&
        addr.length === 42;
      if (!isValidAddress(minter)) return;
      const read = minterConfigReadsData?.[idx];
      idx += 1;
      const result =
        read && typeof read === "object" && "result" in read
          ? (read as { result: unknown }).result
          : read;
      map.set(id, result);
    });
    return map;
  }, [sailMarkets, minterConfigReadsData]);

  const rebalanceContracts = useMemo(() => {
    return sailMarkets.flatMap(([_, m]) => {
      const spm = m.addresses?.stabilityPoolManager as
        | `0x${string}`
        | undefined;
      const mktChainId = (m as Market & { chainId?: number }).chainId ?? 1;
      const isValidAddress = (addr: unknown): addr is `0x${string}` =>
        !!addr &&
        typeof addr === "string" &&
        addr.startsWith("0x") &&
        addr.length === 42;
      if (!isValidAddress(spm)) return [];
      return [
        {
          address: spm,
          abi: STABILITY_POOL_MANAGER_ABI,
          functionName: "rebalanceThreshold" as const,
          chainId: mktChainId,
        },
      ];
    });
  }, [sailMarkets]);

  const { data: rebalanceReadsData, refetch: refetchRebalanceReads } =
    useContractReads({
      contracts: rebalanceContracts,
      query: {
        enabled: rebalanceContracts.length > 0,
        retry: 1,
        retryOnMount: false,
        allowFailure: true,
      },
    });

  const rebalanceThresholdByMarketId = useMemo(() => {
    const map = new Map<string, bigint | undefined>();
    let idx = 0;
    sailMarkets.forEach(([id, m]) => {
      const spm = m.addresses?.stabilityPoolManager as
        | `0x${string}`
        | undefined;
      const isValidAddress = (addr: unknown): addr is `0x${string}` =>
        !!addr &&
        typeof addr === "string" &&
        addr.startsWith("0x") &&
        addr.length === 42;
      if (!isValidAddress(spm)) return;
      const read = rebalanceReadsData?.[idx];
      idx += 1;
      const result =
        read && typeof read === "object" && "result" in read
          ? (read as { result: bigint | undefined }).result
          : (read as bigint | undefined);
      map.set(id, result);
    });
    return map;
  }, [sailMarkets, rebalanceReadsData]);

  const tokenPriceInputs = useMemo(() => {
    return sailMarkets
      .map(([id, m]) => {
        const chainId = (m as Market & { chainId?: number }).chainId ?? 1;
        return buildTokenPriceInput({
          marketId: id,
          minterAddress: m.addresses?.minter,
          pegTarget: m.pegTarget || "USD",
          chainId,
        });
      })
      .filter((input): input is NonNullable<typeof input> => input !== null);
  }, [sailMarkets]);

  const tokenPricesByMarket = useMultipleTokenPrices(tokenPriceInputs);

  const userDepositContracts = useMemo(() => {
    return sailMarkets
      .map(([_, m], index) => {
        const mktChainId = (m as Market & { chainId?: number }).chainId ?? 1;
        const leveragedTokenAddress = m.addresses?.leveragedToken as
          | `0x${string}`
          | undefined;
        if (
          !leveragedTokenAddress ||
          typeof leveragedTokenAddress !== "string" ||
          !leveragedTokenAddress.startsWith("0x") ||
          leveragedTokenAddress.length !== 42 ||
          !address
        )
          return null;
        return {
          marketIndex: index,
          contract: {
            address: leveragedTokenAddress,
            abi: erc20ABI,
            functionName: "balanceOf" as const,
            args: [address as `0x${string}`],
            chainId: mktChainId,
          },
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [sailMarkets, address]);

  const useAnvil = false;
  const userDepositContractArray = useMemo(() => {
    return userDepositContracts.map((c) => c.contract);
  }, [userDepositContracts]);

  const wagmiUserDepositReads = useContractReads({
    contracts: userDepositContractArray,
    query: {
      enabled: sailMarkets.length > 0 && !!address && !useAnvil,
      retry: 1,
      retryOnMount: false,
      allowFailure: true,
    },
  });
  const refetchUserDeposits = wagmiUserDepositReads.refetch;

  const anvilUserDepositReads = useContractReads({
    contracts: userDepositContractArray,
    query: {
      enabled: sailMarkets.length > 0 && !!address && useAnvil,
      refetchInterval: 5000,
      allowFailure: true,
    },
  });

  const userDepositReads = useAnvil
    ? anvilUserDepositReads.data
    : wagmiUserDepositReads.data;

  const userDepositMap = useMemo(() => {
    const map = new Map<number, bigint | undefined>();
    userDepositContracts.forEach(({ marketIndex }, contractIndex) => {
      const readResult = userDepositReads?.[contractIndex];
      const balance =
        readResult && typeof readResult === "object" && "result" in readResult
          ? (readResult.result as bigint | undefined)
          : (readResult as bigint | undefined);
      map.set(marketIndex, balance);
    });
    return map;
  }, [userDepositReads, userDepositContracts]);

  return {
    sailMarkets,
    sailMarketIdToIndex,
    reads: reads as SailContractReads,
    isLoadingReads,
    isReadsError,
    refetchReads,
    marketOffsets,
    minterConfigByMarketId,
    rebalanceThresholdByMarketId,
    refetchMinterConfigs,
    refetchRebalanceReads,
    tokenPricesByMarket,
    userDepositMap,
    refetchUserDeposits,
  };
}
