// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {EcoToken} from "../src/EcoToken.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";
import {QuestRewards} from "../src/QuestRewards.sol";
import {QuestSetup} from "./QuestSetup.sol";

/// @title DeployQuestRewards
/// @notice Deploy riêng QuestRewards (Task 4.4) lên mạng đã có hệ thống (Sepolia), nạp bộ quest
///         mặc định và cấp MINTER_ROLE trên EcoToken + ImpactBadge. Deployer phải là admin của cả hai.
///
/// Biến môi trường: PRIVATE_KEY, ECO_TOKEN_ADDRESS, IMPACT_BADGE_ADDRESS,
///                  CARBON_OFFSET_ADDRESS, GOVERNANCE_ADDRESS.
contract DeployQuestRewards is Script {
    function run() external returns (QuestRewards quests) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        EcoToken eco = EcoToken(vm.envAddress("ECO_TOKEN_ADDRESS"));
        ImpactBadge badge = ImpactBadge(vm.envAddress("IMPACT_BADGE_ADDRESS"));
        address carbonOffset = vm.envAddress("CARBON_OFFSET_ADDRESS");
        address governance = vm.envAddress("GOVERNANCE_ADDRESS");

        require(eco.hasRole(eco.DEFAULT_ADMIN_ROLE(), deployer), "Deployer is not EcoToken admin");
        require(badge.hasRole(badge.DEFAULT_ADMIN_ROLE(), deployer), "Deployer is not ImpactBadge admin");

        console2.log("Chain ID     :", block.chainid);
        console2.log("Deployer     :", deployer);
        console2.log("EcoToken     :", address(eco));
        console2.log("ImpactBadge  :", address(badge));
        console2.log("CarbonOffset :", carbonOffset);
        console2.log("Governance   :", governance);

        vm.startBroadcast(pk);
        quests = new QuestRewards(address(eco), address(badge), carbonOffset, governance, deployer);
        QuestSetup.addDefaultQuests(quests);
        eco.grantRole(eco.MINTER_ROLE(), address(quests));
        badge.grantRole(badge.MINTER_ROLE(), address(quests));
        vm.stopBroadcast();

        console2.log("QuestRewards deployed:", address(quests));
        console2.log("Quests added :", quests.questCount());
        console2.log("MINTER_ROLE granted on EcoToken & ImpactBadge");
        console2.log("=> Cap nhat frontend/src/config/contracts.ts (questRewards) va LOGS_FROM_BLOCK");
    }
}
