"use client";

import { useMemo } from "react";
import { useContractReads } from "wagmi";
import { GENESIS_ABI } from "@/abis/shared";
import { markets, releasesAfterGenesis } from "@/config/markets";

type ReleaseTarget = {
  genesis: `0x${string}`;
  chainId: number;
};

/**
 * Genesis addresses whose voyage has ended on-chain.
 * Used to promote `releaseAfterGenesis` markets onto Earn and Leverage.
 */
export function useReleasedGenesisAddresses(): ReadonlySet<string> {
  const targets = useMemo((): ReleaseTarget[] => {
    const rows: ReleaseTarget[] = [];
    for (const market of Object.values(markets)) {
      if (!releasesAfterGenesis(market)) continue;
      const genesis = (market as { addresses?: { genesis?: string } }).addresses
        ?.genesis;
      const chainId = (market as { chainId?: number }).chainId ?? 1;
      if (
        typeof genesis === "string" &&
        genesis.startsWith("0x") &&
        genesis.length === 42
      ) {
        rows.push({ genesis: genesis as `0x${string}`, chainId });
      }
    }
    return rows;
  }, []);

  const { data } = useContractReads({
    contracts: targets.map((target) => ({
      address: target.genesis,
      abi: GENESIS_ABI,
      functionName: "genesisIsEnded" as const,
      chainId: target.chainId,
    })),
    query: {
      enabled: targets.length > 0,
      refetchInterval: 60_000,
    },
  });

  return useMemo(() => {
    const ended = new Set<string>();
    targets.forEach((target, index) => {
      if (data?.[index]?.result === true) {
        ended.add(target.genesis.toLowerCase());
      }
    });
    return ended;
  }, [data, targets]);
}
