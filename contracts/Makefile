-include .env

.PHONY: all build test clean deploy-local deploy-sepolia

build:
	forge build

test:
	forge test -vvv

clean:
	forge clean

deploy-local:
	forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

deploy-sepolia:
	forge script script/Deploy.s.sol --rpc-url $(SEPOLIA_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast --verify --etherscan-api-key $(ETHERSCAN_API_KEY)