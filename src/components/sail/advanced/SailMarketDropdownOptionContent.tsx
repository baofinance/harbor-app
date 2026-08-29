"use client";

import type { DefinedMarket } from "@/config/markets";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import NetworkIconCell from "@/components/NetworkIconCell";
import { formatLeverage } from "@/utils/sailDisplayFormat";
import { formatSailMarketDropdownTitle } from "@/utils/sailMarketDirectionLabels";
import {
  sailDropdownPositionToneClass,
  type SailDropdownPositionTone,
} from "@/utils/sailMarketDropdownPosition";

export const SAIL_MARKET_DROPDOWN_TITLE_CLASS =
  "text-sm font-semibold text-[#1E4775]";
export const SAIL_MARKET_DROPDOWN_TRIGGER_TITLE_CLASS =
  "text-sm font-semibold leading-none text-[#1E4775]";
export const SAIL_MARKET_DROPDOWN_LEVERAGE_BADGE_CLASS =
  "inline-flex shrink-0 items-center rounded-md bg-[#1E4775]/[0.07] px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tabular-nums text-[#1E4775]/70";
/** @deprecated Inline leverage — prefer SailMarketLeverageBadge. */
export const SAIL_MARKET_DROPDOWN_LEVERAGE_INLINE_CLASS =
  "font-mono text-[11px] font-semibold tabular-nums text-[#1E4775]/80 sm:text-xs";
export const SAIL_MARKET_DROPDOWN_TITLE_SEPARATOR_CLASS =
  "font-medium text-[#1E4775]/55";
export const SAIL_MARKET_DROPDOWN_POSITION_CLASS =
  "font-mono text-xs font-semibold tabular-nums leading-none sm:text-sm";
export const SAIL_MARKET_DROPDOWN_STATUS_CHIP_CLASS =
  "shrink-0 rounded-full bg-[#1E4775]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#64748b]";

export function sailMarketOptionStatusChip(option: {
  isComingSoon?: boolean;
  isDepositsPaused?: boolean;
}): string | null {
  if (option.isComingSoon) return "Coming soon";
  if (option.isDepositsPaused) return "Deposits paused";
  return null;
}

export function sailMarketOptionIsMuted(option: {
  isComingSoon?: boolean;
  isDepositsPaused?: boolean;
}): boolean {
  return Boolean(option.isComingSoon || option.isDepositsPaused);
}

type SailMarketLeverageBadgeProps = {
  leverageRatio?: bigint;
  muted?: boolean;
  className?: string;
};

export function SailMarketLeverageBadge({
  leverageRatio,
  muted = false,
  className = "",
}: SailMarketLeverageBadgeProps) {
  if (muted || !leverageRatio) return null;

  return (
    <span
      className={`${SAIL_MARKET_DROPDOWN_LEVERAGE_BADGE_CLASS} ${className}`.trim()}
    >
      {formatLeverage(leverageRatio)}
    </span>
  );
}

type SailMarketDropdownTitleProps = {
  market: DefinedMarket;
  leverageRatio?: bigint;
  muted?: boolean;
  titleClassName?: string;
  /** When false, show the full pair/leverage line in closed triggers. */
  truncateTitle?: boolean;
};

