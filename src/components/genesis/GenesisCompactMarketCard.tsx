"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import NetworkIconCell from "@/components/NetworkIconCell";
import { MarketMaintenanceTag } from "@/components/MarketMaintenanceTag";
import { TokenLogo } from "@/components/shared";
import SimpleTooltip from "@/components/SimpleTooltip";
import {
  BASIC_MARKET_FEATURE_BODY_CLASS,
  HARBOR_GENESIS_PRIMARY_CTA_CLASS,
  HARBOR_GENESIS_SECONDARY_CTA_CLASS,
} from "@/components/market-cards/harborBasicMarketTokens";
import { formatUSD } from "@/utils/formatters";
import type { GenesisDepositCapData } from "@/utils/genesisDepositCap";

/** Match chain badge + status + expanded APR: one corner radius family on the card. */
const GENESIS_CARD_CONTROL_RADIUS = "rounded-xl";

/** MegaETH badge + Genesis status: same outer height; content vertically centered inside. */
const GENESIS_LEFT_RAIL_CHIP_HEIGHT = "box-border h-12 min-h-12";
const GENESIS_LEFT_RAIL_CHIP_INSET_X = "px-3.5 sm:px-4";

/** Primary Deposit / Claim — Nautical Blue + compact padding (`harborBasicMarketTokens`). */
const primaryActionClass = HARBOR_GENESIS_PRIMARY_CTA_CLASS;
const secondaryActionClass = HARBOR_GENESIS_SECONDARY_CTA_CLASS;
const sectionHeaderClass =
  "text-xs font-semibold uppercase tracking-wide text-[#1E4775]/80";

/** Match `TokenLogo` `size` for the left market icon. */
const MARKET_ICON_PX = 80;
/** Smallest `ch` width for the title rail; longer `marketName` values grow the rail naturally (e.g. FXUSD-GOLD). */
const COMPACT_CARD_TITLE_MIN_CH_FLOOR = 8;
/**
 * Floor for chain + status pill width (px) when title is shorter; below full title `ch` width so
 * `fr` columns grow. Keep in sync with `lg:min-w-[…px]` on the left rail.
 */
const COMPACT_CARD_STATUS_RAIL_MIN_PX = 256;

/** Vertical token equation column (between How it works and Your deposit). */
const VERTICAL_TOKEN_STRIP_ICON_PX = 32;
/** Token strip column (lg grid col 3): `calc(5.5rem + 10px)` in `lg:grid-cols-[…]` below. */
/** MegaETH pill: disc stays compact; network glyph is sized up inside the disc. */
const MEGAETH_CHAIN_DISC_PX = 34;
const MEGAETH_CHAIN_NETWORK_ICON_PX = 32;

/** Extra px so chain/status pills are slightly wider than the icon+title row (“Status: Genesis Open” one line). */
const LEFT_RAIL_WIDTH_BUFFER_PX = 16;

/** Labels under vertical strip icons (canonical casing: wstETH, haUSD, hsSTETH-USD, …). */
function compactStripTokenLabel(symbol: string): string {
  const s = symbol.trim();
  const lower = s.toLowerCase();
  if (lower === "wsteth") return "wstETH";
  if (lower === "steth") return "stETH";
  if (lower === "fxsave") return "fxSAVE";
  if (lower === "fxusd") return "fxUSD";
  if (lower === "hausd") return "haUSD";
  if (lower === "usdc") return "USDC";
  if (lower === "eth") return "ETH";
  if (lower.startsWith("hs")) return `hs${s.slice(2)}`;
  if (lower.startsWith("ha")) return `ha${s.slice(2)}`;
  return s;
}

