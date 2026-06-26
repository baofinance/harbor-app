"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { DefinedMarket } from "@/config/markets";
import { formatUSD } from "@/utils/sailDisplayFormat";
import {
  formatSailMarketDirectionTitle,
  getSailMarketTokenSymbol,
} from "@/utils/sailMarketDirectionLabels";
import { getShortSide } from "@/utils/marketSideLabels";
import { getSailSideLogoPath } from "@/utils/sailAssetLogos";

const SAIL_DROPDOWN_MENU_CLASS =
  "absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-72 overflow-y-auto rounded-xl bg-white/88 backdrop-blur-lg backdrop-saturate-150 border border-[#1E4775]/12 shadow-xl ring-1 ring-black/5 p-1";

const SAIL_DROPDOWN_OPTION_ACTIVE_CLASS = "bg-[#1E4775]/10";
const SAIL_DROPDOWN_OPTION_HOVER_CLASS = "hover:bg-[#1E4775]/[0.06]";

const SAIL_DROPDOWN_TITLE_CLASS = "truncate text-sm font-semibold text-[#1E4775]";
const SAIL_DROPDOWN_META_CLASS =
  "truncate font-mono text-xs text-[#1E4775]/55";
const SAIL_DROPDOWN_SIDE_LABEL_CLASS =
  "text-[10px] font-medium uppercase tracking-wide text-[#1E4775]/45";
const SAIL_DROPDOWN_POSITION_CLASS =
  "text-xs font-medium tabular-nums text-[#4A9784]";
const SAIL_DROPDOWN_TVL_CLASS =
  "font-mono text-xs font-semibold tabular-nums text-[#1E4775]/80";

export type SailMarketDropdownOption = {
  marketId: string;
  market: DefinedMarket;
  tvlUSD?: number;
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

  const marketTitle = formatSailMarketDirectionTitle(selected.market);

  return (
    <div ref={rootRef} className={`relative min-w-0 ${open ? "z-50" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-left transition hover:bg-white/[0.1]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-white sm:text-lg">
            {marketTitle}
          </div>
        </div>
        {selected.positionLabel ? (
          <div className="hidden shrink-0 text-right sm:block">
            <div className="truncate text-xs font-medium text-harbor-mint">
              {selected.positionLabel}
            </div>
          </div>
        ) : null}
        <ChevronDownIcon
          className={`h-5 w-5 shrink-0 text-white/70 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <ul role="listbox" className={SAIL_DROPDOWN_MENU_CLASS}>
          {options.map(({ marketId, market, tvlUSD, positionLabel }) => {
            const active = marketId === selectedMarketId;
            const optionTitle = formatSailMarketDirectionTitle(market);
            const tokenSymbol = getSailMarketTokenSymbol(market);
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
                  <Image
                    src={getSailSideLogoPath(getShortSide(market))}
                    alt=""
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <div className={SAIL_DROPDOWN_TITLE_CLASS}>{optionTitle}</div>
                    <div className={SAIL_DROPDOWN_META_CLASS}>{tokenSymbol}</div>
                  </div>
                  <div className="min-w-[5.5rem] shrink-0 text-right">
                    {positionLabel ? (
                      <>
                        <div className={SAIL_DROPDOWN_POSITION_CLASS}>
                          {positionLabel.replace(/^Your position ·\s*/, "")}
                        </div>
                        <div className={SAIL_DROPDOWN_SIDE_LABEL_CLASS}>
                          Your position
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={SAIL_DROPDOWN_TVL_CLASS}>
                          {tvlUSD !== undefined ? formatUSD(tvlUSD) : "—"}
                        </div>
                        <div className={SAIL_DROPDOWN_SIDE_LABEL_CLASS}>TVL</div>
                      </>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
