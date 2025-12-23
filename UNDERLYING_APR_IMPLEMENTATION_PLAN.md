# Implementation Plan: Display Underlying APR for wstETH and fxSAVE on Genesis Page

## Overview
Display the underlying APR (Annual Percentage Rate) of wstETH and fxSAVE collateral tokens on the genesis page markets. This will help users understand the base yield rate of the collateral they're depositing.

## Current State Analysis

### Genesis Page Structure
- Markets are displayed in rows with columns: Market, Deposit Assets, Total Deposits, Your Deposit, Status, Action
- Markets use either wstETH (BTC/stETH market) or fxSAVE (ETH/fxUSD, BTC/fxUSD markets) as collateral
- Market data is fetched via contract reads and subgraph queries

### Existing APR Infrastructure
- `useProjectedAPR.ts` has a hardcoded `STAKING_APR = 0.035` (3.5%) for stETH
- `useProjectedAPR.ts` already queries wstETH contract for `stEthPerToken` rate
- No existing hook for fxSAVE APR

## Implementation Plan

### Phase 1: Create APR Fetching Hooks

#### 1.1 Create `useWstETHAPR` Hook
**Location**: `src/hooks/useWstETHAPR.ts`

**Purpose**: Fetch the current stETH staking APR dynamically

**Approach Options**:
- **Option A (Recommended)**: Query Lido's stETH contract for the current staking rate
  - Use `stEthPerToken()` to calculate rate change over time
  - Compare current rate vs rate from 24 hours ago to calculate APR
  - Fallback to Lido's public API if available
  
- **Option B**: Use Lido's public API endpoint
  - `https://api.lido.fi/v1/protocol/steth/apr/sma` (Simple Moving Average)
  - More reliable but requires external API dependency

**Implementation**:
```typescript
export function useWstETHAPR(enabled = true) {
  return useQuery({
    queryKey: ["wsteth-apr"],
    queryFn: async () => {
      // Fetch from Lido API or calculate from rate change
      const response = await fetch("https://api.lido.fi/v1/protocol/steth/apr/sma");
      const data = await response.json();
      return parseFloat(data.data.smaApr) / 100; // Convert to decimal
    },
    enabled,
    refetchInterval: 3600000, // Refresh every hour
    staleTime: 1800000, // 30 minutes
  });
}
```

#### 1.2 Create `useFxSAVEAPR` Hook
**Location**: `src/hooks/useFxSAVEAPR.ts`

**Purpose**: Fetch the current fxSAVE savings rate from DeFiLlama

**Approach**: Use DeFiLlama Yields API
- Pool ID: `ee0b7069-f8f3-4aa2-a415-728f13e6cc3d`
- API Endpoint: `https://yields.llama.fi/pool/{poolId}`
- Returns current APY which we can use as APR

**Implementation**:
```typescript
export function useFxSAVEAPR(enabled = true) {
  const FXSAVE_POOL_ID = "ee0b7069-f8f3-4aa2-a415-728f13e6cc3d";
  
  return useQuery({
    queryKey: ["fxsave-apr", FXSAVE_POOL_ID],
    queryFn: async () => {
      const response = await fetch(
        `https://yields.llama.fi/pool/${FXSAVE_POOL_ID}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch fxSAVE APR: ${response.statusText}`);
      }
      
      const data = await response.json();
      // DeFiLlama returns APY, convert to APR (or use APY directly)
      // Typically APY = (1 + APR/n)^n - 1, but for display we can use APY
      return parseFloat(data.apy) / 100; // Convert percentage to decimal
    },
    enabled,
    refetchInterval: 3600000, // Refresh every hour
    staleTime: 1800000, // 30 minutes
    retry: 2,
  });
}
```

### Phase 2: Integrate APR Display in Genesis Page

#### 2.1 Add APR Column/Display
**Location**: `src/app/genesis/page.tsx`

**Display Options**:
- **Option A**: Add new column in desktop view (between "Deposit Assets" and "Total Deposits")
- **Option B**: Add APR badge/indicator next to collateral symbol
- **Option C**: Add APR in tooltip on hover over collateral info
- **Option D**: Add APR in mobile card view below deposit assets

**Recommended**: Option B + Option D (badge in desktop, info in mobile)

#### 2.2 Implementation Steps

1. **Import hooks at top of component**:
```typescript
import { useWstETHAPR } from "@/hooks/useWstETHAPR";
import { useFxSAVEAPR } from "@/hooks/useFxSAVEAPR";
```

2. **Call hooks in component**:
```typescript
const { data: wstETHAPR, isLoading: isLoadingWstETHAPR } = useWstETHAPR();
const { data: fxSAVEAPR, isLoading: isLoadingFxSAVEAPR } = useFxSAVEAPR();
```

3. **Determine which APR to show per market**:
```typescript
const collateralSymbol = (mkt as any)?.collateral?.symbol?.toLowerCase();
const isWstETH = collateralSymbol === "wsteth";
const isFxSAVE = collateralSymbol === "fxsave";

