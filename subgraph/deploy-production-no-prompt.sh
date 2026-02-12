#!/usr/bin/env bash
# Deploy Harbor Marks subgraph to The Graph Studio with no interactive prompts.
#
# Uses GRAPH_DEPLOY_KEY from:
#   1. Environment (export GRAPH_DEPLOY_KEY=...)
#   2. ../.env.local (sourced if present)
#   3. Or run once: graph auth --studio <your-deploy-key> (then key can be omitted)
#
# Optional: GRAPH_VERSION_LABEL (default: v0.1.2-metals-oracle)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load from parent .env.local if present (do not commit .env.local)
if [ -f "../.env.local" ]; then
  set -a
  # shellcheck source=../.env.local
  source "../.env.local"
  set +a
fi

VERSION_LABEL="${GRAPH_VERSION_LABEL:-v0.1.4-metals-consistent-pricing}"

echo "Deploying harbor-marks with version $VERSION_LABEL (no prompts)..."

cp subgraph.production.yaml subgraph.yaml
graph codegen
graph build

if [ -n "${GRAPH_DEPLOY_KEY}" ]; then
  graph deploy \
    --node https://api.studio.thegraph.com/deploy/ \
    --deploy-key "$GRAPH_DEPLOY_KEY" \
    harbor-marks \
    --version-label "$VERSION_LABEL"
else
  # Use stored auth from: graph auth --studio <deploy-key>
  graph deploy \
    --node https://api.studio.thegraph.com/deploy/ \
    harbor-marks \
    --version-label "$VERSION_LABEL"
fi

echo "Done. Check sync at: https://thegraph.com/studio/subgraph/harbor-marks"
