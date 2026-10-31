#!/usr/bin/env bash
# =============================================================================
# deploy_step_by_step.sh
# Fallback script: deploy từng contract bằng `forge create` và cấu hình
# quyền bằng `cast send`. Dùng khi `forge script` liên tục Revert trên Sepolia.
#
# Cách dùng:
#   bash script/deploy_step_by_step.sh
#
# Biến môi trường bắt buộc (có thể khai báo trong .env):
#   PRIVATE_KEY       — private key của deployer
#   SEPOLIA_RPC_URL   — RPC endpoint Sepolia
#   ETHERSCAN_API_KEY — để verify contract (tùy chọn)
#
# Biến môi trường resume (tùy chọn — bỏ trống để deploy mới):
#   ECO_TOKEN_ADDRESS      — nếu EcoToken đã deploy
#   IMPACT_BADGE_ADDRESS   — nếu ImpactBadge đã deploy
#   TREASURY_ADDRESS       — nếu CommunityTreasury đã deploy
# =============================================================================

set -e

# ── Load .env ─────────────────────────────────────────────────────────────────
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
fi

# ── Validate required env vars ────────────────────────────────────────────────
: "${PRIVATE_KEY:?❌  PRIVATE_KEY is not set}"
: "${SEPOLIA_RPC_URL:?❌  SEPOLIA_RPC_URL is not set}"

RPC="$SEPOLIA_RPC_URL"
PK="$PRIVATE_KEY"
DEPLOYER=$(cast wallet address --private-key "$PK")

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Step-by-Step Deploy — Eco-Tourism D2C Platform    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "Deployer : $DEPLOYER"
echo "Network  : Sepolia ($RPC)"
echo ""

# ── Common forge create flags ─────────────────────────────────────────────────
FORGE_FLAGS="--rpc-url $RPC --private-key $PK --broadcast --gas-estimate-multiplier 130"
VERIFY_FLAGS=""
if [ -n "$ETHERSCAN_API_KEY" ]; then
  VERIFY_FLAGS="--verify --etherscan-api-key $ETHERSCAN_API_KEY"
fi

# ── Helper: extract address from forge create output ─────────────────────────
extract_addr() {
  # Grep "Deployed to:" line and pull the address
  echo "$1" | grep -oP 'Deployed to:\s+\K0x[0-9a-fA-F]{40}'
}

# =============================================================================
# STEP 1: EcoToken
# =============================================================================
if [ -n "$ECO_TOKEN_ADDRESS" ]; then
  ECO_TOKEN="$ECO_TOKEN_ADDRESS"
  echo "✅ [1/6] EcoToken (reused): $ECO_TOKEN"
else
  echo "🚀 [1/6] Deploying EcoToken..."
  OUT=$(forge create src/EcoToken.sol:EcoToken \
    $FORGE_FLAGS $VERIFY_FLAGS \
    --constructor-args "$DEPLOYER" 2>&1)
  echo "$OUT"
  ECO_TOKEN=$(extract_addr "$OUT")
  echo "✅ [1/6] EcoToken deployed: $ECO_TOKEN"
fi
echo ""

# =============================================================================
# STEP 2: ImpactBadge
# =============================================================================
if [ -n "$IMPACT_BADGE_ADDRESS" ]; then
  IMPACT_BADGE="$IMPACT_BADGE_ADDRESS"
  echo "✅ [2/6] ImpactBadge (reused): $IMPACT_BADGE"
else
  echo "🚀 [2/6] Deploying ImpactBadge..."
  OUT=$(forge create src/ImpactBadge.sol:ImpactBadge \
    $FORGE_FLAGS $VERIFY_FLAGS \
    --constructor-args "$DEPLOYER" 2>&1)
  echo "$OUT"
  IMPACT_BADGE=$(extract_addr "$OUT")
  echo "✅ [2/6] ImpactBadge deployed: $IMPACT_BADGE"
fi
echo ""

# =============================================================================
# STEP 3: CommunityTreasury
# =============================================================================
if [ -n "$TREASURY_ADDRESS" ]; then
  TREASURY="$TREASURY_ADDRESS"
  echo "✅ [3/6] CommunityTreasury (reused): $TREASURY"
else
  echo "🚀 [3/6] Deploying CommunityTreasury..."
  OUT=$(forge create src/CommunityTreasury.sol:CommunityTreasury \
    $FORGE_FLAGS $VERIFY_FLAGS \
    --constructor-args "$DEPLOYER" 2>&1)
  echo "$OUT"
  TREASURY=$(extract_addr "$OUT")
  echo "✅ [3/6] CommunityTreasury deployed: $TREASURY"
fi
echo ""

# =============================================================================
# STEP 4: Governance
# =============================================================================
PROPOSAL_THRESHOLD="100000000000000000000"  # 100 ECO (18 decimals)
QUORUM_BPS="500"
VOTING_PERIOD="259200"                       # 3 days in seconds

