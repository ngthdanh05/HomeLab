#!/usr/bin/env bash
# =============================================================================
# check_deployment.sh (chỉ đọc, không gửi giao dịch)
# Kiểm tra liên kết, quyền và tham số của bộ contract vừa deploy.
#
# Cách dùng: RPC_URL=<rpc> DEPLOYER=<ví deploy> bash script/check_deployment.sh [deployments/sepolia.json]
# =============================================================================
set -uo pipefail

FILE="${1:-deployments/sepolia.json}"
: "${RPC_URL:?Thiếu RPC_URL}"
: "${DEPLOYER:?Thiếu DEPLOYER}"
[[ -f "$FILE" ]] || { echo "❌ Không tìm thấy $FILE"; exit 1; }

addr() { grep -o "\"$1\": *\"[^\"]*\"" "$FILE" | head -1 | cut -d'"' -f4 | tr 'A-F' 'a-f'; }
read_chain() { cast call --rpc-url "$RPC_URL" "$@" 2>/dev/null | awk '{print $1}' | tr 'A-F' 'a-f'; }

ECO=$(addr EcoToken); BADGE=$(addr ImpactBadge); TREASURY=$(addr CommunityTreasury); GOV=$(addr Governance)
SPLITTER=$(addr PaymentSplitter); MARKET=$(addr Marketplace); CARBON=$(addr CarbonOffset); QUESTS=$(addr QuestRewards)
DEPLOYER=$(echo "$DEPLOYER" | tr 'A-F' 'a-f')
MINTER=$(cast keccak MINTER_ROLE)
failures=0

expect() { # mô tả, giá trị thực, giá trị mong đợi
  if [[ "$2" == "$3" ]]; then echo "✅ $1"; else echo "❌ $1: nhận '$2', cần '$3'"; failures=$((failures + 1)); fi
}
expect_positive() { # mô tả, giá trị thực
  if [[ "$2" =~ ^[1-9][0-9]*$ ]]; then echo "✅ $1 = $2"; else echo "❌ $1: nhận '$2', cần > 0"; failures=$((failures + 1)); fi
}
role() { read_chain "$1" "hasRole(bytes32,address)(bool)" "$MINTER" "$2"; }

expect "Marketplace dùng đúng PaymentSplitter" "$(read_chain "$MARKET" 'paymentSplitter()(address)')" "$SPLITTER"
expect "Marketplace dùng đúng ImpactBadge" "$(read_chain "$MARKET" 'impactBadge()(address)')" "$BADGE"
expect "PaymentSplitter chỉ nhận Marketplace" "$(read_chain "$SPLITTER" 'marketplace()(address)')" "$MARKET"
expect "Treasury chỉ nhận Governance" "$(read_chain "$TREASURY" 'governance()(address)')" "$GOV"

expect "ECO mint: PaymentSplitter" "$(role "$ECO" "$SPLITTER")" true
expect "ECO mint: QuestRewards" "$(role "$ECO" "$QUESTS")" true
expect "ECO mint: Marketplace không có quyền" "$(role "$ECO" "$MARKET")" false
expect "ECO mint: deployer không có quyền" "$(role "$ECO" "$DEPLOYER")" false
expect "Badge mint: Marketplace" "$(role "$BADGE" "$MARKET")" true
expect "Badge mint: CarbonOffset" "$(role "$BADGE" "$CARBON")" true
expect "Badge mint: QuestRewards" "$(role "$BADGE" "$QUESTS")" true
expect "Badge mint: PaymentSplitter không có quyền" "$(role "$BADGE" "$SPLITTER")" false
expect "Badge mint: deployer không có quyền" "$(role "$BADGE" "$DEPLOYER")" false

expect "Chia tiền nghệ nhân 70%" "$(read_chain "$SPLITTER" 'artisanBPS()(uint16)')" 7000
expect "Đủ 6 quest" "$(read_chain "$QUESTS" 'questCount()(uint256)')" 6
expect "Bắt buộc xác thực nghệ nhân" "$(read_chain "$MARKET" 'artisanVerificationRequired()(bool)')" true
expect "Marketplace không bị dừng" "$(read_chain "$MARKET" 'paused()(bool)')" false
expect_positive "Thời hạn escrow" "$(read_chain "$MARKET" 'escrowPeriod()(uint256)')"
expect_positive "Voting delay" "$(read_chain "$GOV" 'votingDelayBlocks()(uint256)')"
expect_positive "Timelock" "$(read_chain "$GOV" 'executionDelay()(uint256)')"
expect "Trần giải ngân 20%" "$(read_chain "$GOV" 'maxDisbursementBps()(uint256)')" 2000

if (( failures > 0 )); then
  echo "❌ Có $failures kiểm tra thất bại."
  exit 1
fi
echo "✅ Bộ contract được cấu hình đúng."
