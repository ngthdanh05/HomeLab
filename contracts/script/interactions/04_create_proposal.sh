#!/usr/bin/env bash
# =============================================================================
# 04_create_proposal.sh
# Du khách tạo proposal giải ngân 0.02 ETH từ CommunityTreasury cho dự án bảo tồn.
# Thiết lập ECO voting power cho 3 accounts trước snapshot để phục vụ Script 05.
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
ECO_TOKEN=$(grep -o '"EcoToken": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)
TREASURY=$(grep -o '"CommunityTreasury": *"[^"]*"' "$DEPLOY_FILE" | head -1 | cut -d'"' -f4)

# Anvil Accounts
ACC0_ADDR="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" # Deployer
ACC0_PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

ACC1_ADDR="0x70997970C51812dc3A010C7d01b50e0d17dc79C8" # Artisan
ACC1_PK="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"

ACC2_ADDR="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" # Buyer / Proposer
ACC2_PK="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"

# Recipient (Anvil Account #3)
RECIPIENT="0x90F79bf6EB2c4f870365E785982E1f101E93b906"
AMOUNT="20000000000000000" # 0.02 ETH
DESCRIPTION="Giai ngan 0.02 ETH cho du an trong rung ngap man va bao ton san ho"

echo "=========================================================="
echo "  [Task 2.2] 04_create_proposal.sh"
echo "=========================================================="
echo "  Proposer:    $ACC2_ADDR"
echo "  Recipient:   $RECIPIENT"
echo "  Amount:      0.02 ETH ($AMOUNT wei)"
echo "  Governance:  $GOVERNANCE"
echo "  Description: $DESCRIPTION"
echo "----------------------------------------------------------"

# 1. Cấp thêm MINTER_ROLE tạm cho Deployer hoặc mint ECO để 3 accounts có token vote
MINTER_ROLE=$(cast call --rpc-url "$RPC_URL" "$ECO_TOKEN" "MINTER_ROLE()(bytes32)")
IS_MINTER=$(cast call --rpc-url "$RPC_URL" "$ECO_TOKEN" "hasRole(bytes32,address)(bool)" "$MINTER_ROLE" "$ACC0_ADDR")

if [[ "$IS_MINTER" == "false" ]]; then
  echo ">> Cap MINTER_ROLE cho Deployer de khoi tao voting power ban dau..."
  cast send --rpc-url "$RPC_URL" --private-key "$ACC0_PK" "$ECO_TOKEN" "grantRole(bytes32,address)" "$MINTER_ROLE" "$ACC0_ADDR" >/dev/null
fi

echo ">> Mint ECO token va delegate voting units cho 3 accounts..."
# Mint ECO cho Account 0 và 1 nếu chưa có
cast send --rpc-url "$RPC_URL" --private-key "$ACC0_PK" "$ECO_TOKEN" "mint(address,uint256)" "$ACC0_ADDR" 50000000000000000000 >/dev/null # 50 ECO
cast send --rpc-url "$RPC_URL" --private-key "$ACC0_PK" "$ECO_TOKEN" "mint(address,uint256)" "$ACC1_ADDR" 50000000000000000000 >/dev/null # 50 ECO
cast send --rpc-url "$RPC_URL" --private-key "$ACC0_PK" "$ECO_TOKEN" "mint(address,uint256)" "$ACC2_ADDR" 50000000000000000000 >/dev/null # 50 ECO

# Delegate voting units cho chính họ
cast send --rpc-url "$RPC_URL" --private-key "$ACC0_PK" "$ECO_TOKEN" "delegate(address)" "$ACC0_ADDR" >/dev/null
cast send --rpc-url "$RPC_URL" --private-key "$ACC1_PK" "$ECO_TOKEN" "delegate(address)" "$ACC1_ADDR" >/dev/null
cast send --rpc-url "$RPC_URL" --private-key "$ACC2_PK" "$ECO_TOKEN" "delegate(address)" "$ACC2_ADDR" >/dev/null

# Mine block de checkpoints vao lich su (snapshot = block.number - 1)
cast rpc --rpc-url "$RPC_URL" evm_mine >/dev/null
cast rpc --rpc-url "$RPC_URL" evm_mine >/dev/null

echo ">> Kiem tra Voting Power truoc propose:"
echo "   Account #0 (Deployer): $(cast call --rpc-url "$RPC_URL" "$ECO_TOKEN" "getVotes(address)(uint256)" "$ACC0_ADDR") wei"
echo "   Account #1 (Artisan):  $(cast call --rpc-url "$RPC_URL" "$ECO_TOKEN" "getVotes(address)(uint256)" "$ACC1_ADDR") wei"
echo "   Account #2 (Buyer):    $(cast call --rpc-url "$RPC_URL" "$ECO_TOKEN" "getVotes(address)(uint256)" "$ACC2_ADDR") wei"
echo "----------------------------------------------------------"

echo ">> Du khach (Account #2) tao Proposal..."
TX_RECEIPT=$(cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$ACC2_PK" \
  "$GOVERNANCE" \
  "propose(address,uint256,string)" \
  "$RECIPIENT" "$AMOUNT" "$DESCRIPTION" \
  --json)

TX_HASH=$(echo "$TX_RECEIPT" | grep -o '"transactionHash": *"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ Tao Proposal thanh cong! TxHash: $TX_HASH"

PROPOSAL_COUNT=$(cast call --rpc-url "$RPC_URL" "$GOVERNANCE" "proposalCount()(uint256)")
echo "📋 Proposal ID vua tao: #$PROPOSAL_COUNT"

PROPOSAL_INFO=$(cast call --rpc-url "$RPC_URL" "$GOVERNANCE" "getProposal(uint256)" "$PROPOSAL_COUNT")
echo "📄 Chi tiet Proposal #$PROPOSAL_COUNT: $PROPOSAL_INFO"
echo "=========================================================="
echo "✅ Hoan tat Script 04!"
