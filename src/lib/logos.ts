const ICONS: Record<string, string> = {
    eth: "/icons/eth.png",
    ethereum: "/icons/eth.png",
    fxsave: "/icons/fxSave.png",
    fxusd: "/icons/fxUSD.webp",
    usdc: "/icons/usdc.webp",
    steth: "/icons/steth_logo.webp",
    wsteth: "/icons/wstETH.webp",
    btc: "/icons/btc.png",
    bitcoin: "/icons/btc.png",
    susde: "/icons/susde.svg",
    usde: "/icons/susde.svg",
    usd: "/icons/usd.svg",
    dollar: "/icons/usd.svg",
    eur: "/icons/eur.svg",
    euro: "/icons/eur.svg",
    xau: "/icons/gold.svg",
    gold: "/icons/gold.svg",
    mcap: "/icons/mcap.svg",
    t6ch: "/icons/mcap.svg",
    t6: "/icons/mcap.svg"
};

const STOCK_TICKERS = ["aapl", "amzn", "googl", "meta", "msft", "nvda", "spy", "tsla"];

export function getLogoPath(symbol: string): string {
    const key = symbol.toLowerCase();

    if (ICONS[key]) {
        return ICONS[key];
    }

    if (STOCK_TICKERS.includes(key)) {
        return "/icons/stock.svg";
    }

    return "/icons/placeholder.svg";
}
