"use client";

import React from "react";
import Image from "next/image";
import { formatDateTime } from "@/utils/formatters";
import { EtherscanLink, TokenLogo } from "@/components/shared";
import SimpleTooltip from "@/components/SimpleTooltip";
import { useGenesisMarketExpandedData } from "@/hooks/useGenesisMarketExpandedData";

const sectionHeaderClass =
  "text-xs font-semibold uppercase tracking-wide text-[#1E4775]/80";

const yieldBulletStrongClass = "font-semibold text-[#1E4775]";

const TOKEN_ROW_ICON_PX = 28;

interface GenesisMarketExpandedViewProps {
  marketId: string;
  market: any;
  genesisAddress: string | undefined;
  totalDeposits: bigint | undefined;
  totalDepositsUSD: number;
  userDeposit: bigint | undefined;
  isConnected: boolean;
  address: string | undefined;
  endDate: string | undefined;
  collateralSymbol: string;
  collateralPriceUSD: number;
  peggedSymbol?: string;
  leveragedSymbol?: string;
  underlyingAPR?: number | null;
}

export const GenesisMarketExpandedView = ({
  marketId: _marketId,
  market,
  genesisAddress,
  totalDepositsUSD,
  userDeposit,
  endDate,
  collateralSymbol,
  collateralPriceUSD,
  peggedSymbol,
  leveragedSymbol,
  underlyingAPR,
}: GenesisMarketExpandedViewProps) => {
  const {
    peggedTokenAddress,
    leveragedTokenAddress,
    peggedTokenSymbol,
    leveragedTokenSymbol,
    collateralTokenSymbol,
  } = useGenesisMarketExpandedData({
    genesisAddress,
    market,
    peggedSymbol,
    leveragedSymbol,
  });

  void userDeposit;
  void totalDepositsUSD;
  void collateralPriceUSD;

  const addresses = market.addresses as Record<string, string | undefined>;
  const chainId = (market as { chainId?: number }).chainId ?? 1;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className={sectionHeaderClass}>How yield works (this market)</h3>
        <ul className="space-y-3 text-[13px] leading-snug text-[#1E4775]/90">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E4775]/40" aria-hidden />
            <span>
              <strong className={yieldBulletStrongClass}>
                This market has its own on-chain yield pool.
              </strong>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E4775]/40" aria-hidden />
            <span>
              <strong className={yieldBulletStrongClass}>
                Revenue from fees + collateral carry
              </strong>{" "}
              is credited to this pool.
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E4775]/40" aria-hidden />
            <span>
              <strong className={yieldBulletStrongClass}>
                A configured share of attributed revenue (in USD)
              </strong>{" "}
              is distributed to owners.
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E4775]/40" aria-hidden />
            <span>
              <strong className={yieldBulletStrongClass}>
                Your final ownership % is set at Genesis close
              </strong>{" "}
              (plus voyage boost), this determines your lifetime share.
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E4775]/40" aria-hidden />
            <span>
              <strong className={yieldBulletStrongClass}>Exiting your initial position</strong>{" "}
              reduces your share to the <strong className={yieldBulletStrongClass}>minimum share</strong>.
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E4775]/40" aria-hidden />
            <span>
              <strong className={yieldBulletStrongClass}>% still open</strong> shows remaining
              capped ownership headroom (<strong className={yieldBulletStrongClass}>not</strong>{" "}
              an APR).
            </span>
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-5 border-t border-[#1E4775]/12 pt-5 md:grid-cols-3 md:gap-0 md:gap-y-5">
        <div className="flex flex-col gap-3 md:pr-6">
          <div className="text-center md:text-left">
            <div className={sectionHeaderClass}>End Date/Time</div>
            <p className="mt-1 text-base font-semibold tracking-tight text-[#10141A]">
              {formatDateTime(endDate)}
            </p>
          </div>

          {underlyingAPR !== null && underlyingAPR !== undefined && (
            <div className="rounded-xl bg-[#1E4775] px-4 py-3.5 text-center text-[#FFFFFF] shadow-sm">
              <div className="text-sm font-semibold leading-snug text-white/95">
                Projected {peggedTokenSymbol} APR (Stability pools)
              </div>
              <div className="mt-2.5 flex items-center justify-center gap-2">
                <span className="text-sm font-semibold tabular-nums leading-snug text-white/95">
                  {(underlyingAPR * 2 * 100).toFixed(2)}% +
                </span>
                <Image
                  src="/icons/marks.png"
                  alt="Marks"
                  width={16}
                  height={16}
                  className="inline-block shrink-0 align-middle opacity-95"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[#1E4775]/12 pt-5 md:border-l md:border-t-0 md:px-5 md:pt-0">
          <div className={sectionHeaderClass}>Contract Info</div>
          <div className="mt-2 space-y-0.5 text-[13px]">
            <EtherscanLink
              label="Genesis"
              address={addresses.genesis}
              chainId={chainId}
            />
            <EtherscanLink
              label="Minter"
              address={addresses.minter}
              chainId={chainId}
            />
            <EtherscanLink
              label="Collateral Token"
              address={addresses.collateralToken}
              chainId={chainId}
            />
            <EtherscanLink
              label="Anchor Token"
              address={peggedTokenAddress}
              chainId={chainId}
            />
            <EtherscanLink
              label="Sail Token"
              address={leveragedTokenAddress}
              chainId={chainId}
            />
          </div>
        </div>

        <div className="border-t border-[#1E4775]/12 pt-5 md:border-l md:border-t-0 md:pl-5 md:pr-0 md:pt-0">
          <div className={sectionHeaderClass}>Tokens</div>
          <div className="mt-3 space-y-2.5 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#1E4775]/75">Market Collateral:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[#10141A]">
                  {collateralTokenSymbol}
                </span>
                <SimpleTooltip label={collateralTokenSymbol} className="cursor-help">
                  <TokenLogo
                    symbol={collateralTokenSymbol}
                    size={TOKEN_ROW_ICON_PX}
                    className="ring-0"
                  />
                </SimpleTooltip>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#1E4775]/75">Anchor Token:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[#10141A]">
                  {peggedTokenSymbol}
                </span>
                <SimpleTooltip label={peggedTokenSymbol} className="cursor-help">
                  <TokenLogo
                    symbol={peggedTokenSymbol}
                    size={TOKEN_ROW_ICON_PX}
                    className="ring-0"
                  />
                </SimpleTooltip>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#1E4775]/75">Sail Token:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[#10141A]">
                  {leveragedTokenSymbol}
                </span>
                <SimpleTooltip label={leveragedTokenSymbol} className="cursor-help">
                  <TokenLogo
                    symbol={leveragedTokenSymbol}
                    size={TOKEN_ROW_ICON_PX}
                    className="ring-0"
                  />
                </SimpleTooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
