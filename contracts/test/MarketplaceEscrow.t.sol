// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EcoToken} from "../src/EcoToken.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";
import {CommunityTreasury} from "../src/CommunityTreasury.sol";
import {PaymentSplitter} from "../src/PaymentSplitter.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {ProductType} from "../src/interfaces/IMarketPlaceDeps.sol";

/// @dev Buyer contract that accepts ETH but rejects NFTs.
contract NftRejectingBuyer {
    receive() external payable {}

    function buy(Marketplace m, uint256 id) external payable {
        m.purchaseListing{value: msg.value}(id);
    }
}

contract EscrowHarness is Test {
    EcoToken internal eco;
    ImpactBadge internal badge;
    CommunityTreasury internal treasury;
    PaymentSplitter internal splitter;
    Marketplace internal market;

    address internal owner = makeAddr("owner");
    address internal artisan = makeAddr("artisan");
    address internal buyer = makeAddr("buyer");
    address internal stranger = makeAddr("stranger");
    uint256 internal constant PRICE = 1 ether;

    function _deploy() internal {
        vm.startPrank(owner);
        eco = new EcoToken(owner);
        badge = new ImpactBadge(owner);
        treasury = new CommunityTreasury(owner);
        splitter = new PaymentSplitter(address(treasury), address(eco), 7000, 2000, 1000, 100 ether);
        market = new Marketplace(address(splitter), address(badge), owner);
        eco.grantRole(eco.MINTER_ROLE(), address(splitter));
        badge.grantRole(badge.MINTER_ROLE(), address(market));
        splitter.setMarketplace(address(market));
        market.setArtisanVerified(artisan, true);
        vm.stopPrank();
    }
}

