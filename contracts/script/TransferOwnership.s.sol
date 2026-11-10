// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";

/// @title TransferOwnership
/// @notice Moves admin rights from the deployer to a multisig or timelock.
///
/// Env: PRIVATE_KEY (current owner), NEW_OWNER and the addresses of all 8 contracts
/// (ECO_TOKEN_ADDRESS, IMPACT_BADGE_ADDRESS, TREASURY_ADDRESS, GOVERNANCE_ADDRESS,
/// PAYMENT_SPLITTER_ADDRESS, MARKETPLACE_ADDRESS, CARBON_OFFSET_ADDRESS, QUEST_REWARDS_ADDRESS).
///
/// NEW_OWNER must call acceptOwnership() on 7 contracts (Ownable2Step).
/// ImpactBadge admin is granted immediately; the deployer renounces its own once confirmed.
contract TransferOwnership is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address newOwner = vm.envAddress("NEW_OWNER");
        require(newOwner.code.length > 0, "NEW_OWNER must be a contract (multisig/timelock)");

        string[7] memory keys = [
            "ECO_TOKEN_ADDRESS",
            "TREASURY_ADDRESS",
            "GOVERNANCE_ADDRESS",
            "PAYMENT_SPLITTER_ADDRESS",
            "MARKETPLACE_ADDRESS",
            "CARBON_OFFSET_ADDRESS",
            "QUEST_REWARDS_ADDRESS"
        ];
        ImpactBadge badge = ImpactBadge(vm.envAddress("IMPACT_BADGE_ADDRESS"));

        vm.startBroadcast(pk);
        for (uint256 i; i < keys.length; ++i) {
            address target = vm.envAddress(keys[i]);
            Ownable2Step(target).transferOwnership(newOwner);
            console2.log(keys[i], target);
        }
        badge.grantRole(badge.DEFAULT_ADMIN_ROLE(), newOwner);
        vm.stopBroadcast();

        console2.log("Pending owner:", newOwner);
    }
}
