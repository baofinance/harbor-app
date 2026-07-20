"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { DefinedMarket } from "@/config/markets";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import NetworkIconCell from "@/components/NetworkIconCell";
import { formatLeverage } from "@/utils/sailDisplayFormat";
import { formatSailMarketDropdownTitle } from "@/utils/sailMarketDirectionLabels";
import { SAIL_ADVANCED_FROSTED_LIGHT_PANEL } from "./sailAdvancedStyles";

const SAIL_DROPDOWN_MENU_CLASS =
  `absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-72 overflow-y-auto rounded-xl shadow-xl ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL} p-1`;

const SAIL_DROPDOWN_TRIGGER_CLASS = `flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:brightness-[1.02] ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL}`;

const SAIL_DROPDOWN_OPTION_ACTIVE_CLASS = "bg-[#1E4775]/10";
const SAIL_DROPDOWN_OPTION_HOVER_CLASS = "hover:bg-[#1E4775]/[0.06]";

const SAIL_DROPDOWN_TITLE_CLASS = "truncate text-sm font-semibold text-[#1E4775]";
const SAIL_DROPDOWN_TRIGGER_TITLE_CLASS =
  "truncate text-base font-semibold text-[#1E4775] sm:text-lg";
const SAIL_DROPDOWN_LEVERAGE_CLASS =
  "font-mono font-semibold tabular-nums text-[#1E4775]/80";
const SAIL_DROPDOWN_LEVERAGE_INLINE_CLASS = `${SAIL_DROPDOWN_LEVERAGE_CLASS} text-inherit sm:text-inherit`;
const SAIL_DROPDOWN_TITLE_SEPARATOR_CLASS = "font-medium text-[#1E4775]/55";
const SAIL_DROPDOWN_POSITION_CLASS =
  "mt-0.5 text-xs font-medium tabular-nums text-[#4A9784]";

export type SailMarketDropdownOption = {
  marketId: string;
  market: DefinedMarket;
  leverageRatio?: bigint;
  hasPosition?: boolean;
  positionLabel?: string;
};

type SailMarketDropdownProps = {
  selectedMarketId: string | null;
  options: SailMarketDropdownOption[];
  onSelect: (marketId: string) => void;
};

export function SailMarketDropdown({
  selectedMarketId,
  options,
  onSelect,
}: SailMarketDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.marketId === selectedMarketId);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!selected) return null;

  const marketTitle = formatSailMarketDropdownTitle(selected.market);

  return (
    <div ref={rootRef} className={`relative min-w-0 ${open ? "z-50" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={SAIL_DROPDOWN_TRIGGER_CLASS}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <NetworkIconCell
          chainName={harborMarketChainKey(selected.market)}
          chainLogo={selected.market.chain?.logo}
          size={20}
        />
        <div className={`min-w-0 flex-1 truncate ${SAIL_DROPDOWN_TRIGGER_TITLE_CLASS}`}>
          {marketTitle}
        </div>
        {selected.positionLabel ? (
          <div className="hidden shrink-0 truncate text-xs font-medium text-[#4A9784] sm:block">
            {selected.positionLabel.replace(/^Your position ·\s*/, "")}
          </div>
        ) : null}
        <ChevronDownIcon
          className={`h-5 w-5 shrink-0 text-[#1E4775]/55 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <ul role="listbox" className={SAIL_DROPDOWN_MENU_CLASS}>
          {options.map(({ marketId, market, leverageRatio, positionLabel }) => {
            const active = marketId === selectedMarketId;
            const title = formatSailMarketDropdownTitle(market);
            return (
              <li key={marketId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onSelect(marketId);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition ${
                    active
                      ? SAIL_DROPDOWN_OPTION_ACTIVE_CLASS
                      : SAIL_DROPDOWN_OPTION_HOVER_CLASS
                  }`}
                >
                  <NetworkIconCell
                    chainName={harborMarketChainKey(market)}
                    chainLogo={market.chain?.logo}
                    size={20}
                  />
                  <div className={`min-w-0 flex-1 truncate ${SAIL_DROPDOWN_TITLE_CLASS}`}>
                    {title}
                    <span className={SAIL_DROPDOWN_TITLE_SEPARATOR_CLASS}> · </span>
                    <span className={`text-xs ${SAIL_DROPDOWN_LEVERAGE_INLINE_CLASS}`}>
                      {formatLeverage(leverageRatio)}
                    </span>
                  </div>
                  {positionLabel ? (
                    <div className="min-w-[4.5rem] shrink-0 text-right">
                      <div className={SAIL_DROPDOWN_POSITION_CLASS}>
                        {positionLabel.replace(/^Your position ·\s*/, "")}
                      </div>
                    </div>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
