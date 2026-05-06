"use client";

import Image from "next/image";
import NetworkIconCell from "@/components/NetworkIconCell";
import { TokenLogo } from "@/components/shared";
import { INDEX_CORAL_INFO_TAG_CLASS } from "@/components/shared/indexMarketsToolbarStyles";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import { resolveGenesisUnderlyingApr } from "@/utils/genesisAprDerived";

function getLongSide(market: { leveragedToken?: { description?: string; name?: string; symbol?: string } }): string {
  const desc = market.leveragedToken?.description || "";
  const match = desc.match(/Long\s+(\w+)/i);
  if (match) return match[1];
  const name = market.leveragedToken?.name || "";
  const versusMatch = name.match(/versus\s+(\w+)/i);
  if (versusMatch) return versusMatch[1];
  const symbol = market.leveragedToken?.symbol || "";
  const symbolMatch = symbol.match(/^hs([A-Z]+)-/i);
  if (symbolMatch) return symbolMatch[1];
  return "Other";
}

function getShortSide(market: { leveragedToken?: { description?: string; name?: string; symbol?: string } }): string {
  const desc = market.leveragedToken?.description || "";
  const shortMatch = desc.match(/short\s+(\w+)/i);
  if (shortMatch) return shortMatch[1];
  const name = market.leveragedToken?.name || "";
  const nameShortMatch = name.match(/Short\s+(\w+)/i);
  if (nameShortMatch) return nameShortMatch[1];
  const longMatch = desc.match(/Long\s+\w+\s+vs\s+(\w+)/i);
  if (longMatch) return longMatch[1];
  const symbol = market.leveragedToken?.symbol || "";
  const symbolMatch = symbol.match(/^hs[A-Z]+-(.+)$/i);
  if (symbolMatch) return symbolMatch[1];
  return "Other";
}

export type GenesisComingNextMarketsSectionProps = {
  markets: Array<[string, GenesisMarketConfig]>;
  wstETHAPR: number | undefined;
  fxSAVEAPR: number | undefined;
};

/**
 * “Next Campaign” table for markets with `status: coming-soon` (e.g. Metals maiden voyage).
 */
