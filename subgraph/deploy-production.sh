#!/bin/bash
# Deploy Harbor Marks Subgraph to Production (The Graph Studio)
#
# Prerequisites:
#   1. Graph CLI installed: npm install -g @graphprotocol/graph-cli
#   2. Authenticated with The Graph Studio: graph auth --studio <deploy-key>
#   3. Subgraph created in The Graph Studio dashboard as "harbor-marks"
#
# Usage:
#   ./deploy-production.sh [version-label]
#
# Examples:
#   ./deploy-production.sh              # Prompts for version
#   ./deploy-production.sh v0.0.21      # Deploy with specific version

set -e

# Configuration
SUBGRAPH_NAME="harbor-marks"  # Production subgraph name
VERSION_LABEL="${1}"

echo "=============================================="
echo "Harbor Marks Subgraph - Production Deployment"
echo "=============================================="
echo ""
echo "Subgraph: $SUBGRAPH_NAME"
if [ -z "$VERSION_LABEL" ]; then
    echo "⚠️  No version label provided. You'll be prompted during deployment."
    echo ""
    read -p "Enter version label (e.g., v0.0.21): " VERSION_LABEL
fi
echo "Version:  $VERSION_LABEL"
echo "Network:  mainnet"
echo "Config:   subgraph.production.yaml (production v1 contracts)"
echo ""

# Check if we're in the right directory
if [ ! -f "subgraph.production.yaml" ]; then
    echo "❌ Error: subgraph.production.yaml not found"
    echo "   Please run this script from the subgraph directory"
    exit 1
fi

# Step 1: Copy production config to subgraph.yaml
echo "1. Setting up production configuration..."
cp subgraph.production.yaml subgraph.yaml
echo "   ✅ Copied subgraph.production.yaml to subgraph.yaml"

# Step 2: Generate code
echo ""
echo "2. Generating TypeScript types..."
graph codegen
echo "   ✅ Code generation complete"

# Step 3: Build
echo ""
echo "3. Building subgraph..."
graph build
echo "   ✅ Build complete"

# Step 4: Deploy to The Graph Studio
echo ""
echo "4. Deploying to The Graph Studio..."
echo "   (Make sure you've run: graph auth --studio <deploy-key>)"
echo ""

if [ -z "$VERSION_LABEL" ]; then
    graph deploy --studio $SUBGRAPH_NAME
else
    graph deploy --studio $SUBGRAPH_NAME --version-label $VERSION_LABEL
fi

echo ""
echo "=============================================="
echo "✅ Deployment Complete!"
echo "=============================================="
echo ""
echo "Your subgraph is now deploying. Check status at:"
echo "  https://thegraph.com/studio/subgraph/$SUBGRAPH_NAME/"
echo ""
echo "Production contracts being indexed:"
echo "  ETH/fxUSD Genesis:  0xC9df4f62474Cf6cdE6c064DB29416a9F4f27EBdC (block 24049488)"
echo "  BTC/fxUSD Genesis:  0x42cc9a19b358a2A918f891D8a6199d8b05F0BC1C (block 24049375)"
echo "  BTC/stETH Genesis:  0xc64Fc46eED431e92C1b5e24DC296b5985CE6Cc00 (block 24049273)"
echo ""

