"use client";

import Image from "next/image";
import SimpleTooltip from "@/components/SimpleTooltip";
import { isMarketInMaintenance } from "@/config/markets";
import type { CollateralPriceData } from "@/hooks/useCollateralPrice";
import { getLogoPath } from "@/components/shared";
import { GenesisMarketRowClaimActions } from "./GenesisMarketRowClaimActions";
import {
  GenesisMarketChainCell,
  GenesisMarketCollateralEquationStrip,
  GenesisYourDepositAmountText,
} from "./GenesisMarketSharedRowCells";
import {
  GENESIS_COMPLETED_DESKTOP_ROW_GRID_CLASS,
  GENESIS_COMPLETED_HEADER_INNER_GRID_CLASS,
} from "./genesisActiveTableStyles";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import { formatUSD, formatToken } from "@/utils/formatters";
import { formatGenesisMarketDisplayName } from "@/utils/genesisDisplay";
import { computeGenesisRowUsdPricing } from "@/utils/genesisRowPricing";
import { formatEther } from "viem";
import { readContractRowResult } from "./readContractRow";

export type GenesisClaimMarketArgs = {
  marketId: string;
  genesisAddress: string | undefined;
  displayMarketName: string;
  peggedSymbolForShare: string;
};

export type GenesisCompletedMarketsSectionProps = {
  displayedCompletedByCampaign: Map<string, Array<[string, GenesisMarketConfig, unknown]>>;
  genesisMarkets: Array<[string, GenesisMarketConfig]>;
  reads: readonly unknown[] | undefined;
  isConnected: boolean;
  collateralPricesMap: Map<string, CollateralPriceData>;
  coinGeckoPrices: Record<string, number | null>;
  coinGeckoLoading: boolean;
  chainlinkBtcPrice: number | null;
  address: `0x${string}` | undefined;
  claimingMarket: string | null;
  onClaim: (args: GenesisClaimMarketArgs) => Promise<void>;
};

/**
 * Completed maiden voyages, grouped by campaign label (toolbar “All” reveals this block).
 */
