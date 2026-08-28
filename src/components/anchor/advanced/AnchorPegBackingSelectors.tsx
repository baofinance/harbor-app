"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { ArrowUp } from "lucide-react";
import type { DefinedMarket } from "@/config/markets";
import { harborMarketChainKey } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import NetworkIconCell from "@/components/NetworkIconCell";
import { TokenLogo } from "@/components/shared";
import type { MarketData } from "@/hooks/anchor/useAnchorMarketData";
import { formatAPR } from "@/utils/anchor";
import {
  buildAnchorPegGroups,
  findPegGroupForMarket,
  pickDefaultBackingMarketId,
  type AnchorBackingOption,
  type AnchorPegGroup,
} from "@/utils/anchorMarketSelectors";
import { ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL } from "./anchorAdvancedStyles";

const DROPDOWN_MENU_CLASS = `absolute left-0 top-[calc(100%+0.35rem)] z-[120] min-w-full w-max max-w-[min(100vw-2rem,22rem)] max-h-80 overflow-y-auto rounded-xl shadow-2xl ${ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL} p-1.5`;

const DROPDOWN_TRIGGER_CLASS = `flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:brightness-[1.02] ${ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL}`;

const OPTION_ACTIVE = "bg-[#1E4775]/10";
const OPTION_HOVER = "hover:bg-[#1E4775]/[0.06]";
const TITLE_CLASS = "truncate text-sm font-semibold text-[#1E4775]";
const TRIGGER_TITLE_CLASS =
  "text-base font-semibold leading-tight text-[#1E4775]";
const BACKING_TRIGGER_TITLE_CLASS =
  "whitespace-nowrap text-base font-semibold leading-tight text-[#1E4775]";
const SUBTITLE_CLASS = "truncate text-[11px] font-medium text-[#1E4775]/55";
const APY_CLASS =
  "whitespace-nowrap text-[11px] font-semibold tabular-nums text-[#4A9784] sm:text-xs";
const APY_ARROW_CLASS = "h-3 w-3 shrink-0 text-[#4A9784]";
const STATUS_CHIP_CLASS =
  "shrink-0 rounded-full bg-[#1E4775]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#64748b]";
const SECTION_LABEL_CLASS =
  "px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/45";

const SELECTOR_ICON_SIZE = 22;
const PEG_FIELD_CLASS = "w-[9.25rem] shrink-0 sm:w-[10.25rem]";
const BACKING_FIELD_CLASS = "w-[14.5rem] shrink-0 sm:w-[16rem]";

function normalizeApyDisplay(apyLabel?: string): string | null {
  if (!apyLabel) return null;
  let trimmed = apyLabel.trim();
  if (!trimmed) return null;
  if (trimmed.toUpperCase().startsWith("MAX ")) {
    trimmed = trimmed.slice(4).trim();
  }
  return trimmed || null;
}

