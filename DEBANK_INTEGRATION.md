# DeBank Integration - Contract Addresses

This document provides all contract addresses needed for DeBank to properly track Harbor Protocol user positions and assets.

## Contract Types Overview

1. **Pegged Tokens (ha tokens)** - ERC20 tokens, query `balanceOf(userAddress)`
2. **Leveraged Tokens (hs tokens)** - ERC20 tokens, query `balanceOf(userAddress)`
3. **Collateral Stability Pools** - StabilityPool contracts, query `assetBalanceOf(userAddress)`. **Both pool types accept ha tokens as deposits**; collateral pools convert to collateral tokens on rebalance.
4. **Leveraged Stability Pools** - StabilityPool contracts, query `assetBalanceOf(userAddress)`. **Both pool types accept ha tokens as deposits**; leveraged pools convert to leveraged tokens (hs tokens) on rebalance.
5. **Genesis Contracts** - Query `shares(userAddress)` (before end) or `claimable(userAddress)` (after end)
6. **Reward Tracking** - Rewards are handled directly by stability pool contracts via `claimable(userAddress, rewardToken)` and `activeRewardTokens()`

---

## Production Contracts (Mainnet)

### 1. Pegged Tokens (ha tokens) - ERC20

Track `balanceOf(userAddress)` for these contracts:

| Token               | Symbol | Address                                      | Market               |
| ------------------- | ------ | -------------------------------------------- | -------------------- |
| Harbor Anchored ETH | haETH  | `0x7A53EBc85453DD006824084c4f4bE758FcF8a5B5` | ETH/fxUSD            |
| Harbor Anchored BTC | haBTC  | `0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7` | BTC/fxUSD, BTC/stETH |

**Price Calculation:**

1. Query `Minter.peggedTokenPrice()` on the minter contract (see Minter addresses below)

   - Returns price in peg target units (ETH/BTC/USD) with 18 decimals
   - For haETH: price is in ETH units
   - For haBTC: price is in BTC units

2. Get USD price of the peg target using Chainlink oracles:

   - For haETH: Query Chainlink ETH/USD oracle (`0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`)
   - For haBTC: Query Chainlink BTC/USD oracle (`0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c`)
   - Use `latestRoundData()` function, extract `answer` field, divide by `10^decimals`

3. Calculate USD price:
   ```
   haTokenPriceUSD = (peggedTokenPrice / 1e18) × pegTargetUSD
   ```

**Example:**

- haETH: `peggedTokenPrice = 1.0 ETH`, `ETH/USD = $3000` → `haETH = $3000`
- haBTC: `peggedTokenPrice = 1.0 BTC`, `BTC/USD = $60000` → `haBTC = $60000`

---

### 2. Leveraged Tokens (hs tokens) - ERC20

Track `balanceOf(userAddress)` for these contracts:

| Token                 | Symbol      | Address                                      | Market    |
| --------------------- | ----------- | -------------------------------------------- | --------- |
| Harbor Sail fxUSD-ETH | hsFXUSD-ETH | `0x0Cd6BB1a0cfD95e2779EDC6D17b664B481f2EB4C` | ETH/fxUSD |
| Harbor Sail fxUSD-BTC | hsFXUSD-BTC | `0x9567c243F647f9Ac37efb7Fc26BD9551Dce0BE1B` | BTC/fxUSD |
| Harbor Sail stETH-BTC | hsSTETH-BTC | `0x817ADaE288eD46B8618AAEffE75ACD26A0a1b0FD` | BTC/stETH |

**Price Calculation:**

1. Query `Minter.leveragedTokenPrice()` on the minter contract (see Minter addresses below)

   - Returns price in peg target units (ETH/BTC/USD) with 18 decimals
   - For hsFXUSD-ETH: price is in ETH units
   - For hsFXUSD-BTC: price is in BTC units
   - For hsSTETH-BTC: price is in BTC units

