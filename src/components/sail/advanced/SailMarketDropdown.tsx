"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { DefinedMarket } from "@/config/markets";
import { SAIL_ADVANCED_FROSTED_LIGHT_PANEL, MARKET_SELECTOR_TRIGGER_CLASS } from "./sailAdvancedStyles";
import {
  SailMarketDropdownOptionRowContent,
  SailMarketDropdownTriggerContent,
} from "./SailMarketDropdownOptionContent";

const SAIL_DROPDOWN_MENU_CLASS =
  `absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-72 overflow-y-auto rounded-xl shadow-xl ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL} p-1`;

const SAIL_DROPDOWN_TRIGGER_CLASS = MARKET_SELECTOR_TRIGGER_CLASS;

const SAIL_DROPDOWN_OPTION_ACTIVE_CLASS = "bg-[#1E4775]/10";
const SAIL_DROPDOWN_OPTION_HOVER_CLASS = "hover:bg-[#1E4775]/[0.06]";
const SAIL_DROPDOWN_SECTION_LABEL_CLASS =
  "px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/45";

export type SailMarketDropdownOption = {
  marketId: string;
  market: DefinedMarket;
  leverageRatio?: bigint;
  hasPosition?: boolean;
  positionLabel?: string;
  positionTone?: SailDropdownPositionTone;
  isComingSoon?: boolean;
  isDepositsPaused?: boolean;
};

type SailMarketDropdownProps = {
  selectedMarketId: string | null;
  options: SailMarketDropdownOption[];
  onSelect: (marketId: string) => void;
};

function DropdownOptionRow({
  option,
  selectedMarketId,
  onSelect,
  onClose,
}: {
  option: SailMarketDropdownOption;
  selectedMarketId: string | null;
  onSelect: (marketId: string) => void;
  onClose: () => void;
}) {
  const { marketId, market, leverageRatio, positionLabel, positionTone, isComingSoon, isDepositsPaused, hasPosition } =
    option;
  const active = marketId === selectedMarketId;
  const muted = Boolean(isComingSoon || isDepositsPaused);

  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={() => {
          onSelect(marketId);
          onClose();
        }}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition ${
          muted ? "opacity-90 saturate-[0.78]" : ""
        } ${
          active
            ? SAIL_DROPDOWN_OPTION_ACTIVE_CLASS
            : SAIL_DROPDOWN_OPTION_HOVER_CLASS
        }`}
      >
        <SailMarketDropdownOptionRowContent
          market={market}
          leverageRatio={leverageRatio}
          positionLabel={hasPosition ? positionLabel : undefined}
          positionTone={positionTone}
          isComingSoon={isComingSoon}
          isDepositsPaused={isDepositsPaused}
        />
      </button>
    </li>
  );
}

export function SailMarketDropdown({
  selectedMarketId,
  options,
  onSelect,
}: SailMarketDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.marketId === selectedMarketId);

  const groupedOptions = useMemo(() => {
    const active: SailMarketDropdownOption[] = [];
    const comingSoon: SailMarketDropdownOption[] = [];
    const paused: SailMarketDropdownOption[] = [];
    for (const option of options) {
      if (option.isComingSoon) comingSoon.push(option);
      else if (option.isDepositsPaused) paused.push(option);
      else active.push(option);
    }
    return { active, comingSoon, paused };
  }, [options]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!selected) return null;

  return (
    <div ref={rootRef} className={`relative min-w-0 ${open ? "z-50" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={SAIL_DROPDOWN_TRIGGER_CLASS}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <SailMarketDropdownTriggerContent
          market={selected.market}
          leverageRatio={selected.leverageRatio}
          positionLabel={
            selected.hasPosition ? selected.positionLabel : undefined
          }
          positionTone={selected.positionTone}
          isComingSoon={selected.isComingSoon}
          isDepositsPaused={selected.isDepositsPaused}
        />
        <ChevronDownIcon
          className={`ml-0.5 h-4 w-4 shrink-0 text-[#1E4775]/40 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <ul role="listbox" className={SAIL_DROPDOWN_MENU_CLASS}>
          {groupedOptions.active.map((option) => (
            <DropdownOptionRow
              key={option.marketId}
              option={option}
              selectedMarketId={selectedMarketId}
              onSelect={onSelect}
              onClose={() => setOpen(false)}
            />
          ))}
          {groupedOptions.comingSoon.length > 0 ? (
            <>
              <li
                className={SAIL_DROPDOWN_SECTION_LABEL_CLASS}
                role="presentation"
              >
                Coming soon
              </li>
              {groupedOptions.comingSoon.map((option) => (
                <DropdownOptionRow
                  key={option.marketId}
                  option={option}
                  selectedMarketId={selectedMarketId}
                  onSelect={onSelect}
                  onClose={() => setOpen(false)}
                />
              ))}
            </>
          ) : null}
          {groupedOptions.paused.length > 0 ? (
            <>
              <li
                className={SAIL_DROPDOWN_SECTION_LABEL_CLASS}
                role="presentation"
              >
                Paused markets
              </li>
              {groupedOptions.paused.map((option) => (
                <DropdownOptionRow
                  key={option.marketId}
                  option={option}
                  selectedMarketId={selectedMarketId}
                  onSelect={onSelect}
                  onClose={() => setOpen(false)}
                />
              ))}
            </>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
