# Config File System for Marks Multipliers

## Overview

The subgraph uses a GitHub-controlled config file (`config/marks-config.json`) to manage multipliers for marks calculation. This allows updating multipliers without redeploying the subgraph.

## Config File Structure

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-01T00:00:00Z",
  "multipliers": {
    "haToken": {
      "default": 1.0,
      "perToken": {
        "0x0165878A594ca255338adfa4d48449f69242Eb8F": 1.5,
        "0x...": 2.0
      }
    },
    "stabilityPoolCollateral": {
      "default": 1.0,
      "perPool": {
        "0xf5059a5D33d5853360D16C683c16e67980206f36": 1.2
      }
    },
    "stabilityPoolSail": {
      "default": 1.0,
      "perPool": {}
    }
  },
  "priceFeeds": {
    "wstETH": {
      "usd": "0xeC827421505972a2AE9C320302d3573B42363C26",
      "decimals": 8
    },
    "stETH": {
      "usd": "0xb007167714e2940013ec3bb551584130b7497e22",
      "eth": "0x6b39b761b1b64c8c095bf0e3bb0c6a74705b4788",
      "decimals": 8
    }
  },
  "markets": [
    {
      "marketId": "wstETH",
      "haToken": "0x0165878A594ca255338adfa4d48449f69242Eb8F",
      "collateralToken": "0x2e8880cAdC08E9B438c6052F5ce3869FBd6cE513",
      "stabilityPoolCollateral": "0xf5059a5D33d5853360D16C683c16e67980206f36",
      "stabilityPoolSail": "0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf"
    }
  ]
}
```

## How It Works

### 1. Config File Location
- **Path**: `config/marks-config.json`
- **Control**: GitHub repository (only people with repo access can update)
- **Update Process**: 
  1. Update config file in GitHub
  2. Commit and push
  3. Subgraph reloads config (implementation depends on approach)

### 2. Implementation Approaches

#### Option A: Build-Time Embedding (Recommended)
- Config file is read at build time
- Embedded into the subgraph WASM
- Changes require rebuilding and redeploying subgraph
- **Pros**: Simple, no runtime dependencies
- **Cons**: Requires redeployment for changes

#### Option B: Runtime Loading (Advanced)
- Config file stored on IPFS or GitHub
- Subgraph loads config at runtime via HTTP calls
- Changes take effect without redeployment
- **Pros**: No redeployment needed
- **Cons**: More complex, requires HTTP support in subgraph

#### Option C: On-Chain Storage (Future)
- Store config in a contract
- Subgraph listens to config update events
- Changes take effect after events are indexed
- **Pros**: Fully decentralized, no GitHub dependency
- **Cons**: Requires contract deployment and gas costs

### 3. Current Implementation

Currently using **Option A** (build-time) with fallback to defaults:

```typescript
// In src/config.ts
export function getHaTokenMultiplier(tokenAddress: Bytes): BigDecimal {
  // TODO: Load from config file at build time
  // For now, returns default
  return DEFAULT_HA_TOKEN_MULTIPLIER;
}
```

## Usage

### Updating Multipliers

1. **Edit `config/marks-config.json`**:
   ```json
   {
     "multipliers": {
       "haToken": {
         "default": 1.0,
         "perToken": {
           "0x...": 2.0  // New multiplier for specific token
         }
       }
     }
   }
   ```

2. **Commit to GitHub** (requires repo access)

3. **Rebuild and redeploy subgraph**:
   ```bash
   graph codegen
   graph build
   graph deploy harbor-marks-local --node http://localhost:8020
   ```

### Adding New Markets

Add to `markets` array in config:

```json
{
  "markets": [
    {
      "marketId": "wstETH",
      "haToken": "0x...",
      "collateralToken": "0x...",
      "stabilityPoolCollateral": "0x...",
      "stabilityPoolSail": "0x..."
    },
    {
      "marketId": "rETH",
      "haToken": "0x...",
      "collateralToken": "0x...",
      "stabilityPoolCollateral": "0x...",
      "stabilityPoolSail": "0x..."
    }
  ]
}
```

## Security Considerations

1. **Access Control**: Only GitHub repo maintainers can update config
2. **Validation**: Config should be validated before deployment
3. **Versioning**: Config file has version field for tracking changes
4. **Audit Trail**: All changes are tracked in git history

## Future Enhancements

1. **Config Validation**: Add JSON schema validation
2. **Automatic Reload**: Implement runtime config loading
3. **On-Chain Config**: Move to contract-based config for decentralization
4. **Multi-Chain Support**: Different configs per chain



## Overview

The subgraph uses a GitHub-controlled config file (`config/marks-config.json`) to manage multipliers for marks calculation. This allows updating multipliers without redeploying the subgraph.

## Config File Structure

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-01T00:00:00Z",
  "multipliers": {
    "haToken": {
      "default": 1.0,
      "perToken": {
        "0x0165878A594ca255338adfa4d48449f69242Eb8F": 1.5,
        "0x...": 2.0
      }
    },
    "stabilityPoolCollateral": {
      "default": 1.0,
      "perPool": {
        "0xf5059a5D33d5853360D16C683c16e67980206f36": 1.2
      }
    },
    "stabilityPoolSail": {
      "default": 1.0,
      "perPool": {}
    }
  },
  "priceFeeds": {
    "wstETH": {
      "usd": "0xeC827421505972a2AE9C320302d3573B42363C26",
      "decimals": 8
    },
    "stETH": {
      "usd": "0xb007167714e2940013ec3bb551584130b7497e22",
      "eth": "0x6b39b761b1b64c8c095bf0e3bb0c6a74705b4788",
      "decimals": 8
    }
  },
  "markets": [
    {
      "marketId": "wstETH",
      "haToken": "0x0165878A594ca255338adfa4d48449f69242Eb8F",
      "collateralToken": "0x2e8880cAdC08E9B438c6052F5ce3869FBd6cE513",
      "stabilityPoolCollateral": "0xf5059a5D33d5853360D16C683c16e67980206f36",
      "stabilityPoolSail": "0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf"
    }
  ]
}
```

