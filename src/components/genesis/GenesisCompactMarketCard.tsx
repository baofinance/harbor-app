"use client";

import type { ReactNode } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import NetworkIconCell from "@/components/NetworkIconCell";
import { MarketMaintenanceTag } from "@/components/MarketMaintenanceTag";
import { TokenLogo } from "@/components/shared";
import SimpleTooltip from "@/components/SimpleTooltip";
import { formatUSD } from "@/utils/formatters";
import type { GenesisDepositCapData } from "@/utils/genesisDepositCap";

const primaryActionClass =
  "rounded-md bg-[#1E4775] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#17395F] disabled:cursor-not-allowed disabled:bg-[#1E4775]/40";
const secondaryActionClass =
  "rounded-md border border-[#1E4775]/25 bg-white px-3 py-2 text-xs font-semibold text-[#1E4775] transition hover:bg-[#1E4775]/5 disabled:cursor-not-allowed disabled:text-[#1E4775]/40 disabled:border-[#1E4775]/15";
const sectionHeaderClass =
  "text-xs font-semibold uppercase tracking-wide text-[#1E4775]/85";

export type GenesisCompactMarketCardProps = {
  marketName: string;
  chainName: string;
  chainLogo: string;
  collateralSymbol: string;
  peggedSymbol: string;
  leveragedSymbol: string;
  statusText: string;
  isExpanded: boolean;
  isEnded: boolean;
  isProcessing: boolean;
  showMaintenanceTag: boolean;
  hasClaimable: boolean;
  isClaiming: boolean;
  canWithdraw: boolean;
  userDepositDisplay: string;
  capData: GenesisDepositCapData | null;
  onToggleExpand: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
  onClaim: () => void;
  expandedContent?: ReactNode;
};

