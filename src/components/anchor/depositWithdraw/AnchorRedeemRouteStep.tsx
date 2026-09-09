"use client";

import { TokenLogo } from "@/components/shared";
import { formatUSD } from "@/utils/formatters";
import { DEPOSIT_SECTION_LABEL_CLASS } from "@/components/deposit/depositFlowStyles";

export type AnchorRedeemRouteOption = {
  marketId: string;
  marketName: string;
  collateralSymbol: string;
  feePercent?: number;
  receiveAmount?: number;
  receiveUsd?: number;
  isCapped?: boolean;
  isBest?: boolean;
};

export type AnchorRedeemRouteStepProps = {
  options: readonly AnchorRedeemRouteOption[];
  selectedMarketId: string | null;
  autoMode: boolean;
  recommendedMarketId: string | null;
  disabled?: boolean;
  onSelectAuto: () => void;
  onSelectMarket: (marketId: string) => void;
};

function formatReceive(amount: number | undefined): string | null {
  if (amount === undefined || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  if (amount > 0 && amount < 0.0001) return "<0.0001";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatFee(fee: number | undefined): string {
  if (fee === undefined || !Number.isFinite(fee)) return "—";
  if (fee <= 0) return "Free";
  return `${fee.toFixed(2)}%`;
}

const ROUTE_TAG_BASE =
  "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide";
const ROUTE_TAG_PREFERRED = `${ROUTE_TAG_BASE} bg-harbor-coral/15 text-[#D45A4A]`;
const ROUTE_TAG_BEST = `${ROUTE_TAG_BASE} bg-[#4A9784]/15 text-[#2f6f5f]`;

export function AnchorRedeemRouteStep({
  options,
  selectedMarketId,
  autoMode,
  recommendedMarketId,
  disabled = false,
  onSelectAuto,
  onSelectMarket,
}: AnchorRedeemRouteStepProps) {
  const recommended = recommendedMarketId
    ? options.find((o) => o.marketId === recommendedMarketId)
    : options.find((o) => o.isBest) ?? options[0];

  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <p className={DEPOSIT_SECTION_LABEL_CLASS}>Redeem to</p>
        <div className="flex flex-wrap items-center gap-1.5 px-0.5">
          <p className="text-[11px] leading-snug text-[#1E4775]/55">
            Choose which collateral market to redeem into.
          </p>
          <span className={ROUTE_TAG_PREFERRED}>Harbor Route</span>
          <span className={ROUTE_TAG_BEST}>Best</span>
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onSelectAuto}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
          autoMode
            ? "border-[#1E4775]/35 bg-white/95 shadow-sm"
            : "border-[#1E4775]/12 bg-white/70 hover:border-[#1E4775]/22 hover:bg-white/85"
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1E4775]">Auto</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={ROUTE_TAG_PREFERRED}>Harbor Route</span>
            <span className="truncate text-[11px] text-[#1E4775]/55">
              {recommended
                ? recommended.collateralSymbol
                : "Uncapped route"}
            </span>
          </div>
        </div>
        {recommended?.feePercent !== undefined ? (
          <span className="shrink-0 rounded-full bg-[#1E4775]/8 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#1E4775]/75">
            {formatFee(recommended.feePercent)}
          </span>
        ) : null}
      </button>

      <div className="space-y-1.5">
        <p className={DEPOSIT_SECTION_LABEL_CLASS}>Markets</p>
        <ul className="space-y-1.5" role="listbox" aria-label="Redeem markets">
          {options.map((option) => {
            const selected =
              !autoMode && selectedMarketId === option.marketId;
            const receiveLabel = formatReceive(option.receiveAmount);
            const usdLabel =
              option.receiveUsd !== undefined && option.receiveUsd > 0
                ? formatUSD(option.receiveUsd, { compact: false })
                : null;

            return (
              <li key={option.marketId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={disabled}
                  onClick={() => onSelectMarket(option.marketId)}
                  className={`flex w-full flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected
                      ? "border-[#1E4775]/35 bg-white/95 shadow-sm"
                      : "border-[#1E4775]/12 bg-white/70 hover:border-[#1E4775]/22 hover:bg-white/85"
                  }`}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <TokenLogo
                        symbol={option.collateralSymbol}
                        size={18}
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1E4775]">
                          {option.collateralSymbol}
                        </p>
                        <p className="truncate text-[10px] text-[#1E4775]/50">
                          {option.marketName}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {option.isBest ? (
                        <span className={ROUTE_TAG_BEST}>Best</span>
                      ) : null}
                      {option.isCapped ? (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-800">
                          Limited
                        </span>
                      ) : null}
                      <span className="rounded-full bg-[#1E4775]/8 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#1E4775]/75">
                        {formatFee(option.feePercent)}
                      </span>
                    </div>
                  </div>
                  {receiveLabel ? (
                    <div className="flex items-baseline justify-between gap-2 pl-7">
                      <span className="text-[10px] text-[#1E4775]/45">
                        You receive
                      </span>
                      <span className="font-mono text-xs font-semibold tabular-nums text-[#1E4775]">
                        {receiveLabel} {option.collateralSymbol}
                        {usdLabel ? (
                          <span className="ml-1 text-[10px] font-medium text-[#1E4775]/45">
                            ({usdLabel})
                          </span>
                        ) : null}
                      </span>
                    </div>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
