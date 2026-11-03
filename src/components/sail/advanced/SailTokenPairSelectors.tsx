"use client";

import { useMemo, useState } from "react";
import { TokenLogo } from "@/components/shared";
import { FrostedMarketDropdown } from "@/components/shared/FrostedMarketDropdown";
import {
  buildSailTokenGroups,
  findSailTokenGroupForMarket,
  pickDefaultSailPairMarketId,
  type SailTokenGroup,
} from "@/utils/sailMarketSelectors";
import type { SailMarketDropdownOption } from "./SailMarketDropdown";
import {
  MARKET_SELECTOR_ICON_SIZE,
  MARKET_SELECTOR_PAIR_FIELD_CLASS,
  MARKET_SELECTOR_ROW_CLASS,
  MARKET_SELECTOR_TOKEN_FIELD_CLASS,
  MARKET_SELECTOR_TRIGGER_INNER_CLASS,
  MARKET_SELECTOR_TRIGGER_TITLE_CLASS,
} from "./sailAdvancedStyles";
import {
  SailMarketDropdownOptionRowContent,
  SailMarketDropdownTriggerContent,
} from "./SailMarketDropdownOptionContent";

const OPTION_ACTIVE = "bg-[#1E4775]/10";
const OPTION_HOVER = "hover:bg-[#1E4775]/[0.06]";
const TITLE_CLASS = "truncate text-sm font-semibold text-[#1E4775]";
const SECTION_LABEL_CLASS =
  "px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/45";

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
        <TokenLogo symbol={group.tokenLabel} size={MARKET_SELECTOR_ICON_SIZE} />
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
  onSelect,
}: {
  option: SailMarketDropdownOption;
  active: boolean;
  onSelect: () => void;
}) {
  const muted = Boolean(option.isComingSoon || option.isDepositsPaused);

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
        <SailMarketDropdownOptionRowContent
          market={option.market}
          leverageRatio={option.leverageRatio}
          positionLabel={option.hasPosition ? option.positionLabel : undefined}
          positionTone={option.positionTone}
          isComingSoon={option.isComingSoon}
          isDepositsPaused={option.isDepositsPaused}
        />
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

/** Sail token + pair selectors — pair rows match Sail market dropdown. */
export function SailTokenPairSelectors({
  options,
  selectedMarketId,
  onSelectMarket,
  className = "",
}: SailTokenPairSelectorsProps) {
  const [tokenOpen, setTokenOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);
  const anyOpen = tokenOpen || pairOpen;

  const optionByMarketId = useMemo(() => {
    const map = new Map<string, SailMarketDropdownOption>();
    for (const option of options) {
      map.set(option.marketId, option);
    }
    return map;
  }, [options]);

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

  const selectedOption = selectedMarketId
    ? optionByMarketId.get(selectedMarketId)
    : undefined;

  const hasPosition = (marketId: string) =>
    Boolean(optionByMarketId.get(marketId)?.hasPosition);

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

  if (!selectedGroup || !selectedOption) return null;

  const liveOptions = options.filter(
    (option) =>
      selectedGroup.pairOptions.some((pair) => pair.marketId === option.marketId) &&
      !option.isComingSoon,
  );
  const comingSoonOptions = options.filter(
    (option) =>
      selectedGroup.pairOptions.some((pair) => pair.marketId === option.marketId) &&
      option.isComingSoon,
  );

  return (
    <div
      className={`${MARKET_SELECTOR_ROW_CLASS} ${
        anyOpen ? "z-40" : ""
      } ${className}`.trim()}
    >
      <FrostedMarketDropdown
        label="Sail token"
        className={MARKET_SELECTOR_TOKEN_FIELD_CLASS}
        open={tokenOpen}
        onOpenChange={(next) => {
          setTokenOpen(next);
          if (next) setPairOpen(false);
        }}
        trigger={
          <div className={MARKET_SELECTOR_TRIGGER_INNER_CLASS}>
            <TokenLogo
              symbol={selectedGroup.tokenLabel}
              size={MARKET_SELECTOR_ICON_SIZE}
            />
            <span className={`min-w-0 flex-1 ${MARKET_SELECTOR_TRIGGER_TITLE_CLASS}`}>
              {selectedGroup.tokenLabel}
            </span>
          </div>
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
      </FrostedMarketDropdown>

      <FrostedMarketDropdown
        label="Pair"
        className={MARKET_SELECTOR_PAIR_FIELD_CLASS}
        open={pairOpen}
        onOpenChange={(next) => {
          setPairOpen(next);
          if (next) setTokenOpen(false);
        }}
        trigger={
          <SailMarketDropdownTriggerContent
            market={selectedOption.market}
            leverageRatio={selectedOption.leverageRatio}
            positionLabel={
              selectedOption.hasPosition ? selectedOption.positionLabel : undefined
            }
            positionTone={selectedOption.positionTone}
            isComingSoon={selectedOption.isComingSoon}
            isDepositsPaused={selectedOption.isDepositsPaused}
            showChainIcon={false}
            iconSize={MARKET_SELECTOR_ICON_SIZE}
          />
        }
      >
        {liveOptions.map((option) => (
          <PairOptionRow
            key={option.marketId}
            option={option}
            active={option.marketId === selectedMarketId}
            onSelect={() => handleSelectPair(option.marketId)}
          />
        ))}
        {comingSoonOptions.length > 0 ? (
          <>
            <li className={SECTION_LABEL_CLASS} role="presentation">
              Coming soon
            </li>
            {comingSoonOptions.map((option) => (
              <PairOptionRow
                key={option.marketId}
                option={option}
                active={option.marketId === selectedMarketId}
                onSelect={() => handleSelectPair(option.marketId)}
              />
            ))}
          </>
        ) : null}
      </FrostedMarketDropdown>
    </div>
  );
}
