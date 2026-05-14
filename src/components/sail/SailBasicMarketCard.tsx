"use client";

import Image from "next/image";
import { ChevronRightIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import type { DefinedMarket } from "@/config/markets";
import { isMarketInMaintenance } from "@/config/markets";
import { MarketMaintenanceTag } from "@/components/MarketMaintenanceTag";
import { getLogoPath } from "@/components/shared";
import {
  BASIC_MARKET_CARD_SHELL_CLASS,
  BASIC_MARKET_COMING_SOON_CHIP_CLASS,
  BASIC_MARKET_COMING_SOON_CONTENT_DIM_CLASS,
  BASIC_MARKET_COMING_SOON_NEUTRAL_DOT_CLASS,
  BASIC_MARKET_COMING_SOON_VEIL_CLASS,
  BASIC_MARKET_DIRECTION_LONG_CHIP_CLASS,
  BASIC_MARKET_DIRECTION_LONG_DOT_CLASS,
  BASIC_MARKET_DIRECTION_SHORT_CHIP_CLASS,
  BASIC_MARKET_DIRECTION_SHORT_DOT_CLASS,
  BASIC_MARKET_FLOW_ARROW_CLASS,
  BASIC_MARKET_FLOW_LOGO_PX,
  BASIC_MARKET_METRIC_PRIMARY_CLASS,
  BASIC_MARKET_SUBTITLE_MUTED_LINE_CLASS,
  BASIC_MARKET_SUBTITLE_PRIMARY_CLASS,
  BASIC_MARKET_SYMBOL_TITLE_CLASS,
  BASIC_MARKET_ICON_WELL_CLASS,
  BASIC_MARKET_TOKEN_STRIP_OUTER_CLASS,
  BASIC_MARKET_TOKEN_STRIP_ROW_CLASS,
  HARBOR_COMING_SOON_CTA_SURFACE_CLASS,
  HARBOR_PRIMARY_CTA_INLINE_FLEX_CLASS,
} from "@/components/market-cards/harborBasicMarketTokens";
import { HarborBasicMarketNetworkFooter } from "@/components/market-cards/HarborBasicMarketNetworkFooter";
import { formatLeverage } from "@/utils/sailDisplayFormat";
import type { SailMarketCardModel } from "@/utils/sailMarketCardModel";
import { SailMintRedeemFeeColumn } from "./SailMintRedeemFeeColumn";
import { Vault, Wallet } from "lucide-react";

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
  const { longSide, shortSide, collateralSymbol } = model;
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

  const comingSoonChip = (
    <span className={BASIC_MARKET_COMING_SOON_CHIP_CLASS}>
      <span className={BASIC_MARKET_COMING_SOON_NEUTRAL_DOT_CLASS} />
      <span>Coming soon</span>
    </span>
  );

  const normalizeSideLabel = (value: string): string => {
    const v = (value || "").trim().toLowerCase();
    if (!v) return "";
    if (v.includes("fxusd") || v.includes("fxsave") || v === "usd") return "USD";
    if (v.includes("wsteth") || v.includes("steth") || v === "eth") return "ETH";
    if (v.includes("btc")) return "BTC";
    if (v.includes("eur")) return "EUR";
    return value.trim().toUpperCase();
  };

  const pairByHsSymbol: Record<string, { long: string; short: string }> = {
    "HSFXUSD-ETH": { long: "USD", short: "ETH" },
    "HSFXUSD-BTC": { long: "USD", short: "BTC" },
    "HSSTETH-BTC": { long: "ETH", short: "BTC" },
    "HSSTETH-EUR": { long: "ETH", short: "EUR" },
    "HSFXUSD-EUR": { long: "USD", short: "EUR" },
    "HSSTETH-USD": { long: "ETH", short: "USD" },
  };

  const mappedSides = pairByHsSymbol[hsSymbol.toUpperCase()];
  const longChipLabel = mappedSides?.long ?? normalizeSideLabel(longSide);
  const shortChipLabel = mappedSides?.short ?? normalizeSideLabel(shortSide);

  const longChipClass =
    `flex w-full items-center justify-center gap-2 rounded-xl px-2.5 py-1 text-[11px] font-black leading-none tracking-[0.03em] ${BASIC_MARKET_DIRECTION_LONG_CHIP_CLASS}`;
  const shortChipClass =
    `flex w-full items-center justify-center gap-2 rounded-xl px-2.5 py-1 text-[11px] font-black leading-none tracking-[0.03em] ${BASIC_MARKET_DIRECTION_SHORT_CHIP_CLASS}`;

  return (
    <article
      className={`${BASIC_MARKET_CARD_SHELL_CLASS} ${isComingSoon ? "relative overflow-hidden" : ""}`}
    >
      {isComingSoon ? (
        <div aria-hidden className={BASIC_MARKET_COMING_SOON_VEIL_CLASS} />
      ) : null}
      <div
        className={`flex min-h-0 flex-1 flex-col ${isComingSoon ? BASIC_MARKET_COMING_SOON_CONTENT_DIM_CLASS : ""}`}
      >
      <div className="flex flex-col items-center text-center">
        <Image
          src={getLogoPath(hsSymbol)}
          alt={hsSymbol}
          width={72}
          height={72}
          className="mb-1 h-[72px] w-[72px] rounded-full ring-1 ring-black/5"
        />
        <div className="mt-0.5 text-center space-y-0.5">
          <div className={BASIC_MARKET_SUBTITLE_PRIMARY_CLASS}>{footerLine}</div>
          <div className={BASIC_MARKET_SUBTITLE_MUTED_LINE_CLASS}>{subtitle}</div>
        </div>
        <div className="mt-2 flex h-9 w-full flex-col items-center justify-center gap-1.5">
          {isComingSoon ? (
            comingSoonChip
          ) : (
            <div className="flex w-full items-center gap-2">
              <span className={`${longChipClass} flex-1`}>
                <span
                  className={`${BASIC_MARKET_DIRECTION_LONG_DOT_CLASS} shrink-0 animate-pulse`}
                  aria-hidden
                />
                <span className="leading-none">{`Long ${longChipLabel}`}</span>
              </span>
              <span className={`${shortChipClass} flex-1`}>
                <span className="leading-none">{`Short ${shortChipLabel}`}</span>
                <span
                  className={`${BASIC_MARKET_DIRECTION_SHORT_DOT_CLASS} shrink-0 animate-pulse`}
                  aria-hidden
                />
              </span>
            </div>
          )}
        </div>

        <p className={`mt-3 ${BASIC_MARKET_METRIC_PRIMARY_CLASS}`}>
          {leverageDisplay}
        </p>
      </div>

      <div className={BASIC_MARKET_TOKEN_STRIP_OUTER_CLASS}>
        <div className={BASIC_MARKET_TOKEN_STRIP_ROW_CLASS}>
          <Image
            src={getLogoPath(collateralForStrip)}
            alt={collateralForStrip}
            width={BASIC_MARKET_FLOW_LOGO_PX}
            height={BASIC_MARKET_FLOW_LOGO_PX}
            className={sideLogoClass(collateralForStrip)}
          />
          <ChevronRightIcon className={BASIC_MARKET_FLOW_ARROW_CLASS} aria-hidden />
          <Image
            src={getLogoPath(hsSymbol)}
            alt={hsSymbol}
            width={BASIC_MARKET_FLOW_LOGO_PX}
            height={BASIC_MARKET_FLOW_LOGO_PX}
            className={sideLogoClass(hsSymbol)}
          />
          <ChevronRightIcon className={BASIC_MARKET_FLOW_ARROW_CLASS} aria-hidden />
          <div
            className="flex shrink-0 flex-col items-center justify-center gap-px text-[#1E4775]"
            aria-hidden
          >
            <span className={BASIC_MARKET_ICON_WELL_CLASS}>
              <Wallet className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className={BASIC_MARKET_ICON_WELL_CLASS}>
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
          className={
            isComingSoon
              ? `${HARBOR_COMING_SOON_CTA_SURFACE_CLASS} flex items-center justify-center gap-1.5`
              : HARBOR_PRIMARY_CTA_INLINE_FLEX_CLASS
          }
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
        <HarborBasicMarketNetworkFooter
          chains={
            market.chain?.name
              ? [{ name: market.chain.name, logo: market.chain.logo }]
              : [{ name: "Ethereum", logo: "icons/eth.png" }]
          }
        />
      </div>
      </div>
    </article>
  );
}
