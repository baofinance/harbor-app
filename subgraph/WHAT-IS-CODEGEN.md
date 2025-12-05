# What Does `graph codegen` Do?

## Overview

`graph codegen` is a command from The Graph CLI that generates TypeScript/AssemblyScript code from your contract ABIs (Application Binary Interfaces). This generated code allows your subgraph handlers to interact with smart contracts.

## What Are ABIs?

**ABI (Application Binary Interface)** = A JSON file that describes:
- What functions a contract has
- What parameters those functions take
- What they return
- What events the contract emits
- The data structure of events

**Example ABI snippet** (from `abis/ERC20.json`):
```json
{
  "name": "balanceOf",
  "type": "function",
  "inputs": [
    {
      "name": "account",
      "type": "address"
    }
  ],
  "outputs": [
    {
      "name": "",
      "type": "uint256"
    }
  ]
}
```

This tells us: "The `balanceOf` function takes an address and returns a uint256."

## What `graph codegen` Does

When you run `graph codegen`, it:

1. **Reads your `subgraph.yaml`** to find:
   - Which ABIs you're using (listed in the `abis` section)
   - Where those ABI files are located

2. **Reads the ABI JSON files** from `abis/` directory

3. **Generates TypeScript/AssemblyScript code** in `generated/` directory that includes:
   - **Contract classes** - Type-safe wrappers for calling contract functions
   - **Event classes** - Type-safe event handlers with typed parameters
   - **Type definitions** - All the types (Address, BigInt, etc.) used by contracts

## Generated Files Structure

After running `graph codegen`, you'll see:

```
subgraph/
├── generated/
│   ├── templates/
│   │   ├── HaToken/
│   │   │   ├── ERC20.ts          ← Generated contract class
│   │   │   └── AggregatorV2V3Interface.ts
│   │   └── StabilityPoolCollateral/
│   │       ├── StabilityPool.ts
│   │       ├── ERC20.ts
│   │       └── AggregatorV2V3Interface.ts
│   └── schema.ts                  ← Generated from schema.graphql
```

## Example: What Gets Generated

### Input: ABI File (`abis/ERC20.json`)
```json
{
  "name": "balanceOf",
  "type": "function",
  "inputs": [{"name": "account", "type": "address"}],
  "outputs": [{"name": "", "type": "uint256"}]
}
```

### Output: Generated TypeScript (`generated/templates/HaToken/ERC20.ts`)
```typescript
export class ERC20 extends ethereum.SmartContract {
  // Generated function to call balanceOf
  balanceOf(account: Address): ethereum.CallResult<BigInt> {
    let result = super.tryCall("balanceOf", "balanceOf(address):(uint256)", [
      ethereum.Value.fromAddress(account)
    ]);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }
}
```

## Why We Need This

### Without `graph codegen`:
```typescript
// ❌ You'd have to manually write this (error-prone, no type safety)
const balance = contract.call("balanceOf", [userAddress]);
// What type is balance? Is it BigInt? String? We don't know!
```

### With `graph codegen`:
```typescript
// ✅ Type-safe, auto-complete, compile-time checks
import { ERC20 } from "../generated/templates/HaToken/ERC20";

const token = ERC20.bind(tokenAddress);
const balanceResult = token.try_balanceOf(userAddress);
if (!balanceResult.reverted) {
  const balance: BigInt = balanceResult.value; // TypeScript knows this is BigInt!
}
```

## What Happens in Our Code

### In `src/haToken.ts`:
```typescript
// This import only works AFTER running graph codegen
import { ERC20 } from "../generated/templates/HaToken/ERC20";
import { AggregatorV2V3Interface } from "../generated/templates/HaToken/AggregatorV2V3Interface";

// This function uses the generated ERC20 class
function queryTokenBalance(tokenAddress: Address, userAddress: Address): BigInt {
  const token = ERC20.bind(tokenAddress);  // ← Generated class
  const balanceResult = token.try_balanceOf(userAddress);  // ← Generated method
  // ...
}
```

**Without `graph codegen`**: These imports would fail because the files don't exist yet!

## The Full Workflow

```
1. Write subgraph.yaml
   ↓ (specifies which ABIs to use)
2. Place ABI JSON files in abis/
   ↓ (contract interfaces)
3. Run: graph codegen
   ↓ (generates TypeScript from ABIs)
4. Write handlers in src/
   ↓ (import and use generated classes)
5. Run: graph build
   ↓ (compiles everything to WASM)
6. Deploy subgraph
```

