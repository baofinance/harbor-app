import React from "react";
import Image from "next/image";
import { formatDateTime } from "@/utils/formatters";
import { EtherscanLink, getLogoPath } from "@/components/shared";
import { useGenesisMarketExpandedData } from "@/hooks/useGenesisMarketExpandedData";
import { maidenVoyageYieldOwnerSharePercent } from "@/config/maidenVoyageYield";

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

  const yieldOwnerSharePct = maidenVoyageYieldOwnerSharePercent(
    genesisAddress?.toLowerCase() ?? null
  );
  const yieldShareSentence =
    yieldOwnerSharePct != null ? (
      <>
        <span className="font-semibold text-[#1E4775]">
          {yieldOwnerSharePct}% of attributed revenue
        </span>{" "}
      </>
    ) : (
      <>
        <span className="font-semibold text-[#1E4775]">
          A configured share of attributed revenue
        </span>{" "}
      </>
    );

  const addresses = market.addresses as Record<string, string | undefined>;

  return (
    <div className="bg-[rgb(var(--surface-selected-rgb))] p-4 border-t border-white/20 rounded-lg overflow-hidden">
      <div className="bg-[#17395F]/10 p-4 mb-2 border border-[#1E4775]/15 rounded-lg">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#1E4775]/85 mb-2">
          How yield works (this market)
        </h3>
        <ol className="text-[13px] text-[#1E4775]/90 space-y-1.5 leading-snug">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#1E4775]/30 text-[10px] font-semibold">
              1
            </span>
            <span>
              <strong>This market has its own on-chain yield pool.</strong>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#1E4775]/30 text-[10px] font-semibold">
              2
            </span>
            <span>
              <strong>Revenue from fees + collateral carry</strong> is credited to
              this pool. {yieldShareSentence} (in USD) is distributed to owners.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#1E4775]/30 text-[10px] font-semibold">
              3
            </span>
            <span>
              <strong>Your final ownership % is set at Genesis close</strong> (plus
              voyage boost), this determines your lifetime share.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#1E4775]/30 text-[10px] font-semibold">
              4
            </span>
            <span>
              <strong>% still open</strong> shows remaining capped ownership
              headroom (<strong>not</strong> an APR).
            </span>
          </li>
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* First Column: End Date/Time and Projected APR */}
        <div className="flex flex-col gap-2 h-full">
          {/* Genesis Info */}
          <div className="bg-white p-2 flex flex-col justify-center rounded-lg">
            <h3 className="text-[#1E4775] font-semibold mb-1 text-xs text-center">
              End Date/Time
            </h3>
            <p className="text-sm font-bold text-[#1E4775] text-center">
              {formatDateTime(endDate)}
            </p>
          </div>

          {/* Projected Stability Pool APR */}
          {underlyingAPR !== null && underlyingAPR !== undefined && (
            <div className="rounded-lg bg-[#1E4775] px-4 py-2 text-center text-xs text-white flex-1 flex flex-col justify-center">
              <div className="font-semibold mb-1">
                Projected {peggedTokenSymbol} APR (Stability pools)
              </div>
              <div>
                <span className="font-semibold">
                  {(underlyingAPR * 2 * 100).toFixed(2)}% +
                </span>
                <Image
                  src="/icons/marks.png"
                  alt="Marks"
                  width={14}
                  height={14}
                  className="inline-block ml-1 align-middle"
                />
              </div>
            </div>
          )}
        </div>

        {/* Contract Info */}
        <div className="bg-white p-2 flex flex-col rounded-lg">
          <h3 className="text-[#1E4775] font-semibold mb-1 text-xs">
            Contract Info
          </h3>
          <div>
            <EtherscanLink
              label="Genesis"
              address={addresses.genesis}
              chainId={(market as any).chainId ?? 1}
            />
            <EtherscanLink
              label="Minter"
              address={addresses.minter}
              chainId={(market as any).chainId ?? 1}
            />
            <EtherscanLink
              label="Collateral Token"
              address={addresses.collateralToken}
              chainId={(market as any).chainId ?? 1}
            />
            <EtherscanLink
              label="Anchor Token"
              address={peggedTokenAddress}
              chainId={(market as any).chainId ?? 1}
            />
            <EtherscanLink
              label="Sail Token"
              address={leveragedTokenAddress}
              chainId={(market as any).chainId ?? 1}
            />
          </div>
        </div>

        <div className="bg-white p-2 flex flex-col rounded-lg">
          <h3 className="text-[#1E4775] font-semibold mb-1 text-xs">Tokens</h3>
          <div className="space-y-1 text-xs flex-1 flex justify-center flex-col">
            <div className="flex justify-between items-center">
              <span className="text-[#1E4775]/70">Market Collateral:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#1E4775] font-mono">
                  {collateralTokenSymbol}
                </span>
                <Image
                  src={getLogoPath(collateralTokenSymbol)}
                  alt={collateralTokenSymbol}
                  width={20}
                  height={20}
                  className="flex-shrink-0"
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#1E4775]/70">Anchor Token:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#1E4775] font-mono">
                  {peggedTokenSymbol}
                </span>
                <Image
                  src={getLogoPath(peggedTokenSymbol)}
                  alt={peggedTokenSymbol}
                  width={20}
                  height={20}
                  className="flex-shrink-0"
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#1E4775]/70">Sail Token:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#1E4775] font-mono">
                  {leveragedTokenSymbol}
                </span>
                <Image
                  src={getLogoPath(leveragedTokenSymbol)}
                  alt={leveragedTokenSymbol}
                  width={20}
                  height={20}
                  className="flex-shrink-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