## How It Works

### 1. Config File Location
- **Path**: `config/marks-config.json`
- **Control**: GitHub repository (only people with repo access can update)
- **Update Process**: 
  1. Update config file in GitHub
  2. Commit and push
  3. Subgraph reloads config (implementation depends on approach)

### 2. Implementation Approaches

#### Option A: Build-Time Embedding (Recommended)
- Config file is read at build time
- Embedded into the subgraph WASM
- Changes require rebuilding and redeploying subgraph
- **Pros**: Simple, no runtime dependencies
- **Cons**: Requires redeployment for changes

#### Option B: Runtime Loading (Advanced)
- Config file stored on IPFS or GitHub
- Subgraph loads config at runtime via HTTP calls
- Changes take effect without redeployment
- **Pros**: No redeployment needed
- **Cons**: More complex, requires HTTP support in subgraph

#### Option C: On-Chain Storage (Future)
- Store config in a contract
- Subgraph listens to config update events
- Changes take effect after events are indexed
- **Pros**: Fully decentralized, no GitHub dependency
- **Cons**: Requires contract deployment and gas costs

### 3. Current Implementation

Currently using **Option A** (build-time) with fallback to defaults:

```typescript
// In src/config.ts
export function getHaTokenMultiplier(tokenAddress: Bytes): BigDecimal {
  // TODO: Load from config file at build time
  // For now, returns default
  return DEFAULT_HA_TOKEN_MULTIPLIER;
}
```

## Usage

### Updating Multipliers

1. **Edit `config/marks-config.json`**:
   ```json
   {
     "multipliers": {
       "haToken": {
         "default": 1.0,
         "perToken": {
           "0x...": 2.0  // New multiplier for specific token
         }
       }
     }
   }
   ```

2. **Commit to GitHub** (requires repo access)

3. **Rebuild and redeploy subgraph**:
   ```bash
   graph codegen
   graph build
   graph deploy harbor-marks-local --node http://localhost:8020
   ```

### Adding New Markets

Add to `markets` array in config:

```json
{
  "markets": [
    {
      "marketId": "wstETH",
      "haToken": "0x...",
      "collateralToken": "0x...",
      "stabilityPoolCollateral": "0x...",
      "stabilityPoolSail": "0x..."
    },
    {
      "marketId": "rETH",
      "haToken": "0x...",
      "collateralToken": "0x...",
      "stabilityPoolCollateral": "0x...",
      "stabilityPoolSail": "0x..."
    }
  ]
}
```

## Security Considerations

1. **Access Control**: Only GitHub repo maintainers can update config
2. **Validation**: Config should be validated before deployment
3. **Versioning**: Config file has version field for tracking changes
4. **Audit Trail**: All changes are tracked in git history

## Future Enhancements

1. **Config Validation**: Add JSON schema validation
2. **Automatic Reload**: Implement runtime config loading
3. **On-Chain Config**: Move to contract-based config for decentralization
4. **Multi-Chain Support**: Different configs per chain