## What ABIs Do We Need?

Based on our `subgraph.yaml`, we need:

1. **ERC20.json** - For ha token balance queries
   - Functions: `balanceOf(address)`, `transfer()`, etc.
   - Events: `Transfer(address,address,uint256)`

2. **ChainlinkAggregator.json** - For price feed queries
   - Functions: `latestAnswer()`, `latestRoundData()`, etc.
   - Interface: `AggregatorV2V3Interface`

3. **StabilityPool.json** - For pool deposit queries
   - Functions: `assetBalanceOf(address)`, `asset()`, etc.
   - Events: `Deposit()`, `Withdraw()`, `UserDepositChange()`

## Where Do ABIs Come From?

**Option 1: From Contract Source** (if you have it)
```bash
# If you have the Solidity source
forge build
# ABIs are in out/ContractName.sol/ContractName.json
```

**Option 2: From Etherscan/Block Explorer**
- Download ABI from contract page
- Save as `abis/ContractName.json`

**Option 3: From TypeChain/Hardhat**
- If using Hardhat, ABIs are in `artifacts/`
- Copy to `abis/`

**Option 4: Manual Creation** (for simple interfaces)
- Write JSON manually for known interfaces (like ERC20)

## Common Issues

### Issue: "Cannot find module '../generated/...'"
**Solution**: Run `graph codegen` first!

### Issue: "Function not found in contract"
**Solution**: 
- Check if ABI includes that function
- Regenerate with `graph codegen`

### Issue: "Type mismatch"
**Solution**: 
- Make sure ABI matches actual contract
- Update ABI and regenerate

## Summary

**`graph codegen` = Code Generator**

It reads your ABI JSON files and generates TypeScript classes that let you:
- ✅ Call contract functions with type safety
- ✅ Handle events with typed parameters  
- ✅ Get autocomplete and compile-time checks
- ✅ Avoid manual encoding/decoding

**Without it**: You can't import the contract classes, and your handlers won't compile.

**With it**: You get type-safe, easy-to-use contract interfaces!



## Overview

`graph codegen` is a command from The Graph CLI that generates TypeScript/AssemblyScript code from your contract ABIs (Application Binary Interfaces). This generated code allows your subgraph handlers to interact with smart contracts.

## What Are ABIs?

**ABI (Application Binary Interface)** = A JSON file that describes:
- What functions a contract has
- What parameters those functions take
- What they return
- What events the contract emits
- The data structure of events

**Example ABI snippet** (from `abis/ERC20.json`):
```json
{
  "name": "balanceOf",
  "type": "function",
  "inputs": [
    {
      "name": "account",
      "type": "address"
    }
  ],
  "outputs": [
    {
      "name": "",
      "type": "uint256"
    }
  ]
}
```

This tells us: "The `balanceOf` function takes an address and returns a uint256."

## What `graph codegen` Does

When you run `graph codegen`, it:

1. **Reads your `subgraph.yaml`** to find:
   - Which ABIs you're using (listed in the `abis` section)
   - Where those ABI files are located

2. **Reads the ABI JSON files** from `abis/` directory

3. **Generates TypeScript/AssemblyScript code** in `generated/` directory that includes:
   - **Contract classes** - Type-safe wrappers for calling contract functions
   - **Event classes** - Type-safe event handlers with typed parameters
   - **Type definitions** - All the types (Address, BigInt, etc.) used by contracts

## Generated Files Structure

After running `graph codegen`, you'll see:

```
subgraph/
├── generated/
│   ├── templates/
│   │   ├── HaToken/
│   │   │   ├── ERC20.ts          ← Generated contract class
│   │   │   └── AggregatorV2V3Interface.ts
│   │   └── StabilityPoolCollateral/
│   │       ├── StabilityPool.ts
│   │       ├── ERC20.ts
│   │       └── AggregatorV2V3Interface.ts
│   └── schema.ts                  ← Generated from schema.graphql
```

## Example: What Gets Generated

### Input: ABI File (`abis/ERC20.json`)
```json
{
  "name": "balanceOf",
  "type": "function",
  "inputs": [{"name": "account", "type": "address"}],
  "outputs": [{"name": "", "type": "uint256"}]
}
```

