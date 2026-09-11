"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { TokenLogo } from "@/components/shared";
import NetworkIconCell from "@/components/NetworkIconCell";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import {
  getFeaturedVoyageNumber,
  getGenesisMarketTypeLabel,
} from "@/config/maidenVoyageFeatured";
import { getMaidenVoyageActiveStageLabel } from "@/components/genesis/GenesisMaidenVoyageStageStrip";
import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import { chainFromMarketId } from "@/components/dashboard/dashboardRowPresentation";
import {
  MARKET_SELECTOR_FIELD_LABEL_CLASS,
  MARKET_SELECTOR_ICON_SIZE,
  MARKET_SELECTOR_PAIR_FIELD_CLASS,
  MARKET_SELECTOR_ROW_CLASS,
  MARKET_SELECTOR_TOKEN_FIELD_CLASS,
  MARKET_SELECTOR_TRIGGER_CLASS,
  MARKET_SELECTOR_TRIGGER_INNER_CLASS,
  MARKET_SELECTOR_TRIGGER_TITLE_CLASS,
  SAIL_ADVANCED_FROSTED_LIGHT_PANEL,
} from "./genesisAdvancedStyles";

const DROPDOWN_MENU_CLASS = `absolute left-0 top-[calc(100%+0.35rem)] z-[120] min-w-full w-max max-w-[min(100vw-2rem,26rem)] max-h-80 overflow-y-auto rounded-xl shadow-2xl ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL} p-1.5`;
const OPTION_ACTIVE = "bg-[#1E4775]/10";
const OPTION_HOVER = "hover:bg-[#1E4775]/[0.06]";
const TITLE_CLASS = "truncate text-sm font-semibold text-[#1E4775]";
const META_CLASS = "truncate text-[10px] font-medium text-[#1E4775]/50";

/** Seafoam mint — LIVE on frosted white triggers. */
const LIVE_TAG =
  "inline-flex shrink-0 items-center rounded-full bg-[#4A9784]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[#2f6f5f]";
/** Coral — Completed. */
const COMPLETED_TAG =
  "inline-flex shrink-0 items-center rounded-full bg-[#FF8A7A]/18 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[#D45A4A]";

export type GenesisVoyageOption = {
  marketId: string;
  market: GenesisMarketConfig;
  voyageStatus: ActiveVoyageStatus;
  phaseLabel?: string;
};

