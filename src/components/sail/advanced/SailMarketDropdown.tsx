"use client";

import { useMemo } from "react";
import type { DefinedMarket } from "@/config/markets";
import { SectionedMarketMenu } from "@/components/shared/FrostedMarketDropdown";
import { MARKET_SELECTOR_TRIGGER_CLASS } from "./sailAdvancedStyles";
import {
  SailMarketDropdownOptionRowContent,
  SailMarketDropdownTriggerContent,
} from "./SailMarketDropdownOptionContent";
import type { SailDropdownPositionTone } from "@/utils/sailMarketDropdownPosition";

const SAIL_DROPDOWN_TRIGGER_CLASS = MARKET_SELECTOR_TRIGGER_CLASS;

const SAIL_DROPDOWN_OPTION_ACTIVE_CLASS = "bg-[#1E4775]/10";
const SAIL_DROPDOWN_OPTION_HOVER_CLASS = "hover:bg-[#1E4775]/[0.06]";

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
  const selected = options.find((o) => o.marketId === selectedMarketId);

  const sections = useMemo(() => {
    const active: SailMarketDropdownOption[] = [];
    const comingSoon: SailMarketDropdownOption[] = [];
    const paused: SailMarketDropdownOption[] = [];
    for (const option of options) {
      if (option.isComingSoon) comingSoon.push(option);
      else if (option.isDepositsPaused) paused.push(option);
      else active.push(option);
    }
    return [
      { items: active },
      { label: "Coming soon", items: comingSoon },
      { label: "Paused markets", items: paused },
    ];
  }, [options]);

  if (!selected) return null;

  return (
    <SectionedMarketMenu
      triggerClassName={SAIL_DROPDOWN_TRIGGER_CLASS}
      chevronClassName="ml-0.5 h-4 w-4 shrink-0 text-[#1E4775]/40 transition"
      itemKey={(option) => option.marketId}
      sections={sections}
      renderItem={(option, close) => (
        <DropdownOptionRow
          option={option}
          selectedMarketId={selectedMarketId}
          onSelect={onSelect}
          onClose={close}
        />
      )}
      trigger={
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
      }
    />
  );
}
