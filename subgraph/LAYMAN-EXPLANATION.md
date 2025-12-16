# Layman's Explanation: What `graph codegen` Actually Does

## The Simple Answer

**`graph codegen` does NOT point your subgraph at deployed contracts.**

Instead, it **generates helper code** that lets you *talk to* contracts (any contracts with the same interface).

Think of it like this:

## The Analogy: Phone Book vs. Phone Number

### What `graph codegen` Does (Phone Book)
- Creates a **phone book** (TypeScript classes) that tells you:
  - "Here's how to call `balanceOf()`"
  - "Here's how to call `transfer()`"
  - "Here's what each function returns"

### What `subgraph.yaml` Does (Phone Number)
- Provides the **actual phone number** (contract address):
  ```yaml
  address: "0x0165878A594ca255338adfa4d48449f69242Eb8F"
  ```

## The Real Flow

```
Step 1: You have contract ABIs (the "interface description")
   ↓
   These are JSON files that describe:
   - What functions exist
   - What parameters they take
   - What they return
   
Step 2: Run `graph codegen`
   ↓
   Generates TypeScript classes from ABIs
   - Creates ERC20.ts (knows how to call balanceOf, transfer, etc.)
   - Creates StabilityPool.ts (knows how to call assetBalanceOf, etc.)
   - These are like "instruction manuals" for talking to contracts
   
Step 3: Write your handlers
   ↓
   Use the generated classes:
   - "Hey ERC20 class, call balanceOf() on this address"
   - The class knows HOW to do it (from the ABI)
   
Step 4: Deploy subgraph
   ↓
   subgraph.yaml tells it WHERE to look:
   - "Watch this address: 0x0165..."
   - "Start from block 55"
```

## What Points at Deployed Contracts?

**`subgraph.yaml`** points at deployed contracts:

```yaml
source:
  address: "0x0165878A594ca255338adfa4d48449f69242Eb8F"  ← THIS is the deployed contract
  abi: ERC20
  startBlock: 55  ← Start watching from this block
```

**`graph codegen`** just generates the code that knows HOW to talk to contracts with that ABI.

## The Timing

```
✅ BEFORE contracts deployed:
   - You have the contract source code
   - You compile it to get the ABI
   - You put the ABI in abis/ERC20.json

✅ AFTER contracts deployed:
   - You update subgraph.yaml with the deployed address
   - You run `graph codegen` (generates helper classes)
   - You write handlers (use the helper classes)
   - You deploy subgraph (points at the deployed address)
```

## Real-World Example

Imagine you're building a restaurant app:

1. **ABI** = The menu (describes what dishes exist, what ingredients they need)
2. **`graph codegen`** = Creates a "how to order" guide (knows how to ask for each dish)
3. **`subgraph.yaml`** = The restaurant address (tells you WHERE to go)
4. **Handler** = Your waiter (uses the guide to place orders at the restaurant)

## So Your Understanding Was...

**Partially correct!** 

- ✅ You DO run it after contracts are deployed (or at least after you have the ABIs)
- ❌ But it doesn't "point" at contracts - that's what `subgraph.yaml` does
- ✅ It DOES generate code so the subgraph can "operate properly" with those contracts

## The Correct Understanding

**`graph codegen`** = "Generate helper code from contract interfaces"

**`subgraph.yaml`** = "Point at specific deployed contracts"

**Together** = Subgraph can talk to your deployed contracts!



## The Simple Answer

**`graph codegen` does NOT point your subgraph at deployed contracts.**

Instead, it **generates helper code** that lets you *talk to* contracts (any contracts with the same interface).

Think of it like this:

## The Analogy: Phone Book vs. Phone Number

### What `graph codegen` Does (Phone Book)
- Creates a **phone book** (TypeScript classes) that tells you:
  - "Here's how to call `balanceOf()`"
  - "Here's how to call `transfer()`"
  - "Here's what each function returns"

### What `subgraph.yaml` Does (Phone Number)
- Provides the **actual phone number** (contract address):
  ```yaml
  address: "0x0165878A594ca255338adfa4d48449f69242Eb8F"
  ```

## The Real Flow

```
Step 1: You have contract ABIs (the "interface description")
   ↓
   These are JSON files that describe:
   - What functions exist
   - What parameters they take
   - What they return
   
Step 2: Run `graph codegen`
   ↓
   Generates TypeScript classes from ABIs
   - Creates ERC20.ts (knows how to call balanceOf, transfer, etc.)
   - Creates StabilityPool.ts (knows how to call assetBalanceOf, etc.)
   - These are like "instruction manuals" for talking to contracts
   
Step 3: Write your handlers
   ↓
   Use the generated classes:
   - "Hey ERC20 class, call balanceOf() on this address"
   - The class knows HOW to do it (from the ABI)
   
Step 4: Deploy subgraph
   ↓
   subgraph.yaml tells it WHERE to look:
   - "Watch this address: 0x0165..."
   - "Start from block 55"
```

## What Points at Deployed Contracts?

**`subgraph.yaml`** points at deployed contracts:

```yaml
source:
  address: "0x0165878A594ca255338adfa4d48449f69242Eb8F"  ← THIS is the deployed contract
  abi: ERC20
  startBlock: 55  ← Start watching from this block
```

**`graph codegen`** just generates the code that knows HOW to talk to contracts with that ABI.

## The Timing

```
✅ BEFORE contracts deployed:
   - You have the contract source code
   - You compile it to get the ABI
   - You put the ABI in abis/ERC20.json

✅ AFTER contracts deployed:
   - You update subgraph.yaml with the deployed address
   - You run `graph codegen` (generates helper classes)
   - You write handlers (use the helper classes)
   - You deploy subgraph (points at the deployed address)
```

## Real-World Example

Imagine you're building a restaurant app:

1. **ABI** = The menu (describes what dishes exist, what ingredients they need)
2. **`graph codegen`** = Creates a "how to order" guide (knows how to ask for each dish)
3. **`subgraph.yaml`** = The restaurant address (tells you WHERE to go)
4. **Handler** = Your waiter (uses the guide to place orders at the restaurant)

## So Your Understanding Was...

**Partially correct!** 

- ✅ You DO run it after contracts are deployed (or at least after you have the ABIs)
- ❌ But it doesn't "point" at contracts - that's what `subgraph.yaml` does
- ✅ It DOES generate code so the subgraph can "operate properly" with those contracts

## The Correct Understanding

**`graph codegen`** = "Generate helper code from contract interfaces"

**`subgraph.yaml`** = "Point at specific deployed contracts"

**Together** = Subgraph can talk to your deployed contracts!













