// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {EcoToken} from "../src/EcoToken.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";
import {CommunityTreasury} from "../src/CommunityTreasury.sol";
import {Governance} from "../src/Governance.sol";
import {CarbonOffset} from "../src/CarbonOffset.sol";
import {QuestRewards} from "../src/QuestRewards.sol";
import {QuestSetup} from "../script/QuestSetup.sol";

/// @dev Thử claim lại khi nhận badge thưởng (reentrancy).
contract ReentrantQuester {
    QuestRewards internal quests;
    uint256 internal questId;
    bool internal attacked;
    bool public reentryFailed;

    constructor(QuestRewards q, uint256 id) {
        quests = q;
        questId = id;
    }

    function claim() external {
        quests.claim(questId, new uint256[](0));
    }

    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        if (!attacked) {
            attacked = true;
            try quests.claim(questId, new uint256[](0)) {} catch { reentryFailed = true; }
        }
        return this.onERC721Received.selector;
    }
}

contract QuestRewardsTest is Test {
    EcoToken internal eco;
    ImpactBadge internal badge;
    CommunityTreasury internal treasury;
    Governance internal gov;
    CarbonOffset internal carbon;
    QuestRewards internal quests;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant Q_FIRST_CRAFT = 0;
    uint256 internal constant Q_THREE_CRAFTS = 1;
    uint256 internal constant Q_FIRST_OFFSET = 2;
    uint256 internal constant Q_CLIMATE_HERO = 3;
    uint256 internal constant Q_DAO_VOTE = 4;
    uint256 internal constant Q_HERITAGE = 5;

    event QuestCompleted(address indexed user, uint256 indexed questId, uint256 ecoReward, uint256 badgeTokenId);

    function setUp() public {
        eco = new EcoToken(owner);
        badge = new ImpactBadge(owner);
        treasury = new CommunityTreasury(owner);
        gov = new Governance(address(eco), payable(address(treasury)), 1 ether, 1000, 1 hours, owner);
        carbon = new CarbonOffset(address(badge), address(treasury), 0.00001 ether, owner);
        quests = new QuestRewards(address(eco), address(badge), address(carbon), address(gov), owner);

        vm.startPrank(owner);
        treasury.setGovernance(address(gov));
        badge.grantRole(badge.MINTER_ROLE(), address(carbon));
        badge.grantRole(badge.MINTER_ROLE(), address(quests));
        eco.grantRole(eco.MINTER_ROLE(), address(quests));
        eco.grantRole(eco.MINTER_ROLE(), owner);
        QuestSetup.addDefaultQuests(quests);
        vm.stopPrank();
    }

    // ───────────────────────── helpers ─────────────────────────

    /// @dev Giống Marketplace mua hàng thủ công: mint badge ECO_CHECKIN cho `to`.
    function _craftBadge(address to) internal returns (uint256) {
        vm.prank(owner);
        return badge.mintBadge(to, ImpactBadge.BadgeType.ECO_CHECKIN, "ipfs://craft");
    }

    function _ids(uint256 a) internal pure returns (uint256[] memory r) {
        r = new uint256[](1);
        r[0] = a;
    }

    function _ids(uint256 a, uint256 b, uint256 c) internal pure returns (uint256[] memory r) {
        r = new uint256[](3);
        (r[0], r[1], r[2]) = (a, b, c);
    }

    function _offset(address who, uint256 grams) internal {
        uint256 fee = carbon.quoteOffset(grams);
        vm.deal(who, fee);
        vm.prank(who);
        carbon.offset{value: fee}(grams, "");
    }

    // ───────────────────────── setup / admin ─────────────────────────

    function test_DefaultQuestsLoaded() public view {
        assertEq(quests.questCount(), QuestSetup.QUEST_COUNT);
        QuestRewards.Quest memory q = quests.getQuest(Q_THREE_CRAFTS);
        assertEq(uint8(q.requirement), uint8(QuestRewards.Requirement.BADGES_OF_TYPE));
        assertEq(q.target, 3);
        assertEq(q.ecoReward, 30 ether);
        assertTrue(q.rewardsBadge);
        assertEq(quests.getQuests().length, QuestSetup.QUEST_COUNT);
        assertEq(quests.getQuest(Q_HERITAGE).ecoReward, 0);
    }

    function test_Constructor_RevertsOnZeroAddress() public {
        vm.expectRevert(QuestRewards.ZeroAddress.selector);
        new QuestRewards(address(0), address(badge), address(carbon), address(gov), owner);
    }

    function test_AddQuest_OnlyOwner() public {
        QuestRewards.Quest memory q = quests.getQuest(Q_FIRST_OFFSET);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        quests.addQuest(q);
    }

    function test_AddQuest_RejectsUnsafeConfigs() public {
        vm.startPrank(owner);
        QuestRewards.Quest memory q = quests.getQuest(Q_HERITAGE);

        // Quest tự khai báo không được thưởng ECO
        q.ecoReward = 1 ether;
        vm.expectRevert(QuestRewards.InvalidQuest.selector);
        quests.addQuest(q);

        // Thưởng đúng loại badge làm bằng chứng
        q = quests.getQuest(Q_THREE_CRAFTS);
        q.rewardBadgeType = ImpactBadge.BadgeType.ECO_CHECKIN;
        vm.expectRevert(QuestRewards.InvalidQuest.selector);
        quests.addQuest(q);

        // Thưởng badge ECO_CHECKIN (bằng chứng mua hàng) dù ở loại quest khác
        q = quests.getQuest(Q_DAO_VOTE);
        q.rewardBadgeType = ImpactBadge.BadgeType.ECO_CHECKIN;
        vm.expectRevert(QuestRewards.InvalidQuest.selector);
        quests.addQuest(q);

        // Quest đếm số lượng với target = 0
        q = quests.getQuest(Q_FIRST_OFFSET);
        q.target = 0;
        vm.expectRevert(QuestRewards.InvalidQuest.selector);
        quests.addQuest(q);

        // Không có phần thưởng nào
        q = quests.getQuest(Q_FIRST_OFFSET);
        q.ecoReward = 0;
        vm.expectRevert(QuestRewards.InvalidQuest.selector);
        quests.addQuest(q);

        // Badge thưởng thiếu metadata
        q = quests.getQuest(Q_DAO_VOTE);
        q.badgeURI = "";
        vm.expectRevert(QuestRewards.InvalidQuest.selector);
        quests.addQuest(q);
        vm.stopPrank();
    }

    function test_SetQuestActive() public {
        vm.prank(owner);
        quests.setQuestActive(Q_HERITAGE, false);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(QuestRewards.QuestInactive.selector, Q_HERITAGE));
        quests.claim(Q_HERITAGE, new uint256[](0));

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        quests.setQuestActive(Q_HERITAGE, true);
    }

    function test_Claim_UnknownQuest() public {
        vm.expectRevert(abi.encodeWithSelector(QuestRewards.QuestNotFound.selector, 99));
        quests.claim(99, new uint256[](0));
        assertFalse(quests.canClaim(alice, 99, new uint256[](0)));
    }

    // ───────────────────────── BADGES_OF_TYPE ─────────────────────────

    function test_FirstCraft_MintsEco() public {
        uint256 id = _craftBadge(alice);
        assertTrue(quests.canClaim(alice, Q_FIRST_CRAFT, _ids(id)));

        vm.expectEmit(true, true, false, true);
        emit QuestCompleted(alice, Q_FIRST_CRAFT, 10 ether, 0);
        vm.prank(alice);
        uint256 badgeId = quests.claim(Q_FIRST_CRAFT, _ids(id));

        assertEq(badgeId, 0);
        assertEq(eco.balanceOf(alice), 10 ether);
        assertTrue(quests.isCompleted(alice, Q_FIRST_CRAFT));
        assertEq(quests.completedCountOf(alice), 1);
    }

    function test_ThreeCrafts_MintsEcoAndRareBadge() public {
        uint256 a = _craftBadge(alice);
        uint256 b = _craftBadge(alice);
        uint256 c = _craftBadge(alice);

        vm.prank(alice);
        uint256 badgeId = quests.claim(Q_THREE_CRAFTS, _ids(a, b, c));

        assertEq(eco.balanceOf(alice), 30 ether);
        assertEq(badge.ownerOf(badgeId), alice);
        assertEq(uint8(badge.getBadge(badgeId).badgeType), uint8(ImpactBadge.BadgeType.CULTURE_GUARDIAN));
        assertEq(badge.tokenURI(badgeId), quests.getQuest(Q_THREE_CRAFTS).badgeURI);
    }

    function test_ThreeCrafts_RevertsWithTooFewBadges() public {
        uint256 a = _craftBadge(alice);
        uint256 b = _craftBadge(alice);
        uint256[] memory ids = new uint256[](2);
        (ids[0], ids[1]) = (a, b);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(QuestRewards.RequirementNotMet.selector, Q_THREE_CRAFTS));
        quests.claim(Q_THREE_CRAFTS, ids);
    }

    function test_ThreeCrafts_RejectsDuplicateOrUnsortedIds() public {
        uint256 a = _craftBadge(alice);
        uint256 b = _craftBadge(alice);
        uint256 c = _craftBadge(alice);

        assertFalse(quests.canClaim(alice, Q_THREE_CRAFTS, _ids(a, a, b)));
        assertFalse(quests.canClaim(alice, Q_THREE_CRAFTS, _ids(c, b, a)));
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(QuestRewards.RequirementNotMet.selector, Q_THREE_CRAFTS));
        quests.claim(Q_THREE_CRAFTS, _ids(a, a, b));
    }

    function test_Crafts_RejectsBadgesOfOthersOrWrongType() public {
        uint256 bobs = _craftBadge(bob);
        vm.prank(owner);
        uint256 wrongType = badge.mintBadge(alice, ImpactBadge.BadgeType.ZERO_CARBON, "ipfs://x");

        assertFalse(quests.canClaim(alice, Q_FIRST_CRAFT, _ids(bobs)));
        assertFalse(quests.canClaim(alice, Q_FIRST_CRAFT, _ids(wrongType)));
        assertFalse(quests.canClaim(alice, Q_FIRST_CRAFT, _ids(999))); // không tồn tại
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(QuestRewards.RequirementNotMet.selector, Q_FIRST_CRAFT));
        quests.claim(Q_FIRST_CRAFT, _ids(999));
    }

    function test_Crafts_TransferredBadgeDoesNotCount() public {
        uint256 id = _craftBadge(bob);
        vm.prank(bob);
        badge.transferFrom(bob, alice, id);

        // Alice đang giữ badge nhưng không phải người nhận gốc
        assertFalse(quests.canClaim(alice, Q_FIRST_CRAFT, _ids(id)));
        // Bob vẫn chứng minh được việc mua hàng của mình
        assertTrue(quests.canClaim(bob, Q_FIRST_CRAFT, _ids(id)));
    }

    function test_Claim_RevertsOnTooManyProofIds() public {
        uint256[] memory ids = new uint256[](51);
        vm.prank(alice);
        vm.expectRevert(QuestRewards.TooManyProofIds.selector);
        quests.claim(Q_FIRST_CRAFT, ids);
    }

    // ───────────────────────── Carbon ─────────────────────────

    function test_FirstOffset() public {
        assertFalse(quests.canClaim(alice, Q_FIRST_OFFSET, new uint256[](0)));
        _offset(alice, 500);
        vm.prank(alice);
        quests.claim(Q_FIRST_OFFSET, new uint256[](0));
        assertEq(eco.balanceOf(alice), 10 ether);
    }

    function test_ClimateHero_NeedsHundredKg() public {
        _offset(alice, 60_000);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(QuestRewards.RequirementNotMet.selector, Q_CLIMATE_HERO));
        quests.claim(Q_CLIMATE_HERO, new uint256[](0));

        _offset(alice, 40_000); // tổng 100 kg
        vm.prank(alice);
        uint256 badgeId = quests.claim(Q_CLIMATE_HERO, new uint256[](0));
        assertEq(eco.balanceOf(alice), 25 ether);
        assertEq(uint8(badge.getBadge(badgeId).badgeType), uint8(ImpactBadge.BadgeType.ZERO_CARBON));
    }

    // ───────────────────────── DAO ─────────────────────────

    function test_DaoVote() public {
        vm.prank(owner);
        eco.mint(bob, 100 ether);
        vm.prank(bob);
        eco.delegate(bob);
        vm.roll(block.number + 2);

        vm.deal(address(treasury), 1 ether);
        vm.prank(bob);
        uint256 proposalId = gov.propose(payable(bob), 0.1 ether, "Trong cay");

        assertFalse(quests.canClaim(bob, Q_DAO_VOTE, _ids(proposalId)));
        vm.prank(bob);
        gov.vote(proposalId, true);

        assertTrue(quests.canClaim(bob, Q_DAO_VOTE, _ids(proposalId)));
        assertFalse(quests.canClaim(bob, Q_DAO_VOTE, new uint256[](0))); // thiếu proposalId
        assertFalse(quests.canClaim(alice, Q_DAO_VOTE, _ids(proposalId))); // alice chưa vote

        vm.prank(bob);
        uint256 badgeId = quests.claim(Q_DAO_VOTE, _ids(proposalId));
        assertEq(eco.balanceOf(bob), 120 ether);
        assertEq(uint8(badge.getBadge(badgeId).badgeType), uint8(ImpactBadge.BadgeType.COMMUNITY_DONOR));
    }

    // ───────────────────────── Self-attested / once-only ─────────────────────────

    function test_Heritage_BadgeOnly_AndOnlyOnce() public {
        vm.prank(alice);
        uint256 badgeId = quests.claim(Q_HERITAGE, new uint256[](0));
        assertEq(eco.balanceOf(alice), 0);
        assertEq(badge.ownerOf(badgeId), alice);
        assertEq(uint8(badge.getBadge(badgeId).badgeType), uint8(ImpactBadge.BadgeType.CULTURE_GUARDIAN));

        assertFalse(quests.canClaim(alice, Q_HERITAGE, new uint256[](0)));
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(QuestRewards.AlreadyCompleted.selector, Q_HERITAGE));
        quests.claim(Q_HERITAGE, new uint256[](0));
    }

    function test_CompletedOf() public {
        uint256 id = _craftBadge(alice);
        vm.startPrank(alice);
        quests.claim(Q_FIRST_CRAFT, _ids(id));
        quests.claim(Q_HERITAGE, new uint256[](0));
        vm.stopPrank();

        bool[] memory done = quests.completedOf(alice);
        assertEq(done.length, QuestSetup.QUEST_COUNT);
        assertTrue(done[Q_FIRST_CRAFT]);
        assertTrue(done[Q_HERITAGE]);
        assertFalse(done[Q_THREE_CRAFTS]);
        assertEq(quests.completedCountOf(alice), 2);
    }

    function test_Reentrancy_Blocked() public {
        ReentrantQuester attacker = new ReentrantQuester(quests, Q_HERITAGE);
        attacker.claim();
        assertTrue(attacker.reentryFailed());
        assertEq(badge.balanceOf(address(attacker)), 1);
    }

    function test_Claim_RevertsWithoutMinterRole() public {
        bytes32 minterRole = eco.MINTER_ROLE();
        vm.prank(owner);
        eco.revokeRole(minterRole, address(quests));
        _offset(alice, 1000);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, address(quests), minterRole
            )
        );
        quests.claim(Q_FIRST_OFFSET, new uint256[](0));
    }

    function testFuzz_OffsetGramsThreshold(uint256 grams) public {
        grams = bound(grams, 1, 200_000);
        _offset(alice, grams);
        assertEq(quests.canClaim(alice, Q_CLIMATE_HERO, new uint256[](0)), grams >= 100_000);
    }
}