2. Get USD price of the peg target using Chainlink oracles:

   - For hsFXUSD-ETH: Query Chainlink ETH/USD oracle (`0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`)
   - For hsFXUSD-BTC: Query Chainlink BTC/USD oracle (`0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c`)
   - For hsSTETH-BTC: Query Chainlink BTC/USD oracle (`0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c`)
   - Use `latestRoundData()` function, extract `answer` field, divide by `10^decimals`

3. Calculate USD price:
   ```
   hsTokenPriceUSD = (leveragedTokenPrice / 1e18) × pegTargetUSD
   ```

**Example:**

- hsFXUSD-ETH: `leveragedTokenPrice = 0.5 ETH`, `ETH/USD = $3000` → `hsFXUSD-ETH = $1500`
- hsFXUSD-BTC: `leveragedTokenPrice = 0.02 BTC`, `BTC/USD = $60000` → `hsFXUSD-BTC = $1200`

---

### 3. Collateral Stability Pools

**Important**: Both collateral and leveraged stability pools accept **pegged tokens (ha tokens)** as deposits. The difference is in rebalance behavior:

- **Collateral pools**: Convert deposits to collateral tokens on rebalance
- **Leveraged pools**: Convert deposits to leveraged tokens (hs tokens) on rebalance

Track `assetBalanceOf(userAddress)` for these contracts. Users deposit pegged tokens (haETH, haBTC) here. The `assetBalanceOf` returns the user's deposit amount in ha tokens.

| Pool                      | Address                                      | Market    | Deposit Token (ha token)                             |
| ------------------------- | -------------------------------------------- | --------- | ---------------------------------------------------- |
| ETH/fxUSD Collateral Pool | `0x1F985CF7C10A81DE1940da581208D2855D263D72` | ETH/fxUSD | haETH (`0x7A53EBc85453DD006824084c4f4bE758FcF8a5B5`) |
| BTC/fxUSD Collateral Pool | `0x86561cdB34ebe8B9abAbb0DD7bEA299fA8532a49` | BTC/fxUSD | haBTC (`0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7`) |
| BTC/stETH Collateral Pool | `0x667Ceb303193996697A5938cD6e17255EeAcef51` | BTC/stETH | haBTC (`0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7`) |

**Rebalance Behavior**: On rebalance, deposits are converted to collateral tokens (e.g., fxSAVE, wstETH).

**Reward Tracking:**

- Call `activeRewardTokens()` to get list of reward token addresses
- For each reward token, call `claimable(userAddress, rewardToken)` to get unclaimed rewards
- Common reward tokens: fxSAVE (`0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39`), wstETH (`0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0`)

---

### 4. Leveraged Stability Pools

**Important**: Both collateral and leveraged stability pools accept **pegged tokens (ha tokens)** as deposits. The difference is in rebalance behavior:

- **Collateral pools**: Convert deposits to collateral tokens on rebalance
- **Leveraged pools**: Convert deposits to leveraged tokens (hs tokens) on rebalance

Track `assetBalanceOf(userAddress)` for these contracts. Users deposit pegged tokens (haETH, haBTC) here. The `assetBalanceOf` returns the user's deposit amount in ha tokens.

| Pool                     | Address                                      | Market    | Deposit Token (ha token)                             |
| ------------------------ | -------------------------------------------- | --------- | ---------------------------------------------------- |
| ETH/fxUSD Leveraged Pool | `0x438B29EC7a1770dDbA37D792F1A6e76231Ef8E06` | ETH/fxUSD | haETH (`0x7A53EBc85453DD006824084c4f4bE758FcF8a5B5`) |
| BTC/fxUSD Leveraged Pool | `0x9e56F1E1E80EBf165A1dAa99F9787B41cD5bFE40` | BTC/fxUSD | haBTC (`0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7`) |
| BTC/stETH Leveraged Pool | `0xCB4F3e21DE158bf858Aa03E63e4cEc7342177013` | BTC/stETH | haBTC (`0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7`) |

