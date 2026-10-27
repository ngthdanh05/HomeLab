// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {ProductType, IPaymentSplitter, IImpactBadge} from "../src/interfaces/IMarketPlaceDeps.sol";

// ───────────────────────────── Mocks ─────────────────────────────
// Thay bằng PaymentSplitter / ImpactBadge thật khi đã có (xem ghi chú cuối file).

contract MockPaymentSplitter is IPaymentSplitter {
    address public immutable treasury;
    uint256 public constant SELLER_BPS = 9_000; // 90% seller, 10% treasury

    constructor(address _treasury) {
        treasury = _treasury;
    }

    function splitPayment(address seller, ProductType) external payable {
        uint256 sellerShare = (msg.value * SELLER_BPS) / 10_000;
        (bool ok1,) = seller.call{value: sellerShare}("");
        (bool ok2,) = treasury.call{value: msg.value - sellerShare}("");
        require(ok1 && ok2, "split failed");
    }
}

contract MockImpactBadge is IImpactBadge {
    uint256 public totalMinted;
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => ProductType) public badgeType;

    function mint(address to, ProductType pType) external returns (uint256 tokenId) {
        tokenId = ++totalMinted;
        balanceOf[to]++;
        badgeType[tokenId] = pType;
    }
}

/// Buyer là contract không có receive() → không nhận được tiền hoàn.
contract NoReceiveBuyer {
    function buy(Marketplace m, uint256 id) external payable {
        m.purchaseListing{value: msg.value}(id);
    }
}

// ───────────────────────────── Tests ─────────────────────────────

