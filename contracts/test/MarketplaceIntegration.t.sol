// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EcoToken} from "../src/EcoToken.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";
import {CommunityTreasury} from "../src/CommunityTreasury.sol";
import {PaymentSplitter} from "../src/PaymentSplitter.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {ProductType} from "../src/interfaces/IMarketPlaceDeps.sol";

/// @notice End-to-end purchase through the real contracts, wired like Deploy.s.sol.
contract MarketplaceIntegrationTest is Test {
    EcoToken internal eco;
    ImpactBadge internal badge;
    CommunityTreasury internal treasury;
    PaymentSplitter internal splitter;
    Marketplace internal market;

    address internal admin = makeAddr("admin");
    address internal seller = makeAddr("seller");
    address internal buyer = makeAddr("buyer");

    uint256 internal constant PRICE = 0.1 ether;
    uint256 internal constant REWARD_RATE = 100 ether; // 100 ECO / 1 ETH

    function setUp() public {
        vm.startPrank(admin);
        eco = new EcoToken(admin);
        badge = new ImpactBadge(admin);
        treasury = new CommunityTreasury(admin);
        splitter = new PaymentSplitter(address(treasury), address(eco), 7000, 2000, 1000, REWARD_RATE);
        market = new Marketplace(address(splitter), address(badge), admin);

        eco.grantRole(eco.MINTER_ROLE(), address(splitter));
        badge.grantRole(badge.MINTER_ROLE(), address(market));
        vm.stopPrank();

        vm.deal(buyer, 1 ether);
    }

    function test_purchase_rewardsEcoToBuyer() public {
        vm.prank(seller);
        uint256 id = market.createListing(PRICE, ProductType.Handicraft, "ipfs://listing");

        vm.prank(buyer);
        market.purchaseListing{value: PRICE}(id);

        uint256 expectedReward = (PRICE * REWARD_RATE) / 1 ether; // 10 ECO
        assertEq(eco.balanceOf(buyer), expectedReward, "buyer earns ECO");
        assertEq(eco.balanceOf(address(market)), 0, "marketplace must not keep ECO");
        assertEq(badge.balanceOf(buyer), 1, "buyer earns ImpactBadge");

        assertEq(seller.balance, 0.07 ether);
        assertEq(address(treasury).balance, 0.02 ether);
        assertEq(splitter.pendingPlatformFees(), 0.01 ether);
    }
}