export function GenesisCompactMarketCard({
  marketName,
  chainName,
  chainLogo,
  collateralSymbol,
  peggedSymbol,
  leveragedSymbol,
  statusText,
  isExpanded,
  isEnded,
  isProcessing,
  showMaintenanceTag,
  hasClaimable,
  isClaiming,
  canWithdraw,
  userDepositDisplay,
  capData,
  onToggleExpand,
  onDeposit,
  onWithdraw,
  onClaim,
  expandedContent,
}: GenesisCompactMarketCardProps) {
  const showClaimAction = isEnded && !showMaintenanceTag;
  const disableClaim = !hasClaimable || isClaiming;
  const disableManage = isProcessing || showMaintenanceTag || isEnded;
  const progressPct = capData ? Math.min(100, Math.max(0, capData.progressPct)) : 0;
  const primaryMarketIcon =
    collateralSymbol.toLowerCase() === "wsteth" ? "stETH" : collateralSymbol;

  return (
    <article className="overflow-hidden rounded-lg bg-white text-[#1E4775] shadow-sm ring-1 ring-[#1E4775]/10">
      <div className="grid gap-4 px-4 py-4 md:grid-cols-[0.75fr_2.1fr_1.15fr] md:items-stretch">
        <div className="flex min-w-0 h-full flex-col rounded-md p-4">
          <div className="flex items-center gap-2">
            <TokenLogo
              symbol={primaryMarketIcon}
              size={44}
              className="ring-2 ring-[#1E4775]/10"
            />
            <h3 className="text-[20px] font-semibold tracking-tight">
              {marketName}
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            <div className="text-sm">
              <span className="inline-flex items-center gap-2 rounded-md border border-[#FF8A7A]/45 bg-[#FF8A7A]/20 px-2.5 py-1.5 font-semibold text-[#1E4775] shadow-sm">
                <NetworkIconCell
                  chainName={chainName}
                  chainLogo={chainLogo}
                  size={22}
                />
                <span>{chainName}</span>
              </span>
            </div>
            <div className="text-sm font-bold leading-tight text-[#6EC1AE]">
              Status: {statusText}
            </div>
          </div>

          <div className="mt-auto inline-flex w-fit max-w-full items-center rounded-md border border-[#1E4775]/15 bg-[#F5F8FC] px-2 py-1.5">
            <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <TokenLogo symbol={collateralSymbol} size={22} />
              <span className="text-[#1E4775]/55">+</span>
              <TokenLogo symbol={peggedSymbol} size={22} />
              <span className="text-[#1E4775]/55">+</span>
              <TokenLogo symbol={leveragedSymbol} size={22} />
            </div>
          </div>
        </div>

        <div className="h-full space-y-2 rounded-md bg-[#F7FAFE] p-4 ring-1 ring-[#1E4775]/10">
          <div className="flex items-center justify-between gap-2">
            <h4 className={sectionHeaderClass}>
              How it works
            </h4>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1E4775]/80 hover:text-[#1E4775]"
              onClick={onToggleExpand}
            >
              Learn more
              {isExpanded ? (
                <ChevronUpIcon className="h-3.5 w-3.5" />
              ) : (
                <ChevronDownIcon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <ol className="space-y-3 text-[13px] leading-snug text-[#1E4775]/95">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#1E4775]/30 text-[10px] font-semibold">
                1
              </span>
              <span>Deposit {collateralSymbol} into the {marketName} market.</span>
            </li>

            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#1E4775]/30 text-[10px] font-semibold">
                2
              </span>
              <span>
                Your deposit is automatically split into {peggedSymbol} + {leveragedSymbol} when genesis ends.
              </span>
            </li>

            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#1E4775]/30 text-[10px] font-semibold">
                3
              </span>
              <span className="leading-snug">
                <strong className="text-[#FF8A7A]">
                  The depositor pool owns 5% of this market&apos;s revenue forever.
                </strong>
                <span className="block">
                  Your share is set by final ownership at Genesis close.
                </span>
              </span>
            </li>

            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#1E4775]/30 text-[10px] font-semibold">
                4
              </span>
              <span>Exit anytime: burn {peggedSymbol} or {leveragedSymbol} to redeem collateral.</span>
            </li>

            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#1E4775]/30 text-[10px] font-semibold">
                5
              </span>
              <span>Keep your positions to ride volatility and earn yield.</span>
            </li>
          </ol>
        </div>

        <div className="h-full rounded-md border border-[#1E4775]/12 p-3.5 flex flex-col gap-2.5">
          <div className="space-y-1.5">
            <div className={sectionHeaderClass}>
              Your deposit
            </div>
            <div className="text-xl leading-none font-semibold">{userDepositDisplay}</div>
          </div>

          {showMaintenanceTag ? (
            <div className="flex items-center">
              <MarketMaintenanceTag />
            </div>
          ) : showClaimAction ? (
            <button
              type="button"
              className={primaryActionClass}
              disabled={disableClaim}
              onClick={onClaim}
            >
              {isClaiming ? "Claiming..." : "Claim"}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={primaryActionClass}
                disabled={disableManage}
                onClick={onDeposit}
              >
                Deposit
              </button>
              <button
                type="button"
                className={secondaryActionClass}
                disabled={disableManage || !canWithdraw}
                onClick={onWithdraw}
              >
                Withdraw
              </button>
            </div>
          )}

          {capData && !isEnded && (
            <div className="mt-auto space-y-1.5 pt-2">
              <div className={`${sectionHeaderClass} font-bold`}>
                Early Depositor Advantage
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-[#FF8A7A]/40 bg-[#1E4775]/10">
                <div
                  className={`h-full rounded-full ${
                    capData.capFilled ? "bg-[#9AA5B8]" : "bg-[#FF8A7A]"
                  }`}
                  style={{ width: `${Math.max(0, 100 - capData.progressPct)}%` }}
                />
              </div>
              <p className="text-[11px] leading-tight text-[#1E4775]/70 whitespace-nowrap">
                {capData.capFilled ? (
                  <>
                    <span className="font-medium">0%</span> capped ownership still open.
                  </>
                ) : (
                  <>
                    <span className="font-medium">
                      {(100 - capData.progressPct).toFixed(0)}%
                    </span>{" "}
                    capped ownership still open.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {capData && !isEnded && (
        <div className="border-t border-[#1E4775]/10 bg-[#FAFCFF] px-4 py-3">
          <div className="mb-1 flex items-center gap-2">
            <SimpleTooltip
              label={
                <span className="block max-w-xs text-xs leading-relaxed">
                  Deposits count toward this market&apos;s cap. At genesis close,
                  your counted deposit share sets your maiden-yield ownership share.
                </span>
              }
            >
              <span className="inline-flex cursor-help items-center gap-1 text-[11px] font-semibold text-[#1E4775]">
                Deposit cap
                <InformationCircleIcon className="h-3.5 w-3.5 text-[#1E4775]/60" />
              </span>
            </SimpleTooltip>
            <span className="text-[11px] text-[#1E4775]/70 mr-auto">
              {capData.useTokenCap
                ? `${capData.capCurrent.toFixed(2)} ${capData.collateralSymbol} / ${capData.tokenCapAmount.toFixed(0)} ${capData.collateralSymbol}`
                : `${formatUSD(capData.capCurrentUsd)} / ${formatUSD(capData.capTotalUsd)}`}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full border border-[#1E4775]/20 bg-[#DDE6F2]">
                <div
                  className={`h-full rounded-full transition-all ${
                    capData.capFilled ? "bg-[#9AA5B8]" : "bg-[#FF8A7A]"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-[#1E4775]/75 tabular-nums">
                {progressPct.toFixed(0)}%
              </span>
            </div>
          </div>
          {capData.yieldRevSharePct != null && (
            <p className="mt-1 text-[11px] text-[#1E4775]/80">
              {capData.yieldRevSharePct}% of attributed fee/carry is distributed to
              owners.
            </p>
          )}
          {(capData.ownershipShare > 0 ||
            (capData.countedUsd > 0 && capData.ownershipShare === 0)) && (
            <p className="mt-0.5 text-[11px] text-[#1E4775]/75">
              {capData.ownershipShare > 0 ? (
                <>
                  Your ownership at end:{" "}
                  <span className="font-semibold text-[#1E4775]">
                    {(capData.ownershipShare * 100).toFixed(2)}%
                  </span>
                </>
              ) : (
                <>Counted toward cap: {formatUSD(capData.countedUsd)}</>
              )}
            </p>
          )}
        </div>
      )}

      {isExpanded && expandedContent ? (
        <div className="overflow-hidden border-t border-[#1E4775]/10 px-4 py-3">
          {expandedContent}
        </div>
      ) : null}
    </article>
  );
}
