import NetworkIconCell from "@/components/NetworkIconCell";
import {
  BASIC_MARKET_NETWORK_FOOTER_DIVIDER_CLASS,
  BASIC_MARKET_NETWORK_FOOTER_ICON_PX,
  BASIC_MARKET_NETWORK_FOOTER_TEXT_CLASS,
  BASIC_MARKET_NETWORK_ICON_RING_CLASS,
} from "@/components/market-cards/harborBasicMarketTokens";

export type HarborBasicMarketChain = { name: string; logo?: string };

/** Bottom network rail shared by Sail + Anchor basic cards — fixed vertical rhythm below main card body. */
export function HarborBasicMarketNetworkFooter({
  chains,
}: {
  chains: HarborBasicMarketChain[];
}) {
  const list = chains.length > 0 ? chains : [{ name: "Ethereum", logo: "icons/eth.png" }];

  return (
    <>
      <div className={BASIC_MARKET_NETWORK_FOOTER_DIVIDER_CLASS} />
      <div className="flex min-h-[3rem] items-center justify-center pt-3">
        {list.length <= 1 ? (
          <span
            className={`inline-flex items-center justify-center gap-2.5 ${BASIC_MARKET_NETWORK_FOOTER_TEXT_CLASS}`}
          >
            <NetworkIconCell
              chainName={list[0]?.name || "Ethereum"}
              chainLogo={list[0]?.logo}
              size={BASIC_MARKET_NETWORK_FOOTER_ICON_PX}
              className={BASIC_MARKET_NETWORK_ICON_RING_CLASS}
            />
            <span className="leading-none">{list[0]?.name}</span>
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-2" aria-label="Networks">
            {list.map((c) => (
              <NetworkIconCell
                key={c.name}
                chainName={c.name}
                chainLogo={c.logo}
                size={BASIC_MARKET_NETWORK_FOOTER_ICON_PX}
                className={BASIC_MARKET_NETWORK_ICON_RING_CLASS}
              />
            ))}
          </span>
        )}
      </div>
    </>
  );
}
