// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";

/// @title DeployConfig
/// @notice Centralized configuration for different networks (Anvil, Sepolia).
contract DeployConfig is Script {
    struct NetworkConfig {
        address deployer;
        uint16 artisanBPS; // 7000 = 70%
        uint16 treasuryBPS; // 2000 = 20%
        uint16 platformBPS; // 1000 = 10%
        uint256 ecoRewardRate; // 100 ECO per 1 ETH
        uint256 proposalThreshold; // Min ECO balance to propose
        uint256 quorumBps; // 500 = 5% (500 bps)
        uint256 votingPeriod; // Voting window in seconds
    }

    /// @notice Anvil local configuration (chainId 31337).
    function getAnvilConfig() public view returns (NetworkConfig memory) {
        address deployerAddress = vm.envOr("DEPLOYER_ADDRESS", msg.sender);
        return NetworkConfig({
            deployer: deployerAddress, // Anvil account #0
            artisanBPS: 7000,
            treasuryBPS: 2000,
            platformBPS: 1000,
            ecoRewardRate: 100 ether,
            proposalThreshold: 1 ether, // Low threshold for local tests
            quorumBps: 100, // 1% quorum on local for easy voting
            votingPeriod: 1 hours // Minimum period allowed by Governance (1 hours)
        });
    }

    /// @notice Sepolia testnet configuration (chainId 11155111).
    function getSepoliaConfig() public view returns (NetworkConfig memory) {
        return NetworkConfig({
            deployer: vm.envOr("DEPLOYER_ADDRESS", msg.sender),
            artisanBPS: 7000,
            treasuryBPS: 2000,
            platformBPS: 1000,
            ecoRewardRate: 100 ether,
            proposalThreshold: 100 ether,
            quorumBps: 500, // 5%
            votingPeriod: 3 days
        });
    }

    function getConfig() public view returns (NetworkConfig memory) {
        if (block.chainid == 31337) return getAnvilConfig();
        if (block.chainid == 11155111) return getSepoliaConfig();
        // Fallback for custom or local testing
        return getAnvilConfig();
    }
}
