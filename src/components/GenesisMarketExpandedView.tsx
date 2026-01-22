import React from "react";
import Image from "next/image";
import { formatDateTime } from "@/utils/formatters";
import { EtherscanLink, getLogoPath } from "@/components/shared";
import { useGenesisMarketExpandedData } from "@/hooks/useGenesisMarketExpandedData";

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

  const addresses = market.addresses as Record<string, string | undefined>;

  // Get market name for description - use leveraged token symbol without "hs" prefix
  // This gives us "FXUSD-BTC" from "hsFXUSD-BTC", etc.
  const marketName =
    leveragedTokenSymbol && leveragedTokenSymbol.toLowerCase().startsWith("hs")
      ? leveragedTokenSymbol.slice(2)
      : leveragedTokenSymbol || (market as any).name || "Market";

  return (
    <div className="bg-[rgb(var(--surface-selected-rgb))] p-4 border-t border-white/20">
      {/* Description Box */}
      <div className="bg-white p-4 mb-2 border border-[#1E4775]/10">
        <p className="text-xs text-[#1E4775] leading-relaxed">
          Earn ledger marks for providing liquidity to the{" "}
          <span className="font-semibold">{marketName}</span> market.{" "}
          <span className="font-semibold">{collateralTokenSymbol}</span> is
          split into equal portions of{" "}
          <span className="font-semibold">{peggedTokenSymbol}</span> and{" "}
          <span className="font-semibold">{leveragedTokenSymbol}</span>, which
          are minted on claim. Until you claim, you have{" "}
          <span className="font-semibold">{collateralTokenSymbol}</span>{" "}
          exposure. After you claim your net exposure depends on the balance of
          the market compared to your balance of{" "}
          <span className="font-semibold">{peggedTokenSymbol}</span> and{" "}
          <span className="font-semibold">{leveragedTokenSymbol}</span> tokens.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* First Column: End Date/Time and Projected APR */}
        <div className="flex flex-col gap-2 h-full">
          {/* Genesis Info */}
          <div className="bg-white p-2 flex flex-col justify-center">
            <h3 className="text-[#1E4775] font-semibold mb-1 text-xs text-center">
              End Date/Time
            </h3>
            <p className="text-sm font-bold text-[#1E4775] text-center">
              {formatDateTime(endDate)}
            </p>
          </div>

          {/* Projected Stability Pool APR */}
          {underlyingAPR !== null && underlyingAPR !== undefined && (
            <div className="text-xs text-white bg-[#1E4775] px-4 py-2 text-center flex-1 flex flex-col justify-center">
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
        <div className="bg-white p-2 flex flex-col">
          <h3 className="text-[#1E4775] font-semibold mb-1 text-xs">
            Contract Info
          </h3>
          <div>
            <EtherscanLink label="Genesis" address={addresses.genesis} />
            <EtherscanLink label="Minter" address={addresses.minter} />
            <EtherscanLink
              label="Collateral Token"
              address={addresses.collateralToken}
            />
            <EtherscanLink label="ha Token" address={peggedTokenAddress} />
            <EtherscanLink label="hs Token" address={leveragedTokenAddress} />
          </div>
        </div>

        <div className="bg-white p-2 flex flex-col">
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
              <span className="text-[#1E4775]/70">ha Token:</span>
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
              <span className="text-[#1E4775]/70">hs Token:</span>
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
