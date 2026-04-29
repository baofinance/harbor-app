# EUR Price Calculation Flow

This document breaks down exactly how the haEUR price is calculated on the anchor page.

## Step 1: Find EUR Market Oracle Address
**Location**: `src/hooks/anchor/useAnchorPrices.ts` lines 48-60

- Searches `anchorMarkets` for a market with:
  - `pegTarget === "eur" || "euro"`
  - `collateralSymbol === "fxusd" || "fxsave"`
- Extracts the `collateralPrice` oracle address from that market
- **Expected oracle address**: `0x71437C90F1E0785dd691FD02f7bE0B90cd14c097`

## Step 2: Read Oracle Decimals
**Location**: `src/hooks/anchor/useAnchorPrices.ts` lines 63-72

- Reads `decimals()` function from the oracle contract
- Uses `CHAINLINK_ORACLE_ABI` to call `decimals()`
- **Purpose**: Determine how many decimals the oracle uses (typically 8 for Chainlink)

## Step 3: Read Oracle Price Data
**Location**: `src/hooks/anchor/useAnchorPrices.ts` lines 76-98

- **First attempt**: Reads `latestAnswer()` using `CHAINLINK_ORACLE_ABI` (expects bigint)
- **Fallback**: If Chainlink read fails, reads `latestAnswer()` using `WRAPPED_PRICE_ORACLE_ABI` (expects tuple)
- **Result**: `eurOracleData` = either bigint or tuple

## Step 4: Calculate EUR/USD from Oracle Data
**Location**: `src/hooks/anchor/useAnchorPrices.ts` lines 110-177

### If oracle returns tuple (Harbor oracle):
- Extracts `maxUnderlyingPrice` (index 1) = fxUSD price in EUR terms (18 decimals)
- Calculates: `fxUsdInEur = maxUnderlyingPrice / 1e18`
- Inverts to get EUR/USD: `eurUsd = 1 / fxUsdInEur`
- **Expected range**: 0.5 - 2.0 (EUR/USD should be ~1.0-1.2)

### If oracle returns bigint (Chainlink oracle):
- Uses `decimals()` value to interpret the price
- Calculates: `priceNum = eurOracleData / (10 ** decimals)`
- **Expected range**: 0.5 - 2.0 (EUR/USD should be ~1.0-1.2)
- If price is very small (< 0.5), tries inverting it

### Result:
- `eurPriceFromOracle` = calculated EUR/USD rate, or `null` if out of range

## Step 5: Final EUR Price
**Location**: `src/hooks/anchor/useAnchorPrices.ts` lines 179-185

- `eurPrice = eurPriceFromOracle ?? eurPriceCoinGecko`
- Falls back to CoinGecko if oracle calculation fails
- **Final value**: EUR/USD exchange rate (e.g., ~1.08)

## Step 6: Set Price in peggedPriceUSDMap
**Location**: `src/hooks/anchor/useAnchorPrices.ts` lines 440-448

- For EUR-pegged markets (e.g., haEUR):
  - Checks: `isEURPegged = pegTarget === "eur" || peggedTokenSymbol.includes("eur")`
  - If `eurPrice` is available:
    - Converts to 18 decimals: `eurPriceInWei = BigInt(Math.floor(eurPrice * 1e18))`
    - Sets: `peggedPriceUSDMap[marketId] = eurPriceInWei`
  - If `eurPrice` is NOT available:
    - Logs warning
    - Does NOT set price in map (falls through to fallback)

## Step 7: Use Price on Anchor Page
**Location**: `src/app/anchor/page.tsx` lines 5579-5585

- Looks up price: `mergedPeggedPriceMap[marketId] ?? peggedPriceUSDMap[marketId]`
- If found: `priceUSD = Number(price) / 1e18`
- If NOT found AND `pegTarget === "eur"` AND `eurPrice` exists:
  - Uses fallback: `priceUSD = eurPrice`
- If NOT found AND no fallback:
  - Uses default: `priceUSD = 1` (this is why we see 1:1!)

## Debug Logging

The code now includes comprehensive debug logging at each step:

1. **Oracle address found**: `[useAnchorPrices] Found EUR market: ...`
2. **Oracle reads**: `[useAnchorPrices] EUR oracle reads - decimals: ..., Chainlink: ..., Harbor: ...`
3. **Price calculation**: `[useAnchorPrices] EUR oracle raw: ..., decimals: ..., price: ...`
4. **Final EUR price**: `[useAnchorPrices] EUR price - oracle: ..., CoinGecko: ..., final: ...`
5. **Price map entry**: `[peggedPriceUSDMap] Market ... Using EUR/USD exchange rate: ...`
6. **Anchor page lookup**: `[anchor page] haEUR price from map: ...` or `[anchor page] haEUR price from fallback: ...`

## Common Issues

1. **Oracle returns unexpected format**: The value `338458291459315` suggests the oracle might be using a different decimal format than expected
2. **Price out of range**: If calculated price is not between 0.5-2.0, it's rejected and `eurPrice` becomes `null`
3. **MarketId mismatch**: If the `marketId` used to look up the price doesn't match the one used to set it, the price won't be found
4. **Fallback not working**: If `eurPrice` is `null`, the fallback logic won't work and it defaults to $1

## Next Steps

Check the browser console for these debug logs to identify where the calculation is failing.
