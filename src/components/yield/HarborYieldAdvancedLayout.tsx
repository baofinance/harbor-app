"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  SparklesIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import {
  HARBOR_YIELD_MARKETS,
  harborYieldMarketById,
  type HarborYieldMarket,
} from "@/config/harborYieldMarkets";
import { useMarketQueryParam } from "@/hooks/useMarketQueryParam";
import { usePegTargetPrices } from "@/hooks/usePegTargetPrices";
import { DepositModalShell } from "@/components/DepositModalShell";
import { DepositModalFlowOverview } from "@/components/DepositModalFlowOverview";
import { DepositModalTabHeader } from "@/components/DepositModalTabHeader";
import { DepositModalLayout } from "@/components/deposit/DepositModalLayout";
import { DepositBalanceStrip } from "@/components/deposit/DepositBalanceStrip";
import { DepositTransactionOverview } from "@/components/deposit/DepositTransactionOverview";
import { ProductAdvancedLayoutShell } from "@/components/deposit/ProductAdvancedLayoutShell";
import {
  ANCHOR_MODAL_FOOTER_CHROME,
  DEPOSIT_AMOUNT_CARD_CLASS,
  DEPOSIT_AMOUNT_MAX_BUTTON_CLASS,
  DEPOSIT_EMBEDDED_CONTENT_CLASS,
  DEPOSIT_EMBEDDED_PANEL_HEIGHT,
  DEPOSIT_OVERVIEW_CARD_CLASS,
  DEPOSIT_PRIMARY_DISABLED_CLASS,
  DEPOSIT_SECTION_LABEL_CLASS,
  DEPOSIT_TAG_NEUTRAL_CLASS,
  depositAmountInputClass,
} from "@/components/deposit/depositFlowStyles";
import { AnchorMobileTradeBar } from "@/components/anchor/advanced/AnchorMobileTradeBar";
import {
  ANCHOR_ADVANCED_FROSTED_CARD,
  ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL,
  ANCHOR_ADVANCED_GLASS_CAPTION,
  ANCHOR_ADVANCED_GLASS_CARD,
  ANCHOR_ADVANCED_GLASS_SECTION_TITLE,
  ANCHOR_ADVANCED_GLASS_VALUE,
  ANCHOR_ADVANCED_HEADER_STRIP_DIVIDE,
  ANCHOR_ADVANCED_HEADER_STRIP_LABEL,
  ANCHOR_ADVANCED_HEADER_STRIP_SHELL,
  ANCHOR_ADVANCED_HEADER_STRIP_VALUE,
  ANCHOR_ADVANCED_LABEL,
  ANCHOR_ADVANCED_LIGHT_BODY,
  ANCHOR_ADVANCED_LIGHT_SECTION_TITLE,
  ANCHOR_ADVANCED_SHELL,
  ANCHOR_EMBEDDED_FORM_PANEL,
  MARKET_SELECTOR_FIELD_LABEL_CLASS,
  MARKET_SELECTOR_ICON_SIZE,
  MARKET_SELECTOR_PAIR_FIELD_CLASS,
  MARKET_SELECTOR_ROW_CLASS,
  MARKET_SELECTOR_TOKEN_FIELD_CLASS,
  MARKET_SELECTOR_TRIGGER_CLASS,
  MARKET_SELECTOR_TRIGGER_INNER_CLASS,
  MARKET_SELECTOR_TRIGGER_TITLE_CLASS,
} from "@/components/anchor/advanced/anchorAdvancedStyles";
import { INDEX_EARN_CLAIM_BUTTON_CLASS_DESKTOP } from "@/utils/indexPageManageButton";
import { formatPegUsdPrice, liveUsdPriceForPegAsset } from "@/utils/pegAssetChart";
import { HarborYieldCompareChart } from "./HarborYieldCompareChart";

const TRADE_PANEL_ID = "harbor-yield-trade-panel";
const ACCENT_CLASS = "font-extrabold text-[#6bc4a8]";

const PERKS = ["Auto-compounding", "Pegged value", "Mint and redeem"] as const;

function TokenMark({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={MARKET_SELECTOR_ICON_SIZE}
      height={MARKET_SELECTOR_ICON_SIZE}
      className="h-5 w-5 shrink-0 rounded-full"
    />
  );
}

function StripCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center px-2 py-2.5 text-center sm:px-3">
      <span className={ANCHOR_ADVANCED_HEADER_STRIP_LABEL}>{label}</span>
      <span className={ANCHOR_ADVANCED_HEADER_STRIP_VALUE} title={value}>
        {value}
      </span>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] py-2 last:border-b-0">
      <span className={ANCHOR_ADVANCED_GLASS_CAPTION}>{label}</span>
      <span className={`text-right ${ANCHOR_ADVANCED_GLASS_VALUE}`}>{value}</span>
    </div>
  );
}

function MetricSectionCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <div className={`${ANCHOR_ADVANCED_GLASS_CARD} p-3`}>
      <h3 className={`mb-2 ${ANCHOR_ADVANCED_GLASS_SECTION_TITLE}`}>{title}</h3>
      <div>
        {rows.map((row) => (
          <MetricRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </div>
  );
}

function FooterCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof SparklesIcon;
  title: string;
  body: string;
}) {
  return (
    <div className={`${ANCHOR_ADVANCED_FROSTED_CARD} p-4 sm:p-5`}>
      <div className="mb-2.5 flex items-center gap-2.5">
        <Icon className="h-5 w-5 shrink-0 text-[#1E4775]/80" aria-hidden />
        <h3 className={ANCHOR_ADVANCED_LIGHT_SECTION_TITLE}>{title}</h3>
      </div>
      <p className={ANCHOR_ADVANCED_LIGHT_BODY}>{body}</p>
    </div>
  );
}

function TradePanel({
  market,
  mode,
  onModeChange,
}: {
  market: HarborYieldMarket;
  mode: "mint" | "redeem";
  onModeChange: (mode: "mint" | "redeem") => void;
}) {
  const [amount, setAmount] = useState("");

  useEffect(() => {
    setAmount("");
  }, [market.id, mode]);

  const parsed = Number(amount);
  const hasAmount = Number.isFinite(parsed) && parsed > 0;
  const paySymbol = mode === "mint" ? market.haSymbol : market.symbol;
  const receiveSymbol = mode === "mint" ? market.symbol : market.haSymbol;
  const receiveAmount = hasAmount
    ? mode === "mint"
      ? parsed / market.sharePriceInPeg
      : parsed * market.sharePriceInPeg
    : null;

  const rateLine =
    mode === "mint"
      ? `1 ${market.haSymbol} mints ${(1 / market.sharePriceInPeg).toFixed(2)} ${market.symbol}`
      : `1 ${market.symbol} redeems ${market.sharePriceInPeg.toFixed(2)} ${market.haSymbol}`;

  return (
    <aside className="flex w-full min-w-0 flex-col">
      <div
        className={`mb-3 grid h-[60px] w-full grid-cols-[1fr_auto] items-center gap-2 rounded-xl px-3.5 sm:gap-4 sm:px-4 ${ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL}`}
      >
        <div className="min-w-0 leading-tight">
          <p className={ANCHOR_ADVANCED_HEADER_STRIP_LABEL}>Claimable value</p>
          <p className={`${ANCHOR_ADVANCED_HEADER_STRIP_VALUE} text-sm sm:text-base`}>
            $0.00
          </p>
        </div>
        <button
          type="button"
          disabled
          className={`${INDEX_EARN_CLAIM_BUTTON_CLASS_DESKTOP} h-9 min-w-[6rem] shrink-0 px-6 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[7.5rem]`}
        >
          Claim
        </button>
      </div>
      <div
        className={`${ANCHOR_EMBEDDED_FORM_PANEL} ${DEPOSIT_EMBEDDED_PANEL_HEIGHT} flex w-full min-w-0 flex-col overflow-hidden`}
      >
        <DepositModalShell
          variant="inline"
          isOpen
          onClose={() => {}}
          title={market.symbol}
          panelClassName="h-full min-h-0"
          contentClassName={DEPOSIT_EMBEDDED_CONTENT_CLASS}
          tabs={
            <DepositModalTabHeader
              tabs={[
                { value: "mint", label: "Mint" },
                { value: "redeem", label: "Redeem" },
              ]}
              activeTab={mode}
              onTabChange={(value) =>
                onModeChange(value === "redeem" ? "redeem" : "mint")
              }
            />
          }
        >
          <DepositModalLayout
            flowOverview={
              <DepositModalFlowOverview
                parts={[mode === "mint" ? "Mint" : "Redeem"]}
              />
            }
            scroll={
              <div className={DEPOSIT_AMOUNT_CARD_CLASS}>
                <div className="mb-3 space-y-2">
                  <span className={DEPOSIT_SECTION_LABEL_CLASS}>
                    {mode === "mint" ? "You deposit" : "You return"}
                  </span>
                  <div className="flex w-full items-center gap-2 rounded-md border border-[#1E4775]/20 bg-white/85 px-3 py-2 text-sm text-[#1E4775]">
                    <TokenMark src={market.icon} alt="" />
                    <span className="truncate font-medium">{paySymbol}</span>
                  </div>
                </div>
                <span className={`${DEPOSIT_SECTION_LABEL_CLASS} mb-1.5 block`}>
                  Amount
                </span>
                <div className="relative">
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.0"
                    className={depositAmountInputClass()}
                  />
                  <button
                    type="button"
                    disabled
                    className={DEPOSIT_AMOUNT_MAX_BUTTON_CLASS}
                  >
                    MAX
                  </button>
                </div>
                <DepositBalanceStrip className="mt-1" ariaLabel="Balance">
                  —
                </DepositBalanceStrip>
              </div>
            }
            overview={
              <div className="flex flex-col gap-1.5">
                <div className="space-y-1">
                  <p className={DEPOSIT_SECTION_LABEL_CLASS}>Market Health</p>
                  <div className={`${DEPOSIT_OVERVIEW_CARD_CLASS} space-y-2`}>
                    <span className={DEPOSIT_TAG_NEUTRAL_CLASS}>Vault pending</span>
                    <p className="text-[11px] leading-snug text-[#1E4775]/55">
                      {market.symbol} is not open yet.
                    </p>
                  </div>
                </div>
                <DepositTransactionOverview
                  receiveAmount={
                    receiveAmount == null
                      ? null
                      : receiveAmount.toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })
                  }
                  receiveSymbol={receiveSymbol}
                  emptyMessage="Enter an amount to see what you receive."
                  sourceLine={rateLine}
                />
              </div>
            }
            footer={
              <div className={ANCHOR_MODAL_FOOTER_CHROME}>
                <button
                  type="button"
                  disabled
                  className={DEPOSIT_PRIMARY_DISABLED_CLASS}
                >
                  Vault not open yet
                </button>
              </div>
            }
          />
        </DepositModalShell>
      </div>
    </aside>
  );
}