echo "🚀 [4/6] Deploying Governance..."
OUT=$(forge create src/Governance.sol:Governance \
  $FORGE_FLAGS $VERIFY_FLAGS \
  --constructor-args \
    "$ECO_TOKEN" \
    "$TREASURY" \
    "$PROPOSAL_THRESHOLD" \
    "$QUORUM_BPS" \
    "$VOTING_PERIOD" \
    "$DEPLOYER" 2>&1)
echo "$OUT"
GOVERNANCE=$(extract_addr "$OUT")
echo "✅ [4/6] Governance deployed: $GOVERNANCE"
echo ""

# =============================================================================
# STEP 5: PaymentSplitter
# =============================================================================
ARTISAN_BPS="7000"
TREASURY_BPS_VAL="2000"
PLATFORM_BPS="1000"
ECO_REWARD_RATE="100000000000000000000"  # 100 ether

echo "🚀 [5/6] Deploying PaymentSplitter..."
OUT=$(forge create src/PaymentSplitter.sol:PaymentSplitter \
  $FORGE_FLAGS $VERIFY_FLAGS \
  --constructor-args \
    "$TREASURY" \
    "$ECO_TOKEN" \
    "$ARTISAN_BPS" \
    "$TREASURY_BPS_VAL" \
    "$PLATFORM_BPS" \
    "$ECO_REWARD_RATE" 2>&1)
echo "$OUT"
PAYMENT_SPLITTER=$(extract_addr "$OUT")
echo "✅ [5/6] PaymentSplitter deployed: $PAYMENT_SPLITTER"
echo ""

# =============================================================================
# STEP 6: Marketplace
# =============================================================================
echo "🚀 [6/6] Deploying Marketplace..."
OUT=$(forge create src/Marketplace.sol:Marketplace \
  $FORGE_FLAGS $VERIFY_FLAGS \
  --constructor-args \
    "$PAYMENT_SPLITTER" \
    "$IMPACT_BADGE" \
    "$DEPLOYER" 2>&1)
echo "$OUT"
MARKETPLACE=$(extract_addr "$OUT")
echo "✅ [6/6] Marketplace deployed: $MARKETPLACE"
echo ""

# =============================================================================
# POST-DEPLOY: PHÂN QUYỀN
# =============================================================================
echo "╔══════════════════════════════════════════════════════╗"
echo "║              Post-Deploy: Phân quyền                ║"
echo "╚══════════════════════════════════════════════════════╝"

MINTER_ROLE=$(cast keccak "MINTER_ROLE")
CAST_FLAGS="--rpc-url $RPC --private-key $PK --gas-estimate-multiplier 130"

echo "🔑 EcoToken.grantRole(MINTER_ROLE → PaymentSplitter)..."
cast send $CAST_FLAGS "$ECO_TOKEN" \
  "grantRole(bytes32,address)" "$MINTER_ROLE" "$PAYMENT_SPLITTER"

echo "🔑 EcoToken.grantRole(MINTER_ROLE → Marketplace)..."
cast send $CAST_FLAGS "$ECO_TOKEN" \
  "grantRole(bytes32,address)" "$MINTER_ROLE" "$MARKETPLACE"

echo "🔑 ImpactBadge.grantRole(MINTER_ROLE → Marketplace)..."
cast send $CAST_FLAGS "$IMPACT_BADGE" \
  "grantRole(bytes32,address)" "$MINTER_ROLE" "$MARKETPLACE"

echo "🔑 ImpactBadge.grantRole(MINTER_ROLE → PaymentSplitter)..."
cast send $CAST_FLAGS "$IMPACT_BADGE" \
  "grantRole(bytes32,address)" "$MINTER_ROLE" "$PAYMENT_SPLITTER"

echo "🔑 CommunityTreasury.setGovernance(Governance)..."
cast send $CAST_FLAGS "$TREASURY" \
  "setGovernance(address)" "$GOVERNANCE"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         🎉 Deployment Complete! Addresses:          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "  EcoToken          : $ECO_TOKEN"
echo "  ImpactBadge       : $IMPACT_BADGE"
echo "  CommunityTreasury : $TREASURY"
echo "  Governance        : $GOVERNANCE"
echo "  PaymentSplitter   : $PAYMENT_SPLITTER"
echo "  Marketplace       : $MARKETPLACE"
echo ""

# ── Lưu ra deployments/sepolia.json ──────────────────────────────────────────
TIMESTAMP=$(date +%s)
mkdir -p deployments
cat > deployments/sepolia.json <<EOF
{
  "network": "sepolia",
  "chainId": 11155111,
  "timestamp": $TIMESTAMP,
  "deployer": "$DEPLOYER",
  "contracts": {
    "EcoToken": "$ECO_TOKEN",
    "ImpactBadge": "$IMPACT_BADGE",
    "CommunityTreasury": "$TREASURY",
    "Governance": "$GOVERNANCE",
    "PaymentSplitter": "$PAYMENT_SPLITTER",
    "Marketplace": "$MARKETPLACE"
  }
}
EOF
echo "📄 Deployments saved to deployments/sepolia.json"