**Rebalance Behavior**: On rebalance, deposits are converted to leveraged tokens (hs tokens).

**Reward Tracking:**

- Call `activeRewardTokens()` to get list of reward token addresses
- For each reward token, call `claimable(userAddress, rewardToken)` to get unclaimed rewards
- Common reward tokens: fxSAVE (`0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39`), wstETH (`0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0`)

---

### 5. Genesis Contracts

Track bootstrap deposits. Query `shares(userAddress)` before genesis ends, or `claimable(userAddress)` after genesis ends (returns `[peggedAmount, leveragedAmount]`).

| Contract          | Address                                      | Market    |
| ----------------- | -------------------------------------------- | --------- |
| ETH/fxUSD Genesis | `0xC9df4f62474Cf6cdE6c064DB29416a9F4f27EBdC` | ETH/fxUSD |
| BTC/fxUSD Genesis | `0x42cc9a19b358a2A918f891D8a6199d8b05F0BC1C` | BTC/fxUSD |
| BTC/stETH Genesis | `0xc64Fc46eED431e92C1b5e24DC296b5985CE6Cc00` | BTC/stETH |

**Query Logic:**

- Before genesis ends: `shares(userAddress)` returns user's share amount
- After genesis ends: `claimable(userAddress)` returns `[peggedAmount, leveragedAmount]` tuple
- Check `genesisIsEnded()` to determine which function to use

---

### 6. Minter Contracts (for hs token pricing)

These contracts are needed to query leveraged token prices via `leveragedTokenPrice()`.

| Minter           | Address                                      | Market    | Leveraged Token |
| ---------------- | -------------------------------------------- | --------- | --------------- |
| ETH/fxUSD Minter | `0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F` | ETH/fxUSD | hsFXUSD-ETH     |
| BTC/fxUSD Minter | `0x33e32ff4d0677862fa31582CC654a25b9b1e4888` | BTC/fxUSD | hsFXUSD-BTC     |
| BTC/stETH Minter | `0xF42516EB885E737780EB864dd07cEc8628000919` | BTC/stETH | hsSTETH-BTC     |

---

## Summary: All Contract Addresses (Flat List)

### ERC20 Tokens (balanceOf)

```
0x7A53EBc85453DD006824084c4f4bE758FcF8a5B5  # haETH
0x25bA4A826E1A1346dcA2Ab530831dbFF9C08bEA7  # haBTC
0x0Cd6BB1a0cfD95e2779EDC6D17b664B481f2EB4C  # hsFXUSD-ETH
0x9567c243F647f9Ac37efb7Fc26BD9551Dce0BE1B  # hsFXUSD-BTC
0x817ADaE288eD46B8618AAEffE75ACD26A0a1b0FD  # hsSTETH-BTC
```

### Stability Pools (assetBalanceOf)

```
0x1F985CF7C10A81DE1940da581208D2855D263D72  # ETH/fxUSD Collateral Pool
0x86561cdB34ebe8B9abAbb0DD7bEA299fA8532a49  # BTC/fxUSD Collateral Pool
0x667Ceb303193996697A5938cD6e17255EeAcef51  # BTC/stETH Collateral Pool
0x438B29EC7a1770dDbA37D792F1A6e76231Ef8E06  # ETH/fxUSD Leveraged Pool
0x9e56F1E1E80EBf165A1dAa99F9787B41cD5bFE40  # BTC/fxUSD Leveraged Pool
0xCB4F3e21DE158bf858Aa03E63e4cEc7342177013  # BTC/stETH Leveraged Pool
```

### Genesis Contracts (shares/claimable)

```
0xC9df4f62474Cf6cdE6c064DB29416a9F4f27EBdC  # ETH/fxUSD Genesis
0x42cc9a19b358a2A918f891D8a6199d8b05F0BC1C  # BTC/fxUSD Genesis
0xc64Fc46eED431e92C1b5e24DC296b5985CE6Cc00  # BTC/stETH Genesis
```