function ApyBadge({
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

type FrostedDropdownProps = {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function FrostedDropdown({
  label,
  trigger,
  children,
  className = "",
  open,
  onOpenChange,
}: FrostedDropdownProps) {
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
        className={DROPDOWN_TRIGGER_CLASS}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {trigger}
        <ChevronDownIcon
          className={`ml-auto h-5 w-5 shrink-0 text-[#1E4775]/55 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? (
        <ul role="listbox" className={DROPDOWN_MENU_CLASS}>
          {children}
        </ul>
      ) : null}
    </div>
  );
}

function PegChainIcon({ market }: { market: DefinedMarket }) {
  return (
    <NetworkIconCell
      chainName={harborMarketChainKey(market)}
      chainLogo={market.chain?.logo}
      size={SELECTOR_ICON_SIZE}
    />
  );
}

function PegOptionRow({
  group,
  active,
  onSelect,
}: {
  group: AnchorPegGroup;
  active: boolean;
  onSelect: () => void;
}) {
  const bestApyOption = group.backingOptions
    .filter((o) => !o.isComingSoon && o.apyLabel)
    .sort(
      (a, b) =>
        (parseFloat((b.apyLabel ?? "").match(/([\d.]+)/)?.[1] ?? "0") || 0) -
        (parseFloat((a.apyLabel ?? "").match(/([\d.]+)/)?.[1] ?? "0") || 0),
    )[0];
  const bestApy = bestApyOption?.apyLabel;

  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={onSelect}
        className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition ${
          active ? OPTION_ACTIVE : OPTION_HOVER
        }`}
      >
        <PegChainIcon market={group.representativeMarket} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={TITLE_CLASS}>{group.pegLabel}</span>
          <span className={SUBTITLE_CLASS}>
            Pegged to {group.pegTarget}
            {group.multiChain
              ? ` · ${harborMarketChainKey(group.representativeMarket)}`
              : ""}
          </span>
        </div>
        {bestApy ? (
          <ApyBadge apyLabel={bestApy} className="mt-0.5 shrink-0" />
        ) : null}
      </button>
    </li>
  );
}

function BackingOptionRow({
  option,
  active,
  showChain,
  onSelect,
}: {
  option: AnchorBackingOption;
  active: boolean;
  showChain: boolean;
  onSelect: () => void;
}) {
  const { market, backingLabel, apyLabel, isComingSoon } = option;

  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={onSelect}
        className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition ${
          isComingSoon ? "opacity-90 saturate-[0.78]" : ""
        } ${active ? OPTION_ACTIVE : OPTION_HOVER}`}
      >
        <TokenLogo symbol={backingLabel} size={SELECTOR_ICON_SIZE} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
          <span
            className={`truncate ${TITLE_CLASS} ${
              isComingSoon ? "text-[#64748b]" : ""
            }`}
          >
            {backingLabel}
          </span>
          <span className={SUBTITLE_CLASS}>
            {showChain
              ? harborMarketChainKey(market)
              : `Pegged ${market.peggedToken?.symbol ?? "haToken"}`}
          </span>
        </div>
        {isComingSoon ? (
          <span className={`${STATUS_CHIP_CLASS} mt-0.5`}>Coming soon</span>
        ) : apyLabel ? (
          <ApyBadge apyLabel={apyLabel} className="mt-0.5 shrink-0" />
        ) : null}
      </button>
    </li>
  );
}

export type AnchorPegBackingSelectorsProps = {
  markets: readonly [string, DefinedMarket][];
  selectedMarketId: string | null;
  marketsDataById: Map<string, MarketData>;
  marketPositions: Record<
    string,
    { collateralPool: bigint; sailPool: bigint } | undefined
  >;
  onSelectMarket: (marketId: string) => void;
  className?: string;
};

export function AnchorPegBackingSelectors({
  markets,
  selectedMarketId,
  marketsDataById,
  marketPositions,
  onSelectMarket,
  className = "",
}: AnchorPegBackingSelectorsProps) {
  const [pegOpen, setPegOpen] = useState(false);
  const [backingOpen, setBackingOpen] = useState(false);
  const anyOpen = pegOpen || backingOpen;

  const apyByMarketId = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const [marketId] of markets) {
      const data = marketsDataById.get(marketId);
      const bestApr = Math.max(data?.maxAPR || 0, data?.minAPR || 0);
      map.set(
        marketId,
        bestApr > 0 ? `${formatAPR(bestApr)} APY` : undefined,
      );
    }
    return map;
  }, [markets, marketsDataById]);

  const pegGroups = useMemo(
    () => buildAnchorPegGroups(markets, { apyByMarketId }),
    [markets, apyByMarketId],
  );

  const selectedPegGroup = useMemo(
    () => findPegGroupForMarket(pegGroups, selectedMarketId),
    [pegGroups, selectedMarketId],
  );

  const selectedBacking = useMemo(
    () =>
      selectedPegGroup?.backingOptions.find(
        (o) => o.marketId === selectedMarketId,
      ),
    [selectedPegGroup, selectedMarketId],
  );

  const hasPosition = (marketId: string) => {
    const pos = marketPositions[marketId];
    if (!pos) return false;
    return (
      (pos.collateralPool !== undefined && pos.collateralPool > 0n) ||
      (pos.sailPool !== undefined && pos.sailPool > 0n)
    );
  };

  const handleSelectPeg = (group: AnchorPegGroup) => {
    if (group.pegKey === selectedPegGroup?.pegKey) {
      setPegOpen(false);
      return;
    }
    const nextId = pickDefaultBackingMarketId(group, hasPosition);
    if (nextId) {
      onSelectMarket(nextId);
    }
    setPegOpen(false);
    setBackingOpen(false);
  };

  const handleSelectBacking = (marketId: string) => {
    onSelectMarket(marketId);
    setBackingOpen(false);
  };

  if (!selectedPegGroup || !selectedBacking) return null;

  const comingSoonBackings = selectedPegGroup.backingOptions.filter(
    (o) => o.isComingSoon,
  );
  const liveBackings = selectedPegGroup.backingOptions.filter(
    (o) => !o.isComingSoon,
  );

  return (
    <div
      className={`relative flex w-auto shrink-0 flex-col gap-2.5 sm:flex-row sm:items-end sm:gap-2.5 ${
        anyOpen ? "z-[100]" : ""
      } ${className}`.trim()}
    >
      <FrostedDropdown
        label="Anchor token"
        className={PEG_FIELD_CLASS}
        open={pegOpen}
        onOpenChange={(next) => {
          setPegOpen(next);
          if (next) setBackingOpen(false);
        }}
        trigger={
          <>
            <PegChainIcon market={selectedBacking.market} />
            <span className={`min-w-0 flex-1 ${TRIGGER_TITLE_CLASS}`}>
              {selectedPegGroup.pegLabel}
            </span>
          </>
        }
      >
        {pegGroups.map((group) => (
          <PegOptionRow
            key={group.pegKey}
            group={group}
            active={group.pegKey === selectedPegGroup.pegKey}
            onSelect={() => handleSelectPeg(group)}
          />
        ))}
      </FrostedDropdown>

      <FrostedDropdown
        label="Backing"
        className={BACKING_FIELD_CLASS}
        open={backingOpen}
        onOpenChange={(next) => {
          setBackingOpen(next);
          if (next) setPegOpen(false);
        }}
        trigger={
          <>
            <TokenLogo
              symbol={selectedBacking.backingLabel}
              size={SELECTOR_ICON_SIZE}
            />
            <span
              className={`${BACKING_TRIGGER_TITLE_CLASS} ${
                selectedBacking.isComingSoon ? "text-[#64748b]" : ""
              }`}
            >
              {selectedBacking.backingLabel}
            </span>
            {!selectedBacking.isComingSoon && selectedBacking.apyLabel ? (
              <ApyBadge apyLabel={selectedBacking.apyLabel} className="shrink-0" />
            ) : null}
            {selectedBacking.isComingSoon ? (
              <span className={STATUS_CHIP_CLASS}>Coming soon</span>
            ) : null}
            <span className="min-w-0 flex-1" aria-hidden="true" />
          </>
        }
      >
        {liveBackings.map((option) => (
          <BackingOptionRow
            key={option.marketId}
            option={option}
            active={option.marketId === selectedMarketId}
            showChain={selectedPegGroup.multiChain}
            onSelect={() => handleSelectBacking(option.marketId)}
          />
        ))}
        {comingSoonBackings.length > 0 ? (
          <>
            <li className={SECTION_LABEL_CLASS} role="presentation">
              Coming soon
            </li>
            {comingSoonBackings.map((option) => (
              <BackingOptionRow
                key={option.marketId}
                option={option}
                active={option.marketId === selectedMarketId}
                showChain={selectedPegGroup.multiChain}
                onSelect={() => handleSelectBacking(option.marketId)}
              />
            ))}
          </>
        ) : null}
      </FrostedDropdown>
    </div>
  );
}
