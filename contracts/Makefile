-include .env

.PHONY: all build test clean \
        deploy-local deploy-sepolia deploy-sepolia-resume \
        deploy-step-by-step \
        verify-sepolia simulate-e2e

# ── Build & Test ───────────────────────────────────────────────────────────────
build:
	forge build

sizes:
	forge build --sizes

test:
	forge test -vvv

# ── Clean (triệt để: xoá cả out, cache, broadcast) ───────────────────────────
clean:
	forge clean
	@if exist out rmdir /S /Q out
	@if exist cache rmdir /S /Q cache
	@if exist broadcast rmdir /S /Q broadcast

# ── Local Deployment (Anvil) ──────────────────────────────────────────────────
deploy-local:
	forge script script/Deploy.s.sol \
		--rpc-url http://127.0.0.1:8545 \
		--private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
		--broadcast \
		--gas-estimate-multiplier 130 \
		-vvvv

# ── Sepolia Full Deploy ───────────────────────────────────────────────────────
# Dùng khi chưa có contract nào trên Sepolia.
# --gas-estimate-multiplier 130 : buffer 30% để tránh Out-of-Gas
# --slow                        : giữa các tx có delay để tránh nonce race
# --legacy                      : dùng type-0 tx thay vì EIP-1559 (bỏ comment nếu cần)
deploy-sepolia: clean
	forge script script/Deploy.s.sol \
		--rpc-url $(SEPOLIA_RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--broadcast \
		--slow \
		--gas-estimate-multiplier 130 \
		--verify \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		-vvvv

# ── Sepolia Resume Deploy ────────────────────────────────────────────────────
# Dùng khi EcoToken (và tùy chọn ImpactBadge, CommunityTreasury) đã deploy thành công.
# Truyền địa chỉ qua biến môi trường:
#   ECO_TOKEN_ADDRESS=0x...    (bắt buộc nếu đã deploy EcoToken)
#   IMPACT_BADGE_ADDRESS=0x... (tùy chọn)
#   TREASURY_ADDRESS=0x...     (tùy chọn)
# Ví dụ:
#   make deploy-sepolia-resume ECO_TOKEN_ADDRESS=0x9E7c1af2fa393987d8c8451bE512b2df0AD9e35C
deploy-sepolia-resume:
	forge script script/Deploy.s.sol \
		--rpc-url $(SEPOLIA_RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--broadcast \
		--slow \
		--gas-estimate-multiplier 130 \
		--verify \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		-vvvv

# ── Sepolia Simulate (không broadcast, kiểm tra local trước) ─────────────────
simulate-sepolia:
	forge script script/Deploy.s.sol \
		--rpc-url $(SEPOLIA_RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--gas-estimate-multiplier 130 \
		-vvvv

# ── Sepolia Contract Verification ─────────────────────────────────────────────
verify-sepolia:
	@bash script/verify_sepolia.sh

# ── Step-by-Step deploy via forge create (fallback nếu forge script vẫn lỗi) ─
# Chạy: make deploy-step-by-step
# Script bash sẽ deploy từng contract một và in địa chỉ ra màn hình.
deploy-step-by-step:
	@bash script/deploy_step_by_step.sh

# ── End-to-End Simulation on Anvil ────────────────────────────────────────────
simulate-e2e:
	@echo "=== [E2E Simulation] Starting End-to-End Flow on Anvil ==="
	@bash script/interactions/01_create_listing.sh
	@echo ""
	@bash script/interactions/02_purchase_listing.sh
	@echo ""
	@bash script/interactions/03_check_balances.sh
	@echo ""
	@bash script/interactions/04_create_proposal.sh
	@echo ""
	@bash script/interactions/05_vote_and_execute.sh
	@echo ""
	@echo "=== [E2E Simulation] All tasks completed successfully! ==="