export function GenesisComingNextMarketsSection({
  markets,
  wstETHAPR,
  fxSAVEAPR,
}: GenesisComingNextMarketsSectionProps) {
  if (markets.length === 0) return null;

  return (
    <section className="space-y-2 overflow-visible mt-8">
      <div className="pt-4 mb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">Next Campaign:</h2>
          <span className={INDEX_CORAL_INFO_TAG_CLASS}>Metals</span>
        </div>
      </div>
      <div className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto mb-0 rounded-md">
        <div className="grid lg:grid-cols-[32px_1.5fr_80px_0.9fr_1fr_0.9fr] md:grid-cols-[32px_120px_80px_100px_1fr_90px] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
          <div className="min-w-0" aria-label="Network" />
          <div className="min-w-0 text-center">Market</div>
          <div className="text-center min-w-0 whitespace-nowrap">Proj. SP APR</div>
          <div className="text-center min-w-0">Anchor Token</div>
          <div className="text-center min-w-0">Sail Token</div>
          <div className="text-center min-w-0">Status</div>
        </div>
      </div>
      <div className="space-y-2">
        {markets.map(([id, mkt]) => {
          const peggedSymbol = mkt.peggedToken?.symbol || "haTOKEN";
          const leveragedSymbol = mkt.leveragedToken?.symbol || "hsTOKEN";
          const collateralSymbol = mkt.collateral?.symbol || "COLLATERAL";
          const longSide = getLongSide(mkt);
          const shortSide = getShortSide(mkt);
          const sailDescription =
            longSide && shortSide ? `Long ${longSide} / Short ${shortSide}` : leveragedSymbol;
          const { underlyingAPR } = resolveGenesisUnderlyingApr(collateralSymbol, {
            wstETHAPR,
            fxSAVEAPR,
          });
          const marketName = `${collateralSymbol}-${mkt.pegTarget?.toUpperCase() || "TOKEN"}`;

          return (
            <div key={id} className="bg-white py-2.5 px-2 rounded-md border border-white/10">
              <div className="hidden md:grid lg:grid-cols-[32px_1.5fr_80px_0.9fr_1fr_0.9fr] md:grid-cols-[32px_120px_80px_100px_1fr_110px] gap-4 items-center">
                <div className="flex items-center justify-center">
                  <NetworkIconCell
                    chainName={mkt.chain?.name || "Ethereum"}
                    chainLogo={mkt.chain?.logo || "icons/eth.png"}
                    size={20}
                  />
                </div>
                <div className="flex items-center gap-2 min-w-0 pl-4">
                  <div className="text-[#1E4775] font-medium text-sm">{marketName}</div>
                  <div className="flex items-center gap-1">
                    <TokenLogo symbol={collateralSymbol} size={20} className="flex-shrink-0" />
                    <span className="text-[#1E4775]/60 text-xs">=</span>
                    <TokenLogo symbol={peggedSymbol} size={20} className="flex-shrink-0" />
                    <span className="text-[#1E4775]/60 text-xs">+</span>
                    <TokenLogo symbol={leveragedSymbol} size={20} className="flex-shrink-0" />
                  </div>
                </div>
                <div className="flex-shrink-0 text-center">
                  {underlyingAPR !== null && underlyingAPR !== undefined ? (
                    <div className="text-[#1E4775] font-semibold text-xs">
                      {(underlyingAPR * 2 * 100).toFixed(2)}% +
                      <Image
                        src="/icons/marks.png"
                        alt="Marks"
                        width={20}
                        height={20}
                        className="inline-block ml-1 align-middle"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1.5 min-w-0">
                  <TokenLogo symbol={peggedSymbol} size={20} className="flex-shrink-0" />
                  <span className="text-[#1E4775] font-semibold text-xs">{peggedSymbol}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 min-w-0">
                  <div className="flex items-center justify-center gap-1.5">
                    <TokenLogo symbol={leveragedSymbol} size={20} className="flex-shrink-0" />
                    <span className="text-[#1E4775] font-semibold text-xs">{leveragedSymbol}</span>
                  </div>
                  <div className="text-[#1E4775]/60 text-[9px] italic text-center">{sailDescription}</div>
                </div>
                <div className="flex-shrink-0 text-center min-w-0 overflow-hidden">
                  <div className="bg-[#FF8A7A] px-2 md:px-3 py-1 rounded-md inline-block max-w-full">
                    <span className="text-white font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">
                      Coming Next
                    </span>
                  </div>
                </div>
              </div>

              <div className="md:hidden space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-[#1E4775] font-medium text-sm">{marketName}</div>
                    <div className="flex items-center gap-1">
                      <TokenLogo symbol={collateralSymbol} size={20} className="flex-shrink-0" />
                      <span className="text-[#1E4775]/60 text-xs">=</span>
                      <TokenLogo symbol={peggedSymbol} size={20} className="flex-shrink-0" />
                      <span className="text-[#1E4775]/60 text-xs">+</span>
                      <TokenLogo symbol={leveragedSymbol} size={20} className="flex-shrink-0" />
                    </div>
                  </div>
                  <div className="bg-[#FF8A7A] px-3 py-1 rounded-md">
                    <span className="text-white font-semibold text-[10px] uppercase tracking-wider">
                      Coming Next
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[#1E4775]/70 text-[10px] mb-1">Anchor Token</div>
                    <div className="flex items-center gap-1.5">
                      <TokenLogo symbol={peggedSymbol} size={16} className="flex-shrink-0" />
                      <span className="text-[#1E4775] font-semibold text-xs">{peggedSymbol}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[#1E4775]/70 text-[10px] mb-1">Sail Token</div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <TokenLogo symbol={leveragedSymbol} size={16} className="flex-shrink-0" />
                        <span className="text-[#1E4775] font-semibold text-xs">{leveragedSymbol}</span>
                      </div>
                      <div className="text-[#1E4775]/60 text-[9px] italic">{sailDescription}</div>
                    </div>
                  </div>
                </div>
                {underlyingAPR !== null && underlyingAPR !== undefined && (
                  <div className="text-sm text-[#1E4775]">
                    <span className="font-semibold">
                      Projected {peggedSymbol} APR: {(underlyingAPR * 2 * 100).toFixed(2)}% +
                    </span>
                    <Image
                      src="/icons/marks.png"
                      alt="Marks"
                      width={18}
                      height={18}
                      className="inline-block ml-1 align-middle"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