contract MarketplaceEscrowTest is EscrowHarness {
    uint256 internal id;

    function setUp() public {
        _deploy();
        vm.prank(artisan);
        id = market.createListing(PRICE, ProductType.Handicraft, "ipfs://x");
        vm.deal(buyer, 10 ether);
        vm.prank(buyer);
        market.purchaseListing{value: PRICE}(id);
    }

    function _status() internal view returns (Marketplace.OrderStatus) {
        return market.getOrder(id).status;
    }

    function test_Purchase_HoldsFundsAndDefersRewards() public view {
        assertEq(address(market).balance, PRICE);
        assertEq(artisan.balance, 0);
        assertEq(eco.balanceOf(buyer), 0);
        assertEq(badge.balanceOf(buyer), 0);
        assertEq(uint8(_status()), uint8(Marketplace.OrderStatus.Paid));
        assertFalse(market.getListing(id).isActive);
    }

    function test_Confirm_ReleasesAndRewards() public {
        vm.prank(buyer);
        market.confirmDelivery(id);

        assertEq(artisan.balance, 0.7 ether);
        assertEq(address(treasury).balance, 0.2 ether);
        assertEq(address(splitter).balance, 0.1 ether);
        assertEq(address(market).balance, 0);
        assertEq(eco.balanceOf(buyer), 100 ether);
        assertEq(badge.balanceOf(buyer), 1);
        assertEq(uint8(_status()), uint8(Marketplace.OrderStatus.Released));
    }

    function test_Confirm_OnlyBuyer() public {
        vm.prank(stranger);
        vm.expectRevert(Marketplace.NotBuyer.selector);
        market.confirmDelivery(id);
    }

    function test_Confirm_CannotReleaseTwice() public {
        vm.startPrank(buyer);
        market.confirmDelivery(id);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.InvalidOrderStatus.selector, id));
        market.confirmDelivery(id);
        vm.stopPrank();
    }

    function test_Timeout_AnyoneReleasesOnlyAfterPeriod() public {
        uint256 releasableAt = block.timestamp + market.escrowPeriod();
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.EscrowNotExpired.selector, releasableAt));
        market.releaseAfterTimeout(id);

        vm.warp(releasableAt);
        vm.prank(stranger);
        market.releaseAfterTimeout(id);
        assertEq(artisan.balance, 0.7 ether);
        assertEq(eco.balanceOf(stranger), 0);
        assertEq(eco.balanceOf(buyer), 100 ether);
    }

    function test_SellerRefund_ReturnsAllAndGivesNoReward() public {
        uint256 before = buyer.balance;
        vm.prank(artisan);
        market.refundBuyer(id);

        assertEq(buyer.balance - before, PRICE);
        assertEq(address(market).balance, 0);
        assertEq(eco.balanceOf(buyer), 0, "buy-then-refund must not earn ECO");
        assertEq(badge.balanceOf(buyer), 0);
        assertEq(uint8(_status()), uint8(Marketplace.OrderStatus.Refunded));
    }

    function test_SellerRefund_OnlySeller() public {
        vm.prank(buyer);
        vm.expectRevert(Marketplace.NotSeller.selector);
        market.refundBuyer(id);
    }

    function test_Dispute_BlocksTimeoutRelease() public {
        vm.prank(buyer);
        market.openDispute(id);
        vm.warp(block.timestamp + market.escrowPeriod());
        vm.expectRevert(abi.encodeWithSelector(Marketplace.InvalidOrderStatus.selector, id));
        market.releaseAfterTimeout(id);
    }

    function test_Dispute_OnlyBuyerOpens() public {
        vm.prank(stranger);
        vm.expectRevert(Marketplace.NotBuyer.selector);
        market.openDispute(id);
    }

    function test_Dispute_ArbiterRefunds() public {
        vm.prank(buyer);
        market.openDispute(id);
        uint256 before = buyer.balance;
        vm.prank(owner);
        market.resolveDispute(id, true);
        assertEq(buyer.balance - before, PRICE);
    }

    function test_Dispute_ArbiterReleases() public {
        vm.prank(buyer);
        market.openDispute(id);
        vm.prank(owner);
        market.resolveDispute(id, false);
        assertEq(artisan.balance, 0.7 ether);
        assertEq(badge.balanceOf(buyer), 1);
    }

    function test_Dispute_OnlyArbiterResolves() public {
        vm.prank(buyer);
        market.openDispute(id);
        vm.prank(buyer);
        vm.expectRevert(Marketplace.NotArbiter.selector);
        market.resolveDispute(id, true);
    }

    function test_Dispute_SellerCanStillRefund() public {
        vm.prank(buyer);
        market.openDispute(id);
        vm.prank(artisan);
        market.refundBuyer(id);
        assertEq(uint8(_status()), uint8(Marketplace.OrderStatus.Refunded));
    }

    function test_StaleDispute_RefundsAfterPeriod() public {
        vm.prank(buyer);
        market.openDispute(id);
        uint256 claimableAt = block.timestamp + market.STALE_DISPUTE_PERIOD();
        vm.expectRevert(abi.encodeWithSelector(Marketplace.DisputeNotStale.selector, claimableAt));
        market.refundStaleDispute(id);

        vm.warp(claimableAt);
        uint256 before = buyer.balance;
        vm.prank(stranger);
        market.refundStaleDispute(id);
        assertEq(buyer.balance - before, PRICE);
    }

    function test_Pause_DoesNotTrapEscrow() public {
        vm.prank(owner);
        market.pause();
        vm.prank(buyer);
        market.confirmDelivery(id);
        assertEq(artisan.balance, 0.7 ether);
    }

    function test_NftRejectingBuyer_CannotBlockArtisanPayment() public {
        NftRejectingBuyer contractBuyer = new NftRejectingBuyer();
        vm.deal(address(contractBuyer), 1 ether);
        vm.prank(artisan);
        uint256 second = market.createListing(PRICE, ProductType.Handicraft, "ipfs://y");
        vm.deal(address(this), PRICE);
        contractBuyer.buy{value: PRICE}(market, second);

        vm.warp(block.timestamp + market.escrowPeriod());
        vm.expectEmit(true, true, false, false, address(market));
        emit Marketplace.BadgeMintFailed(second, address(contractBuyer));
        market.releaseAfterTimeout(second);
        assertEq(artisan.balance, 0.7 ether);
    }

    function test_AdminSetters() public {
        vm.startPrank(owner);
        market.setEscrowPeriod(7 days);
        market.setArbiter(stranger);
        vm.expectRevert(Marketplace.InvalidEscrowPeriod.selector);
        market.setEscrowPeriod(1 hours);
        vm.expectRevert(Marketplace.InvalidEscrowPeriod.selector);
        market.setEscrowPeriod(61 days);
        vm.expectRevert(Marketplace.ZeroAddress.selector);
        market.setArbiter(address(0));
        vm.stopPrank();
        assertEq(market.escrowPeriod(), 7 days);
        assertEq(market.arbiter(), stranger);
    }

    function test_Treasury_TracksTotals() public {
        vm.prank(buyer);
        market.confirmDelivery(id);
        assertEq(treasury.totalDeposited(), 0.2 ether);
        assertEq(treasury.totalDisbursed(), 0);
    }
}

