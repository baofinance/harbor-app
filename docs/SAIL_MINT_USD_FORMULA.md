# Sail Mint: USD Output Formula

## Current implementation

**Base formula:**
```
usdValue = outputAmount × getTokenPriceUSD(symbol, prices, collateralSymbol)
```

Where:
- `outputAmount` = `expectedMintOutput` in human-readable units (e.g. 0.256879 hsSTETH-EUR)
- `symbol` = leveraged token symbol (e.g. "hsSTETH-EUR", "hsFXUSD-ETH")
- `collateralSymbol` = backing collateral (wstETH, fxSAVE)

**getTokenPriceUSD for hs* tokens:**
- **wstETH-backed** (hsSTETH-EUR, hsSTETH-BTC): use leveragedPriceUSD if > 100 (hsSTETH-BTC), else ethPrice (hsSTETH-EUR)
- **fxSAVE-backed** (hsFXUSD-ETH): use leveragedPriceUSD (~$1.08)

## Example outputs (expected)

| Input       | Output (approx) | Price per output token | USD value (approx)      |
|------------|-----------------|------------------------|-------------------------|
| 1 ETH      | ~1 hsSTETH-EUR  | ~$2300 (ETH)          | ~$2300                  |
| 100 fxSAVE | ~92 hsFXUSD-ETH | ~$1.08 (fxSAVE)       | ~$100                   |
| 100 fxUSD  | ~92 hsFXUSD-ETH | ~$1.08 (fxSAVE)       | ~$100                   |

## Bug: hsSTETH-EUR uses wrong price source

**Problem:** For hsSTETH-EUR (wstETH-backed), the minter’s `leveragedTokenPrice()` returns price **in EUR** (peg target). That is often ~1 EUR ≈ $1.09. So `leveragedPriceUSD` ≈ 1.09 and we show:

```
0.256879 × $1.09 = $0.28  (WRONG)
```

The user deposited 0.26 ETH (~$570) and expects to see ~$570, not $0.28.

**Fix:** For **wstETH-backed** leveraged tokens, prefer **collateral-based pricing** (wstETHPrice/ethPrice) over leveragedPriceUSD for the mint output USD display, since the contract’s peg price does not reflect the ETH/stETH value the user deposited.
