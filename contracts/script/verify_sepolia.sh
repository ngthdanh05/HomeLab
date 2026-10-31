#!/usr/bin/env bash
# =============================================================================
# verify_sepolia.sh
# Verify all deployed contracts on Sepolia Etherscan
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
DEPLOY_FILE="$ROOT_DIR/deployments/sepolia.json"

if [[ ! -f "$DEPLOY_FILE" ]]; then
  echo "❌ Không tìm thấy $DEPLOY_FILE. Hãy deploy lên Sepolia trước."
  exit 1
fi

if [[ -z "${ETHERSCAN_API_KEY:-}" ]]; then
  echo "❌ Thiếu ETHERSCAN_API_KEY trong môi trường hoặc .env."
  exit 1
fi

echo "=========================================================="
echo "  Verifying contracts on Sepolia Etherscan"
echo "=========================================================="

ECO_TOKEN=$(grep -o '"EcoToken": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)
IMPACT_BADGE=$(grep -o '"ImpactBadge": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)
TREASURY=$(grep -o '"CommunityTreasury": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)
GOVERNANCE=$(grep -o '"Governance": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)
PAYMENT_SPLITTER=$(grep -o '"PaymentSplitter": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)
MARKETPLACE=$(grep -o '"Marketplace": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)

echo "1. Verifying EcoToken at $ECO_TOKEN..."
forge verify-contract --chain-id 11155111 "$ECO_TOKEN" src/EcoToken.sol:EcoToken --etherscan-api-key "$ETHERSCAN_API_KEY" || true

echo "2. Verifying ImpactBadge at $IMPACT_BADGE..."
forge verify-contract --chain-id 11155111 "$IMPACT_BADGE" src/ImpactBadge.sol:ImpactBadge --etherscan-api-key "$ETHERSCAN_API_KEY" || true

echo "3. Verifying CommunityTreasury at $TREASURY..."
forge verify-contract --chain-id 11155111 "$TREASURY" src/CommunityTreasury.sol:CommunityTreasury --etherscan-api-key "$ETHERSCAN_API_KEY" || true

echo "4. Verifying Governance at $GOVERNANCE..."
forge verify-contract --chain-id 11155111 "$GOVERNANCE" src/Governance.sol:Governance --etherscan-api-key "$ETHERSCAN_API_KEY" || true

echo "5. Verifying PaymentSplitter at $PAYMENT_SPLITTER..."
forge verify-contract --chain-id 11155111 "$PAYMENT_SPLITTER" src/PaymentSplitter.sol:PaymentSplitter --etherscan-api-key "$ETHERSCAN_API_KEY" || true

echo "6. Verifying Marketplace at $MARKETPLACE..."
forge verify-contract --chain-id 11155111 "$MARKETPLACE" src/Marketplace.sol:Marketplace --etherscan-api-key "$ETHERSCAN_API_KEY" || true

echo "=========================================================="
echo "✅ Verification script executed!"
