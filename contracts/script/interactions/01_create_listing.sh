#!/usr/bin/env bash
# =============================================================================
# 01_create_listing.sh
# Nghệ nhân (Anvil account #1) tạo listing tour trải nghiệm sinh thái 0.1 ETH
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

# Parse Marketplace address from deployments/local.json
MARKETPLACE=$(grep -o '"Marketplace": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)

# Anvil Account #1 (Artisan)
ARTISAN_ADDR="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
ARTISAN_PK="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"

PRICE="100000000000000000" # 0.1 ETH (in wei)
PRODUCT_TYPE=2             # Experience (ProductType enum: 0=Handicraft, 1=Food, 2=Experience)
METADATA_URI="ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/tour.json"

echo "=========================================================="
echo "  [Task 2.2] 01_create_listing.sh"
echo "=========================================================="
echo "  RPC URL:      $RPC_URL"
echo "  Marketplace:  $MARKETPLACE"
echo "  Artisan:      $ARTISAN_ADDR"
echo "  Price:        0.1 ETH ($PRICE wei)"
echo "  ProductType:  Experience ($PRODUCT_TYPE)"
echo "  Metadata URI: $METADATA_URI"
echo "----------------------------------------------------------"

echo ">> Dang gui transaction createListing..."
TX_RECEIPT=$(cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$ARTISAN_PK" \
  "$MARKETPLACE" \
  "createListing(uint256,uint8,string)" \
  "$PRICE" "$PRODUCT_TYPE" "$METADATA_URI" \
  --json)

TX_HASH=$(echo "$TX_RECEIPT" | grep -o '"transactionHash": *"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ createListing thanh cong! TxHash: $TX_HASH"

# Doc lai listing #1 tu Marketplace contract
echo ">> Kiem tra thong tin Listing #1..."
LISTING=$(cast call --rpc-url "$RPC_URL" "$MARKETPLACE" "getListing(uint256)" 1)
echo "📋 Listing #1 Data: $LISTING"
echo "✅ Hoan tat tao Listing #1!"