const underlyingAPR = isWstETH ? wstETHAPR : isFxSAVE ? fxSAVEAPR : null;
```

4. **Add display in desktop header** (if using column approach):
```typescript
<div className="text-center min-w-0">Underlying APR</div>
```

5. **Add display in market rows**:
```typescript
{underlyingAPR !== null && (
  <div className="text-center">
    <div className="text-[#1E4775]/70 text-[10px]">Underlying APR</div>
    <div className="text-[#1E4775] font-semibold">
      {isLoadingWstETHAPR || isLoadingFxSAVEAPR 
        ? "..." 
        : `${(underlyingAPR * 100).toFixed(2)}%`}
    </div>
  </div>
)}
```

6. **Add display in mobile view**:
```typescript
{underlyingAPR !== null && (
  <div className="mt-2">
    <div className="text-[#1E4775]/70 text-[10px]">Underlying APR</div>
    <div className="text-[#1E4775] font-semibold text-xs">
      {isLoadingWstETHAPR || isLoadingFxSAVEAPR 
        ? "Loading..." 
        : `${(underlyingAPR * 100).toFixed(2)}%`}
    </div>
  </div>
)}
```

### Phase 3: Error Handling & Fallbacks

1. **Handle API failures gracefully**:
   - Show "N/A" or "-" if APR cannot be fetched
   - Use fallback values if available (e.g., last known rate)
   - Don't block page rendering if APR fetch fails

2. **Loading states**:
   - Show loading indicator or skeleton while fetching
   - Consider showing cached/stale data if available

3. **Rate limiting**:
   - Use appropriate refetch intervals to avoid API rate limits
   - Cache results appropriately

## Data Sources Research Needed

### wstETH APR Sources:
1. **Lido API**: `https://api.lido.fi/v1/protocol/steth/apr/sma`
2. **On-chain calculation**: Monitor `stEthPerToken()` rate change over time
3. **Lido subgraph**: May have historical rate data

### fxSAVE APR Sources:
1. **DeFiLlama Yields API** (✅ Implemented): 
   - Pool ID: `ee0b7069-f8f3-4aa2-a415-728f13e6cc3d`
   - Endpoint: `https://yields.llama.fi/pool/{poolId}`
   - Returns current APY which can be used as APR

## Testing Plan

1. **Unit Tests**:
   - Test APR calculation logic
   - Test fallback handling
   - Test loading states

2. **Integration Tests**:
   - Verify APR displays correctly for wstETH markets
   - Verify APR displays correctly for fxSAVE markets
   - Verify loading states work properly
   - Verify error states don't break the page

3. **Manual Testing**:
   - Test on different screen sizes (desktop, tablet, mobile)
   - Test with slow network connections
   - Test with API failures
   - Verify APR updates over time

## Implementation Order

1. ✅ Research data sources for wstETH and fxSAVE APR
2. ✅ Create `useWstETHAPR` hook
3. ✅ Create `useFxSAVEAPR` hook  
4. ✅ Add APR display to genesis page (desktop view)
5. ✅ Add APR display to genesis page (mobile view)
6. ✅ Add error handling and fallbacks
7. ✅ Test and refine

## Notes

- Consider adding a tooltip explaining what "Underlying APR" means
- May want to show both current APR and historical average
- Consider caching APR data to reduce API calls
- Ensure APR updates don't cause unnecessary re-renders

