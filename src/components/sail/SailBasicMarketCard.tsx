"use client";

import Image from "next/image";
import { ChevronRightIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import type { DefinedMarket } from "@/config/markets";
import { isMarketInMaintenance } from "@/config/markets";
import { MarketMaintenanceTag } from "@/components/MarketMaintenanceTag";
import { getLogoPath } from "@/components/shared";
import NetworkIconCell from "@/components/NetworkIconCell";
import { formatLeverage } from "@/utils/sailDisplayFormat";
import type { SailMarketCardModel } from "@/utils/sailMarketCardModel";
import { SailMintRedeemFeeColumn } from "./SailMintRedeemFeeColumn";

const SAIL_CARD_SHELL_CLASS =
  "flex h-full min-h-0 flex-col rounded-xl border border-[#1E4775]/12 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.04] sm:p-5";

function sideLogoClass(side: string): string {
  const s = side.toLowerCase();
  return `flex-shrink-0 rounded-full ${
    s === "fxusd" ? "mix-blend-multiply bg-transparent" : ""
  } ${s === "btc" ? "border border-[#1E4775]/60" : ""}`;
}

export function SailBasicMarketCard({
  marketId,
  market,
  model,
  isConnected,
  onExploreMarket,
}: {
  marketId: string;
  market: DefinedMarket;
  model: SailMarketCardModel;
  isConnected: boolean;
  onExploreMarket: (marketId: string, m: DefinedMarket) => void;
}) {
  const showMaintenance = isMarketInMaintenance(market);
  const { longSide, shortSide, direction, collateralSymbol } = model;
  const title = `Long ${longSide} / Short ${shortSide}`;
  const subtitle = collateralSymbol
    ? `Using ${collateralSymbol} as collateral`
    : "Variable leverage token";
  const leverageDisplay = formatLeverage(model.leverageRatio);
  const footerLine = `Leverage long on ${longSide}. Short on ${shortSide}.`;

  const directionPillClass =
    direction === "LONG"
      ? "bg-[#dcfce7] text-[#166534] ring-1 ring-[#166534]/25"
      : "bg-[#ffedd5] text-[#9a3412] ring-1 ring-[#9a3412]/20";

  return (
    <article className={SAIL_CARD_SHELL_CLASS}>
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex min-w-0 flex-1 items-center justify-evenly gap-0 py-0.5"
          aria-hidden
        >
          <Image
            src={getLogoPath(longSide)}
            alt={longSide}
            width={28}
            height={28}
            className={sideLogoClass(longSide)}
          />
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#1E4775]/35" />
          <Image
            src={getLogoPath(shortSide)}
            alt={shortSide}
            width={28}
            height={28}
            className={sideLogoClass(shortSide)}
          />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${directionPillClass}`}
          >
            {direction}
          </span>
          <NetworkIconCell
            chainName={market.chain?.name || "Ethereum"}
            chainLogo={market.chain?.logo || "icons/eth.png"}
            size={20}
            className="rounded-full ring-1 ring-[#1E4775]/10"
          />
        </div>
      </div>

      <div className="mt-3 text-center">
        <h3 className="text-base font-bold leading-tight text-[#153B63] sm:text-lg">
          {title}
        </h3>
        <p className="mt-1 text-xs text-[#64748b]">{subtitle}</p>
        <p className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight text-[#153B63] sm:text-4xl">
          {leverageDisplay}
        </p>
      </div>

      <div className="my-4 border-t border-[#e2e8f0]" />

      <div className="space-y-2">
        <div className="text-center text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/70">
          Mint / Redeem Fee
        </div>
        <div className="flex justify-center px-1">
          <SailMintRedeemFeeColumn
            collateralRatio={model.collateralRatio}
            mintFeeRatio={model.mintFeeRatio}
            redeemFeeRatio={model.redeemFeeRatio}
            activeMintBand={model.activeMintBand}
            activeRedeemBand={model.activeRedeemBand}
            mintBands={model.mintBands}
            redeemBands={model.redeemBands}
          />
        </div>
      </div>

      {showMaintenance && (
        <div className="mt-3 flex justify-center">
          <MarketMaintenanceTag />
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <button
          type="button"
          disabled={!isConnected || showMaintenance}
          onClick={() => onExploreMarket(marketId, market)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#153B63] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0F2F52] disabled:cursor-not-allowed disabled:bg-[#153B63]/40"
        >
          Explore Market
          <ArrowRightIcon className="h-4 w-4" />
        </button>
        <p className="text-center text-[11px] leading-snug text-[#94a3b8]">
          {footerLine}
        </p>
      </div>
    </article>
  );
}
