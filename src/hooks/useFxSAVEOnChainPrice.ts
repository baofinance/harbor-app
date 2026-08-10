"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { ERC4626_ABI } from "@/abis/erc4626";

/** Mainnet fxSAVE — ERC-4626 vault; 1 share ≈ underlying fxUSD assets. */
export const FXSAVE_TOKEN_ADDRESS =
  "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39" as const;

const ONE_SHARE = 10n ** 18n;

/**
 * USD price per 1 fxSAVE from on-chain convertToAssets(1e18).
 * Underlying fxUSD is ~$1, so assets/share ≈ USD per fxSAVE.
 */
export function useFxSAVEOnChainPrice(enabled = true) {
  const query = useReadContract({
    address: FXSAVE_TOKEN_ADDRESS,
    abi: ERC4626_ABI,
    functionName: "convertToAssets",
    args: [ONE_SHARE],
    query: { enabled },
  });

  const price = useMemo(() => {
    const assets = query.data as bigint | undefined;
    if (assets == null) return null;
    const usd = Number(assets) / 1e18;
    return Number.isFinite(usd) && usd > 0 ? usd : null;
  }, [query.data]);

  return {
    price,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
