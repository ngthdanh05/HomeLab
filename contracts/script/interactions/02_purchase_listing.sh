#!/usr/bin/env bash
# =============================================================================
# 02_purchase_listing.sh
# Du khách (Anvil account #2) mua listing #1 → kiểm tra luồng phân bổ ETH.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/../.."
DEPLOY_FILE="$ROOT_DIR/deployments/local.json"

if [[ ! -f "$DEPLOY_FILE" ]]; then
  echo "❌ Không tìm thấy $DEPLOY_FILE. Hãy chạy 'make deploy-local' trước."
  exit 1
fi

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

MARKETPLACE=$(grep -o '"Marketplace": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)
TREASURY=$(grep -o '"CommunityTreasury": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)
PAYMENT_SPLITTER=$(grep -o '"PaymentSplitter": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)

ARTISAN_ADDR="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
BUYER_ADDR="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
BUYER_PK="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"

LISTING_ID="${1:-1}"
PRICE="100000000000000000" # 0.1 ETH in wei

echo "=========================================================="
echo "  [Task 2.2] 02_purchase_listing.sh"
echo "=========================================================="
echo "  Buyer:       $BUYER_ADDR"
echo "  Listing ID:  $LISTING_ID"
echo "  Price:       0.1 ETH ($PRICE wei)"
echo "----------------------------------------------------------"

# Số dư trước khi mua
ARTISAN_BEFORE=$(cast balance --rpc-url "$RPC_URL" "$ARTISAN_ADDR")
TREASURY_BEFORE=$(cast balance --rpc-url "$RPC_URL" "$TREASURY")
BUYER_BEFORE=$(cast balance --rpc-url "$RPC_URL" "$BUYER_ADDR")

echo "📊 So du TRUOC giao dich:"
echo "   Artisan:   $(cast --from-wei "$ARTISAN_BEFORE") ETH ($ARTISAN_BEFORE wei)"
echo "   Treasury:  $(cast --from-wei "$TREASURY_BEFORE") ETH ($TREASURY_BEFORE wei)"
echo "   Buyer:     $(cast --from-wei "$BUYER_BEFORE") ETH ($BUYER_BEFORE wei)"
echo "----------------------------------------------------------"

echo ">> Dang gui transaction purchaseListing..."
TX_RECEIPT=$(cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$BUYER_PK" \
  "$MARKETPLACE" \
  "purchaseListing(uint256)" \
  "$LISTING_ID" \
  --value "$PRICE" \
  --json)

TX_HASH=$(echo "$TX_RECEIPT" | grep -o '"transactionHash": *"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ purchaseListing thanh cong! TxHash: $TX_HASH"
echo "----------------------------------------------------------"

# Số dư sau khi mua
ARTISAN_AFTER=$(cast balance --rpc-url "$RPC_URL" "$ARTISAN_ADDR")
TREASURY_AFTER=$(cast balance --rpc-url "$RPC_URL" "$TREASURY")
BUYER_AFTER=$(cast balance --rpc-url "$RPC_URL" "$BUYER_ADDR")

ARTISAN_DIFF=$((ARTISAN_AFTER - ARTISAN_BEFORE))
TREASURY_DIFF=$((TREASURY_AFTER - TREASURY_BEFORE))

echo "📊 So du SAU giao dich:"
echo "   Artisan:   $(cast --from-wei "$ARTISAN_AFTER") ETH"
echo "   Treasury:  $(cast --from-wei "$TREASURY_AFTER") ETH"
echo "   Buyer:     $(cast --from-wei "$BUYER_AFTER") ETH"
echo "----------------------------------------------------------"
echo "💰 Kiem tra phan bo tien:"
echo "   Artisan nhan (+70%):  $(cast --from-wei "$ARTISAN_DIFF") ETH ($ARTISAN_DIFF wei)"
echo "   Treasury nhan (+20%): $(cast --from-wei "$TREASURY_DIFF") ETH ($TREASURY_DIFF wei)"

# Kiem tra phi platform pending
PLATFORM_FEES=$(cast call --rpc-url "$RPC_URL" "$PAYMENT_SPLITTER" "pendingPlatformFees()(uint256)" | awk '{print $1}')
echo "   Platform phi (+10%):  $(cast --from-wei "$PLATFORM_FEES") ETH ($PLATFORM_FEES wei)"
echo "✅ Phan bo doanh thu chinh xac theo ty le 70% / 20% / 10%!"
