// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";

contract ERC721ReceiverMock {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}

contract ImpactBadgeTest is Test {
    ImpactBadge internal badge;

    address internal admin = makeAddr("admin");
    address internal minter = makeAddr("minter");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal attacker = makeAddr("attacker");

    string internal constant URI_1 = "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/1.json";
    string internal constant URI_2 = "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/2.json";
    string internal constant URI_3 = "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/3.json";

    event BadgeMinted(address indexed to, uint256 tokenId, ImpactBadge.BadgeType badgeType);

function setUp() public {
    badge = new ImpactBadge(admin);

    vm.startPrank(admin);
    
    badge.grantRole(badge.MINTER_ROLE(), minter);
    
    vm.stopPrank();
}

    function test_Deployment_SetsNameSymbolAndRoles() public view {
        assertEq(badge.name(), "Impact Badge");
        assertEq(badge.symbol(), "IMPACT");
        assertTrue(badge.hasRole(badge.DEFAULT_ADMIN_ROLE(), admin));
        // Admin quản lý role nhưng mặc định không tự gán MINTER_ROLE cho mình
        assertTrue(badge.hasRole(badge.MINTER_ROLE(), admin));
        assertTrue(badge.hasRole(badge.MINTER_ROLE(), minter));
        assertEq(badge.totalMinted(), 0);
    }


    function test_Mint_Succeeds_AndStoresBadgeData() public {
        vm.warp(1_700_000_000);

        vm.prank(minter);
        uint256 tokenId = badge.mintBadge(alice, ImpactBadge.BadgeType.ECO_CHECKIN, URI_1);

        assertEq(tokenId, 1);
        assertEq(badge.ownerOf(tokenId), alice);
        assertEq(badge.balanceOf(alice), 1);

        ImpactBadge.Badge memory b = badge.getBadge(tokenId);
        assertEq(uint8(b.badgeType), uint8(ImpactBadge.BadgeType.ECO_CHECKIN));
        assertEq(b.issuedAt, 1_700_000_000);
        assertEq(b.recipient, alice);
    }

    function test_Mint_TokenIdIncrementsCorrectly() public {
        vm.startPrank(minter);
        uint256 id1 = badge.mintBadge(alice, ImpactBadge.BadgeType.ECO_CHECKIN, URI_1);
        uint256 id2 = badge.mintBadge(bob, ImpactBadge.BadgeType.ZERO_CARBON, URI_2);
        uint256 id3 = badge.mintBadge(alice, ImpactBadge.BadgeType.CULTURE_GUARDIAN, URI_3);
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(id3, 3);
        assertEq(badge.totalMinted(), 3);
    }

    function test_Mint_EmitsBadgeMinted() public {
        vm.expectEmit(true, false, false, true, address(badge));
        emit BadgeMinted(alice, 1, ImpactBadge.BadgeType.COMMUNITY_DONOR);

        vm.prank(minter);
        badge.mintBadge(alice, ImpactBadge.BadgeType.COMMUNITY_DONOR, URI_1);
    }

    function test_Mint_AllBadgeTypes() public {
        vm.startPrank(minter);
        uint256 a = badge.mintBadge(alice, ImpactBadge.BadgeType.ECO_CHECKIN, URI_1);
        uint256 b = badge.mintBadge(alice, ImpactBadge.BadgeType.ZERO_CARBON, URI_2);
        uint256 c = badge.mintBadge(alice, ImpactBadge.BadgeType.CULTURE_GUARDIAN, URI_3);
        uint256 d = badge.mintBadge(alice, ImpactBadge.BadgeType.COMMUNITY_DONOR, URI_1);
        vm.stopPrank();

        assertEq(uint8(badge.getBadge(a).badgeType), 0);
        assertEq(uint8(badge.getBadge(b).badgeType), 1);
        assertEq(uint8(badge.getBadge(c).badgeType), 2);
        assertEq(uint8(badge.getBadge(d).badgeType), 3);
    }

    function test_Mint_ToContractReceiver_Works() public {
        ERC721ReceiverMock receiver = new ERC721ReceiverMock();
        vm.prank(minter);
        uint256 id = badge.mintBadge(address(receiver), ImpactBadge.BadgeType.ECO_CHECKIN, URI_1);
        assertEq(badge.ownerOf(id), address(receiver));
    }

    function test_Mint_RevertsWithoutMinterRole() public {
        bytes32 role = badge.MINTER_ROLE();
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, attacker, role)
        );
        vm.prank(attacker);
        badge.mintBadge(attacker, ImpactBadge.BadgeType.ECO_CHECKIN, URI_1);
    }

    function test_Mint_RevertsAfterRoleRevoked() public {
        bytes32 role = badge.MINTER_ROLE();
        vm.prank(admin);
        badge.revokeRole(role, minter);

        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, minter, role));
        vm.prank(minter);
        badge.mintBadge(alice, ImpactBadge.BadgeType.ECO_CHECKIN, URI_1);
    }

    function test_Mint_RevertsOnZeroAddress() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721InvalidReceiver.selector, address(0)));
        vm.prank(minter);
        badge.mintBadge(address(0), ImpactBadge.BadgeType.ECO_CHECKIN, URI_1);
    }

    function test_Mint_RevertsOnEmptyMetadataURI() public {
        vm.expectRevert(ImpactBadge.EmptyMetadataURI.selector);
        vm.prank(minter);
        badge.mintBadge(alice, ImpactBadge.BadgeType.ECO_CHECKIN, "");
    }


    function test_GetBadgesByOwner_ReturnsCorrectList() public {
        vm.startPrank(minter);
        badge.mintBadge(alice, ImpactBadge.BadgeType.ECO_CHECKIN, URI_1); // 1
        badge.mintBadge(bob, ImpactBadge.BadgeType.ZERO_CARBON, URI_2); // 2
        badge.mintBadge(alice, ImpactBadge.BadgeType.CULTURE_GUARDIAN, URI_3); // 3
        vm.stopPrank();

        uint256[] memory aliceIds = badge.getBadgesByOwner(alice);
        assertEq(aliceIds.length, 2);
        assertEq(aliceIds[0], 1);
        assertEq(aliceIds[1], 3);

        uint256[] memory bobIds = badge.getBadgesByOwner(bob);
        assertEq(bobIds.length, 1);
        assertEq(bobIds[0], 2);
    }

    function test_GetBadgesByOwner_EmptyForNonHolder() public view {
        assertEq(badge.getBadgesByOwner(alice).length, 0);
    }

    function test_GetBadgesByOwner_UpdatesAfterTransfer() public {
        vm.startPrank(minter);
        badge.mintBadge(alice, ImpactBadge.BadgeType.ECO_CHECKIN, URI_1); // 1
        badge.mintBadge(alice, ImpactBadge.BadgeType.ZERO_CARBON, URI_2); // 2
        vm.stopPrank();

        vm.prank(alice);
        badge.transferFrom(alice, bob, 1);

        uint256[] memory aliceIds = badge.getBadgesByOwner(alice);
        uint256[] memory bobIds = badge.getBadgesByOwner(bob);

        assertEq(aliceIds.length, 1);
        assertEq(aliceIds[0], 2);
        assertEq(bobIds.length, 1);
        assertEq(bobIds[0], 1);
    }

    function test_TokenURI_ReturnsIpfsUri() public {
        vm.startPrank(minter);
        uint256 id1 = badge.mintBadge(alice, ImpactBadge.BadgeType.ECO_CHECKIN, URI_1);
        uint256 id2 = badge.mintBadge(bob, ImpactBadge.BadgeType.ZERO_CARBON, URI_2);
        vm.stopPrank();

        assertEq(badge.tokenURI(id1), URI_1);
        assertEq(badge.tokenURI(id2), URI_2);
    }

    function test_TokenURI_RevertsForNonexistentToken() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 999));
        badge.tokenURI(999);
    }


    function test_Transfer_TransferFrom_Works() public {
        vm.prank(minter);
        uint256 id = badge.mintBadge(alice, ImpactBadge.BadgeType.ECO_CHECKIN, URI_1);

        vm.prank(alice);
        badge.transferFrom(alice, bob, id);

        assertEq(badge.ownerOf(id), bob);
        assertEq(badge.balanceOf(alice), 0);
        assertEq(badge.balanceOf(bob), 1);
        assertEq(badge.tokenURI(id), URI_1);
        assertEq(badge.getBadge(id).recipient, alice);
    }

    function test_Transfer_SafeTransferFrom_Works() public {
        vm.prank(minter);
        uint256 id = badge.mintBadge(alice, ImpactBadge.BadgeType.ECO_CHECKIN, URI_1);

        vm.prank(alice);
        badge.safeTransferFrom(alice, bob, id);

        assertEq(badge.ownerOf(id), bob);
    }

    function test_Transfer_ApprovedOperator_Works() public {
        vm.prank(minter);
        uint256 id = badge.mintBadge(alice, ImpactBadge.BadgeType.ECO_CHECKIN, URI_1);

        vm.prank(alice);
        badge.approve(bob, id);
        assertEq(badge.getApproved(id), bob);

        vm.prank(bob);
        badge.transferFrom(alice, bob, id);
        assertEq(badge.ownerOf(id), bob);
    }

    function test_Transfer_RevertsWhenNotOwnerOrApproved() public {
        vm.prank(minter);
        uint256 id = badge.mintBadge(alice, ImpactBadge.BadgeType.ECO_CHECKIN, URI_1);

        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721InsufficientApproval.selector, attacker, id));
        vm.prank(attacker);
        badge.transferFrom(alice, attacker, id);
    }

    function test_GetBadge_RevertsForNonexistentToken() public {
        vm.expectRevert(abi.encodeWithSelector(ImpactBadge.BadgeDoesNotExist.selector, 1));
        badge.getBadge(1);
    }

    function test_SupportsInterface() public view {
        assertTrue(badge.supportsInterface(type(IERC721).interfaceId));
        assertTrue(badge.supportsInterface(0x5b5e139f)); // ERC-721 Metadata
        assertTrue(badge.supportsInterface(type(IAccessControl).interfaceId));
        assertTrue(badge.supportsInterface(0x01ffc9a7)); // ERC-165
        assertFalse(badge.supportsInterface(0xffffffff));
    }

    function testFuzz_Mint_SequentialIdsAndOwnership(uint8 count) public {
        count = uint8(bound(count, 1, 50));

        vm.startPrank(minter);
        for (uint256 i = 0; i < count; i++) {
            uint256 id = badge.mintBadge(alice, ImpactBadge.BadgeType(i % 4), URI_1);
            assertEq(id, i + 1);
        }
        vm.stopPrank();

        assertEq(badge.balanceOf(alice), count);
        assertEq(badge.getBadgesByOwner(alice).length, count);
        assertEq(badge.totalMinted(), count);
    }
}