import NetworkIconCell from "@/components/NetworkIconCell";
import {
  BASIC_MARKET_NETWORK_FOOTER_DARK_DIVIDER_CLASS,
  BASIC_MARKET_NETWORK_FOOTER_DARK_TEXT_CLASS,
  BASIC_MARKET_NETWORK_FOOTER_DIVIDER_CLASS,
  BASIC_MARKET_NETWORK_FOOTER_ICON_BUTTON_CLASS,
  BASIC_MARKET_NETWORK_FOOTER_ICON_IDLE_CLASS,
  BASIC_MARKET_NETWORK_FOOTER_ICON_PX,
  BASIC_MARKET_NETWORK_FOOTER_ICON_SELECTED_CLASS,
  BASIC_MARKET_NETWORK_FOOTER_TEXT_CLASS,
  BASIC_MARKET_NETWORK_ICON_RING_CLASS,
} from "@/components/market-cards/harborBasicMarketTokens";

export type HarborBasicMarketChain = {
  /** Stable key (usually `chain.name`). */
  key: string;
  name: string;
  logo?: string;
};

export function harborMarketChainKey(market: {
  chain?: { name?: string };
}): string {
  return market.chain?.name ?? "Ethereum";
}

export function harborChainsFromMarkets(
  markets: Array<{ chain?: { name?: string; logo?: string } }>
): HarborBasicMarketChain[] {
  const seen = new Map<string, HarborBasicMarketChain>();
  for (const market of markets) {
    const key = harborMarketChainKey(market);
    if (!seen.has(key)) {
      seen.set(key, { key, name: key, logo: market.chain?.logo });
    }
  }
  return Array.from(seen.values());
}

/** Bottom network rail — single chain shows icon + label; multichain is icon-only selectors. */
export function HarborBasicMarketNetworkFooter({
  chains,
  selectedChainKey,
  onChainSelect,
  theme = "light",
}: {
  chains: HarborBasicMarketChain[];
  /** Active chain `key`; required when `onChainSelect` is set. */
  selectedChainKey?: string;
  onChainSelect?: (chainKey: string) => void;
  theme?: "light" | "dark";
}) {
  const dividerClass =
    theme === "dark"
      ? BASIC_MARKET_NETWORK_FOOTER_DARK_DIVIDER_CLASS
      : BASIC_MARKET_NETWORK_FOOTER_DIVIDER_CLASS;
  const textClass =
    theme === "dark"
      ? BASIC_MARKET_NETWORK_FOOTER_DARK_TEXT_CLASS
      : BASIC_MARKET_NETWORK_FOOTER_TEXT_CLASS;
  const list =
    chains.length > 0
      ? chains
      : [{ key: "Ethereum", name: "Ethereum", logo: "icons/eth.png" }];

  const isMultichain = list.length > 1;
  const isSelectable = Boolean(onChainSelect);
  const activeKey =
    selectedChainKey && list.some((c) => c.key === selectedChainKey)
      ? selectedChainKey
      : list[0]?.key;

  return (
    <>
      <div className={dividerClass} />
      <div className="flex min-h-[3rem] items-center justify-center pt-3">
        {isMultichain || isSelectable ? (
          <div
            className="inline-flex items-center justify-center gap-2.5"
            role={isSelectable ? "tablist" : undefined}
            aria-label="Network"
          >
            {list.map((c) => {
              const selected = c.key === activeKey;
              const icon = (
                <NetworkIconCell
                  chainName={c.name}
                  chainLogo={c.logo}
                  size={BASIC_MARKET_NETWORK_FOOTER_ICON_PX}
                  className={BASIC_MARKET_NETWORK_ICON_RING_CLASS}
                />
              );

              if (!isSelectable) {
                return (
                  <span
                    key={c.key}
                    className={`inline-flex items-center justify-center rounded-full p-0.5 ${
                      selected
                        ? BASIC_MARKET_NETWORK_FOOTER_ICON_SELECTED_CLASS
                        : BASIC_MARKET_NETWORK_FOOTER_ICON_IDLE_CLASS
                    }`}
                    title={c.name}
                  >
                    {icon}
                  </span>
                );
              }

              return (
                <button
                  key={c.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  title={c.name}
                  className={`${BASIC_MARKET_NETWORK_FOOTER_ICON_BUTTON_CLASS} ${
                    selected
                      ? BASIC_MARKET_NETWORK_FOOTER_ICON_SELECTED_CLASS
                      : BASIC_MARKET_NETWORK_FOOTER_ICON_IDLE_CLASS
                  }`}
                  onClick={() => onChainSelect?.(c.key)}
                >
                  {icon}
                </button>
              );
            })}
          </div>
        ) : (
          <span
            className={`inline-flex items-center justify-center gap-2.5 ${textClass}`}
          >
            <NetworkIconCell
              chainName={list[0]?.name || "Ethereum"}
              chainLogo={list[0]?.logo}
              size={BASIC_MARKET_NETWORK_FOOTER_ICON_PX}
              className={BASIC_MARKET_NETWORK_ICON_RING_CLASS}
            />
            <span className="leading-none">{list[0]?.name}</span>
          </span>
        )}
      </div>
    </>
  );
}