contract MarketplaceTest is Test {
    Marketplace internal market;
    MockPaymentSplitter internal splitter;
    MockImpactBadge internal badge;

    address internal owner = makeAddr("owner");
    address internal treasury = makeAddr("treasury");
    address internal seller = makeAddr("seller");
    address internal buyer = makeAddr("buyer");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant PRICE = 1 ether;
    string internal constant URI = "ipfs://bafy.../product.json";

    event ListingCreated(
        uint256 indexed listingId, address indexed seller, uint256 price, ProductType pType, string metadataURI
    );
    event ListingPurchased(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed listingId, address indexed cancelledBy);

    function setUp() public {
        splitter = new MockPaymentSplitter(treasury);
        badge = new MockImpactBadge();
        market = new Marketplace(address(splitter), address(badge), owner);
        vm.deal(buyer, 100 ether);
    }

    function _create() internal returns (uint256 id) {
        vm.prank(seller);
        id = market.createListing(PRICE, ProductType.Handicraft, URI);
    }

    // ───────────── constructor ─────────────

    function test_constructor_setsState() public view {
        assertEq(address(market.paymentSplitter()), address(splitter));
        assertEq(address(market.impactBadge()), address(badge));
        assertEq(market.owner(), owner);
        assertEq(market.nextListingId(), 1);
    }

    function test_constructor_revertsOnZeroAddress() public {
        vm.expectRevert(Marketplace.ZeroAddress.selector);
        new Marketplace(address(0), address(badge), owner);

        vm.expectRevert(Marketplace.ZeroAddress.selector);
        new Marketplace(address(splitter), address(0), owner);
    }

    // ───────────── createListing ─────────────

    function test_createListing_success_andIdIncrements() public {
        vm.expectEmit(true, true, false, true);
        emit ListingCreated(1, seller, PRICE, ProductType.Handicraft, URI);
        uint256 id1 = _create();

        vm.prank(seller);
        uint256 id2 = market.createListing(2 ether, ProductType.Food, "ipfs://second");

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(market.nextListingId(), 3);

        Marketplace.Listing memory l = market.getListing(id1);
        assertEq(l.id, 1);
        assertEq(l.seller, seller);
        assertEq(l.price, PRICE);
        assertEq(uint8(l.pType), uint8(ProductType.Handicraft));
        assertEq(l.metadataURI, URI);
        assertTrue(l.isActive);

        assertEq(market.getListing(id2).seller, seller);
        assertEq(market.getListing(id2).price, 2 ether);
    }

    function test_createListing_revertsOnZeroPrice() public {
        vm.prank(seller);
        vm.expectRevert(Marketplace.ZeroPrice.selector);
        market.createListing(0, ProductType.Handicraft, URI);
    }

    function test_createListing_revertsOnEmptyURI() public {
        vm.prank(seller);
        vm.expectRevert(Marketplace.EmptyMetadataURI.selector);
        market.createListing(PRICE, ProductType.Handicraft, "");
    }

    // ───────────── purchaseListing ─────────────

    function test_purchase_splitsPaymentCorrectly() public {
        uint256 id = _create();
        uint256 sellerBefore = seller.balance;
        uint256 treasuryBefore = treasury.balance;
        uint256 buyerBefore = buyer.balance;

        vm.expectEmit(true, true, true, true);
        emit ListingPurchased(id, buyer, seller, PRICE);
        vm.prank(buyer);
        market.purchaseListing{value: PRICE}(id);

        assertEq(seller.balance - sellerBefore, 0.9 ether);
        assertEq(treasury.balance - treasuryBefore, 0.1 ether);
        assertEq(buyerBefore - buyer.balance, PRICE);
        assertEq(address(market).balance, 0, "market must not hold funds");
        assertEq(address(splitter).balance, 0, "splitter must not hold funds");
        assertFalse(market.getListing(id).isActive);
    }

    function test_purchase_mintsBadgeToBuyer() public {
        vm.prank(seller);
        uint256 id = market.createListing(PRICE, ProductType.Experience, URI);

        vm.prank(buyer);
        market.purchaseListing{value: PRICE}(id);

        assertEq(badge.balanceOf(buyer), 1);
        assertEq(badge.totalMinted(), 1);
        assertEq(uint8(badge.badgeType(1)), uint8(ProductType.Experience));
    }

    function test_purchase_refundsExcess() public {
        uint256 id = _create();
        uint256 buyerBefore = buyer.balance;

        vm.prank(buyer);
        market.purchaseListing{value: 3 ether}(id);

        assertEq(buyerBefore - buyer.balance, PRICE, "only price is charged");
        assertEq(address(market).balance, 0);
    }

    function test_purchase_revertsIfRefundFails() public {
        uint256 id = _create();
        NoReceiveBuyer b = new NoReceiveBuyer();
        vm.deal(address(b), 5 ether);

        vm.expectRevert(Marketplace.RefundFailed.selector);
        b.buy{value: 2 ether}(market, id);

        // revert toàn bộ → listing vẫn active, không mint badge
        assertTrue(market.getListing(id).isActive);
        assertEq(badge.totalMinted(), 0);
    }

    function test_purchase_revertsIfInsufficientEth() public {
        uint256 id = _create();

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.InsufficientPayment.selector, PRICE, PRICE - 1));
        market.purchaseListing{value: PRICE - 1}(id);

        assertTrue(market.getListing(id).isActive);
    }

    function test_purchase_revertsIfAlreadyPurchased() public {
        uint256 id = _create();
        vm.prank(buyer);
        market.purchaseListing{value: PRICE}(id);

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.ListingNotActive.selector, id));
        market.purchaseListing{value: PRICE}(id);
    }

    function test_purchase_revertsIfCancelled() public {
        uint256 id = _create();
        vm.prank(seller);
        market.cancelListing(id);

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.ListingNotActive.selector, id));
        market.purchaseListing{value: PRICE}(id);
    }

    function test_purchase_revertsIfListingNotFound() public {
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.ListingNotFound.selector, 999));
        market.purchaseListing{value: PRICE}(999);
    }

    function testFuzz_purchase_splitsAnyPrice(uint96 price, uint96 extra) public {
        price = uint96(bound(price, 1, 50 ether));
        extra = uint96(bound(extra, 0, 10 ether));

        vm.prank(seller);
        uint256 id = market.createListing(price, ProductType.Food, URI);

        uint256 sellerBefore = seller.balance;
        uint256 treasuryBefore = treasury.balance;

        vm.deal(buyer, uint256(price) + extra);
        vm.prank(buyer);
        market.purchaseListing{value: uint256(price) + extra}(id);

        assertEq((seller.balance - sellerBefore) + (treasury.balance - treasuryBefore), price);
        assertEq(address(market).balance, 0);
        assertEq(buyer.balance, extra);
    }

    // ───────────── cancelListing ─────────────

    function test_cancel_bySeller() public {
        uint256 id = _create();

        vm.expectEmit(true, true, false, false);
        emit ListingCancelled(id, seller);
        vm.prank(seller);
        market.cancelListing(id);

        assertFalse(market.getListing(id).isActive);
    }

    function test_cancel_byOwner() public {
        uint256 id = _create();

        vm.expectEmit(true, true, false, false);
        emit ListingCancelled(id, owner);
        vm.prank(owner);
        market.cancelListing(id);

        assertFalse(market.getListing(id).isActive);
    }

    function test_cancel_revertsForStranger() public {
        uint256 id = _create();

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.NotSellerOrOwner.selector, stranger));
        market.cancelListing(id);

        assertTrue(market.getListing(id).isActive);
    }

    function test_cancel_revertsIfAlreadyInactive() public {
        uint256 id = _create();
        vm.startPrank(seller);
        market.cancelListing(id);

        vm.expectRevert(abi.encodeWithSelector(Marketplace.ListingNotActive.selector, id));
        market.cancelListing(id);
        vm.stopPrank();
    }

    function test_cancel_revertsIfNotFound() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.ListingNotFound.selector, 42));
        market.cancelListing(42);
    }
}

// Ghi chú tích hợp: khi PaymentSplitter/ImpactBadge thật đã sẵn sàng, thêm một
// test integration (deploy contract thật, grant MINTER_ROLE cho Marketplace,
// kiểm tra số dư theo tỉ lệ chia thật) bên cạnh các test dùng mock ở trên.
