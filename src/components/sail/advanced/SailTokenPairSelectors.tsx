"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { TokenLogo } from "@/components/shared";
import {
  buildSailTokenGroups,
  findSailTokenGroupForMarket,
  pickDefaultSailPairMarketId,
  type SailPairOption,
  type SailTokenGroup,
} from "@/utils/sailMarketSelectors";
import { formatLeverage } from "@/utils/sailDisplayFormat";
import {
  sailDropdownPositionToneClass,
  type SailDropdownPositionTone,
} from "@/utils/sailMarketDropdownPosition";
import type { SailMarketDropdownOption } from "./SailMarketDropdown";
import { SAIL_ADVANCED_FROSTED_LIGHT_PANEL } from "./sailAdvancedStyles";

const DROPDOWN_MENU_CLASS = `absolute left-0 top-[calc(100%+0.35rem)] z-[120] min-w-full w-max max-w-[min(100vw-2rem,22rem)] max-h-80 overflow-y-auto rounded-xl shadow-2xl ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL} p-1.5`;

const DROPDOWN_TRIGGER_CLASS = `flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:brightness-[1.02] ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL}`;

const OPTION_ACTIVE = "bg-[#1E4775]/10";
const OPTION_HOVER = "hover:bg-[#1E4775]/[0.06]";
const TITLE_CLASS = "truncate text-sm font-semibold text-[#1E4775]";
const TRIGGER_TITLE_CLASS =
  "text-base font-semibold leading-tight text-[#1E4775]";
const STATUS_CHIP_CLASS =
  "shrink-0 rounded-full bg-[#1E4775]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#64748b]";
const SECTION_LABEL_CLASS =
  "px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/45";

const SELECTOR_ICON_SIZE = 22;
const TOKEN_FIELD_CLASS = "w-[9.25rem] shrink-0 sm:w-[10.25rem]";
const PAIR_FIELD_CLASS = "w-[14.5rem] shrink-0 sm:w-[16rem]";
const LEVERAGE_CLASS =
  "font-mono font-semibold tabular-nums text-[#1E4775]/80";
const LEVERAGE_INLINE_CLASS = `${LEVERAGE_CLASS} text-inherit sm:text-inherit`;
const TITLE_SEPARATOR_CLASS = "font-medium text-[#1E4775]/55";
const POSITION_CLASS = "text-xs font-medium tabular-nums";

function formatPositionLabel(label: string): string {
  return label.replace(/^Your position ·\s*/, "");
}

function pairIsMuted(option: SailPairOption): boolean {
  return option.isComingSoon || Boolean(option.isDepositsPaused);
}

function pairStatusChip(option: SailPairOption): string | null {
  if (option.isComingSoon) return "Coming soon";
  if (option.isDepositsPaused) return "Deposits paused";
  return null;
}

function useCloseOnOutsideClick(
  open: boolean,
  onClose: () => void,
  rootRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, rootRef]);
}