/** Market title with optional leverage badge — matches dropdown option rows. */
export function SailMarketDropdownTitle({
  market,
  leverageRatio,
  muted = false,
  titleClassName = SAIL_MARKET_DROPDOWN_TITLE_CLASS,
  truncateTitle = true,
}: SailMarketDropdownTitleProps) {
  const title = formatSailMarketDropdownTitle(market);

  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 ${
        truncateTitle ? "flex-1" : "shrink-0"
      } ${muted ? "text-[#64748b]" : ""}`}
    >
      <span
        className={`${
          truncateTitle ? "min-w-0 truncate" : "shrink-0 whitespace-nowrap"
        } ${titleClassName} ${muted ? "text-[#64748b]" : ""}`}
      >
        {title}
      </span>
      <SailMarketLeverageBadge leverageRatio={leverageRatio} muted={muted} />
    </div>
  );
}

type SailMarketDropdownPositionProps = {
  label?: string;
  tone?: SailDropdownPositionTone;
  className?: string;
};

export function SailMarketDropdownPosition({
  label,
  tone,
  className = "",
}: SailMarketDropdownPositionProps) {
  if (!label) return null;

  return (
    <div className={`shrink-0 text-right ${className}`.trim()}>
      <div
        className={`${SAIL_MARKET_DROPDOWN_POSITION_CLASS} ${sailDropdownPositionToneClass(tone)}`}
      >
        {label}
      </div>
    </div>
  );
}

type SailMarketDropdownOptionRowContentProps = {
  market: DefinedMarket;
  leverageRatio?: bigint;
  positionLabel?: string;
  positionTone?: SailDropdownPositionTone;
  isComingSoon?: boolean;
  isDepositsPaused?: boolean;
  showChainIcon?: boolean;
  iconSize?: number;
};

/** Shared row body for Sail market dropdown and pair selector lists. */
export function SailMarketDropdownOptionRowContent({
  market,
  leverageRatio,
  positionLabel,
  positionTone,
  isComingSoon,
  isDepositsPaused,
  showChainIcon = true,
  iconSize = 20,
}: SailMarketDropdownOptionRowContentProps) {
  const muted = sailMarketOptionIsMuted({ isComingSoon, isDepositsPaused });
  const statusChip = sailMarketOptionStatusChip({ isComingSoon, isDepositsPaused });

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      {showChainIcon ? (
        <NetworkIconCell
          chainName={harborMarketChainKey(market)}
          chainLogo={market.chain?.logo}
          size={iconSize}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <SailMarketDropdownTitle
          market={market}
          leverageRatio={leverageRatio}
          muted={muted}
          truncateTitle={false}
        />
        {statusChip ? (
          <span className={SAIL_MARKET_DROPDOWN_STATUS_CHIP_CLASS}>
            {statusChip}
          </span>
        ) : positionLabel ? (
          <SailMarketDropdownPosition
            label={positionLabel}
            tone={positionTone}
          />
        ) : null}
      </div>
    </div>
  );
}

type SailMarketDropdownTriggerContentProps = {
  market: DefinedMarket;
  leverageRatio?: bigint;
  positionLabel?: string;
  positionTone?: SailDropdownPositionTone;
  isComingSoon?: boolean;
  isDepositsPaused?: boolean;
  showChainIcon?: boolean;
  iconSize?: number;
};

/** Shared closed trigger for Sail market dropdown and pair selector. */
export function SailMarketDropdownTriggerContent({
  market,
  leverageRatio,
  positionLabel,
  positionTone,
  isComingSoon,
  isDepositsPaused,
  showChainIcon = true,
  iconSize = 20,
}: SailMarketDropdownTriggerContentProps) {
  const muted = sailMarketOptionIsMuted({ isComingSoon, isDepositsPaused });
  const statusChip = sailMarketOptionStatusChip({ isComingSoon, isDepositsPaused });

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      {showChainIcon ? (
        <NetworkIconCell
          chainName={harborMarketChainKey(market)}
          chainLogo={market.chain?.logo}
          size={iconSize}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <SailMarketDropdownTitle
          market={market}
          leverageRatio={leverageRatio}
          muted={muted}
          truncateTitle
          titleClassName={SAIL_MARKET_DROPDOWN_TRIGGER_TITLE_CLASS}
        />
        {statusChip ? (
          <span className={SAIL_MARKET_DROPDOWN_STATUS_CHIP_CLASS}>
            {statusChip}
          </span>
        ) : positionLabel ? (
          <SailMarketDropdownPosition
            label={positionLabel}
            tone={positionTone}
            className="pl-1"
          />
        ) : null}
      </div>
    </div>
  );
}
