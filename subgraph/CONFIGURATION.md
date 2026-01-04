# Harbor Marks Configuration Guide

This guide explains how to configure and adapt Harbor Marks rules for different contract types and behaviors.

## Default Rules

The system comes with default rules for each contract type:

| Contract Type             | Marks per Dollar per Day | Bonus       | Forfeit on Withdrawal |
| ------------------------- | ------------------------ | ----------- | --------------------- |
| `genesis`                 | 10                       | 100x at end | Yes (100%)            |
| `stabilityPoolCollateral` | 1                        | None        | Yes (100%)            |
| `stabilityPoolSail`       | 2                        | None        | Yes (100%)            |
| `sailToken`               | 5                        | None        | No                    |
| `haToken`                 | 1                        | None        | No                    |

## Adding New Contract Types

### Step 1: Update `marksRules.ts`

Add a new case in `getOrCreateMarksRule()`:

```typescript
else if (contractType == "yourNewType") {
  rule.marksPerDollarPerDay = BigDecimal.fromString("3");
  rule.bonusMultiplier = null; // or set a bonus
  rule.hasPeriod = false; // or true if time-limited
  rule.forfeitOnWithdrawal = true;
  rule.forfeitPercentage = BigDecimal.fromString("100");
}
```

### Step 2: Create Event Handlers

Create a new handler file (e.g., `src/yourContract.ts`) that:

- Listens to deposit/withdraw/transfer events
- Uses `getOrCreateMarksRule()` to get the rule
- Uses `calculateMarksWithRule()` to calculate marks
- Updates `UserHarborMarks` entities

### Step 3: Update `subgraph.yaml`

Add a new data source:

```yaml
dataSources:
  - kind: ethereum
    name: YourContract
    network: anvil
    source:
      address: "0x..."
      abi: YourContract
      startBlock: 0
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Deposit
        - Withdrawal
        - UserHarborMarks
      abis:
        - name: YourContract
          file: ./abis/YourContract.json
      eventHandlers:
        - event: Deposit(...)
          handler: handleYourContractDeposit
      file: ./src/yourContract.ts
```

## Updating Rules Dynamically

Rules can be updated via admin functions or events. Create an admin handler:

```typescript
import { updateMarksRule } from "./marksRules";

export function handleRuleUpdate(event: RuleUpdateEvent): void {
  updateMarksRule(event.params.contractAddress, event.params.contractType, {
    marksPerDollarPerDay: event.params.newRate,
    // ... other updates
  });
}
```

## Custom Rules per Contract

You can set contract-specific rules by passing the contract address:

```typescript
// Default rule for all stabilityPoolCollateral contracts
getOrCreateMarksRule(null, "stabilityPoolCollateral");

// Specific rule for one contract
getOrCreateMarksRule("0x...", "stabilityPoolCollateral");
```

## Advanced Configuration

### Time-Limited Promotions

```typescript
updateMarksRule(contractAddress, "stabilityPoolCollateral", {
  marksPerDollarPerDay: BigDecimal.fromString("5"), // Higher rate
  hasPeriod: true,
  periodStartDate: BigInt.fromI32(promotionStart),
  periodEndDate: BigInt.fromI32(promotionEnd),
});
```

### Partial Forfeiture

```typescript
updateMarksRule(contractAddress, "stabilityPoolCollateral", {
  forfeitOnWithdrawal: true,
  forfeitPercentage: BigDecimal.fromString("50"), // Only forfeit 50%
});
```

### Tiered Bonuses

Use `additionalRules` JSON field to store complex rules:

```typescript
const tieredRules = {
  tiers: [
    { minDeposit: 1000, bonusMultiplier: 1.1 },
    { minDeposit: 10000, bonusMultiplier: 1.2 },
  ],
};
updateMarksRule(contractAddress, contractType, {
  additionalRules: JSON.stringify(tieredRules),
});
```

## Token Balance Tracking

For wallet balances (ha tokens, sail tokens), you need to:

1. **Map token addresses** in `tokenBalances.ts`:

   ```typescript
   TOKEN_TYPE_MAP.set("0x...", "haToken");
   TOKEN_TYPE_MAP.set("0x...", "sailToken");
   ```

2. **Track Transfer events** to update balances

3. **Calculate marks** based on current balance and time held

## Best Practices

1. **Always use rules** - Don't hardcode mark rates
2. **Test rule changes** - Update rules in a test environment first
3. **Document custom rules** - Use `additionalRules` JSON field for complex logic
4. **Version your rules** - Consider adding a `version` field to `MarksRule`
5. **Monitor rule changes** - Log when rules are updated for audit purposes












