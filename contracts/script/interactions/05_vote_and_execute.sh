#!/usr/bin/env bash
# =============================================================================
# 05_vote_and_execute.sh
# 3 accounts vote TRUE, tua qua deadline (evm_increaseTime), va execute proposal.
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

GOVERNANCE=$(grep -o '"Governance": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)
TREASURY=$(grep -o '"CommunityTreasury": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)

PROPOSAL_ID="${1:-1}"

# Anvil Accounts
ACC0_ADDR="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" # Deployer
ACC0_PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

ACC1_ADDR="0x70997970C51812dc3A010C7d01b50e0d17dc79C8" # Artisan
ACC1_PK="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"

ACC2_ADDR="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" # Buyer
ACC2_PK="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"

RECIPIENT="0x90F79bf6EB2c4f870365E785982E1f101E93b906"

echo "=========================================================="
echo "  [Task 2.2] 05_vote_and_execute.sh"
echo "=========================================================="
echo "  Governance Contract: $GOVERNANCE"
echo "  Treasury Contract:   $TREASURY"
echo "  Proposal ID:         #$PROPOSAL_ID"
echo "  Recipient:           $RECIPIENT"
echo "----------------------------------------------------------"

# 1. 3 Accounts cast vote
echo ">> [1/3] Account #0 ($ACC0_ADDR) bo phieu YES..."
cast send --rpc-url "$RPC_URL" --private-key "$ACC0_PK" "$GOVERNANCE" "vote(uint256,bool)" "$PROPOSAL_ID" true >/dev/null
echo "   ✅ Account #0 da vote YES."

echo ">> [2/3] Account #1 ($ACC1_ADDR) bo phieu YES..."
cast send --rpc-url "$RPC_URL" --private-key "$ACC1_PK" "$GOVERNANCE" "vote(uint256,bool)" "$PROPOSAL_ID" true >/dev/null
echo "   ✅ Account #1 da vote YES."

echo ">> [3/3] Account #2 ($ACC2_ADDR) bo phieu YES..."
cast send --rpc-url "$RPC_URL" --private-key "$ACC2_PK" "$GOVERNANCE" "vote(uint256,bool)" "$PROPOSAL_ID" true >/dev/null
echo "   ✅ Account #2 da vote YES."
echo "----------------------------------------------------------"

# 2. Tua thoi gian qua voting period (1 hours = 3600 seconds)
echo ">> Tua thoi gian Anvil node them 3605 giay qua voting deadline..."
cast rpc --rpc-url "$RPC_URL" evm_increaseTime 3605 >/dev/null
cast rpc --rpc-url "$RPC_URL" evm_mine >/dev/null
echo "✅ Da tua thoi gian va mine block moi!"
echo "----------------------------------------------------------"

# 3. Kiem tra so du truoc execute
RECIPIENT_BEFORE=$(cast balance --rpc-url "$RPC_URL" "$RECIPIENT")
TREASURY_BEFORE=$(cast balance --rpc-url "$RPC_URL" "$TREASURY")
echo "📊 So du TRUOC khi execute proposal:"
echo "   Recipient: $(cast --from-wei "$RECIPIENT_BEFORE") ETH ($RECIPIENT_BEFORE wei)"
echo "   Treasury:  $(cast --from-wei "$TREASURY_BEFORE") ETH ($TREASURY_BEFORE wei)"
echo "----------------------------------------------------------"

# 4. Execute proposal
echo ">> Thuc thi Governance.execute(#$PROPOSAL_ID)..."
TX_RECEIPT=$(cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$ACC0_PK" \
  "$GOVERNANCE" \
  "execute(uint256)" \
  "$PROPOSAL_ID" \
  --json)

TX_HASH=$(echo "$TX_RECEIPT" | grep -o '"transactionHash": *"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ Proposal executed thanh cong! TxHash: $TX_HASH"
echo "----------------------------------------------------------"

# 5. Kiem tra so du sau execute
RECIPIENT_AFTER=$(cast balance --rpc-url "$RPC_URL" "$RECIPIENT")
TREASURY_AFTER=$(cast balance --rpc-url "$RPC_URL" "$TREASURY")
DIFF_RECIPIENT=$((RECIPIENT_AFTER - RECIPIENT_BEFORE))
DIFF_TREASURY=$((TREASURY_BEFORE - TREASURY_AFTER))

echo "📊 So du SAU khi execute proposal:"
echo "   Recipient: $(cast --from-wei "$RECIPIENT_AFTER") ETH (nhan duoc +$(cast --from-wei "$DIFF_RECIPIENT") ETH)"
echo "   Treasury:  $(cast --from-wei "$TREASURY_AFTER") ETH (giam -$(cast --from-wei "$DIFF_TREASURY") ETH)"
echo "=========================================================="
echo "🎉 E2E Flow Hoan tat xuat sac: Proposal da duoc thuc thi va giai ngan ETH thanh cong!"
