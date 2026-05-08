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
import { Vault, Wallet } from "lucide-react";

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
  isComingSoon = false,
}: {
  marketId: string;
  market: DefinedMarket;
  model: SailMarketCardModel;
  isConnected: boolean;
  onExploreMarket: (marketId: string, m: DefinedMarket) => void;
  isComingSoon?: boolean;
}) {
  const showMaintenance = isMarketInMaintenance(market);
  const { longSide, shortSide, direction, collateralSymbol } = model;
  const hsSymbol =
    (longSide || "").toLowerCase().startsWith("hs")
      ? longSide
      : (shortSide || "").toLowerCase().startsWith("hs")
        ? shortSide
        : market.leveragedToken?.symbol || "hs";
  const subtitle = collateralSymbol
    ? `Using ${collateralSymbol} as collateral`
    : "Variable leverage token";
  const leverageDisplay = formatLeverage(model.leverageRatio);
  const footerLine = `Leverage long on ${longSide}. Short on ${shortSide}.`;
  const collateralForStrip =
    market.collateral?.underlyingSymbol ||
    market.collateral?.symbol ||
    collateralSymbol ||
    "fxUSD";

  const directionPillClass =
    direction === "LONG"
      ? "bg-[#dcfce7] text-[#166534] ring-1 ring-[#166534]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_26px_-22px_rgba(22,101,52,0.35)]"
      : "bg-[#ffedd5] text-[#9a3412] ring-1 ring-[#9a3412]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_26px_-22px_rgba(154,52,18,0.32)]";
  const directionDotClass =
    direction === "LONG"
      ? "bg-[#16a34a] shadow-[0_0_0_3px_rgba(22,163,74,0.18)]"
      : "bg-[#f97316] shadow-[0_0_0_3px_rgba(249,115,22,0.18)]";

  const comingSoonChip = (
    <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f1f5f9] px-3.5 py-1.5 text-[12px] font-black uppercase tracking-[0.10em] text-[#64748b] ring-1 ring-[#1E4775]/10">
      <span className="h-2 w-2 rounded-full bg-[#94a3b8] shadow-[0_0_0_3px_rgba(148,163,184,0.22)]" />
      <span>Coming soon</span>
    </span>
  );

  return (
    <article className={`${SAIL_CARD_SHELL_CLASS} ${isComingSoon ? "opacity-90" : ""}`}>
      <div className="flex flex-col items-center text-center">
        <Image
          src={getLogoPath(hsSymbol)}
          alt={hsSymbol}
          width={72}
          height={72}
          className="mb-1 h-[72px] w-[72px] rounded-full ring-1 ring-black/5"
        />
        <h3 className="font-mono text-2xl font-bold leading-tight tracking-tight text-[#153B63]">
          {hsSymbol}
        </h3>
        <div className="mt-1 text-center text-[11px] leading-snug text-[#94a3b8]">
          <div>{footerLine}</div>
          <div className="mt-0.5">{subtitle}</div>
        </div>
        <div className="mt-2 flex w-full flex-col items-center justify-center gap-1.5">
          {isComingSoon ? (
            comingSoonChip
          ) : (
            <span
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-1.5 text-[12px] font-black uppercase tracking-[0.10em] ${directionPillClass}`}
            >
              <span className={`h-2 w-2 rounded-full ${directionDotClass}`} />
              <span>{direction}</span>
            </span>
          )}
        </div>

        <p className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight text-[#153B63] sm:text-4xl">
          {leverageDisplay}
        </p>
      </div>

      <div className="rounded-xl border border-[#1E4775]/12 bg-[#f8fafc] px-3 py-2">
        <div className="flex min-h-[44px] items-center justify-evenly gap-2 text-[#1E4775]">
          <Image
            src={getLogoPath(collateralForStrip)}
            alt={collateralForStrip}
            width={28}
            height={28}
            className={sideLogoClass(collateralForStrip)}
          />
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#1E4775]/35" />
          <Image
            src={getLogoPath(hsSymbol)}
            alt={hsSymbol}
            width={28}
            height={28}
            className={sideLogoClass(hsSymbol)}
          />
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#1E4775]/35" />
          <div
            className="flex shrink-0 flex-col items-center justify-center gap-px text-[#1E4775]"
            aria-hidden
          >
            <span className="flex h-5 w-5 items-center justify-center">
              <Wallet className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="flex h-5 w-5 items-center justify-center">
              <Vault className="h-5 w-5" strokeWidth={1.75} />
            </span>
          </div>
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
          disabled={isComingSoon || !isConnected || showMaintenance}
          onClick={() => onExploreMarket(marketId, market)}
          className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition ${
            isComingSoon
              ? "cursor-not-allowed border border-[#cbd5e1] bg-[#f8fafc] text-[#94a3b8]"
              : "bg-[#153B63] text-white hover:bg-[#0F2F52] disabled:cursor-not-allowed disabled:bg-[#153B63]/40"
          }`}
        >
          Explore Market
          <ArrowRightIcon className="h-4 w-4" />
        </button>
        <div className="flex justify-center px-3">
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
        <div className="mt-3 w-full border-t border-[#e2e8f0]" />
        <div className="flex items-center justify-center gap-2 pt-3 text-xs font-semibold text-[#64748b]">
          <NetworkIconCell
            chainName={market.chain?.name || "Ethereum"}
            chainLogo={market.chain?.logo || "icons/eth.png"}
            size={18}
            className="rounded-full ring-1 ring-[#1E4775]/10"
          />
          <span className="leading-none">{market.chain?.name || "Ethereum"}</span>
        </div>
      </div>
    </article>
  );
}
