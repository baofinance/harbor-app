const ICONS: Record<string, string> = {
    eth: "/icons/eth.png",
    ethereum: "/icons/eth.png",
    weth: "/icons/eth.png", // Wrapped Ether - use ETH icon
    fxsave: "/icons/fxSave.png",
    fxusd: "/icons/fxUSD.webp",
    usdc: "/icons/usdc.webp",
    steth: "/icons/steth_logo.webp",
    wsteth: "/icons/wstETH.webp",
    btc: "/icons/btc.png",
    bitcoin: "/icons/btc.png",
    wbtc: "/icons/btc.png", // Wrapped Bitcoin - use BTC icon
    susde: "/icons/susde.svg",
    usde: "/icons/susde.svg",
    usd: "/icons/usd.svg",
    dollar: "/icons/usd.svg",
    eur: "/icons/eur.svg",
    euro: "/icons/eur.svg",
    xau: "/icons/gold.svg", // Keep for backward compatibility
    gold: "/icons/gold.svg",
    xag: "/icons/gold.svg", // Keep for backward compatibility
    silver: "/icons/gold.svg",
    // Gold and Silver Genesis markets (pegged + leveraged tokens)
    hagold: "/icons/haGOLD.png",
    hasilver: "/icons/haSILVER.png",
    "hssteth-gold": "/icons/hsSTETH-GOLD.png",
    "hssteth-silver": "/icons/hsSTETH-SILVER.png",
    "hsfxusd-gold": "/icons/hsFXUSD-GOLD.png",
    "hsfxusd-silver": "/icons/hsFXUSD-SILVER.png",
    mcap: "/icons/mcap.svg",
    t6ch: "/icons/mcap.svg",
    t6: "/icons/mcap.svg",
    mag7: "/icons/stock.svg", // Financial index - using stock icon
    "mag7.i26": "/icons/stock.svg", // Financial index variant
    bom5: "/icons/stock.svg", // Financial index - using stock icon
    all: "/icons/logo-blue.svg", // "All pools" filter – Harbor logo (blue for visibility on white)
    // Harbor tokens - ha (pegged) tokens
    haeth: "/icons/haETH.png",
    habtc: "/icons/haBTC.png",
    haeur: "/icons/haEUR.png",
    hapb: "/icons/haETH.png",
    // Harbor tokens - hs (leveraged) tokens
    "hsfxusd-eth": "/icons/hsUSDETH.png",
    hsfxusdeth: "/icons/hsUSDETH.png",
    "hsfxusd-btc": "/icons/hsUSDBTC.png",
    hsfxusdbtc: "/icons/hsUSDBTC.png",
    "hssteth-btc": "/icons/hsETHBTC.png",
    hsstethbtc: "/icons/hsETHBTC.png",
    "hssteth-eur": "/icons/hsSTETHEUR.png",
    hsstetheur: "/icons/hsSTETHEUR.png",
    "hsfxusd-eur": "/icons/hsUSDeur.png",
    hsfxusdeur: "/icons/hsUSDeur.png",
    hseth: "/icons/hsUSDETH.png", // Fallback for hsETH
};

const STOCK_TICKERS = ["aapl", "amzn", "googl", "meta", "msft", "nvda", "spy", "tsla"];

export function getLogoPath(symbol: string): string {
    const key = symbol.toLowerCase();

    if (ICONS[key]) {
        return ICONS[key];
    }

    // Harbor tokens - ha (pegged) tokens fallback
    if (key.startsWith("ha")) {
        return "/icons/haUSD2.png"; // Fallback for other ha tokens
    }
    
    // Harbor tokens - hs (leveraged) tokens fallback
    if (key.startsWith("hs")) {
        return "/icons/hsUSDETH.png"; // Fallback for other hs tokens
    }

    if (STOCK_TICKERS.includes(key)) {
        return "/icons/stock.svg";
    }

    return "/icons/placeholder.svg";
}
