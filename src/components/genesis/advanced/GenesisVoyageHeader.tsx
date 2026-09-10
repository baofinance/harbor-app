"use client";

import type { GenesisMarketConfig } from "@/types/genesisMarket";
import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";
import { MV_ACCENT_GRADIENT } from "@/components/genesis/maidenVoyageLayoutStyles";
import { getGenesisMarketTypeLabel } from "@/config/maidenVoyageFeatured";
import {
  GenesisChainVoyageSelectors,
  type GenesisVoyageOption,
} from "./GenesisChainVoyageSelectors";
import { GenesisVoyageStatsStrip } from "./GenesisVoyageStatsStrip";

const TAGLINE_CLASS =
  "min-w-0 text-center text-xl font-bold leading-snug text-white/90 sm:text-2xl lg:text-left lg:text-3xl";
const PEG_CLASS = "font-extrabold text-[#B8EBD5]";
const PERKS_CLASS =
  "mb-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] font-medium tracking-wide text-white/70 sm:gap-x-0 sm:text-xs lg:justify-start";
const PERK_ITEM_CLASS = "inline-flex items-center gap-1.5 text-white/75";
const PERK_RULE_CLASS =
  "mx-2.5 hidden h-3 w-px shrink-0 bg-white/20 sm:mx-3 sm:inline-block";
const PERK_DOT_CLASS = "inline-block h-1 w-1 rounded-full bg-[#6bc4a8]";

export type GenesisVoyageHeaderProps = {
  options: readonly GenesisVoyageOption[];
  selectedMarketId: string | null;
  selectedMarket: GenesisMarketConfig | null;
  yieldRevSharePct?: number | null;
  onSelectMarket: (marketId: string) => void;
  voyageStatus?: ActiveVoyageStatus | null;
  capDisplay?: GenesisVoyageCapDisplay | null;
  capLoading?: boolean;
  genesisAddress?: string;
  userDepositUsd?: number | null;
};

export function GenesisVoyageHeader({
  options,
  selectedMarketId,
  selectedMarket,
  yieldRevSharePct = null,
  onSelectMarket,
  voyageStatus = null,
  capDisplay = null,
  capLoading = false,
  genesisAddress,
  userDepositUsd = null,
}: GenesisVoyageHeaderProps) {
  const pegLabel =
    selectedMarket?.pegTarget?.toUpperCase() ||
    getGenesisMarketTypeLabel(selectedMarket?.pegTarget).replace(
      / Market$/i,
      "",
    ) ||
    "USD";
  const revPct =
    yieldRevSharePct != null && Number.isFinite(yieldRevSharePct)
      ? `${yieldRevSharePct}%`
      : "5%";

  const perks = [
    "Founding deposit",
    `${revPct} revenue forever`,
    "Anchor + Sail at launch",
  ] as const;

  return (
    <header className="relative z-10 flex flex-col gap-4 overflow-visible border-b border-white/10 pb-4">
      <div className="min-w-0 overflow-visible">
        <div className="grid min-w-0 gap-4 overflow-visible lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-8">
          <GenesisChainVoyageSelectors
            options={options}
            selectedMarketId={selectedMarketId}
            onSelectMarket={onSelectMarket}
          />
          <div className="flex w-full min-w-0 flex-col items-center justify-center gap-1.5 text-center lg:items-start lg:text-left">
            <ul className={PERKS_CLASS}>
              {perks.map((label, index) => (
                <li key={label} className="inline-flex items-center">
                  {index > 0 ? (
                    <span className={PERK_RULE_CLASS} aria-hidden="true" />
                  ) : null}
                  <span className={PERK_ITEM_CLASS}>
                    <span className={PERK_DOT_CLASS} aria-hidden="true" />
                    <span>{label}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className={TAGLINE_CLASS}>
              Own a piece of the <span className={PEG_CLASS}>{pegLabel}</span>{" "}
              market.{" "}
              <span className={`${MV_ACCENT_GRADIENT} whitespace-nowrap`}>
                Earn forever.
              </span>
            </p>
          </div>
        </div>
      </div>

      <GenesisVoyageStatsStrip
        voyageStatus={voyageStatus}
        capDisplay={capDisplay}
        capLoading={capLoading}
        yieldRevSharePct={yieldRevSharePct}
        genesisAddress={genesisAddress}
        userDepositUsd={userDepositUsd}
      />
    </header>
  );
}