/** Used token amount beside progress bar: always round down to two decimals. */
function floorTokenAmountTwoDecimals(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "0.00";
  return (Math.floor(amount * 100) / 100).toFixed(2);
}

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
  /** Maiden voyage preview (`genesisActive: "soon"`): grey card, no deposits. */
  isGenesisPreviewSoon?: boolean;
  /** `genesisActive: "completed"`: no new deposits/withdrawals; claim when market ended. */
  isGenesisClaimOnlyConfig?: boolean;
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
  isGenesisPreviewSoon = false,
  isGenesisClaimOnlyConfig = false,
}: GenesisCompactMarketCardProps) {
  const previewSoon = Boolean(isGenesisPreviewSoon);
  const claimOnlyCfg = Boolean(isGenesisClaimOnlyConfig);
  const blockConfiguredDeposits = previewSoon || claimOnlyCfg;

  const compactTitleMinCh = Math.max(
    COMPACT_CARD_TITLE_MIN_CH_FLOOR,
    marketName.trim().length,
  );

  const showClaimAction = isEnded && !showMaintenanceTag;
  const disableClaim =
    !hasClaimable || isClaiming || previewSoon;
  const disableManage = isProcessing || showMaintenanceTag || isEnded || blockConfiguredDeposits;
  const progressPct = capData ? Math.min(100, Math.max(0, capData.progressPct)) : 0;
  const availablePct = capData ? Math.min(100, Math.max(0, 100 - progressPct)) : 0;
  const statusVisual: { variant: "open" | "warning" | "neutral" | "claim"; dotClass: string; text: string } =
    (() => {
      if (previewSoon) {
        return {
          variant: "neutral",
          dotClass: "bg-slate-400",
          text: "Opening soon",
        };
      }
      if (claimOnlyCfg && !isEnded) {
        return {
          variant: "neutral",
          dotClass: "bg-slate-500",
          text: "Deposits closed",
        };
      }
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
    ? `flex flex-nowrap min-h-0 min-w-0 w-full items-center justify-center gap-2.5 ${GENESIS_CARD_CONTROL_RADIUS} ${GENESIS_LEFT_RAIL_CHIP_HEIGHT} ${GENESIS_LEFT_RAIL_CHIP_INSET_X} border border-white/[0.09] bg-gradient-to-br from-[#0f2832] via-[#1a253e] to-[#321a3a] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_12px_36px_-20px_rgba(10,8,24,0.48)] ring-1 ring-black/[0.05]`
    : `flex min-h-0 min-w-0 w-full flex-wrap items-center justify-center gap-2 ${GENESIS_CARD_CONTROL_RADIUS} border border-[#10141A]/10 bg-gradient-to-b from-[#1E4775] to-[#153B56] px-2.5 py-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_10px_24px_-16px_rgba(30,71,117,0.35)]`;

  const chainBadgeIconEthereumWrapClass =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFFFFF] shadow-[inset_0_0_0_1px_rgba(16,20,26,0.06)]";
  const chainBadgeIconMegaEthWrapClass =
    "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEF2F7] shadow-[inset_0_0_0_1px_rgba(16,20,26,0.05),0_1px_4px_-1px_rgba(0,0,0,0.35)] [&_svg]:contrast-[1.04]";

  const chainBadgeLabelClass = isMegaEthChainBadge
    ? "pr-0.5 text-[14px] font-black leading-none tracking-[0.05em] text-[#FAFCFF] antialiased sm:text-[15px]"
    : "pr-0.5 text-sm font-semibold tracking-tight text-[#FFFFFF]";

  /** Icon + market title row only — chain, status, and token strip match this width (left: icon edge, right: title edge). */
  const headerTitleRowRef = useRef<HTMLDivElement>(null);
  const [statusBarTotalWidthPx, setStatusBarTotalWidthPx] = useState<number | undefined>(
    undefined,
  );

  useLayoutEffect(() => {
    const el = headerTitleRowRef.current;
    if (!el) return;

    const measure = () => {
      const w = Math.ceil(el.getBoundingClientRect().width);
      setStatusBarTotalWidthPx(
        Math.max(w + LEFT_RAIL_WIDTH_BUFFER_PX, COMPACT_CARD_STATUS_RAIL_MIN_PX)
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [marketName, primaryMarketIcon]);

  return (
    <article
      className={`overflow-hidden rounded-xl bg-white text-[#1E4775] shadow-[0_16px_40px_-30px_rgba(0,0,0,0.55)] ring-1 ring-black/5 ${
        blockConfiguredDeposits ? "relative opacity-[0.92] saturate-[0.72]" : ""
      }`}
    >
      {/* lg: `1.15fr` / `2.7fr` / strip / `1.15fr` — outer cols equal */}
      <div className="grid gap-4 px-4 py-4 md:grid-cols-2 md:items-stretch lg:grid-cols-[minmax(0,_1.15fr)_minmax(0,_2.7fr)_calc(5.5rem_+_10px)_minmax(0,_1.15fr)] lg:items-stretch lg:gap-x-0 lg:gap-y-4">
        <div
          className="flex h-full min-h-0 min-w-0 max-w-full w-full flex-col py-2 lg:pr-4"
          style={{
            minWidth: `min(100%, calc(${MARKET_ICON_PX}px + 0.75rem + ${compactTitleMinCh}ch))`,
          }}
        >
          {/* Equal gap (gap-3) between icon+title row, chain, and status; rail width matches measured header + buffer */}
          <div className="flex w-full min-w-0 max-w-full flex-col gap-3">
            <div
              ref={headerTitleRowRef}
              className="flex w-fit max-w-full min-w-0 items-center gap-3"
              style={{
                minWidth: `calc(${MARKET_ICON_PX}px + 0.75rem + ${compactTitleMinCh}ch)`,
              }}
            >
              <TokenLogo
                symbol={primaryMarketIcon}
                size={MARKET_ICON_PX}
                className="translate-y-[3px] shrink-0 ring-2 ring-[#1E4775]/40 shadow-[0_0_0_1px_rgba(30,71,117,0.28),0_0_40px_-4px_rgba(30,71,117,0.52),0_10px_60px_-16px_rgba(30,71,117,0.42),0_0_80px_-6px_rgba(30,71,117,0.2)]"
              />
              <h3
                className="shrink-0 text-left text-xl font-bold tracking-tight text-[#1E4775] sm:text-[22px]"
                style={{ minWidth: `${compactTitleMinCh}ch` }}
              >
                {marketName}
              </h3>
            </div>
            <div
              className="min-w-0 max-w-full shrink-0 self-start"
              style={
                statusBarTotalWidthPx != null
                  ? {
                      width: statusBarTotalWidthPx,
                      maxWidth: "100%",
                    }
                  : undefined
              }
            >
              <span className={chainBadgeShellClass}>
                <span
                  className={
                    isMegaEthChainBadge
                      ? chainBadgeIconMegaEthWrapClass
                      : chainBadgeIconEthereumWrapClass
                  }
                  style={
                    isMegaEthChainBadge
                      ? {
                          width: MEGAETH_CHAIN_DISC_PX,
                          height: MEGAETH_CHAIN_DISC_PX,
                        }
                      : undefined
                  }
                >
                  <NetworkIconCell
                    chainName={chainName}
                    chainLogo={chainLogo}
                    size={isMegaEthChainBadge ? MEGAETH_CHAIN_NETWORK_ICON_PX : 22}
                  />
                </span>
                <span className={chainBadgeLabelClass}>{chainName}</span>
              </span>
            </div>

            <div className="min-w-0 max-w-full self-start">
              <span
                className={`flex min-w-0 max-w-full items-center justify-center gap-2 ${GENESIS_CARD_CONTROL_RADIUS} ${GENESIS_LEFT_RAIL_CHIP_HEIGHT} ${GENESIS_LEFT_RAIL_CHIP_INSET_X} ${statusPillSurfaceClass}`}
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
                  className={`text-center text-[13px] font-black leading-tight tracking-[0.04em] antialiased sm:text-[14px] ${statusPillLabelClass}`}
                >
                  <span className="mr-1 inline">Status:</span>
                  <span>{statusVisual.text}</span>
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-0 min-w-0 flex-col border-t border-[#1E4775]/12 py-2 pt-5 md:border-l md:border-t-0 md:pl-4 md:pt-2 lg:pl-5 lg:pr-3">
          <div className="flex shrink-0 items-start justify-between gap-2">
            <h4 className={`${sectionHeaderClass} leading-none`}>
              How it works
            </h4>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 self-center text-[11px] font-medium text-[#1E4775]/80 hover:text-[#1E4775]"
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
          <ul className={`mt-2 flex min-h-0 flex-1 flex-col justify-between gap-y-2 lg:mt-2 lg:gap-y-0 ${BASIC_MARKET_FEATURE_BODY_CLASS}`}>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#10141A]/35" aria-hidden />
              <span>
                Deposit {collateralSymbol} into the {marketName} market.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#10141A]/35" aria-hidden />
              <span>
                Your deposit is automatically split into {peggedSymbol} + {leveragedSymbol} when
                genesis ends.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#10141A]/35" aria-hidden />
              <span className="leading-snug">
                <strong className="text-[#FF8A7A]">
                  The depositor pool owns 5% of this market&apos;s revenue forever.
                </strong>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#10141A]/35" aria-hidden />
              <span>Your share is set by final ownership at Genesis close.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#10141A]/35" aria-hidden />
              <span>
                Exit anytime: burn {peggedSymbol} or {leveragedSymbol} to redeem collateral.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#10141A]/35" aria-hidden />
              <span>Keep your positions to ride volatility and earn yield.</span>
            </li>
          </ul>
        </div>

        {/* Collateral → anchor + sail; full column height like “How it works” bullets (justify-between) */}
        <div
          className="flex h-full min-h-0 min-w-0 flex-col items-center justify-between self-stretch border-t border-[#1E4775]/12 py-3 pt-5 md:border-l md:border-t-0 md:py-3 md:pt-2 lg:border-x lg:px-0.5 lg:pb-4 lg:pt-[11px]"
          aria-label={`${compactStripTokenLabel(collateralSymbol)} splits into ${compactStripTokenLabel(peggedSymbol)} and ${compactStripTokenLabel(leveragedSymbol)}`}
        >
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <SimpleTooltip label={collateralSymbol} className="cursor-help">
              <TokenLogo
                symbol={collateralSymbol}
                size={VERTICAL_TOKEN_STRIP_ICON_PX}
                className="ring-0"
              />
            </SimpleTooltip>
            <span className="max-w-[6rem] truncate text-center font-mono text-[10px] font-semibold tracking-wide text-[#1E4775]/65">
              {compactStripTokenLabel(collateralSymbol)}
            </span>
          </div>
          <ArrowDownIcon
            aria-hidden
            className="h-4 w-4 shrink-0 text-[#1E4775]/35"
          />
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <SimpleTooltip label={peggedSymbol} className="cursor-help">
              <TokenLogo
                symbol={peggedSymbol}
                size={VERTICAL_TOKEN_STRIP_ICON_PX}
                className="ring-0"
              />
            </SimpleTooltip>
            <span className="max-w-[6rem] truncate text-center font-mono text-[10px] font-semibold tracking-wide text-[#1E4775]/65">
              {compactStripTokenLabel(peggedSymbol)}
            </span>
          </div>
          <div className="flex min-w-0 max-w-full shrink-0 flex-col items-center gap-0.5 px-0.5">
            <SimpleTooltip label={leveragedSymbol} className="cursor-help">
              <TokenLogo
                symbol={leveragedSymbol}
                size={VERTICAL_TOKEN_STRIP_ICON_PX}
                className="ring-0"
              />
            </SimpleTooltip>
            <span className="w-full max-w-[min(100%,7.5rem)] truncate text-center font-mono text-[10px] font-semibold tracking-wide text-[#1E4775]/65">
              {compactStripTokenLabel(leveragedSymbol)}
            </span>
          </div>
        </div>

        <div className="flex h-full min-h-0 min-w-0 flex-col gap-2.5 border-t border-[#1E4775]/12 py-2 pt-5 md:border-l md:border-t-0 md:pl-4 md:pt-2 lg:col-span-1 lg:border-l-0 lg:pl-4 lg:pt-2">
          <div className="space-y-1.5">
            <div className={`${sectionHeaderClass} leading-none`}>
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

          {capData && !isEnded && !previewSoon && (
            <div className="mt-auto space-y-2.5 pt-1">
              <div className={`${sectionHeaderClass} font-bold`}>
                Early depositor advantage
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-[#B8EBD5]/50 bg-[#1E4775]/10">
                <div
                  className={`h-full rounded-full ${
                    capData.capFilled ? "bg-[#9AA5B8]" : "bg-[#B8EBD5]"
                  }`}
                  style={{ width: `${Math.max(0, 100 - capData.progressPct)}%` }}
                />
              </div>
              <p className="text-[11px] leading-snug text-[#1E4775]/55">
                <span className="font-semibold tabular-nums text-[#1E4775]/70">
                  {availablePct.toFixed(0)}%
                </span>{" "}
                capped ownership still open.
              </p>
            </div>
          )}
        </div>
      </div>

      {capData && !isEnded && !previewSoon && (
        <div className="border-t border-black/5 bg-[#FAFCFF] px-4 py-3">
          <div className="mb-1 flex items-center gap-2">
            <SimpleTooltip
              label={
                <span className="flex max-w-xs flex-col gap-2 text-xs leading-relaxed">
                  <span>
                    Deposits count toward this market&apos;s cap. At genesis close,
                    your counted deposit share sets your maiden-yield ownership share.
                  </span>
                  {capData.useTokenCap ? (
                    <span className="font-medium leading-snug text-[#FF8A7A]">
                      {availablePct.toFixed(0)}% of {capData.tokenCapAmount.toFixed(0)}{" "}
                      {compactStripTokenLabel(capData.collateralSymbol)} still available for
                      early depositors.
                    </span>
                  ) : (
                    <span className="font-medium leading-snug text-[#FF8A7A]">
                      {formatUSD(capData.capCurrentUsd)} cumulative toward a{" "}
                      {formatUSD(capData.capTotalUsd)} cap ({availablePct.toFixed(0)}% headroom
                      for early depositors).
                    </span>
                  )}
                </span>
              }
            >
              <span className="inline-flex cursor-help items-center gap-1 text-[11px] font-semibold text-[#1E4775]">
                Genesis allocation
                <InformationCircleIcon className="h-3.5 w-3.5 text-[#1E4775]/60" />
              </span>
            </SimpleTooltip>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full border border-[#B8EBD5]/35 bg-[#DDE6F2]">
                <div
                  className={`h-full rounded-full transition-all ${
                    capData.capFilled ? "bg-[#9AA5B8]" : "bg-[#B8EBD5]"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="max-w-[min(100%,11rem)] shrink-0 text-right text-[11px] font-semibold leading-tight text-[#1E4775]/75 tabular-nums">
                {capData.useTokenCap ? (
                  <>
                    {floorTokenAmountTwoDecimals(capData.capCurrent)} /{" "}
                    {capData.tokenCapAmount.toFixed(0)}{" "}
                    {compactStripTokenLabel(capData.collateralSymbol)}
                  </>
                ) : (
                  <>
                    {formatUSD(capData.capCurrentUsd)} / {formatUSD(capData.capTotalUsd)}
                  </>
                )}
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
        <div className="overflow-hidden border-t border-[#1E4775]/12 bg-white px-4 py-3.5">
          {expandedContent}
        </div>
      ) : null}
    </article>
  );
}
