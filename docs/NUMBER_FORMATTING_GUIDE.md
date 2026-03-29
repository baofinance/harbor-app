# Number Formatting Guide

This document outlines the standard number formatting approach for the Harbor Finance application.

## Formatting Hook

Use the `useNumberFormatter()` hook for all number formatting needs:

```typescript
import { useNumberFormatter } from '@/hooks/useNumberFormatter';

function MyComponent() {
  const formatter = useNumberFormatter();
  
  // Format token amounts
  const tokenDisplay = formatter.formatToken(balance, "ETH", { priceUSD: 2500 });
  // Returns: { formatted: "1.234567", compact: "1.23", withSymbol: "1.234567 ETH", usd: "$3,086.42" }
  
  // Format USD values
  const usdDisplay = formatter.formatUSD(1234567.89);
  // Returns: { formatted: "1.23M", compact: "1.23M", withSymbol: "$1.23M" }
  
  // Format percentages
  const percentDisplay = formatter.formatPercent(0.0523, { isDecimal: true });
  // Returns: "5.23%"
  
  // Format ratios (from contracts)
  const ratioDisplay = formatter.formatRatio(1500000000000000000n); // 1.5e18
  // Returns: "150%"
  
  // Format APR/APY
  const aprDisplay = formatter.formatAPR(0.0523); // 5.23%
  // Returns: "5.23%"
}
```

## Formatting Rules

### Token Amounts
- Always include a space before the token symbol: `"1.234 ETH"` ✅ not `"1.234ETH"` ❌
- Use thousand separators for values >= 1: `"1,234.567 ETH"`
- Remove trailing zeros: `"1.5 ETH"` not `"1.500000 ETH"`
- Use exponential notation for very small values: `"1.23e-7 ETH"`
- Default max decimals: 6
- Show USD equivalent when price is available: `"1.234 ETH ($3,086.42)"`

### USD Values
- Use compact notation by default: `"$1.23M"`, `"$456.78K"`, `"$12.34B"`
- Show full value for amounts < $10,000: `"$1,234.56"`
- Use `"<$0.01"` for very small positive values
- Always include thousand separators: `"$1,234.56"`

### Percentages
- Always include the `%` symbol: `"5.23%"` ✅ not `"5.23"` ❌
- Use 2 decimal places by default
- Show `"<0.01%"` for very small values
- For APR/APY, allow prefixes like `"up to 12.5%"` or `"~5.2%"`

### Ratios (from contracts)
- Contract ratios are scaled by 1e18
- Display as percentage by default: `"150%"` for 1.5x ratio
- Can optionally display as decimal: `"1.5"` for 1.5x ratio

### Balance Display
- Format: `"Balance: 1.234567 ETH"` with space before token symbol
- Show loading state: `"Balance: Loading..."`
- Show error state: `"Balance: Error loading balance"`

## Migration Checklist

When updating a page to use the new formatter:

1. Import the hook: `import { useNumberFormatter } from '@/hooks/useNumberFormatter';`
2. Initialize in component: `const formatter = useNumberFormatter();`
3. Replace all inline formatting with formatter methods
4. Ensure all token amounts have spaces before symbols
5. Use `.withSymbol` property for display with symbol
6. Use `.formatted` property for display without symbol
7. Test all number displays on the page

## Pages to Update

- [x] GenesisDepositModal - Fixed balance spacing
- [ ] GenesisWithdrawModal
- [ ] AnchorDepositWithdrawModal
- [ ] Genesis page (src/app/genesis/page.tsx)
- [ ] Anchor page (src/app/anchor/page.tsx)
- [ ] Sail page (src/app/sail/page.tsx)
- [ ] Flow page (src/app/flow/page.tsx)
- [ ] Transparency page (src/app/transparency/page.tsx)
- [ ] Earn page (src/app/earn/page.tsx)
- [ ] Ledger Marks page (src/app/ledger-marks/page.tsx)
- [ ] Mint/Redeem page (src/app/mintredeem/page.tsx)

## Common Patterns

### Token Balance with USD
```typescript
const { withSymbol, usd } = formatter.formatToken(balance, "ETH", { priceUSD: 2500 });
return (
  <div>
    {withSymbol}
    {usd && <span className="text-gray-500 ml-1">({usd})</span>}
  </div>
);
```

### Compact USD Display
```typescript
const { withSymbol } = formatter.formatUSD(1234567, { compact: true });
return <div>{withSymbol}</div>; // "$1.23M"
```

### APR Display
```typescript
const apr = formatter.formatAPR(0.0523); // "5.23%"
return <div>APR: {apr}</div>;
```

### Ratio from Contract
```typescript
const ratio = formatter.formatRatio(collateralRatio); // bigint from contract
return <div>Collateral Ratio: {ratio}</div>; // "150%"
```

