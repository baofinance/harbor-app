#!/usr/bin/env bash
# Query the Harbor Marks subgraph for a wallet to debug "marks not accumulating".
# Usage:
#   GRAPH_URL="https://api.studio.thegraph.com/query/1718836/harbor-marks/v0.1.1-metals-bonus" ./scripts/query-marks-debug.sh 0xAE7Dbb17bc40D53A6363409c6B1ED88d3cFdc31e
# Or use your staging subgraph URL (same as NEXT_PUBLIC_GRAPH_URL):
#   GRAPH_URL="<your-staging-graph-url>" ./scripts/query-marks-debug.sh 0xAE7Dbb17bc40D53A6363409c6B1ED88d3cFdc31e

WALLET="${1:-0xAE7Dbb17bc40D53A6363409c6B1ED88d3cFdc31e}"
GRAPH_URL="${GRAPH_URL:-https://api.studio.thegraph.com/query/1718836/harbor-marks/v0.1.1-metals-bonus}"
USER_LOWER=$(echo "$WALLET" | tr '[:upper:]' '[:lower:]')

# Metals genesis addresses (lowercase)
FXUSD_GOLD="0x2cbf457112ef5a16cfca10fb173d56a5cc9daa66"
STETH_GOLD="0x8ad6b177137a6c33070c27d98355717849ce526c"
FXUSD_SILVER="0x66d18b9dd5d1cd51957dfea0e0373b54e06118c8"
STETH_SILVER="0x8f655ca32a1fa8032955989c19e91886f26439dc"

echo "Querying subgraph: $GRAPH_URL"
echo "Wallet: $WALLET"
echo ""

for GENESIS in "$FXUSD_GOLD" "$STETH_GOLD" "$FXUSD_SILVER" "$STETH_SILVER"; do
  ID="${GENESIS}-${USER_LOWER}"
  NAME="$GENESIS"
  case "$GENESIS" in
    $FXUSD_GOLD) NAME="fxUSD-GOLD" ;;
    $STETH_GOLD) NAME="stETH-GOLD" ;;
    $FXUSD_SILVER) NAME="fxUSD-SILVER" ;;
    $STETH_SILVER) NAME="stETH-SILVER" ;;
  esac
  echo "--- $NAME (id: $ID) ---"
  curl -s -X POST "$GRAPH_URL" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"query { userHarborMarks(id: \\\"$ID\\\") { currentMarks campaignId currentDepositUSD } }\"}" | jq .
  echo ""
done