export function GenesisCompletedMarketsSection({
  displayedCompletedByCampaign,
  genesisMarkets,
  reads,
  isConnected,
  collateralPricesMap,
  coinGeckoPrices,
  coinGeckoLoading,
  chainlinkBtcPrice,
  address,
  claimingMarket,
  onClaim,
}: GenesisCompletedMarketsSectionProps) {
  if (displayedCompletedByCampaign.size === 0) return null;

  return (
    <section className="space-y-4 overflow-visible mt-8">
      {Array.from(displayedCompletedByCampaign.entries()).map(([campaignLabel, markets]) => {
        const campaignName =
          campaignLabel.replace(/\s+Maiden Voyage.*/i, "").trim() || campaignLabel;

        return (
          <div key={campaignLabel} className="space-y-2">
            <div className="pt-4 mb-1">
              <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">
                Completed: {campaignName}
              </h2>
            </div>
            <div className="hidden md:block bg-white py-1.5 px-2 overflow-x-auto mb-0 rounded-md">
              <div className={GENESIS_COMPLETED_HEADER_INNER_GRID_CLASS}>
                <div className="min-w-0" aria-label="Network" />
                <div className="min-w-0 text-center">Market</div>
                <div className="text-center min-w-0">
                  Anchor
                  <span className="hidden lg:inline"> Tokens</span>
                </div>
                <div className="text-center min-w-0">
                  Sail
                  <span className="hidden lg:inline"> Tokens</span>
                </div>
                <div className="min-w-0 text-center">Your Deposit</div>
                <div className="text-center min-w-0">Action</div>
              </div>
            </div>
            <div className="space-y-2">
              {markets.map(([id, mkt]) => {
                const mi = genesisMarkets.findIndex((m) => m[0] === id);
                const baseOffset = mi * (isConnected ? 3 : 1);
                const claimableResult = isConnected
                  ? readContractRowResult<[bigint, bigint]>(reads, baseOffset + 2)
                  : undefined;
                const claimablePegged = claimableResult?.[0] || 0n;
                const claimableLeveraged = claimableResult?.[1] || 0n;
                const hasClaimable = claimablePegged > 0n || claimableLeveraged > 0n;
                const userDeposit = isConnected
                  ? readContractRowResult<bigint>(reads, baseOffset + 1)
                  : undefined;

                const genesisAddress = mkt.addresses?.genesis;
                const collateralSymbol = mkt.collateral?.symbol || "ETH";
                const oracleAddress = mkt.addresses?.collateralPrice as `0x${string}` | undefined;
                const collateralPriceData = oracleAddress
                  ? collateralPricesMap.get(oracleAddress.toLowerCase())
                  : undefined;
                const marketCoinGeckoId = mkt.coinGeckoId;
                const underlyingSymbol = mkt.collateral?.underlyingSymbol || collateralSymbol;

                const { collateralPriceUSD } = computeGenesisRowUsdPricing({
                  underlyingSymbol,
                  pegTarget: mkt.pegTarget,
                  marketCoinGeckoId,
                  coinGeckoPrices,
                  collateralPriceData,
                  chainlinkBtcPrice,
                  coinGeckoLoading,
                  collateralSymbol,
                });
                const userDepositUSD =
                  userDeposit && collateralPriceUSD > 0
                    ? Number(formatEther(userDeposit)) * collateralPriceUSD
                    : 0;
                const rowPeggedSymbol = mkt.peggedToken?.symbol || "ha";
                const rowLeveragedSymbol = mkt.leveragedToken?.symbol || "hs";
                const rawDisplayMarketName =
                  rowLeveragedSymbol && rowLeveragedSymbol.toLowerCase().startsWith("hs")
                    ? rowLeveragedSymbol.slice(2)
                    : rowLeveragedSymbol || mkt.name || "Market";
                const displayMarketName = formatGenesisMarketDisplayName(rawDisplayMarketName);
                const completedShowMaintenanceTag = isMarketInMaintenance(mkt);
                const peggedNoPrefixCompleted =
                  rowPeggedSymbol && rowPeggedSymbol.toLowerCase().startsWith("ha")
                    ? rowPeggedSymbol.slice(2)
                    : rowPeggedSymbol || "pegged token";

                const anchorTokenPriceUSD = 1;
                const sailTokenPriceUSD = collateralPriceUSD;

                return (
                  <div
                    key={id}
                    className="bg-white py-2.5 px-2 rounded-md border border-white/10"
                  >
                    <div className={GENESIS_COMPLETED_DESKTOP_ROW_GRID_CLASS}>
                      <GenesisMarketChainCell
                        chainName={mkt.chain?.name || "Ethereum"}
                        chainLogo={mkt.chain?.logo || "icons/eth.png"}
                        size={20}
                      />
                      <div className="flex items-center gap-2 min-w-0 pl-4 flex-wrap">
                        <div className="text-[#1E4775] font-medium text-sm flex items-center gap-1.5 flex-wrap">
                          {displayMarketName}
                        </div>
                        <GenesisMarketCollateralEquationStrip
                          collateralSymbol={collateralSymbol}
                          peggedSymbol={rowPeggedSymbol}
                          leveragedSymbol={rowLeveragedSymbol}
                          iconSize={20}
                        />
                      </div>

                      <div className="flex items-center justify-center gap-1.5 min-w-0">
                        <Image
                          src={getLogoPath(rowPeggedSymbol)}
                          alt={rowPeggedSymbol}
                          width={20}
                          height={20}
                          className="flex-shrink-0 rounded-full"
                        />
                        <SimpleTooltip
                          label={
                            claimablePegged > 0n && anchorTokenPriceUSD > 0
                              ? formatUSD(Number(formatEther(claimablePegged)) * anchorTokenPriceUSD)
                              : claimablePegged > 0n
                                ? `${formatToken(claimablePegged)} ${rowPeggedSymbol}`
                                : ""
                          }
                        >
                          <div className="text-[#1E4775] font-semibold text-xs cursor-help">
                            {claimablePegged > 0n ? formatToken(claimablePegged) : "-"}
                          </div>
                        </SimpleTooltip>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 min-w-0">
                        <Image
                          src={getLogoPath(rowLeveragedSymbol)}
                          alt={rowLeveragedSymbol}
                          width={20}
                          height={20}
                          className="flex-shrink-0 rounded-full"
                        />
                        <SimpleTooltip
                          label={
                            claimableLeveraged > 0n && sailTokenPriceUSD > 0
                              ? formatUSD(Number(formatEther(claimableLeveraged)) * sailTokenPriceUSD)
                              : claimableLeveraged > 0n
                                ? `${formatToken(claimableLeveraged)} ${rowLeveragedSymbol}`
                                : ""
                          }
                        >
                          <div className="text-[#1E4775] font-semibold text-xs cursor-help">
                            {claimableLeveraged > 0n ? formatToken(claimableLeveraged) : "-"}
                          </div>
                        </SimpleTooltip>
                      </div>

                      <div className="flex items-center justify-center gap-1 min-w-0">
                        <Image
                          src={getLogoPath(collateralSymbol)}
                          alt={collateralSymbol}
                          width={14}
                          height={14}
                          className="flex-shrink-0 rounded-full"
                        />
                        <GenesisYourDepositAmountText
                          userDeposit={userDeposit}
                          collateralPriceUSD={collateralPriceUSD}
                          collateralSymbol={collateralSymbol}
                          userDepositUSD={userDepositUSD}
                        />
                      </div>

                      <div className="flex-shrink-0 flex items-center justify-center text-center">
                        <GenesisMarketRowClaimActions
                          variant="compact"
                          isEnded
                          showMaintenanceTag={completedShowMaintenanceTag}
                          hasClaimable={hasClaimable}
                          genesisAddress={genesisAddress}
                          walletAddress={address}
                          isClaimingThisMarket={claimingMarket === id}
                          onClaim={() =>
                            onClaim({
                              marketId: id,
                              genesisAddress,
                              displayMarketName,
                              peggedSymbolForShare: peggedNoPrefixCompleted,
                            })
                          }
                          onManage={() => {}}
                        />
                      </div>
                    </div>

                    <div className="md:hidden space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-[#1E4775] font-medium text-sm">{displayMarketName}</div>
                          <GenesisMarketCollateralEquationStrip
                            collateralSymbol={collateralSymbol}
                            peggedSymbol={rowPeggedSymbol}
                            leveragedSymbol={rowLeveragedSymbol}
                            iconSize={20}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[#1E4775]/70 text-[10px] mb-1">Anchor</div>
                          <div className="flex items-center gap-1.5">
                            <Image
                              src={getLogoPath(rowPeggedSymbol)}
                              alt={rowPeggedSymbol}
                              width={16}
                              height={16}
                              className="flex-shrink-0 rounded-full"
                            />
                            <span className="text-[#1E4775] font-semibold text-xs">
                              {claimablePegged > 0n ? formatToken(claimablePegged) : "-"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[#1E4775]/70 text-[10px] mb-1">Sail</div>
                          <div className="flex items-center gap-1.5">
                            <Image
                              src={getLogoPath(rowLeveragedSymbol)}
                              alt={rowLeveragedSymbol}
                              width={16}
                              height={16}
                              className="flex-shrink-0 rounded-full"
                            />
                            <span className="text-[#1E4775] font-semibold text-xs">
                              {claimableLeveraged > 0n ? formatToken(claimableLeveraged) : "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[#1E4775]/70 text-[10px] flex items-center gap-1">
                            <Image
                              src={getLogoPath(collateralSymbol)}
                              alt={collateralSymbol}
                              width={14}
                              height={14}
                              className="flex-shrink-0 rounded-full"
                            />
                            <span>Your Deposit</span>
                          </div>
                          <GenesisYourDepositAmountText
                            userDeposit={userDeposit}
                            collateralPriceUSD={collateralPriceUSD}
                            collateralSymbol={collateralSymbol}
                            userDepositUSD={userDepositUSD}
                          />
                        </div>
                        <GenesisMarketRowClaimActions
                          variant="compact"
                          isEnded
                          showMaintenanceTag={completedShowMaintenanceTag}
                          hasClaimable={hasClaimable}
                          genesisAddress={genesisAddress}
                          walletAddress={address}
                          isClaimingThisMarket={claimingMarket === id}
                          onClaim={() =>
                            onClaim({
                              marketId: id,
                              genesisAddress,
                              displayMarketName,
                              peggedSymbolForShare: peggedNoPrefixCompleted,
                            })
                          }
                          onManage={() => {}}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
