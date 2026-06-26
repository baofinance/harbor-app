"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { DefinedMarket } from "@/config/markets";
import { getLongSide, getShortSide } from "@/utils/marketSideLabels";
import { formatUSD } from "@/utils/sailDisplayFormat";
import { getSailSideLogoPath } from "@/utils/sailAssetLogos";
import {
  SAIL_ADVANCED_CAPTION,
  SAIL_ADVANCED_META,
  SAIL_ADVANCED_PANEL,
} from "./sailAdvancedStyles";

export type SailMarketDropdownOption = {
  marketId: string;
  market: DefinedMarket;
  tvlUSD?: number;
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

  const hsSymbol = selected.market.leveragedToken?.symbol || "Sail";
  const subtitle = `Short ${getShortSide(selected.market)} · Long ${getLongSide(selected.market)}`;

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
          <div className="truncate font-mono text-lg font-bold text-white">
            {hsSymbol}
          </div>
          <div className={`truncate ${SAIL_ADVANCED_META}`}>{subtitle}</div>
        </div>
        <ChevronDownIcon
          className={`h-5 w-5 shrink-0 text-white/70 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className={`absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-72 overflow-y-auto ${SAIL_ADVANCED_PANEL} p-1 shadow-xl ring-1 ring-white/10`}
        >
          {options.map(({ marketId, market, tvlUSD }) => {
            const symbol = market.leveragedToken?.symbol || marketId;
            const active = marketId === selectedMarketId;
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
                    active ? "bg-white/[0.12]" : "hover:bg-white/[0.08]"
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
                    <div className="truncate text-sm font-semibold text-white">
                      {symbol}
                    </div>
                    <div className={SAIL_ADVANCED_META}>
                      {getLongSide(market)} / {getShortSide(market)}
                    </div>
                  </div>
                  <div className={`shrink-0 ${SAIL_ADVANCED_CAPTION}`}>
                    {tvlUSD !== undefined ? formatUSD(tvlUSD) : "—"}
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