### Minter Contracts (for pricing)

```
0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F  # ETH/fxUSD Minter
0x33e32ff4d0677862fa31582CC654a25b9b1e4888  # BTC/fxUSD Minter
0xF42516EB885E737780EB864dd07cEc8628000919  # BTC/stETH Minter
```

---

## Important Notes

1. **Reward Distributors**: There are no separate reward distributor contracts. Rewards are handled directly by stability pool contracts using:

   - `activeRewardTokens()` - Returns array of reward token addresses
   - `claimable(userAddress, rewardToken)` - Returns claimable amount for a specific reward token

2. **Price Oracles**:

   **Chainlink Oracle Addresses (Ethereum Mainnet):**

   - ETH/USD: `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`
   - BTC/USD: `0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c`

   **Pricing Method:**

   - **ha tokens**: Query `Minter.peggedTokenPrice()` → multiply by Chainlink peg target price
   - **hs tokens**: Query `Minter.leveragedTokenPrice()` → multiply by Chainlink peg target price
   - Both functions return prices with 18 decimals in peg target units (ETH/BTC/USD)
   - Chainlink `latestRoundData()` returns `(roundId, answer, startedAt, updatedAt, answeredInRound)`
   - Extract `answer` and divide by `10^decimals` to get USD price

3. **Genesis Status**: Check `genesisIsEnded()` on each Genesis contract to determine whether to query `shares()` or `claimable()`

4. **Chain**: All contracts are on Ethereum Mainnet (Chain ID: 1)

5. **Coming Soon Markets**: The following markets are configured but not yet deployed:

   - fxUSD-GOLD
   - stETH-GOLD
   - stETH-EUR
   - fxUSD-EUR
   - stETH-MCAP
   - fxUSD-MCAP

   Do not include these in the initial integration.

---

## Contract ABIs

DeBank will need the following ABIs:

- Standard ERC20 ABI (for token balances)
- StabilityPool ABI (for `assetBalanceOf`, `claimable`, `activeRewardTokens`)
- Genesis ABI (for `shares`, `claimable`, `genesisIsEnded`)
- Minter ABI (for `peggedTokenPrice`, `leveragedTokenPrice`)
- Chainlink Aggregator ABI (for `latestRoundData`, `decimals`)

These can be found in the Harbor Protocol repository or requested from the team.

---

## Pricing Implementation Details

### Chainlink Oracle ABI

```solidity
function latestRoundData() external view returns (
  uint80 roundId,
  int256 answer,
  uint256 startedAt,
  uint256 updatedAt,
  uint80 answeredInRound
);

function decimals() external view returns (uint8);
```

### Minter ABI Functions

```solidity
// Returns price in peg target units (18 decimals)
function peggedTokenPrice() external view returns (uint256);

// Returns price in peg target units (18 decimals)
function leveragedTokenPrice() external view returns (uint256);
```

### Pricing Algorithm

```javascript
// 1. Get token price from Minter (in peg units)
const peggedPrice = await minterContract.peggedTokenPrice(); // 18 decimals
const leveragedPrice = await minterContract.leveragedTokenPrice(); // 18 decimals

// 2. Get peg target USD price from Chainlink
const chainlinkData = await chainlinkOracle.latestRoundData();
const decimals = await chainlinkOracle.decimals();
const pegTargetUSD = Number(chainlinkData.answer) / 10 ** decimals;

// 3. Calculate USD price
const haTokenPriceUSD = (Number(peggedPrice) / 1e18) * pegTargetUSD;
const hsTokenPriceUSD = (Number(leveragedPrice) / 1e18) * pegTargetUSD;
```

### Market-to-Peg-Target Mapping

| Market    | Peg Target | Chainlink Oracle                             |
| --------- | ---------- | -------------------------------------------- |
| ETH/fxUSD | ETH        | `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` |
| BTC/fxUSD | BTC        | `0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c` |
| BTC/stETH | BTC        | `0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c` |
