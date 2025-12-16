# RPC Request Optimization Recommendations

## Current Issues

### 1. No Default Query Configuration
- `QueryClient` has no default configuration, using React Query defaults:
  - `staleTime: 0` (everything refetches immediately)
  - `refetchOnWindowFocus: true` (refetch every time user returns to tab)
  - `refetchOnMount: true` (refetch on every component mount)
- This causes **excessive unnecessary refetches**

### 2. Aggressive Polling Intervals
- **29 instances** of `refetchInterval: 5000` (5 seconds)
- Found in modals that poll even when closed
- Balance checks, allowances, and deposit amounts all polling at 5s

### 3. Unused Centralized Config
- `src/config/polling.ts` exists with sensible intervals but is **rarely used**
- Hardcoded intervals scattered throughout codebase (99+ instances)

### 4. Modal Polling When Closed
- Deposit/Withdraw modals continue polling even when closed
- Should use conditional intervals: `refetchInterval: isOpen ? 5000 : false`

## Recommended Optimizations

### Priority 1: Configure QueryClient Defaults (HIGH IMPACT)

```typescript
// src/components/Web3Provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // Data fresh for 30s (reduces refetches)
      cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch on tab focus (biggest win)
      refetchOnMount: false, // Don't refetch on component remount
      retry: 1, // Reduce retries from 3 to 1
      refetchInterval: false, // Disable interval by default
    },
  },
})
```

**Impact:** Could reduce requests by 50-70% immediately

### Priority 2: Use Conditional Polling in Modals (HIGH IMPACT)

```typescript
// Example: GenesisDepositModal.tsx
const { data: allowanceData } = useContractRead({
  // ...
  query: {
    refetchInterval: isOpen ? 15000 : false, // Poll only when open
    staleTime: 10000,
  }
});
```

**Files to update:**
- `src/components/GenesisDepositModal.tsx` (2 instances at 5000ms)
- `src/components/AnchorDepositWithdrawModal.tsx` (17 instances at 5000ms)
- `src/components/SailManageModal.tsx` (2 instances at 5000ms)
- `src/components/AnchorDepositModal.tsx` (5 instances at 5000ms)
- `src/components/AnchorWithdrawModal.tsx` (1 instance at 5000ms)

**Impact:** Eliminates polling when modals closed

### Priority 3: Increase Polling Intervals (MEDIUM IMPACT)

Change aggressive 5-second intervals to more reasonable values:

```typescript
// Balance checks: 5s → 15s
refetchInterval: 15000

// Allowances: 5s → 15s (only checked when needed)
refetchInterval: 15000

// Prices: 30s (already reasonable in most places)
refetchInterval: 30000

// Genesis end check: 5s → 60s (doesn't change minute-to-minute)
refetchInterval: 60000
```

**Files:**
- `src/app/genesis/page.tsx` - genesis end check (5s → 60s)
- Modal balance checks (5s → conditional 15s)

### Priority 4: Use Centralized Config (LOW IMPACT, GOOD DX)

```typescript
import { POLLING_INTERVALS } from '@/config/polling';

// Instead of:
refetchInterval: 5000

// Use:
refetchInterval: POLLING_INTERVALS.NORMAL
```

### Priority 5: Batch Requests Where Possible (MEDIUM IMPACT)

Already using `useContractReads` in many places (good!), but consider:

```typescript
// Instead of 3 separate calls:
useContractRead({ address: token1, functionName: 'balanceOf' })
useContractRead({ address: token2, functionName: 'balanceOf' })
useContractRead({ address: token3, functionName: 'balanceOf' })

// Use single batched call:
useContractReads({
  contracts: [
    { address: token1, functionName: 'balanceOf' },
    { address: token2, functionName: 'balanceOf' },
    { address: token3, functionName: 'balanceOf' },
  ]
})
```

### Priority 6: Static Data Caching (LOW IMPACT)

For data that never changes:
- Token symbols
- Token decimals  
- Token names

```typescript
const { data: tokenSymbol } = useContractRead({
  // ...
  query: {
    staleTime: Infinity, // Never refetch
    cacheTime: Infinity, // Cache forever
  }
});
```

## Implementation Plan

### Phase 1 (Quick Wins - 30 min)
1. Add QueryClient default configuration
2. Add conditional polling to GenesisDepositModal

### Phase 2 (1-2 hours)
3. Update all modal polling to be conditional
4. Increase genesis end check interval to 60s
5. Test modal behavior thoroughly

### Phase 3 (Ongoing)
6. Gradually replace hardcoded intervals with centralized config
7. Identify and cache static contract data

## Expected Impact

| Optimization | Request Reduction | Effort |
|-------------|-------------------|--------|
| QueryClient defaults | 50-70% | 5 min |
| Conditional modal polling | 30-40% | 30 min |
| Increased intervals | 10-20% | 15 min |
| Batching improvements | 5-10% | Varies |

**Total potential reduction: 60-80% of current RPC requests**

## Monitoring

After implementing, monitor:
1. Alchemy dashboard for request count trends
2. User-reported latency issues
3. Data freshness (ensure nothing feels stale)

## Notes

- The polling config file already exists at `src/config/polling.ts` with good documentation
- Most queries already use `allowFailure: true` (good for reliability)
- Many queries already use `useContractReads` for batching (good!)
- Current setup favors freshness over efficiency - we can rebalance

