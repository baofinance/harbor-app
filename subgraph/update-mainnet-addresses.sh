#!/bin/bash
# Update mainnet subgraph configuration with new contract addresses
#
# Usage:
#   ./update-mainnet-addresses.sh <genesis> <pegged> <leveraged> <sp-collateral> <sp-leveraged> <start-block>
#
# Example:
#   ./update-mainnet-addresses.sh \
#     0x1454707877cdb966e29cea8a190c2169eeca4b8c \
#     0x6ff0fe773d4ad4ea923ba9ea9cc1c1b42b70f5fc \
#     0x469ddfcfa98d0661b7efedc82aceeab84133f7fe \
#     0xac8113ef28c8ef06064e8d78b69890d670273c73 \
#     0x6738c3ee945218fb80700e2f4c1a5f3022a28c8d \
#     23993255

set -e

if [ "$#" -lt 6 ]; then
    echo "Usage: $0 <genesis> <pegged> <leveraged> <sp-collateral> <sp-leveraged> <start-block>"
    echo ""
    echo "Current addresses in subgraph.mainnet.yaml:"
    grep -E "address:|startBlock:" subgraph.mainnet.yaml | head -20
    exit 1
fi

GENESIS="$1"
PEGGED="$2"
LEVERAGED="$3"
SP_COLLATERAL="$4"
SP_LEVERAGED="$5"
START_BLOCK="$6"

echo "Updating mainnet addresses..."
echo ""
echo "Genesis:                   $GENESIS"
echo "Pegged Token:              $PEGGED"
echo "Leveraged Token:           $LEVERAGED"
echo "Stability Pool Collateral: $SP_COLLATERAL"
echo "Stability Pool Leveraged:  $SP_LEVERAGED"
echo "Start Block:               $START_BLOCK"
echo ""

# Backup current config
cp subgraph.mainnet.yaml subgraph.mainnet.yaml.backup

# Create updated config using sed
# Note: Using temp file for compatibility with both macOS and Linux
sed_inplace() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "$@"
    else
        sed -i "$@"
    fi
}

# Update Genesis address (first occurrence after "name: Genesis")
awk -v addr="$GENESIS" -v block="$START_BLOCK" '
    /name: Genesis$/ { in_genesis=1 }
    in_genesis && /address:/ && !genesis_addr_done { 
        sub(/address: "[^"]*"/, "address: \"" addr "\""); genesis_addr_done=1 
    }
    in_genesis && /startBlock:/ && !genesis_block_done { 
        sub(/startBlock: [0-9]+/, "startBlock: " block); genesis_block_done=1; in_genesis=0 
    }
    { print }
' subgraph.mainnet.yaml > subgraph.mainnet.yaml.tmp && mv subgraph.mainnet.yaml.tmp subgraph.mainnet.yaml

# Update HaToken (Pegged) address
awk -v addr="$PEGGED" -v block="$START_BLOCK" '
    /name: HaToken_haPB$/ { in_ha=1 }
    in_ha && /address:/ && !ha_addr_done { 
        sub(/address: "[^"]*"/, "address: \"" addr "\""); ha_addr_done=1 
    }
    in_ha && /startBlock:/ && !ha_block_done { 
        sub(/startBlock: [0-9]+/, "startBlock: " block); ha_block_done=1; in_ha=0 
    }
    { print }
' subgraph.mainnet.yaml > subgraph.mainnet.yaml.tmp && mv subgraph.mainnet.yaml.tmp subgraph.mainnet.yaml

# Update Stability Pool Collateral address
awk -v addr="$SP_COLLATERAL" -v block="$START_BLOCK" '
    /name: StabilityPoolCollateral$/ { in_spc=1 }
    in_spc && /address:/ && !spc_addr_done { 
        sub(/address: "[^"]*"/, "address: \"" addr "\""); spc_addr_done=1 
    }
    in_spc && /startBlock:/ && !spc_block_done { 
        sub(/startBlock: [0-9]+/, "startBlock: " block); spc_block_done=1; in_spc=0 
    }
    { print }
' subgraph.mainnet.yaml > subgraph.mainnet.yaml.tmp && mv subgraph.mainnet.yaml.tmp subgraph.mainnet.yaml

# Update Stability Pool Leveraged address
awk -v addr="$SP_LEVERAGED" -v block="$START_BLOCK" '
    /name: StabilityPoolLeveraged$/ { in_spl=1 }
    in_spl && /address:/ && !spl_addr_done { 
        sub(/address: "[^"]*"/, "address: \"" addr "\""); spl_addr_done=1 
    }
    in_spl && /startBlock:/ && !spl_block_done { 
        sub(/startBlock: [0-9]+/, "startBlock: " block); spl_block_done=1; in_spl=0 
    }
    { print }
' subgraph.mainnet.yaml > subgraph.mainnet.yaml.tmp && mv subgraph.mainnet.yaml.tmp subgraph.mainnet.yaml

echo "✅ Updated subgraph.mainnet.yaml"
echo ""
echo "Verify changes:"
grep -E "address:|startBlock:" subgraph.mainnet.yaml | head -20
echo ""
echo "To deploy, run:"
echo "  npm run deploy:mainnet"


