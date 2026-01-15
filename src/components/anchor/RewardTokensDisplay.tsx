import React, { useMemo } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { usePoolRewardTokens } from "@/hooks/usePoolRewardTokens";
import SimpleTooltip from "@/components/SimpleTooltip";
import { getLogoPath } from "@/components/shared";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { ERC20_ABI } from "@/config/contracts";

interface RewardTokensDisplayProps {
  collateralPool: `0x${string}` | undefined;
  sailPool: `0x${string}` | undefined;
  poolAddresses?: Array<`0x${string}`>;
  iconSize?: number;
  className?: string;
}

export function RewardTokensDisplay({
  collateralPool,
  sailPool,
  poolAddresses,
  iconSize = 24,
  className = "",
}: RewardTokensDisplayProps) {
  const publicClient = usePublicClient();
  const { data: collateralRewardTokens = [], isLoading: isLoadingCollateral } =
    usePoolRewardTokens({
      poolAddress: collateralPool,
      enabled: !!collateralPool,
    });
  const { data: sailRewardTokens = [], isLoading: isLoadingSail } =
    usePoolRewardTokens({
      poolAddress: sailPool,
      enabled: !!sailPool,
    });

  const normalizedPoolAddresses = useMemo(() => {
    return (poolAddresses ?? [])
      .map((addr) => addr.toLowerCase() as `0x${string}`)
      .filter(Boolean);
  }, [poolAddresses]);

  const { data: multiPoolTokens = [] } = useQuery({
    queryKey: [
      "reward-tokens-by-pools",
      normalizedPoolAddresses.join(","),
    ],
    enabled: normalizedPoolAddresses.length > 0 && !!publicClient,
    queryFn: async () => {
      if (!publicClient || normalizedPoolAddresses.length === 0) return [];

      const tokenMap = new Map<
        string,
        { symbol: string; displayName: string; name?: string }
      >();

      for (const poolAddress of normalizedPoolAddresses) {
        let rewardTokenAddresses: `0x${string}`[] = [];
        try {
          rewardTokenAddresses = (await publicClient.readContract({
            address: poolAddress,
            abi: stabilityPoolABI,
            functionName: "activeRewardTokens",
            args: [],
          })) as `0x${string}`[];
        } catch {
          continue;
        }

        for (const tokenAddress of rewardTokenAddresses) {
          let symbol: string | undefined;
          let name: string | undefined;

          try {
            symbol = (await publicClient.readContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: "symbol",
              args: [],
            })) as string;
          } catch {}

          try {
            name = (await publicClient.readContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: "name",
              args: [],
            })) as string;
          } catch {}

          const displayName =
            symbol && symbol.length > 0 && symbol !== "UNKNOWN"
              ? symbol
              : name && name.length > 0
              ? name
              : tokenAddress.slice(0, 6) + "..." + tokenAddress.slice(-4);

          const mapKey = (symbol || displayName).toLowerCase();
          if (!tokenMap.has(mapKey)) {
            tokenMap.set(mapKey, {
              symbol: symbol || displayName,
              displayName,
              name,
            });
          }
        }
      }

      return Array.from(tokenMap.values());
    },
    refetchInterval: 60000,
    retry: 2,
  });

  // Combine and deduplicate reward tokens, keeping full token info
  const allRewardTokens = useMemo(() => {
    const rewardTokenMap = new Map<
      string,
      { symbol: string; displayName: string; name?: string }
    >();
    const sourceTokens =
      normalizedPoolAddresses.length > 0
        ? multiPoolTokens
        : [...collateralRewardTokens, ...sailRewardTokens];
    sourceTokens.forEach((token) => {
      if (token.symbol && !rewardTokenMap.has(token.symbol.toLowerCase())) {
        rewardTokenMap.set(token.symbol.toLowerCase(), {
          symbol: token.symbol,
          displayName: token.displayName || token.name || token.symbol,
          name: token.name,
        });
      }
    });
    return Array.from(rewardTokenMap.values());
  }, [
    collateralRewardTokens,
    sailRewardTokens,
    multiPoolTokens,
    normalizedPoolAddresses.length,
  ]);

  return (
    <div
      className={[
        "text-center min-w-0 flex items-center justify-center gap-1.5",
        className,
      ].join(" ")}
      onClick={(e) => e.stopPropagation()}
    >
      {allRewardTokens.length > 0 ? (
        <div
          className="flex items-center"
          style={{
            gap: allRewardTokens.length > 1 ? "-4px" : "4px",
          }}
        >
          {allRewardTokens.map((token, idx) => (
            <SimpleTooltip
              key={token.symbol}
              label={token.name || token.displayName}
            >
              <Image
                src={getLogoPath(token.symbol)}
                alt={token.displayName}
                width={iconSize}
                height={iconSize}
                className="flex-shrink-0 cursor-help rounded-full border border-white"
                style={{
                  zIndex: allRewardTokens.length - idx,
                  position: "relative",
                }}
              />
            </SimpleTooltip>
          ))}
          {/* Separator between reward tokens and Harbor Marks */}
          <span
            className="text-[#1E4775]/60 font-semibold mx-1"
            style={{
              fontSize: iconSize <= 16 ? "12px" : "14px",
            }}
          >
            +
          </span>
          {/* Ledger Marks Multiplier Logo */}
          <SimpleTooltip label="1 ledger mark per dollar per day">
            <div
              className="relative flex-shrink-0"
              style={{
                zIndex: allRewardTokens.length + 1,
              }}
            >
              <Image
                src="/icons/marks.png"
                alt="Harbor Marks 1x"
                width={iconSize}
                height={iconSize}
                className="flex-shrink-0 cursor-help rounded-full border border-white"
              />
            </div>
          </SimpleTooltip>
        </div>
      ) : (
        <SimpleTooltip label="1 ledger mark per dollar per day">
          <div className="relative flex-shrink-0">
            <Image
              src="/icons/marks.png"
              alt="Harbor Marks 1x"
              width={iconSize}
              height={iconSize}
              className="flex-shrink-0 cursor-help rounded-full border border-white"
            />
          </div>
        </SimpleTooltip>
      )}
    </div>
  );
}

