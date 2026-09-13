"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { ArrowUp } from "lucide-react";
import type { DefinedMarket } from "@/config/markets";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import NetworkIconCell from "@/components/NetworkIconCell";
import { ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL } from "./anchorAdvancedStyles";

const DROPDOWN_MENU_CLASS = `absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-72 overflow-y-auto rounded-xl shadow-xl ${ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL} p-1`;

const DROPDOWN_TRIGGER_CLASS = `flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:brightness-[1.02] ${ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL}`;

const OPTION_ACTIVE = "bg-[#1E4775]/10";
const OPTION_HOVER = "hover:bg-[#1E4775]/[0.06]";
const TITLE_CLASS = "truncate text-sm font-semibold text-[#1E4775]";
const TRIGGER_TITLE_CLASS =
  "truncate text-base font-semibold text-[#1E4775] sm:text-lg";
const APY_CLASS =
  "whitespace-nowrap text-[11px] font-semibold tabular-nums text-[#4A9784] sm:text-xs";
const APY_ARROW_CLASS = "h-3 w-3 shrink-0 text-[#4A9784]";
const POSITION_CLASS =
  "text-xs font-medium tabular-nums text-[#1E4775]";
const STATUS_CHIP_CLASS =
  "shrink-0 rounded-full bg-[#1E4775]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#64748b]";
const SECTION_LABEL_CLASS =
  "px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/45";

export type AnchorMarketDropdownOption = {
  marketId: string;
  market: DefinedMarket;
  hasPosition?: boolean;
  positionLabel?: string;
  apyLabel?: string;
  isComingSoon?: boolean;
};

type AnchorMarketDropdownProps = {
  selectedMarketId: string | null;
  options: AnchorMarketDropdownOption[];
  onSelect: (marketId: string) => void;
};

function formatMarketTitle(market: DefinedMarket): string {
  const peg = market.peggedToken?.symbol || "haToken";
  const collateral = market.collateral?.symbol;
  return collateral ? `${peg} · ${collateral}` : peg;
}

function normalizeApyDisplay(apyLabel?: string): string | null {
  if (!apyLabel) return null;
  let trimmed = apyLabel.trim();
  if (!trimmed) return null;
  if (trimmed.toUpperCase().startsWith("MAX ")) {
    trimmed = trimmed.slice(4).trim();
  }
  return trimmed || null;
}

function MaxApyBadge({
  apyLabel,
  className = "",
}: {
  apyLabel: string;
  className?: string;
}) {
  const display = normalizeApyDisplay(apyLabel);
  if (!display) return null;

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`.trim()}
      title={`Max ${display}`}
    >
      <ArrowUp className={APY_ARROW_CLASS} aria-hidden />
      <span className={APY_CLASS}>{display}</span>
    </span>
  );
}

function DropdownOptionRow({
  option,
  selectedMarketId,
  onSelect,
  onClose,
}: {
  option: AnchorMarketDropdownOption;
  selectedMarketId: string | null;
  onSelect: (marketId: string) => void;
  onClose: () => void;
}) {
  const { marketId, market, positionLabel, apyLabel, hasPosition, isComingSoon } =
    option;
  const active = marketId === selectedMarketId;
  const title = formatMarketTitle(market);
  const muted = Boolean(isComingSoon);

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
        } ${active ? OPTION_ACTIVE : OPTION_HOVER}`}
      >
        <NetworkIconCell
          chainName={harborMarketChainKey(market)}
          chainLogo={market.chain?.logo}
          size={20}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
          <span
            className={`truncate ${TITLE_CLASS} ${muted ? "text-[#64748b]" : ""}`}
          >
            {title}
          </span>
          {normalizeApyDisplay(apyLabel) ? (
            <MaxApyBadge apyLabel={apyLabel!} />
          ) : null}
        </div>
        {isComingSoon ? (
          <span className={STATUS_CHIP_CLASS}>Coming soon</span>
        ) : hasPosition && positionLabel ? (
          <div className="min-w-[4.5rem] shrink-0 text-right">
            <div className={POSITION_CLASS}>{positionLabel}</div>
          </div>
        ) : null}
      </button>
    </li>
  );
}

export function AnchorMarketDropdown({
  selectedMarketId,
  options,
  onSelect,
}: AnchorMarketDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.marketId === selectedMarketId);

  const groupedOptions = useMemo(() => {
    const active: AnchorMarketDropdownOption[] = [];
    const comingSoon: AnchorMarketDropdownOption[] = [];
    for (const option of options) {
      if (option.isComingSoon) comingSoon.push(option);
      else active.push(option);
    }
    return { active, comingSoon };
  }, [options]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!selected) return null;

  const marketTitle = formatMarketTitle(selected.market);

  return (
    <div ref={rootRef} className={`relative min-w-0 ${open ? "z-50" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={DROPDOWN_TRIGGER_CLASS}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <NetworkIconCell
          chainName={harborMarketChainKey(selected.market)}
          chainLogo={selected.market.chain?.logo}
          size={20}
        />
        <span
          className={`min-w-0 max-w-[38%] shrink truncate sm:max-w-[42%] ${TRIGGER_TITLE_CLASS} ${
            selected.isComingSoon ? "text-[#64748b]" : ""
          }`}
        >
          {marketTitle}
        </span>
        {normalizeApyDisplay(selected.apyLabel) ? (
          <span className="flex min-w-0 flex-1 justify-center px-1">
            <MaxApyBadge apyLabel={selected.apyLabel!} />
          </span>
        ) : (
          <span className="min-w-0 flex-1" aria-hidden />
        )}
        {selected.isComingSoon ? (
          <span className={`shrink-0 ${STATUS_CHIP_CLASS}`}>Coming soon</span>
        ) : selected.hasPosition && selected.positionLabel ? (
          <div
            className={`hidden min-w-[4.5rem] shrink-0 truncate text-right sm:block ${POSITION_CLASS}`}
          >
            {selected.positionLabel}
          </div>
        ) : null}
        <ChevronDownIcon
          className={`h-5 w-5 shrink-0 text-[#1E4775]/55 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <ul role="listbox" className={DROPDOWN_MENU_CLASS}>
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
              <li className={SECTION_LABEL_CLASS} role="presentation">
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
        </ul>
      ) : null}
    </div>
  );
}
