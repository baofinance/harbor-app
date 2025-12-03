# Quick Start: Harbor Marks Rules

## Your Current Requirements

Based on your requirements, the system is already configured with these default rules:

- **1 mark per dollar per day** for:

  - ha tokens in wallet (`haToken`)
  - Collateral stability pool deposits (`stabilityPoolCollateral`)

- **2 marks per dollar per day** for:

  - Sail stability pool deposits (`stabilityPoolSail`)

- **5 marks per dollar per day** for:
  - Sail tokens in wallet (`sailToken`)

## How to Change Rules

### Option 1: Update Default Rules (All Contracts)

Edit `subgraph/src/marksRules.ts`:

```typescript
else if (contractType == "stabilityPoolCollateral") {
  rule.marksPerDollarPerDay = BigDecimal.fromString("1.5"); // Changed from 1
  // ...
}
```

### Option 2: Update Specific Contract

Use `updateMarksRule()` in an event handler:

```typescript
import { updateMarksRule } from "./marksRules";

export function handleAdminUpdate(event: AdminUpdateEvent): void {
  updateMarksRule(
    "0x...", // Specific contract address
    "stabilityPoolCollateral",
    {
      marksPerDollarPerDay: BigDecimal.fromString("2"), // New rate
    }
  );
}
```

### Option 3: Add New Contract Type

1. Add to `marksRules.ts`:

```typescript
else if (contractType == "newType") {
  rule.marksPerDollarPerDay = BigDecimal.fromString("3");
  rule.hasPeriod = false;
  rule.forfeitOnWithdrawal = true;
  rule.forfeitPercentage = BigDecimal.fromString("100");
}
```

2. Create handler file (e.g., `src/newContract.ts`)
3. Add data source to `subgraph.yaml`

## Adding Stability Pool Tracking

To track stability pools, you need to:

1. **Add data sources** to `subgraph.yaml` for each stability pool contract
2. **Determine pool type** (collateral vs sail) - can be done via:
   - Contract address mapping
   - Event data
   - Contract call
3. **Use the handlers** in `src/stabilityPool.ts`

## Adding Token Balance Tracking

To track wallet balances:

1. **Map token addresses** in `src/tokenBalances.ts`:

```typescript
TOKEN_TYPE_MAP.set("0x...", "haToken");
TOKEN_TYPE_MAP.set("0x...", "sailToken");
```

2. **Add ERC20 data sources** to `subgraph.yaml` for each token
3. **Track Transfer events** to update balances

## Testing Rule Changes

1. Deploy subgraph to test environment
2. Test with sample transactions
3. Verify marks calculation matches expected rates
4. Deploy to production

## Common Patterns

### Time-Limited Promotion

```typescript
updateMarksRule(contractAddress, "stabilityPoolCollateral", {
  marksPerDollarPerDay: BigDecimal.fromString("5"), // Higher rate
  hasPeriod: true,
  periodStartDate: BigInt.fromI32(promotionStart),
  periodEndDate: BigInt.fromI32(promotionEnd),
});
```

### Gradual Rate Change

Use `additionalRules` JSON to store tiered rates based on deposit size or time.

### No Forfeiture Period

```typescript
updateMarksRule(contractAddress, contractType, {
  forfeitOnWithdrawal: false,
});
```