export function HarborYieldAdvancedLayout() {
  const { marketParam, setMarketParam } = useMarketQueryParam();
  const market = harborYieldMarketById(marketParam);
  const pegTargetPrices = usePegTargetPrices();
  const [metricsOpen, setMetricsOpen] = useState(true);
  const [mode, setMode] = useState<"mint" | "redeem">("mint");

  const liveHa = liveUsdPriceForPegAsset(market.asset, pegTargetPrices);
  const liveHy =
    liveHa != null ? liveHa * market.sharePriceInPeg : null;
  const haPriceLabel = formatPegUsdPrice(liveHa, market.asset);
  const hyPriceLabel = formatPegUsdPrice(liveHy, market.asset);

  useEffect(() => {
    setMode("mint");
  }, [market.id]);

  useEffect(() => {
    if (marketParam !== market.id) setMarketParam(market.id);
  }, [market.id, marketParam, setMarketParam]);

  const scrollToTrade = useCallback((next: "mint" | "redeem") => {
    setMode(next);
    document
      .getElementById(TRADE_PANEL_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const header = useMemo(
    () => (
      <header className="relative z-10 flex flex-col gap-4 overflow-visible border-b border-white/10 pb-4">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-8">
          <div className={MARKET_SELECTOR_ROW_CLASS}>
            <div className={MARKET_SELECTOR_TOKEN_FIELD_CLASS}>
              <span className={MARKET_SELECTOR_FIELD_LABEL_CLASS}>Yield</span>
              <label className="sr-only" htmlFor="harbor-yield-market">
                Harbor Yield market
              </label>
              <div className="relative">
                <div className={`${MARKET_SELECTOR_TRIGGER_CLASS} pointer-events-none`}>
                  <span className={MARKET_SELECTOR_TRIGGER_INNER_CLASS}>
                    <TokenMark src={market.icon} alt="" />
                    <span className={MARKET_SELECTOR_TRIGGER_TITLE_CLASS}>
                      {market.symbol}
                    </span>
                  </span>
                  <ChevronDownIcon className="h-4 w-4 text-[#1E4775]/50" aria-hidden />
                </div>
                <select
                  id="harbor-yield-market"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  value={market.id}
                  onChange={(event) => setMarketParam(event.target.value)}
                >
                  {HARBOR_YIELD_MARKETS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={MARKET_SELECTOR_PAIR_FIELD_CLASS}>
              <span className={MARKET_SELECTOR_FIELD_LABEL_CLASS}>Peg</span>
              <div className={MARKET_SELECTOR_TRIGGER_CLASS}>
                <span className={MARKET_SELECTOR_TRIGGER_INNER_CLASS}>
                  <TokenMark src={market.pegIcon} alt="" />
                  <span className={MARKET_SELECTOR_TRIGGER_TITLE_CLASS}>
                    {market.pegSymbol}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="min-w-0 text-center">
            <ul className="mb-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] font-medium tracking-wide text-white/70 sm:text-xs">
              {PERKS.map((label, index) => (
                <li key={label} className="inline-flex items-center">
                  {index > 0 ? (
                    <span
                      className="mx-2.5 hidden h-3 w-px bg-white/20 sm:inline-block"
                      aria-hidden
                    />
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-1 w-1 rounded-full bg-[#6bc4a8]" />
                    {label}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xl font-bold leading-snug text-white/90 sm:text-2xl lg:text-3xl">
              Compound yield with <span className={ACCENT_CLASS}>{market.symbol}</span>
              , priced in <span className={ACCENT_CLASS}>{market.pegSymbol}</span>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <p className={`mb-1 ${ANCHOR_ADVANCED_LABEL}`}>Your wallet</p>
            <div
              className={`${ANCHOR_ADVANCED_HEADER_STRIP_SHELL} grid grid-cols-2 sm:grid-cols-4 ${ANCHOR_ADVANCED_HEADER_STRIP_DIVIDE}`}
            >
              <StripCell label="Portfolio" value="—" />
              <StripCell label="Positions" value="—" />
              <StripCell label="Yield" value="—" />
              <StripCell label="Marks" value="—" />
            </div>
          </div>
          <div>
            <p className={`mb-1 ${ANCHOR_ADVANCED_LABEL}`}>This market</p>
            <div
              className={`${ANCHOR_ADVANCED_HEADER_STRIP_SHELL} grid grid-cols-2 sm:grid-cols-4 ${ANCHOR_ADVANCED_HEADER_STRIP_DIVIDE}`}
            >
              <StripCell label="Your position" value="—" />
              <StripCell label="Basket" value="—" />
              <StripCell label="Share price" value={hyPriceLabel} />
              <StripCell label={`${market.haSymbol} / USD`} value={haPriceLabel} />
            </div>
          </div>
        </div>
      </header>
    ),
    [haPriceLabel, hyPriceLabel, market, setMarketParam],
  );

  return (
    <ProductAdvancedLayoutShell
      header={header}
      tradePanelId={TRADE_PANEL_ID}
      primary={
        <div
          className={`flex h-full min-h-[22rem] flex-1 flex-col overflow-hidden rounded-xl p-3 sm:min-h-[26rem] ${ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL}`}
        >
          <HarborYieldCompareChart market={market} />
        </div>
      }
      action={
        <TradePanel market={market} mode={mode} onModeChange={setMode} />
      }
      metrics={
        <div>
          <button
            type="button"
            onClick={() => setMetricsOpen((open) => !open)}
            aria-expanded={metricsOpen}
            className="mb-1 flex w-full items-center justify-between gap-2 text-left"
          >
            <span className={ANCHOR_ADVANCED_LABEL}>Market metrics</span>
            <ChevronDownIcon
              className={`h-4 w-4 text-white/55 transition-transform ${
                metricsOpen ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>
          {metricsOpen ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MetricSectionCard
                title="Market"
                rows={[
                  { label: "hyToken", value: market.symbol },
                  { label: "Tracks", value: market.haSymbol },
                  { label: "Peg", value: market.pegSymbol },
                  {
                    label: "Share price",
                    value: `${market.sharePriceInPeg.toFixed(2)} ${market.pegSymbol}`,
                  },
                ]}
              />
              <MetricSectionCard
                title="Basket"
                rows={[
                  { label: "Vault TVL", value: "—" },
                  { label: "Assets", value: "—" },
                  { label: "Share supply", value: "—" },
                  { label: `${market.haSymbol} price`, value: haPriceLabel },
                ]}
              />
            </div>
          ) : null}
        </div>
      }
      mobileBar={
        <AnchorMobileTradeBar
          onMint={() => scrollToTrade("mint")}
          onRedeem={() => scrollToTrade("redeem")}
        />
      }
      infoFooter={
        <footer className={`${ANCHOR_ADVANCED_SHELL} px-3 py-3 sm:px-4`}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <FooterCard
              icon={SparklesIcon}
              title="What is a hyToken"
              body={`${market.symbol} is a tradeable share of Harbor Yield, priced in ${market.pegSymbol}. The number of shares stays fixed. The price grows as yield is compounded.`}
            />
            <FooterCard
              icon={ArrowsRightLeftIcon}
              title="The basket"
              body="Harbor Yield holds yield-bearing positions and folds the earnings into the share price. There is nothing to claim or restake."
            />
            <FooterCard
              icon={StarIcon}
              title="Mint and redeem"
              body={`Mint ${market.symbol} from ${market.haSymbol}. Redeem ${market.symbol} for your share of the basket whenever you want.`}
            />
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-white/65">
            <ArrowPathIcon className="h-3.5 w-3.5" aria-hidden />
            Yield stays in the share price
          </p>
        </footer>
      }
    />
  );
}
