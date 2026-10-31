#!/usr/bin/env bash
# =============================================================================
# 03_check_balances.sh
# In ra balances: ECO Token của buyer, ImpactBadge tokenId, Treasury ETH balance.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/../.."
DEPLOY_FILE="$ROOT_DIR/deployments/local.json"

if [[ ! -f "$DEPLOY_FILE" ]]; then
  echo "❌ Không tìm thấy $DEPLOY_FILE."
  exit 1
fi

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

ECO_TOKEN=$(grep -o '"EcoToken": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)
IMPACT_BADGE=$(grep -o '"ImpactBadge": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)
TREASURY=$(grep -o '"CommunityTreasury": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)
PAYMENT_SPLITTER=$(grep -o '"PaymentSplitter": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)

BUYER_ADDR="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

echo "=========================================================="
echo "  [Task 2.2] 03_check_balances.sh"
echo "=========================================================="
echo "  Buyer:       $BUYER_ADDR"
echo "  EcoToken:    $ECO_TOKEN"
echo "  ImpactBadge: $IMPACT_BADGE"
echo "  Treasury:    $TREASURY"
echo "----------------------------------------------------------"

# 1. ECO Token của Buyer
ECO_BAL=$(cast call --rpc-url "$RPC_URL" "$ECO_TOKEN" "balanceOf(address)(uint256)" "$BUYER_ADDR")
echo "🌿 EcoToken Balance (Buyer):"
echo "   Wei:       $ECO_BAL"
echo "   Formatted: $(cast --from-wei "$ECO_BAL") ECO"
echo "----------------------------------------------------------"

# 2. ImpactBadge của Buyer
BADGE_BAL=$(cast call --rpc-url "$RPC_URL" "$IMPACT_BADGE" "balanceOf(address)(uint256)" "$BUYER_ADDR")
TOTAL_BADGES=$(cast call --rpc-url "$RPC_URL" "$IMPACT_BADGE" "totalMinted()(uint256)")
echo "🏅 ImpactBadge:"
echo "   Buyer NFT Count: $BADGE_BAL"
echo "   Total Minted:    $TOTAL_BADGES"

if [[ "$BADGE_BAL" -gt 0 ]]; then
  BADGE_DATA=$(cast call --rpc-url "$RPC_URL" "$IMPACT_BADGE" "getBadge(uint256)((uint8,uint256,address))" 1 2>/dev/null || echo "N/A")
  BADGE_URI=$(cast call --rpc-url "$RPC_URL" "$IMPACT_BADGE" "tokenURI(uint256)(string)" 1 2>/dev/null || echo "N/A")
  echo "   Badge #1 Data:   $BADGE_DATA"
  echo "   Badge #1 URI:    $BADGE_URI"
fi
echo "----------------------------------------------------------"

# 3. Treasury ETH Balance
TREASURY_BAL=$(cast balance --rpc-url "$RPC_URL" "$TREASURY")
echo "🏛️ Community Treasury:"
echo "   Wei:       $TREASURY_BAL"
echo "   Formatted: $(cast --from-wei "$TREASURY_BAL") ETH"
echo "----------------------------------------------------------"

# 4. PaymentSplitter Platform Fees
PLATFORM_FEES=$(cast call --rpc-url "$RPC_URL" "$PAYMENT_SPLITTER" "pendingPlatformFees()(uint256)" | awk '{print $1}')
echo "💼 PaymentSplitter Platform Fees (Pending Withdrawal):"
echo "   Wei:       $PLATFORM_FEES"
echo "   Formatted: $(cast --from-wei "$PLATFORM_FEES") ETH"
echo "=========================================================="
echo "✅ Check balances hoan tat thanh cong!"
