"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

/** Match chain badge + status + expanded APR: one corner radius family on the card. */
const GENESIS_CARD_CONTROL_RADIUS = "rounded-xl";

const primaryActionClass =
  `w-full ${GENESIS_CARD_CONTROL_RADIUS} bg-[#153B63] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0F2F52] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#153B63]/30 disabled:cursor-not-allowed disabled:bg-[#153B63]/35`;
const secondaryActionClass =
  `w-full ${GENESIS_CARD_CONTROL_RADIUS} border border-[#1E4775]/20 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1E4775] transition hover:bg-[#1E4775]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4775]/15 disabled:cursor-not-allowed disabled:text-[#64748b] disabled:border-[#CBD5E1] disabled:bg-[#F8FAFC]`;
const sectionHeaderClass =
  "text-xs font-semibold uppercase tracking-wide text-[#1E4775]/80";

/** Match `TokenLogo` `size` for the left market icon (used for status bar width math). */
const MARKET_ICON_PX = 80;

const TOKEN_STRIP_ICON_PX = 36;
/** `gap-3` between icon column and text column */
const HEADER_GAP_PX = 12;

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
  const availablePct = capData ? Math.min(100, Math.max(0, 100 - progressPct)) : 0;
  const statusVisual: { variant: "open" | "warning" | "neutral" | "claim"; dotClass: string; text: string } =
    (() => {
      if (showMaintenanceTag || statusText === "Maintenance") {
        return {
          variant: "neutral",
          dotClass: "bg-[#7B8794]",
          text: "Maintenance",
        };
      }
      if (isEnded || statusText === "Ended") {
        return {
          variant: "neutral",
          dotClass: "bg-[#7B8794]",
          text: "Ended",
        };
      }
      if (statusText === "Processing") {
        return {
          variant: "warning",
          dotClass: "bg-[#E8922E]",
          text: "Processing",
        };
      }
      if (statusText === "Claim available") {
        return {
          variant: "claim",
          dotClass: "bg-[#E85D4F]",
          text: "Claim available",
        };
      }
      return {
        variant: "open",
        dotClass: "bg-[#4A9784]",
        text: "Genesis Open",
      };
    })();

  const statusPillSurfaceClass =
    statusVisual.variant === "open"
      ? "border border-[#10141A]/12 bg-[#B8EBD5] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_22px_-14px_rgba(30,119,117,0.35)]"
      : statusVisual.variant === "warning"
        ? "border border-amber-500/22 bg-gradient-to-b from-[#FFF8ED] via-[#FFF4E3] to-[#FFEEDA] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_28px_-20px_rgba(232,146,46,0.3)]"
        : statusVisual.variant === "claim"
          ? "border border-[#E85D4F]/22 bg-gradient-to-b from-[#FFF5F3] via-[#FFEDE9] to-[#FFE4DE] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_28px_-18px_rgba(232,93,79,0.28)]"
          : "border border-slate-400/18 bg-gradient-to-b from-[#F3F6F9] via-[#EEF2F7] to-[#E6EBF3] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-20px_rgba(30,71,117,0.12)]";

  const statusPillLabelClass =
    statusVisual.variant === "open"
      ? "text-[#4A9784]"
      : statusVisual.variant === "warning"
        ? "text-[#7a4d12]"
        : statusVisual.variant === "claim"
          ? "text-[#8b2f26]"
          : "text-[#3d4a58]";
  const primaryMarketIcon =
    collateralSymbol.toLowerCase() === "wsteth" ? "stETH" : collateralSymbol;

  const isMegaEthChainBadge = chainName.trim().toLowerCase() === "megaeth";

  const chainBadgeShellClass = isMegaEthChainBadge
    ? `flex min-h-0 min-w-0 w-full flex-wrap items-center justify-center gap-2.5 ${GENESIS_CARD_CONTROL_RADIUS} border border-white/[0.09] bg-gradient-to-br from-[#0f2832] via-[#1a253e] to-[#321a3a] px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_12px_36px_-20px_rgba(10,8,24,0.48)] ring-1 ring-black/[0.05]`
    : `flex min-h-0 min-w-0 w-full flex-wrap items-center justify-center gap-2 ${GENESIS_CARD_CONTROL_RADIUS} border border-[#10141A]/10 bg-gradient-to-b from-[#1E4775] to-[#153B56] px-2.5 py-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_10px_24px_-16px_rgba(30,71,117,0.35)]`;

  const chainBadgeIconWrapClass = isMegaEthChainBadge
    ? "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#EEF2F7] shadow-[inset_0_0_0_1px_rgba(16,20,26,0.05),0_1px_4px_-1px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.045] [&_svg]:contrast-[1.04]"
    : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFFFFF] shadow-[inset_0_0_0_1px_rgba(16,20,26,0.06)]";

  const chainBadgeLabelClass = isMegaEthChainBadge
    ? "pr-0.5 text-[14px] font-black leading-none tracking-[0.05em] text-[#FAFCFF] antialiased sm:text-[15px]"
    : "pr-0.5 text-sm font-semibold tracking-tight text-[#FFFFFF]";

  const brandStackRef = useRef<HTMLDivElement>(null);
  const [statusBarTotalWidthPx, setStatusBarTotalWidthPx] = useState<number | undefined>(
    undefined,
  );

  useLayoutEffect(() => {
    const el = brandStackRef.current;
    if (!el) return;

    const measure = () => {
      const w = Math.ceil(el.getBoundingClientRect().width);
      setStatusBarTotalWidthPx(MARKET_ICON_PX + HEADER_GAP_PX + w);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [marketName, chainName, chainLogo]);

  return (
    <article className="overflow-hidden rounded-xl bg-white text-[#1E4775] shadow-[0_16px_40px_-30px_rgba(0,0,0,0.55)] ring-1 ring-black/5">
      <div className="grid gap-5 px-5 py-5 md:grid-cols-2 md:items-stretch lg:grid-cols-[auto_minmax(0,1.95fr)_minmax(0,1fr)] lg:gap-x-0 lg:gap-y-5">
        <div className="flex h-full max-w-full w-fit flex-col justify-self-start py-2 min-w-0 lg:pr-6">
          <div className="flex w-fit max-w-full min-w-0 items-center gap-3">
            <TokenLogo
              symbol={primaryMarketIcon}
              size={MARKET_ICON_PX}
              className="translate-y-[3px] shrink-0 shadow-[0_10px_24px_-16px_rgba(16,20,26,0.35)] ring-1 ring-[#10141A]/6"
            />
            <div
              ref={brandStackRef}
              className="inline-grid max-w-full min-w-0 grid-cols-1 gap-2"
            >
              <h3 className="min-w-0 w-full text-left text-xl font-bold tracking-tight text-[#1E4775] sm:text-[22px]">
                {marketName}
              </h3>
              <span className={chainBadgeShellClass}>
                <span className={chainBadgeIconWrapClass}>
                  <NetworkIconCell
                    chainName={chainName}
                    chainLogo={chainLogo}
                    size={isMegaEthChainBadge ? 28 : 22}
                  />
                </span>
                <span className={chainBadgeLabelClass}>{chainName}</span>
              </span>
            </div>
          </div>

          <div className="mt-3 min-w-0">
            <span
              className={`box-border inline-flex min-w-0 max-w-full items-center justify-center gap-3 ${GENESIS_CARD_CONTROL_RADIUS} px-3.5 py-2.5 sm:px-4 ${statusPillSurfaceClass}`}
              style={
                statusBarTotalWidthPx != null
                  ? {
                      width: statusBarTotalWidthPx,
                      maxWidth: "100%",
                    }
                  : undefined
              }
            >
              <span
                className={
                  statusVisual.variant === "open"
                    ? `h-2 w-2 shrink-0 rounded-full bg-[#4A9784] shadow-[0_0_0_3px_rgba(255,255,255,0.75)] animate-genesis-status-open-dot`
                    : `h-2 w-2 shrink-0 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.75)] ${statusVisual.dotClass}`
                }
              />
              <span
                className={`shrink min-w-0 text-[13px] font-medium leading-snug tracking-normal sm:text-sm ${statusPillLabelClass}`}
              >
                <span className="mr-1 inline">Status:</span>
                <span className="font-semibold">{statusVisual.text}</span>
              </span>
            </span>
          </div>

          <div
            className="mt-4 flex min-w-0 shrink-0 justify-center pt-0"
            style={
              statusBarTotalWidthPx != null
                ? { width: statusBarTotalWidthPx, maxWidth: "100%" }
                : { width: "100%", maxWidth: "100%" }
            }
          >
            <div className="inline-flex items-center gap-3 whitespace-nowrap text-[#10141A]/55">
              <SimpleTooltip label={collateralSymbol} className="cursor-help">
                <TokenLogo symbol={collateralSymbol} size={TOKEN_STRIP_ICON_PX} className="ring-0" />
              </SimpleTooltip>
              <span aria-hidden className="text-base">
                =
              </span>
              <SimpleTooltip label={peggedSymbol} className="cursor-help">
                <TokenLogo symbol={peggedSymbol} size={TOKEN_STRIP_ICON_PX} className="ring-0" />
              </SimpleTooltip>
              <span aria-hidden className="text-base">
                +
              </span>
              <SimpleTooltip label={leveragedSymbol} className="cursor-help">
                <TokenLogo symbol={leveragedSymbol} size={TOKEN_STRIP_ICON_PX} className="ring-0" />
              </SimpleTooltip>
            </div>
          </div>
        </div>

        <div className="h-full min-w-0 space-y-2 border-t border-[#1E4775]/12 py-2 pt-5 md:border-l md:border-t-0 md:pl-5 md:pt-2 lg:pl-6 lg:pr-4">
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
          <ul className="space-y-3 text-[13px] leading-snug text-[#1E4775]/90">
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E4775]/40" />
              <span>
                Deposit {collateralSymbol} into the {marketName} market.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E4775]/40" />
              <span>
                Your deposit is automatically split into {peggedSymbol} + {leveragedSymbol} when
                genesis ends.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E4775]/40" />
              <span className="leading-snug">
                <strong className="text-[#FF8A7A]">
                  The depositor pool owns 5% of this market&apos;s revenue forever.
                </strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E4775]/40" />
              <span>Your share is set by final ownership at Genesis close.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E4775]/40" />
              <span>
                Exit anytime: burn {peggedSymbol} or {leveragedSymbol} to redeem collateral.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E4775]/40" />
              <span>Keep your positions to ride volatility and earn yield.</span>
            </li>
          </ul>
        </div>

        <div className="flex h-full min-w-0 flex-col gap-3 border-t border-[#1E4775]/12 py-2 pt-5 md:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-2">
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
            <div className="flex flex-col gap-2">
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
            <div className="mt-auto space-y-2.5 pt-1">
              <div className={`${sectionHeaderClass} font-bold`}>
                Early depositor advantage
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-[#FF8A7A]/40 bg-[#1E4775]/10">
                <div
                  className={`h-full rounded-full ${
                    capData.capFilled ? "bg-[#9AA5B8]" : "bg-[#FF8A7A]"
                  }`}
                  style={{ width: `${Math.max(0, 100 - capData.progressPct)}%` }}
                />
              </div>
              <p className="text-[11px] leading-tight text-[#1E4775]/65">
                {capData.capFilled ? (
                  <>
                    <span className="font-medium text-[#1E4775]/80">0%</span>{" "}
                    capped ownership still open.
                  </>
                ) : (
                  <>
                    <span className="font-medium text-[#1E4775]/80">
                      {availablePct.toFixed(0)}%
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
        <div className="border-t border-black/5 bg-[#FAFCFF] px-5 py-3.5">
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
                Genesis allocation
                <InformationCircleIcon className="h-3.5 w-3.5 text-[#1E4775]/60" />
              </span>
            </SimpleTooltip>
            <span className="text-[11px] text-[#1E4775]/70 mr-auto">
              {capData.useTokenCap
                ? `${availablePct.toFixed(0)}% of ${capData.tokenCapAmount.toFixed(0)} ${capData.collateralSymbol} still available for early depositors`
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
                {availablePct.toFixed(0)}%
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
        <div className="overflow-hidden border-t border-[#1E4775]/12 bg-white px-5 py-4">
          {expandedContent}
        </div>
      ) : null}
    </article>
  );
}