export type GenesisChainVoyageSelectorsProps = {
  options: readonly GenesisVoyageOption[];
  selectedMarketId: string | null;
  onSelectMarket: (marketId: string) => void;
};

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
      <p className={MARKET_SELECTOR_FIELD_LABEL_CLASS}>{label}</p>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={`${MARKET_SELECTOR_TRIGGER_CLASS} w-full`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {trigger}
        <ChevronDownIcon
          className={`ml-0.5 h-4 w-4 shrink-0 text-[#1E4775]/40 transition-transform ${
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

function chainMeta(marketId: string, market: GenesisMarketConfig) {
  const fromConfig = chainFromMarketId(marketId);
  const chainId = market.chainId ?? 1;
  if (chainId === 4326) {
    return {
      chainId,
      name: market.chain?.name ?? "MegaETH",
      logo: market.chain?.logo ?? "icons/eth.png",
    };
  }
  return {
    chainId,
    name: market.chain?.name || fromConfig.chainName || "Ethereum",
    logo: market.chain?.logo || fromConfig.chainLogo || "icons/eth.png",
  };
}

function collateralLabel(market: GenesisMarketConfig): string {
  return (
    market.collateral?.underlyingSymbol ||
    market.collateral?.symbol ||
    "Collateral"
  );
}

function isVoyageCompleted(
  market: GenesisMarketConfig,
  voyageStatus: ActiveVoyageStatus,
): boolean {
  return (
    voyageStatus === "launch_complete" || market.genesisActive === "completed"
  );
}

export function GenesisChainVoyageSelectors({
  options,
  selectedMarketId,
  onSelectMarket,
}: GenesisChainVoyageSelectorsProps) {
  const [chainOpen, setChainOpen] = useState(false);
  const [voyageOpen, setVoyageOpen] = useState(false);

  const selected =
    options.find((o) => o.marketId === selectedMarketId) ?? options[0] ?? null;

  const chains = useMemo(() => {
    const map = new Map<
      number,
      { chainId: number; name: string; logo: string }
    >();
    for (const o of options) {
      const meta = chainMeta(o.marketId, o.market);
      if (!map.has(meta.chainId)) map.set(meta.chainId, meta);
    }
    return Array.from(map.values());
  }, [options]);

  const selectedChainMeta = selected
    ? chainMeta(selected.marketId, selected.market)
    : null;
  const selectedChainId = selectedChainMeta?.chainId ?? chains[0]?.chainId ?? 1;

  const voyagesForChain = useMemo(
    () =>
      options.filter(
        (o) => chainMeta(o.marketId, o.market).chainId === selectedChainId,
      ),
    [options, selectedChainId],
  );

  const selectedChain =
    chains.find((c) => c.chainId === selectedChainId) ??
    selectedChainMeta ??
    chains[0];

  if (!selected || !selectedChain) return null;

  const colLabel = collateralLabel(selected.market);
  const typeLabel = getGenesisMarketTypeLabel(selected.market.pegTarget);
  const completed = isVoyageCompleted(selected.market, selected.voyageStatus);

  return (
    <div className={MARKET_SELECTOR_ROW_CLASS}>
      <FrostedDropdown
        label="Chain"
        className={MARKET_SELECTOR_TOKEN_FIELD_CLASS}
        open={chainOpen}
        onOpenChange={(open) => {
          setChainOpen(open);
          if (open) setVoyageOpen(false);
        }}
        trigger={
          <div className={MARKET_SELECTOR_TRIGGER_INNER_CLASS}>
            <NetworkIconCell
              chainName={selectedChain.name}
              chainLogo={selectedChain.logo}
              size={MARKET_SELECTOR_ICON_SIZE}
            />
            <span className={`min-w-0 flex-1 ${MARKET_SELECTOR_TRIGGER_TITLE_CLASS}`}>
              {selectedChain.name}
            </span>
          </div>
        }
      >
        {chains.map((chain) => {
          const active = chain.chainId === selectedChainId;
          return (
            <li key={chain.chainId}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setChainOpen(false);
                  if (chain.chainId === selectedChainId) return;
                  const first = options.find(
                    (o) =>
                      chainMeta(o.marketId, o.market).chainId === chain.chainId,
                  );
                  if (first) onSelectMarket(first.marketId);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition ${
                  active ? OPTION_ACTIVE : OPTION_HOVER
                }`}
              >
                <NetworkIconCell
                  chainName={chain.name}
                  chainLogo={chain.logo}
                  size={MARKET_SELECTOR_ICON_SIZE}
                />
                <span className={`min-w-0 flex-1 truncate ${TITLE_CLASS}`}>
                  {chain.name}
                </span>
              </button>
            </li>
          );
        })}
      </FrostedDropdown>

      <FrostedDropdown
        label="Voyage"
        className={MARKET_SELECTOR_PAIR_FIELD_CLASS}
        open={voyageOpen}
        onOpenChange={(open) => {
          setVoyageOpen(open);
          if (open) setChainOpen(false);
        }}
        trigger={
          <div className={MARKET_SELECTOR_TRIGGER_INNER_CLASS}>
            <TokenLogo symbol={colLabel} size={MARKET_SELECTOR_ICON_SIZE} />
            <span className={`min-w-0 flex-1 ${MARKET_SELECTOR_TRIGGER_TITLE_CLASS}`}>
              {colLabel} - {typeLabel}
            </span>
            <span className={completed ? COMPLETED_TAG : LIVE_TAG}>
              {completed ? "Completed" : "LIVE"}
            </span>
          </div>
        }
      >
        {voyagesForChain.map((option) => {
          const active = option.marketId === selected.marketId;
          const col = collateralLabel(option.market);
          const type = getGenesisMarketTypeLabel(option.market.pegTarget);
          const num = getFeaturedVoyageNumber(option.marketId);
          const phase =
            option.phaseLabel ??
            getMaidenVoyageActiveStageLabel(option.voyageStatus);
          const done = isVoyageCompleted(option.market, option.voyageStatus);
          return (
            <li key={option.marketId}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setVoyageOpen(false);
                  onSelectMarket(option.marketId);
                }}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition ${
                  active ? OPTION_ACTIVE : OPTION_HOVER
                }`}
              >
                <TokenLogo
                  symbol={col}
                  size={MARKET_SELECTOR_ICON_SIZE}
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className={`min-w-0 truncate ${TITLE_CLASS}`}>
                      {col} - {type}
                    </span>
                    <span className={done ? COMPLETED_TAG : LIVE_TAG}>
                      {done ? "Completed" : "LIVE"}
                    </span>
                  </span>
                  <span className={`mt-0.5 block ${META_CLASS}`}>
                    Voyage #{num}
                    {phase ? ` · ${phase}` : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </FrostedDropdown>
    </div>
  );
}
