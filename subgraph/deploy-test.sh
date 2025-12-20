#!/bin/bash
# Deploy Harbor Marks Subgraph to Test/Dev (The Graph Studio)
#
# Prerequisites:
#   1. Graph CLI installed: npm install -g @graphprotocol/graph-cli
#   2. Authenticated with The Graph Studio: graph auth --studio <deploy-key>
#   3. Subgraph created in The Graph Studio dashboard as "harbor-marks-test"
#
# Usage:
#   ./deploy-test.sh [version-label]
#
# Examples:
#   ./deploy-test.sh              # Prompts for version
#   ./deploy-test.sh v0.0.21      # Deploy with specific version

set -e

# Configuration
SUBGRAPH_NAME="harbor-marks-test"  # Test subgraph name
VERSION_LABEL="${1}"

echo "=============================================="
echo "Harbor Marks Subgraph - Test/Dev Deployment"
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
echo "Config:   subgraph.test.yaml (test2 contracts)"
echo ""

# Check if we're in the right directory
if [ ! -f "subgraph.test.yaml" ]; then
    echo "❌ Error: subgraph.test.yaml not found"
    echo "   Please run this script from the subgraph directory"
    exit 1
fi

# Step 1: Copy test config to subgraph.yaml
echo "1. Setting up test configuration..."
cp subgraph.test.yaml subgraph.yaml
echo "   ✅ Copied subgraph.test.yaml to subgraph.yaml"

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
echo "Test contracts being indexed:"
echo "  ETH/fxUSD Genesis:  0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073 (block 24025347)"
echo "  BTC/fxUSD Genesis:  0x288c61c3b3684ff21adf38d878c81457b19bd2fe (block 24025557)"
echo "  BTC/stETH Genesis:  0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0 (block 24025785)"
echo ""