### Output: Generated TypeScript (`generated/templates/HaToken/ERC20.ts`)
```typescript
export class ERC20 extends ethereum.SmartContract {
  // Generated function to call balanceOf
  balanceOf(account: Address): ethereum.CallResult<BigInt> {
    let result = super.tryCall("balanceOf", "balanceOf(address):(uint256)", [
      ethereum.Value.fromAddress(account)
    ]);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }
}
```

## Why We Need This

### Without `graph codegen`:
```typescript
// ❌ You'd have to manually write this (error-prone, no type safety)
const balance = contract.call("balanceOf", [userAddress]);
// What type is balance? Is it BigInt? String? We don't know!
```

### With `graph codegen`:
```typescript
// ✅ Type-safe, auto-complete, compile-time checks
import { ERC20 } from "../generated/templates/HaToken/ERC20";

const token = ERC20.bind(tokenAddress);
const balanceResult = token.try_balanceOf(userAddress);
if (!balanceResult.reverted) {
  const balance: BigInt = balanceResult.value; // TypeScript knows this is BigInt!
}
```

## What Happens in Our Code

### In `src/haToken.ts`:
```typescript
// This import only works AFTER running graph codegen
import { ERC20 } from "../generated/templates/HaToken/ERC20";
import { AggregatorV2V3Interface } from "../generated/templates/HaToken/AggregatorV2V3Interface";

// This function uses the generated ERC20 class
function queryTokenBalance(tokenAddress: Address, userAddress: Address): BigInt {
  const token = ERC20.bind(tokenAddress);  // ← Generated class
  const balanceResult = token.try_balanceOf(userAddress);  // ← Generated method
  // ...
}
```

**Without `graph codegen`**: These imports would fail because the files don't exist yet!

## The Full Workflow

```
1. Write subgraph.yaml
   ↓ (specifies which ABIs to use)
2. Place ABI JSON files in abis/
   ↓ (contract interfaces)
3. Run: graph codegen
   ↓ (generates TypeScript from ABIs)
4. Write handlers in src/
   ↓ (import and use generated classes)
5. Run: graph build
   ↓ (compiles everything to WASM)
6. Deploy subgraph
```

## What ABIs Do We Need?

Based on our `subgraph.yaml`, we need:

1. **ERC20.json** - For ha token balance queries
   - Functions: `balanceOf(address)`, `transfer()`, etc.
   - Events: `Transfer(address,address,uint256)`

2. **ChainlinkAggregator.json** - For price feed queries
   - Functions: `latestAnswer()`, `latestRoundData()`, etc.
   - Interface: `AggregatorV2V3Interface`

3. **StabilityPool.json** - For pool deposit queries
   - Functions: `assetBalanceOf(address)`, `asset()`, etc.
   - Events: `Deposit()`, `Withdraw()`, `UserDepositChange()`

## Where Do ABIs Come From?

**Option 1: From Contract Source** (if you have it)
```bash
# If you have the Solidity source
forge build
# ABIs are in out/ContractName.sol/ContractName.json
```

**Option 2: From Etherscan/Block Explorer**
- Download ABI from contract page
- Save as `abis/ContractName.json`

**Option 3: From TypeChain/Hardhat**
- If using Hardhat, ABIs are in `artifacts/`
- Copy to `abis/`

**Option 4: Manual Creation** (for simple interfaces)
- Write JSON manually for known interfaces (like ERC20)

## Common Issues

### Issue: "Cannot find module '../generated/...'"
**Solution**: Run `graph codegen` first!

### Issue: "Function not found in contract"
**Solution**: 
- Check if ABI includes that function
- Regenerate with `graph codegen`

### Issue: "Type mismatch"
**Solution**: 
- Make sure ABI matches actual contract
- Update ABI and regenerate

## Summary

**`graph codegen` = Code Generator**

It reads your ABI JSON files and generates TypeScript classes that let you:
- ✅ Call contract functions with type safety
- ✅ Handle events with typed parameters  
- ✅ Get autocomplete and compile-time checks
- ✅ Avoid manual encoding/decoding

**Without it**: You can't import the contract classes, and your handlers won't compile.

**With it**: You get type-safe, easy-to-use contract interfaces!

