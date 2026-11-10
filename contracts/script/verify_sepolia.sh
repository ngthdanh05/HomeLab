#!/usr/bin/env bash
# =============================================================================
# verify_sepolia.sh
# Verify toàn bộ 8 contract trên Sepolia Etherscan; thoát với mã lỗi nếu có contract thất bại.
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
DEPLOY_FILE="$ROOT_DIR/deployments/sepolia.json"

if [[ ! -f "$DEPLOY_FILE" ]]; then
  echo "❌ Không tìm thấy $DEPLOY_FILE. Hãy deploy lên Sepolia trước."
  exit 1
fi

if [[ -z "${ETHERSCAN_API_KEY:-}" || -z "${SEPOLIA_RPC_URL:-}" ]]; then
  echo "❌ Thiếu ETHERSCAN_API_KEY hoặc SEPOLIA_RPC_URL trong môi trường."
  exit 1
fi

cd "$ROOT_DIR"
failed=()

for name in EcoToken ImpactBadge CommunityTreasury Governance PaymentSplitter Marketplace CarbonOffset QuestRewards; do
  address=$(grep -o "\"$name\": *\"[^\"]*\"" "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)
  if [[ -z "$address" ]]; then
    echo "❌ $name: không có địa chỉ trong $DEPLOY_FILE"
    failed+=("$name")
    continue
  fi
  echo ">> Verifying $name at $address..."
  # Constructor args được forge suy ra từ giao dịch tạo contract qua RPC.
  if ! forge verify-contract --chain-id 11155111 --rpc-url "$SEPOLIA_RPC_URL" --guess-constructor-args \
    --etherscan-api-key "$ETHERSCAN_API_KEY" --watch "$address" "src/$name.sol:$name"; then
    failed+=("$name")
  fi
done

if (( ${#failed[@]} > 0 )); then
  echo "❌ Verify thất bại: ${failed[*]}"
  exit 1
fi
echo "✅ Đã verify đủ 8 contract."