/// @dev Random order actions for the invariant tests.
contract EscrowHandler is Test {
    Marketplace internal market;
    address internal artisan;
    address internal arbiter;
    address internal buyer = makeAddr("handlerBuyer");
    uint256[] public ids;
    uint256 public openEscrow;

    constructor(Marketplace market_, address artisan_, address arbiter_) {
        market = market_;
        artisan = artisan_;
        arbiter = arbiter_;
    }

    function buy(uint96 price) external {
        price = uint96(bound(price, 0.001 ether, 10 ether));
        vm.prank(artisan);
        uint256 id = market.createListing(price, ProductType.Handicraft, "ipfs://x");
        vm.deal(buyer, price);
        vm.prank(buyer);
        market.purchaseListing{value: price}(id);
        ids.push(id);
        openEscrow += price;
    }

    function _pick(uint256 seed) internal view returns (uint256 id, Marketplace.Order memory order, bool ok) {
        if (ids.length == 0) return (0, order, false);
        id = ids[seed % ids.length];
        order = market.getOrder(id);
        ok = true;
    }

    function confirm(uint256 seed) external {
        (uint256 id, Marketplace.Order memory o, bool ok) = _pick(seed);
        if (!ok || o.status != Marketplace.OrderStatus.Paid) return;
        vm.prank(buyer);
        market.confirmDelivery(id);
        openEscrow -= o.price;
    }

    function dispute(uint256 seed) external {
        (uint256 id, Marketplace.Order memory o, bool ok) = _pick(seed);
        if (!ok || o.status != Marketplace.OrderStatus.Paid) return;
        vm.prank(buyer);
        market.openDispute(id);
    }

    function resolve(uint256 seed, bool toBuyer) external {
        (uint256 id, Marketplace.Order memory o, bool ok) = _pick(seed);
        if (!ok || o.status != Marketplace.OrderStatus.Disputed) return;
        vm.prank(arbiter);
        market.resolveDispute(id, toBuyer);
        openEscrow -= o.price;
    }

    function refund(uint256 seed) external {
        (uint256 id, Marketplace.Order memory o, bool ok) = _pick(seed);
        if (!ok || (o.status != Marketplace.OrderStatus.Paid && o.status != Marketplace.OrderStatus.Disputed)) return;
        vm.prank(artisan);
        market.refundBuyer(id);
        openEscrow -= o.price;
    }
}

contract MarketplaceEscrowInvariantTest is EscrowHarness {
    EscrowHandler internal handler;

    function setUp() public {
        _deploy();
        handler = new EscrowHandler(market, artisan, owner);
        targetContract(address(handler));
    }

    /// @notice Marketplace holds exactly the sum of open orders.
    function invariant_MarketBalanceEqualsOpenEscrow() public view {
        assertEq(address(market).balance, handler.openEscrow());
    }

    /// @notice PaymentSplitter always covers pending fees.
    function invariant_SplitterHoldsPendingFees() public view {
        assertEq(address(splitter).balance, splitter.pendingPlatformFees());
    }
}
