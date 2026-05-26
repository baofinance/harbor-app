"use client";

import Image from "next/image";
import SimpleTooltip from "@/components/SimpleTooltip";
import {
  MarketArchivedBadge,
  WithdrawOnlyTag,
} from "@/components/MarketMaintenanceTag";
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
import type { GenesisClaimMarketArgs } from "./GenesisCompletedMarketsSection";

export type GenesisArchivedMarketsSectionProps = {
  showSection: boolean;
  onToggleShow: () => void;
  displayedLiveMarkets: Array<[string, GenesisMarketConfig]>;
  displayedCompletedMarkets: Array<[string, GenesisMarketConfig, unknown]>;
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
  openManageModal: (
    marketId: string,
    market: GenesisMarketConfig,
    initialTab?: "deposit" | "withdraw"
  ) => Promise<void>;
};

function ArchivedGenesisRow({
  id,
  mkt,
  isEnded,
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
  openManageModal,
}: {
  id: string;
  mkt: GenesisMarketConfig;
  isEnded: boolean;
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
  openManageModal: GenesisArchivedMarketsSectionProps["openManageModal"];
}) {
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
            <MarketArchivedBadge compact />
            {!isEnded ? <WithdrawOnlyTag /> : null}
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
              {isEnded && claimablePegged > 0n ? formatToken(claimablePegged) : "-"}
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
              {isEnded && claimableLeveraged > 0n ? formatToken(claimableLeveraged) : "-"}
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
            isEnded={isEnded}
            showMaintenanceTag={false}
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
            onManage={() => void openManageModal(id, mkt, "withdraw")}
          />
        </div>
      </div>
    </div>
  );
}

export function GenesisArchivedMarketsSection({
  showSection,
  onToggleShow,
  displayedLiveMarkets,
  displayedCompletedMarkets,
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
  openManageModal,
}: GenesisArchivedMarketsSectionProps) {
  const totalCount = displayedLiveMarkets.length + displayedCompletedMarkets.length;
  if (totalCount === 0) return null;

  return (
    <section className="space-y-3 overflow-visible mt-8">
      <button
        type="button"
        onClick={onToggleShow}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-left hover:bg-white/10 transition-colors"
      >
        <div>
          <h2 className="text-xs font-medium text-white/80 uppercase tracking-wider">
            Archived markets
          </h2>
          <p className="text-[11px] text-white/50 mt-0.5">
            Deposits disabled · withdrawals and claims still available
          </p>
        </div>
        <span className="text-xs text-white/60 shrink-0">
          {showSection ? "Hide" : "Show"} ({totalCount})
        </span>
      </button>

      {showSection ? (
        <div className="space-y-2">
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
          {displayedLiveMarkets.map(([id, mkt]) => (
            <ArchivedGenesisRow
              key={id}
              id={id}
              mkt={mkt}
              isEnded={false}
              genesisMarkets={genesisMarkets}
              reads={reads}
              isConnected={isConnected}
              collateralPricesMap={collateralPricesMap}
              coinGeckoPrices={coinGeckoPrices}
              coinGeckoLoading={coinGeckoLoading}
              chainlinkBtcPrice={chainlinkBtcPrice}
              address={address}
              claimingMarket={claimingMarket}
              onClaim={onClaim}
              openManageModal={openManageModal}
            />
          ))}
          {displayedCompletedMarkets.map(([id, mkt]) => (
            <ArchivedGenesisRow
              key={id}
              id={id}
              mkt={mkt}
              isEnded
              genesisMarkets={genesisMarkets}
              reads={reads}
              isConnected={isConnected}
              collateralPricesMap={collateralPricesMap}
              coinGeckoPrices={coinGeckoPrices}
              coinGeckoLoading={coinGeckoLoading}
              chainlinkBtcPrice={chainlinkBtcPrice}
              address={address}
              claimingMarket={claimingMarket}
              onClaim={onClaim}
              openManageModal={openManageModal}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
