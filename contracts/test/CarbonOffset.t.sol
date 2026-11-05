// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";
import {CommunityTreasury} from "../src/CommunityTreasury.sol";
import {CarbonOffset} from "../src/CarbonOffset.sol";

/// @dev Ví hợp đồng không nhận ETH hoàn lại.
contract NoRefundReceiver {
    function doOffset(CarbonOffset c, uint256 grams) external payable {
        c.offset{value: msg.value}(grams, "");
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}

/// @dev Thử gọi lại offset() khi nhận NFT (reentrancy).
contract ReentrantReceiver {
    CarbonOffset internal c;
    bool internal attacked;

    constructor(CarbonOffset c_) {
        c = c_;
    }

    function attack(uint256 grams) external payable {
        c.offset{value: msg.value}(grams, "");
    }

    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        if (!attacked) {
            attacked = true;
            c.offset{value: 0}(1, "");
        }
        return this.onERC721Received.selector;
    }

    receive() external payable {}
}

contract CarbonOffsetTest is Test {
    ImpactBadge internal badge;
    CommunityTreasury internal treasury;
    CarbonOffset internal carbon;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal attacker = makeAddr("attacker");

    uint256 internal constant PRICE_PER_KG = 0.00001 ether;
    string internal constant META = "data:application/json;base64,eyJuYW1lIjoiWmVybyBDYXJib24ifQ==";

    event CarbonOffsetted(address indexed user, uint256 indexed tokenId, uint256 carbonGrams, uint256 paid);

    function setUp() public {
        badge = new ImpactBadge(owner);
        treasury = new CommunityTreasury(owner);
        carbon = new CarbonOffset(address(badge), address(treasury), PRICE_PER_KG, owner);

        bytes32 minterRole = badge.MINTER_ROLE();
        vm.prank(owner);
        badge.grantRole(minterRole, address(carbon));

        vm.deal(alice, 10 ether);
        vm.deal(attacker, 10 ether);
    }

    function test_Constructor_RevertsOnZeroAddress() public {
        vm.expectRevert(CarbonOffset.ZeroAddress.selector);
        new CarbonOffset(address(0), address(treasury), PRICE_PER_KG, owner);
        vm.expectRevert(CarbonOffset.ZeroAddress.selector);
        new CarbonOffset(address(badge), address(0), PRICE_PER_KG, owner);
    }

    function test_Quote_RoundsUpPerGram() public view {
        assertEq(carbon.quoteOffset(1000), PRICE_PER_KG); // 1 kg
        assertEq(carbon.quoteOffset(12_500), PRICE_PER_KG * 125 / 10); // 12.5 kg
        assertEq(carbon.quoteOffset(1), (PRICE_PER_KG + 999) / 1000);
    }

    function test_Offset_MintsZeroCarbonBadge_AndFundsTreasury() public {
        uint256 grams = 50_000; // 50 kg
        uint256 fee = carbon.quoteOffset(grams);

        vm.expectEmit(true, true, false, true, address(carbon));
        emit CarbonOffsetted(alice, 1, grams, fee);

        vm.prank(alice);
        uint256 tokenId = carbon.offset{value: fee}(grams, META);

        assertEq(tokenId, 1);
        assertEq(badge.ownerOf(tokenId), alice);
        assertEq(uint8(badge.getBadge(tokenId).badgeType), uint8(ImpactBadge.BadgeType.ZERO_CARBON));
        assertEq(badge.tokenURI(tokenId), META);
        assertEq(address(treasury).balance, fee);
        assertEq(carbon.offsetGramsOf(alice), grams);
        assertEq(carbon.offsetCountOf(alice), 1);
        assertEq(carbon.totalOffsetGrams(), grams);
    }

    function test_Offset_EmptyMetadata_UsesDefaultUri() public {
        uint256 fee = carbon.quoteOffset(1000);
        vm.prank(alice);
        uint256 tokenId = carbon.offset{value: fee}(1000, "");
        assertEq(badge.tokenURI(tokenId), badge.DEFAULT_METADATA_URI());
    }

    function test_Offset_RefundsExcess() public {
        uint256 fee = carbon.quoteOffset(2000);
        uint256 before = alice.balance;
        vm.prank(alice);
        carbon.offset{value: fee + 1 ether}(2000, "");
        assertEq(alice.balance, before - fee);
        assertEq(address(carbon).balance, 0);
    }

    function test_Offset_Accumulates() public {
        vm.startPrank(alice);
        carbon.offset{value: carbon.quoteOffset(1000)}(1000, "");
        carbon.offset{value: carbon.quoteOffset(3000)}(3000, "");
        vm.stopPrank();
        assertEq(carbon.offsetGramsOf(alice), 4000);
        assertEq(carbon.offsetCountOf(alice), 2);
        assertEq(badge.balanceOf(alice), 2);
    }

    function test_Offset_RevertsOnInvalidAmount() public {
        vm.startPrank(alice);
        vm.expectRevert(CarbonOffset.InvalidCarbonAmount.selector);
        carbon.offset(0, "");
        uint256 tooMuch = carbon.MAX_OFFSET_GRAMS() + 1;
        vm.expectRevert(CarbonOffset.InvalidCarbonAmount.selector);
        carbon.offset{value: 10 ether}(tooMuch, "");
        vm.stopPrank();
    }

    function test_Offset_RevertsOnInsufficientPayment() public {
        uint256 fee = carbon.quoteOffset(5000);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(CarbonOffset.InsufficientPayment.selector, fee, fee - 1));
        carbon.offset{value: fee - 1}(5000, "");
    }

    function test_Offset_RevertsOnLongMetadata() public {
        bytes memory long = new bytes(carbon.MAX_METADATA_URI_LENGTH() + 1);
        for (uint256 i; i < long.length; ++i) long[i] = "a";
        vm.prank(alice);
        vm.expectRevert(CarbonOffset.MetadataTooLong.selector);
        carbon.offset{value: 1 ether}(1000, string(long));
    }

    function test_Offset_RevertsWithoutMinterRole() public {
        CarbonOffset unauthorised = new CarbonOffset(address(badge), address(treasury), PRICE_PER_KG, owner);
        uint256 fee = unauthorised.quoteOffset(1000);
        bytes32 minterRole = badge.MINTER_ROLE();
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, address(unauthorised), minterRole
            )
        );
        unauthorised.offset{value: fee}(1000, "");
    }

    function test_Offset_RevertsWhenRefundFails() public {
        NoRefundReceiver receiver = new NoRefundReceiver();
        uint256 fee = carbon.quoteOffset(1000);
        vm.expectRevert(CarbonOffset.RefundFailed.selector);
        receiver.doOffset{value: fee + 1}(carbon, 1000);
    }

    function test_Offset_ReentrancyBlocked() public {
        ReentrantReceiver r = new ReentrantReceiver(carbon);
        uint256 fee = carbon.quoteOffset(1000);
        vm.prank(attacker);
        vm.expectRevert(); // nested offset() hits ReentrancyGuard, bubbling up through _safeMint
        r.attack{value: fee}(1000);
        assertEq(badge.totalMinted(), 0);
    }

    function test_SetPricePerKg_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        carbon.setPricePerKg(1);

        vm.prank(owner);
        carbon.setPricePerKg(2 ether);
        assertEq(carbon.pricePerKgWei(), 2 ether);
        assertEq(carbon.quoteOffset(1000), 2 ether);
    }

    function test_ZeroPrice_IsFree() public {
        vm.prank(owner);
        carbon.setPricePerKg(0);
        vm.prank(alice);
        uint256 tokenId = carbon.offset(1000, "");
        assertEq(badge.ownerOf(tokenId), alice);
        assertEq(address(treasury).balance, 0);
    }

    function testFuzz_Offset_PaysExactQuote(uint256 grams) public {
        grams = bound(grams, 1, carbon.MAX_OFFSET_GRAMS());
        uint256 fee = carbon.quoteOffset(grams);
        vm.deal(alice, fee);
        vm.prank(alice);
        carbon.offset{value: fee}(grams, "");
        assertEq(address(treasury).balance, fee);
        assertEq(alice.balance, 0);
    }
}
