import React from "react";
import Image from "next/image";
import { usePoolRewardTokens } from "@/hooks/usePoolRewardTokens";
import SimpleTooltip from "@/components/SimpleTooltip";
import { getLogoPath } from "@/components/shared";

interface RewardTokensDisplayProps {
  collateralPool: `0x${string}` | undefined;
  sailPool: `0x${string}` | undefined;
}

export function RewardTokensDisplay({
  collateralPool,
  sailPool,
}: RewardTokensDisplayProps) {
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

  // Combine and deduplicate reward tokens, keeping full token info
  const rewardTokenMap = new Map<
    string,
    { symbol: string; displayName: string; name?: string }
  >();
  [...collateralRewardTokens, ...sailRewardTokens].forEach((token) => {
    if (token.symbol && !rewardTokenMap.has(token.symbol.toLowerCase())) {
      rewardTokenMap.set(token.symbol.toLowerCase(), {
        symbol: token.symbol,
        displayName: token.displayName || token.name || token.symbol,
        name: token.name,
      });
    }
  });
  const allRewardTokens = Array.from(rewardTokenMap.values());

  return (
    <div
      className="text-center min-w-0 flex items-center justify-center gap-1.5"
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
                width={24}
                height={24}
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
              fontSize: "14px",
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
                width={24}
                height={24}
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
              width={24}
              height={24}
              className="flex-shrink-0 cursor-help rounded-full border border-white"
            />
          </div>
        </SimpleTooltip>
      )}
    </div>
  );
}

