"use client";

import { useAccount, useContractRead } from "wagmi";
import { TokenLogo } from "@/components/shared";
import { DepositModalTabHeader } from "@/components/DepositModalTabHeader";
import { HarborConnectWalletCta } from "@/components/sail/HarborConnectWalletCta";
import {
  ANCHOR_MODAL_FOOTER_CHROME,
  DEPOSIT_PRIMARY_CORAL_CLASS,
  DEPOSIT_PRIMARY_DISABLED_CLASS,
  DEPOSIT_PRIMARY_MINT_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
} from "@/components/deposit/depositFlowStyles";
import { GENESIS_ABI } from "@/abis/shared";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import { formatTokenAmount } from "@/utils/formatters";
import {
  SAIL_ADVANCED_LIGHT_BODY,
} from "@/components/genesis/advanced/genesisAdvancedStyles";

export type GenesisClaimPanelProps = {
  market: GenesisMarketConfig;
  isClaiming?: boolean;
  onClaim: () => void;
};

/** Claim review panel — HA (Anchor) + HS (Sail) amounts to receive. */
export function GenesisClaimPanel({
  market,
  isClaiming = false,
  onClaim,
}: GenesisClaimPanelProps) {
  const { address, isConnected } = useAccount();
  const genesisAddress = market?.addresses?.genesis as `0x${string}` | undefined;
  const chainId = (market as { chainId?: number }).chainId ?? 1;

  const peggedSymbol = market?.peggedToken?.symbol || "haTOKEN";
  const leveragedSymbol = market?.leveragedToken?.symbol || "hsTOKEN";

  const { data: claimableAmounts, isLoading } = useContractRead({
    address: genesisAddress,
    abi: GENESIS_ABI,
    functionName: "claimable",
    args: address ? [address] : undefined,
    chainId,
    query: {
      enabled: !!address && !!genesisAddress,
    },
  });

  const claimablePegged =
    (claimableAmounts as [bigint, bigint] | undefined)?.[0] || 0n;
  const claimableLeveraged =
    (claimableAmounts as [bigint, bigint] | undefined)?.[1] || 0n;
  const hasClaimable = claimablePegged > 0n || claimableLeveraged > 0n;

  const haDisplay = formatTokenAmount(claimablePegged, peggedSymbol);
  const hsDisplay = formatTokenAmount(claimableLeveraged, leveragedSymbol);

  let ctaLabel = "Claim Anchor + Sail";
  let ctaDisabled = true;
  let ctaClass = DEPOSIT_PRIMARY_DISABLED_CLASS;

  if (!isConnected) {
    ctaLabel = "Connect wallet";
  } else if (isLoading) {
    ctaLabel = "Loading claim…";
  } else if (isClaiming) {
    ctaLabel = "Claiming…";
  } else if (!hasClaimable) {
    ctaLabel = "Nothing to claim";
  } else {
    ctaDisabled = false;
    ctaClass = DEPOSIT_PRIMARY_CORAL_CLASS;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden pt-2.5 sm:pt-3">
      <div className="shrink-0 px-4 sm:px-5">
        <DepositModalTabHeader
          tabs={[{ value: "claim", label: "Claim" }]}
          activeTab="claim"
          onTabChange={() => {}}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3 pt-3 sm:px-5">
        <div className="space-y-1 text-center">
          <p className="text-sm font-bold text-[#1E4775]">Amount</p>
          <p className="text-[11px] leading-snug text-[#1E4775]/55">
            Confirm the details below before submitting.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className={DEPOSIT_SECTION_LABEL_CLASS}>Review</p>
          <div className="overflow-hidden rounded-xl border border-[#1E4775]/12 bg-white/90">
            <div className="divide-y divide-[#1E4775]/10">
              <div className="px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#1E4775]/45">
                  From
                </p>
                <p className="mt-0.5 text-xs font-semibold text-[#1E4775]">
                  Maiden Voyage deposit
                </p>
                <p className="text-[10px] text-[#1E4775]/50">
                  Claim Anchor + Sail after market launch
                </p>
              </div>

              <div className="space-y-2.5 bg-harbor-mint/30 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#1E4775]/55">
                  You receive
                </p>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <TokenLogo symbol={peggedSymbol} size={18} />
                    <span className="truncate text-xs font-semibold text-[#1E4775]">
                      {peggedSymbol}
                    </span>
                    <span className="shrink-0 text-[10px] text-[#1E4775]/45">
                      Anchor
                    </span>
                  </div>
                  <p
                    className="shrink-0 font-mono text-base font-bold tabular-nums text-[#1E4775] sm:text-lg"
                    title={haDisplay.display}
                  >
                    {haDisplay.formatted}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <TokenLogo symbol={leveragedSymbol} size={18} />
                    <span className="truncate text-xs font-semibold text-[#1E4775]">
                      {leveragedSymbol}
                    </span>
                    <span className="shrink-0 text-[10px] text-[#1E4775]/45">
                      Sail
                    </span>
                  </div>
                  <p
                    className="shrink-0 font-mono text-base font-bold tabular-nums text-[#1E4775] sm:text-lg"
                    title={hsDisplay.display}
                  >
                    {hsDisplay.formatted}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className={SAIL_ADVANCED_LIGHT_BODY}>
          {hasClaimable
            ? "One on-chain claim · review wallet prompts."
            : isConnected
              ? "No claimable Anchor or Sail tokens for this voyage."
              : "Connect your wallet to see claimable amounts."}
        </p>
      </div>

      <div className={ANCHOR_MODAL_FOOTER_CHROME}>
        {!isConnected ? (
          <HarborConnectWalletCta
            className={`${DEPOSIT_PRIMARY_MINT_CLASS} w-full`}
            label="Connect wallet"
          />
        ) : (
          <button
            type="button"
            className={`${ctaClass} w-full`}
            disabled={ctaDisabled}
            onClick={onClaim}
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}
