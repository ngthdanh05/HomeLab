// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";
import {CarbonOffset} from "../src/CarbonOffset.sol";

/// @title DeployCarbonOffset
/// @notice Deploy riêng CarbonOffset lên mạng đã có hệ thống (Sepolia) và cấp
///         MINTER_ROLE trên ImpactBadge cho nó. Deployer phải là admin của ImpactBadge.
///
/// Biến môi trường: PRIVATE_KEY, IMPACT_BADGE_ADDRESS, TREASURY_ADDRESS,
///                  CARBON_PRICE_PER_KG_WEI (tuỳ chọn, mặc định 0.00001 ETH/kg).
contract DeployCarbonOffset is Script {
    uint256 internal constant DEFAULT_PRICE_PER_KG = 0.00001 ether;

    function run() external returns (CarbonOffset carbonOffset) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address badgeAddr = vm.envAddress("IMPACT_BADGE_ADDRESS");
        address treasuryAddr = vm.envAddress("TREASURY_ADDRESS");
        uint256 price = vm.envOr("CARBON_PRICE_PER_KG_WEI", DEFAULT_PRICE_PER_KG);

        ImpactBadge badge = ImpactBadge(badgeAddr);
        require(badge.hasRole(badge.DEFAULT_ADMIN_ROLE(), deployer), "Deployer is not ImpactBadge admin");

        console2.log("Chain ID     :", block.chainid);
        console2.log("Deployer     :", deployer);
        console2.log("ImpactBadge  :", badgeAddr);
        console2.log("Treasury     :", treasuryAddr);
        console2.log("Price / kg   :", price);

        vm.startBroadcast(pk);
        carbonOffset = new CarbonOffset(badgeAddr, treasuryAddr, price, deployer);
        badge.grantRole(badge.MINTER_ROLE(), address(carbonOffset));
        vm.stopBroadcast();

        console2.log("CarbonOffset deployed:", address(carbonOffset));
        console2.log("ImpactBadge: MINTER_ROLE granted to CarbonOffset");
        console2.log("=> Cap nhat frontend/src/config/contracts.ts (carbonOffset) va LOGS_FROM_BLOCK");
    }
}