function FrostedDropdown({
  label,
  trigger,
  children,
  className = "",
  open,
  onOpenChange,
}: {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useCloseOnOutsideClick(open, () => onOpenChange(false), rootRef);

  return (
    <div
      ref={rootRef}
      className={`relative min-w-0 ${open ? "z-[110]" : ""} ${className}`.trim()}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/55">
        {label}
      </p>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={`${DROPDOWN_TRIGGER_CLASS} w-full`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {trigger}
        <ChevronDownIcon
          className={`ml-auto h-4 w-4 shrink-0 text-[#1E4775]/50 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {open ? (
        <ul className={DROPDOWN_MENU_CLASS} role="listbox">
          {children}
        </ul>
      ) : null}
    </div>
  );
}

function TokenOptionRow({
  group,
  active,
  onSelect,
}: {
  group: SailTokenGroup;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={onSelect}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition ${
          active ? OPTION_ACTIVE : OPTION_HOVER
        }`}
      >
        <TokenLogo symbol={group.tokenLabel} size={SELECTOR_ICON_SIZE} />
        <span className={`min-w-0 flex-1 truncate ${TITLE_CLASS}`}>
          {group.tokenLabel}
        </span>
      </button>
    </li>
  );
}

function PairOptionRow({
  option,
  active,
  leverageRatio,
  hasPosition,
  positionLabel,
  positionTone,
  onSelect,
}: {
  option: SailPairOption;
  active: boolean;
  leverageRatio?: bigint;
  hasPosition?: boolean;
  positionLabel?: string;
  positionTone?: SailDropdownPositionTone;
  onSelect: () => void;
}) {
  const muted = pairIsMuted(option);
  const statusChip = pairStatusChip(option);

  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={onSelect}
        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left transition ${
          muted ? "opacity-90 saturate-[0.78]" : ""
        } ${active ? OPTION_ACTIVE : OPTION_HOVER}`}
      >
        <div
          className={`min-w-0 flex-1 truncate ${TITLE_CLASS} ${
            muted ? "text-[#64748b]" : ""
          }`}
        >
          {option.pairLabel}
          {!muted ? (
            <>
              <span className={TITLE_SEPARATOR_CLASS}> · </span>
              <span className={`text-xs ${LEVERAGE_INLINE_CLASS}`}>
                {formatLeverage(leverageRatio)}
              </span>
            </>
          ) : null}
        </div>
        {statusChip ? (
          <span className={STATUS_CHIP_CLASS}>{statusChip}</span>
        ) : hasPosition && positionLabel ? (
          <div className="min-w-[4.5rem] shrink-0 text-right">
            <div
              className={`${POSITION_CLASS} ${sailDropdownPositionToneClass(positionTone)}`}
            >
              {formatPositionLabel(positionLabel)}
            </div>
          </div>
        ) : null}
      </button>
    </li>
  );
}

export type SailTokenPairSelectorsProps = {
  options: SailMarketDropdownOption[];
  selectedMarketId: string | null;
  onSelectMarket: (marketId: string) => void;
  className?: string;
};

/** Sail token + pair selectors — mirrors Anchor peg/backing layout. */
export function SailTokenPairSelectors({
  options,
  selectedMarketId,
  onSelectMarket,
  className = "",
}: SailTokenPairSelectorsProps) {
  const [tokenOpen, setTokenOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);
  const anyOpen = tokenOpen || pairOpen;

  const tokenGroups = useMemo(
    () =>
      buildSailTokenGroups(
        options.map((o) => ({
          marketId: o.marketId,
          market: o.market,
          isComingSoon: o.isComingSoon,
          isDepositsPaused: o.isDepositsPaused,
        })),
      ),
    [options],
  );

  const selectedGroup = useMemo(
    () => findSailTokenGroupForMarket(tokenGroups, selectedMarketId),
    [tokenGroups, selectedMarketId],
  );

  const selectedPair = useMemo(
    () =>
      selectedGroup?.pairOptions.find((o) => o.marketId === selectedMarketId),
    [selectedGroup, selectedMarketId],
  );

  const optionByMarketId = useMemo(() => {
    const map = new Map<string, SailMarketDropdownOption>();
    for (const option of options) {
      map.set(option.marketId, option);
    }
    return map;
  }, [options]);

  const hasPosition = (marketId: string) =>
    Boolean(optionByMarketId.get(marketId)?.hasPosition);

  const getOptionMeta = (marketId: string) => optionByMarketId.get(marketId);

  const handleSelectToken = (group: SailTokenGroup) => {
    if (group.tokenKey === selectedGroup?.tokenKey) {
      setTokenOpen(false);
      return;
    }
    const nextId = pickDefaultSailPairMarketId(group, hasPosition);
    if (nextId) onSelectMarket(nextId);
    setTokenOpen(false);
    setPairOpen(false);
  };

  const handleSelectPair = (marketId: string) => {
    onSelectMarket(marketId);
    setPairOpen(false);
  };

  if (!selectedGroup || !selectedPair) return null;

  const livePairs = selectedGroup.pairOptions.filter((o) => !o.isComingSoon);
  const comingSoonPairs = selectedGroup.pairOptions.filter((o) => o.isComingSoon);
  const selectedOption = selectedMarketId
    ? getOptionMeta(selectedMarketId)
    : undefined;
  const selectedMuted = pairIsMuted(selectedPair);
  const selectedStatusChip = pairStatusChip(selectedPair);

  return (
    <div
      className={`relative flex w-auto shrink-0 flex-col gap-2.5 sm:flex-row sm:items-end sm:gap-2.5 ${
        anyOpen ? "z-[100]" : ""
      } ${className}`.trim()}
    >
      <FrostedDropdown
        label="Sail token"
        className={TOKEN_FIELD_CLASS}
        open={tokenOpen}
        onOpenChange={(next) => {
          setTokenOpen(next);
          if (next) setPairOpen(false);
        }}
        trigger={
          <>
            <TokenLogo symbol={selectedGroup.tokenLabel} size={SELECTOR_ICON_SIZE} />
            <span className={`min-w-0 flex-1 truncate ${TRIGGER_TITLE_CLASS}`}>
              {selectedGroup.tokenLabel}
            </span>
          </>
        }
      >
        {tokenGroups.map((group) => (
          <TokenOptionRow
            key={group.tokenKey}
            group={group}
            active={group.tokenKey === selectedGroup.tokenKey}
            onSelect={() => handleSelectToken(group)}
          />
        ))}
      </FrostedDropdown>

      <FrostedDropdown
        label="Pair"
        className={PAIR_FIELD_CLASS}
        open={pairOpen}
        onOpenChange={(next) => {
          setPairOpen(next);
          if (next) setTokenOpen(false);
        }}
        trigger={
          <>
            <div
              className={`min-w-0 flex-1 truncate ${TRIGGER_TITLE_CLASS} ${
                selectedMuted ? "text-[#64748b]" : ""
              }`}
            >
              {selectedPair.pairLabel}
              {!selectedMuted ? (
                <>
                  <span className={TITLE_SEPARATOR_CLASS}> · </span>
                  <span className={`text-sm ${LEVERAGE_INLINE_CLASS}`}>
                    {formatLeverage(selectedOption?.leverageRatio)}
                  </span>
                </>
              ) : null}
            </div>
            {selectedStatusChip ? (
              <span className={STATUS_CHIP_CLASS}>{selectedStatusChip}</span>
            ) : selectedOption?.hasPosition && selectedOption.positionLabel ? (
              <div
                className={`hidden shrink-0 truncate sm:block ${POSITION_CLASS} ${sailDropdownPositionToneClass(selectedOption.positionTone)}`}
              >
                {formatPositionLabel(selectedOption.positionLabel)}
              </div>
            ) : null}
            <span className="min-w-0 flex-1" aria-hidden="true" />
          </>
        }
      >
        {livePairs.map((option) => {
          const meta = getOptionMeta(option.marketId);
          return (
            <PairOptionRow
              key={option.marketId}
              option={option}
              active={option.marketId === selectedMarketId}
              leverageRatio={meta?.leverageRatio}
              hasPosition={meta?.hasPosition}
              positionLabel={meta?.positionLabel}
              positionTone={meta?.positionTone}
              onSelect={() => handleSelectPair(option.marketId)}
            />
          );
        })}
        {comingSoonPairs.length > 0 ? (
          <>
            <li className={SECTION_LABEL_CLASS} role="presentation">
              Coming soon
            </li>
            {comingSoonPairs.map((option) => {
              const meta = getOptionMeta(option.marketId);
              return (
                <PairOptionRow
                  key={option.marketId}
                  option={option}
                  active={option.marketId === selectedMarketId}
                  leverageRatio={meta?.leverageRatio}
                  hasPosition={meta?.hasPosition}
                  positionLabel={meta?.positionLabel}
                  positionTone={meta?.positionTone}
                  onSelect={() => handleSelectPair(option.marketId)}
                />
              );
            })}
          </>
        ) : null}
      </FrostedDropdown>
    </div>
  );
}
