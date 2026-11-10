// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EcoToken} from "../src/EcoToken.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";
import {CommunityTreasury} from "../src/CommunityTreasury.sol";
import {Governance} from "../src/Governance.sol";
import {PaymentSplitter} from "../src/PaymentSplitter.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {CarbonOffset} from "../src/CarbonOffset.sol";
import {QuestRewards} from "../src/QuestRewards.sol";
import {QuestSetup} from "../script/QuestSetup.sol";
import {ProductType} from "../src/interfaces/IMarketPlaceDeps.sol";

/// @notice Regressions for proven attack scenarios, run with public-network defaults.
contract SecurityRegressionsTest is Test {
    EcoToken internal eco;
    ImpactBadge internal badge;
    CommunityTreasury internal treasury;
    Governance internal gov;
    PaymentSplitter internal splitter;
    Marketplace internal market;
    CarbonOffset internal carbon;
    QuestRewards internal quests;

    address internal owner = makeAddr("owner");
    address internal artisan = makeAddr("artisan");
    address internal buyer = makeAddr("buyer");
    address internal attacker = makeAddr("attacker");
    address internal guardian = makeAddr("guardian");

    uint256 internal constant QUORUM_BPS = 500;
    uint256 internal constant PERIOD = 3 days;

    function setUp() public {
        vm.startPrank(owner);
        eco = new EcoToken(owner);
        badge = new ImpactBadge(owner);
        treasury = new CommunityTreasury(owner);
        gov = new Governance(address(eco), payable(address(treasury)), 100 ether, QUORUM_BPS, PERIOD, owner);
        splitter = new PaymentSplitter(address(treasury), address(eco), 7000, 2000, 1000, 100 ether);
        market = new Marketplace(address(splitter), address(badge), owner);
        carbon = new CarbonOffset(address(badge), address(treasury), 0.00001 ether, owner);
        quests = new QuestRewards(address(eco), address(badge), address(carbon), address(gov), owner);

        bytes32 minter = eco.MINTER_ROLE();
        eco.grantRole(minter, address(splitter));
        eco.grantRole(minter, address(quests));
        badge.grantRole(minter, address(market));
        badge.grantRole(minter, address(carbon));
        badge.grantRole(minter, address(quests));
        splitter.setMarketplace(address(market));
        treasury.setGovernance(address(gov));
        gov.setGuardian(guardian);
        market.setArtisanVerified(artisan, true);
        QuestSetup.addDefaultQuests(quests);
        vm.stopPrank();

        vm.deal(buyer, 1_000 ether);
        vm.deal(attacker, 1_000 ether);
    }

    // ───────────────────────── helpers ─────────────────────────

    function _listing(uint256 price, ProductType pType) internal returns (uint256 id) {
        vm.prank(artisan);
        id = market.createListing(price, pType, "ipfs://listing");
    }

    function _buyAndConfirm(address who, uint256 id, uint256 price) internal {
        _buy(who, id, price);
        vm.prank(who);
        market.confirmDelivery(id);
    }

    function _buy(address who, uint256 id, uint256 price) internal {
        vm.prank(who);
        market.purchaseListing{value: price}(id);
    }

    /// @dev Attacker holds `votes` delegated ECO; treasury holds `funded` ETH.
    function _propose(uint256 votes, uint256 funded, uint256 amount) internal returns (uint256 id) {
        bytes32 minter = eco.MINTER_ROLE();
        vm.startPrank(owner);
        eco.grantRole(minter, owner);
        eco.mint(attacker, votes);
        vm.stopPrank();
        vm.deal(address(treasury), funded);
        vm.prank(attacker);
        eco.delegate(attacker);
        vm.roll(block.number + 1);
        vm.prank(attacker);
        id = gov.propose(payable(attacker), amount, "Du an");
    }

    function _voteAndCloseVoting(uint256 id) internal {
        Governance.Proposal memory p = gov.getProposal(id);
        vm.roll(p.snapshotBlock + 1);
        vm.prank(attacker);
        gov.vote(id, true);
        vm.warp(p.deadline);
    }

    // ───────────────────────── Farm ECO ─────────────────────────

    function test_Listing_RejectsUnverifiedSeller() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.ArtisanNotVerified.selector, attacker));
        market.createListing(1 ether, ProductType.Handicraft, "ipfs://x");
    }

    function test_Listing_RejectsDustPrice() public {
        vm.prank(artisan);
        vm.expectRevert(abi.encodeWithSelector(Marketplace.PriceBelowMinimum.selector, 1, 0.001 ether));
        market.createListing(1, ProductType.Handicraft, "ipfs://x");
    }

    function test_Purchase_RejectsSelfPurchase() public {
        uint256 id = _listing(0.01 ether, ProductType.Handicraft);
        vm.deal(artisan, 1 ether);
        vm.prank(artisan);
        vm.expectRevert(Marketplace.SelfPurchase.selector);
        market.purchaseListing{value: 0.01 ether}(id);
    }

    function test_Splitter_DirectPaymentNeverMintsEco() public {
        vm.prank(attacker);
        splitter.splitPayment{value: 1 ether}(attacker);
        assertEq(eco.balanceOf(attacker), 0);
    }

    function test_Splitter_BuyerOverloadOnlyFromMarketplace() public {
        vm.prank(attacker);
        vm.expectRevert(PaymentSplitter.NotMarketplace.selector);
        splitter.splitPayment{value: 1 ether}(attacker, attacker, ProductType.Handicraft);
    }

    function test_Marketplace_PurchaseStillRewardsBuyer() public {
        uint256 id = _listing(0.1 ether, ProductType.Handicraft);
        _buyAndConfirm(buyer, id, 0.1 ether);
        assertEq(eco.balanceOf(buyer), 10 ether);
        assertEq(artisan.balance, 0.07 ether);
    }

    function test_Quests_CheapActionsMintNoEco() public {
        // Offset, vote and self-attested quests only reward badges.
        uint256 fee = carbon.quoteOffset(100_000);
        vm.prank(buyer);
        carbon.offset{value: fee}(100_000, "");

        vm.startPrank(buyer);
        quests.claim(2, new uint256[](0));
        quests.claim(3, new uint256[](0));
        quests.claim(5, new uint256[](0));
        vm.stopPrank();
        assertEq(eco.balanceOf(buyer), 0);
    }

    function test_AddQuest_RejectsEcoOnNonPurchaseQuest() public {
        QuestRewards.Quest memory q = quests.getQuest(4); // DAO_VOTE
        q.ecoReward = 1 ether;
        vm.prank(owner);
        vm.expectRevert(QuestRewards.InvalidQuest.selector);
        quests.addQuest(q);
    }

    // ───────────────────────── Greenwashing ─────────────────────────

    function test_Carbon_RejectsTokenOffset() public {
        vm.prank(attacker);
        vm.expectRevert(CarbonOffset.InvalidCarbonAmount.selector);
        carbon.offset{value: 1 ether}(999, "");
    }

    function test_FoodPurchase_IsNotZeroCarbon() public {
        uint256 id = _listing(0.01 ether, ProductType.Food);
        _buyAndConfirm(buyer, id, 0.01 ether);
        assertEq(uint8(badge.getBadge(1).badgeType), uint8(ImpactBadge.BadgeType.CULTURE_GUARDIAN));
    }

    // ───────────────────────── Governance ─────────────────────────

    function test_Vote_BlockedDuringVotingDelay() public {
        uint256 id = _propose(1_000 ether, 10 ether, 1 ether);
        Governance.Proposal memory p = gov.getProposal(id);
        assertEq(p.snapshotBlock, block.number - 1 + gov.votingDelayBlocks());

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Governance.VotingNotStarted.selector, p.snapshotBlock));
        gov.vote(id, true);
    }

    function test_DelegatingDuringDelayCountsForDefenders() public {
        bytes32 minter = eco.MINTER_ROLE();
        vm.startPrank(owner);
        eco.grantRole(minter, owner);
        eco.mint(buyer, 5_000 ether);
        vm.stopPrank();

        uint256 id = _propose(1_000 ether, 10 ether, 1 ether);
        vm.prank(buyer);
        eco.delegate(buyer); // after the proposal, before the snapshot

        Governance.Proposal memory p = gov.getProposal(id);
        vm.roll(p.snapshotBlock + 1);
        vm.prank(attacker);
        gov.vote(id, true);
        vm.prank(buyer);
        gov.vote(id, false);
        vm.warp(p.deadline);

        gov.execute(id);
        assertTrue(gov.getProposal(id).finalized);
        assertEq(attacker.balance, 1_000 ether, "attacker must not be paid");
    }

    function test_Execute_WaitsForTimelock() public {
        uint256 id = _propose(1_000 ether, 10 ether, 1 ether);
        _voteAndCloseVoting(id);
        uint256 executeAfter = gov.getProposal(id).executeAfter;
        assertEq(executeAfter, block.timestamp + gov.executionDelay());

        vm.expectRevert(abi.encodeWithSelector(Governance.TimelockNotElapsed.selector, executeAfter));
        gov.execute(id);

        vm.warp(executeAfter);
        gov.execute(id);
        assertEq(address(treasury).balance, 9 ether);
    }

    function test_Execute_CappedPerProposal() public {
        uint256 id = _propose(1_000 ether, 10 ether, 10 ether);
        _voteAndCloseVoting(id);
        vm.warp(gov.getProposal(id).executeAfter);

        vm.expectRevert(abi.encodeWithSelector(Governance.ExceedsDisbursementCap.selector, 10 ether, 2 ether));
        gov.execute(id);
        assertEq(address(treasury).balance, 10 ether);
    }

    function test_Execute_ExpiresAfterGracePeriod() public {
        uint256 id = _propose(1_000 ether, 10 ether, 1 ether);
        _voteAndCloseVoting(id);
        vm.warp(gov.getProposal(id).executeAfter + gov.EXECUTION_GRACE_PERIOD() + 1);

        vm.expectRevert(Governance.ProposalExpired.selector);
        gov.execute(id);
    }

    function test_Guardian_CancelsMaliciousProposal() public {
        uint256 id = _propose(1_000 ether, 10 ether, 1 ether);
        _voteAndCloseVoting(id);

        vm.prank(attacker);
        vm.expectRevert(Governance.NotGuardian.selector);
        gov.cancel(id);

        vm.prank(guardian);
        gov.cancel(id);
        assertTrue(gov.getProposal(id).cancelled);

        vm.warp(gov.getProposal(id).executeAfter);
        vm.expectRevert(Governance.AlreadyFinalized.selector);
        gov.execute(id);
    }

    function test_CancelledProposal_CannotBeVoted() public {
        uint256 id = _propose(1_000 ether, 10 ether, 1 ether);
        vm.prank(guardian);
        gov.cancel(id);
        vm.roll(gov.getProposal(id).snapshotBlock + 1);
        vm.prank(attacker);
        vm.expectRevert(Governance.VotingClosed.selector);
        gov.vote(id, true);
    }

    function test_GovernanceSetters_Bounds() public {
        vm.startPrank(owner);
        uint256 maxDelay = gov.MAX_EXECUTION_DELAY();
        vm.expectRevert(Governance.InvalidParameter.selector);
        gov.setExecutionDelay(maxDelay + 1);
        vm.expectRevert(Governance.InvalidParameter.selector);
        gov.setMaxDisbursementBps(0);
        vm.expectRevert(Governance.InvalidParameter.selector);
        gov.setMaxDisbursementBps(10_001);
        // Delay must be shorter than the voting period.
        vm.expectRevert(Governance.InvalidParameter.selector);
        gov.setVotingDelayBlocks(PERIOD / 12);
        vm.expectRevert(Governance.InvalidParameter.selector);
        gov.setVotingPeriod(1 days); // shorter than the default 7,200-block delay
        vm.expectRevert(Governance.ZeroAddress.selector);
        gov.setGuardian(address(0));
        vm.stopPrank();
    }

    // ───────────────────────── Owner powers ─────────────────────────

    function test_Owner_CannotZeroOutArtisan() public {
        vm.startPrank(owner);
        vm.expectRevert(PaymentSplitter.ShareLimitExceeded.selector);
        splitter.setShares(0, 0, 10_000);
        vm.expectRevert(PaymentSplitter.ShareLimitExceeded.selector);
        splitter.setShares(4_999, 5_001, 0);
        vm.expectRevert(PaymentSplitter.ShareLimitExceeded.selector);
        splitter.setShares(7_000, 0, 3_000);
        vm.stopPrank();
    }

    function test_Ownership_IsTwoStep() public {
        address next = makeAddr("next");
        vm.prank(owner);
        market.transferOwnership(next);
        assertEq(market.owner(), owner, "owner unchanged until accepted");

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        market.acceptOwnership();

        vm.prank(next);
        market.acceptOwnership();
        assertEq(market.owner(), next);
    }

    function test_EcoAdmin_MovesOnlyOnAccept() public {
        address next = makeAddr("next");
        bytes32 admin = eco.DEFAULT_ADMIN_ROLE();
        vm.prank(owner);
        eco.transferOwnership(next);
        assertTrue(eco.hasRole(admin, owner));
        assertFalse(eco.hasRole(admin, next));

        vm.prank(next);
        eco.acceptOwnership();
        assertFalse(eco.hasRole(admin, owner));
        assertTrue(eco.hasRole(admin, next));
    }

    function test_Pause_StopsValueFlows() public {
        uint256 id = _listing(0.01 ether, ProductType.Handicraft);
        vm.startPrank(owner);
        market.pause();
        carbon.pause();
        quests.pause();
        vm.stopPrank();

        bytes4 paused = Pausable.EnforcedPause.selector;
        vm.prank(buyer);
        vm.expectRevert(paused);
        market.purchaseListing{value: 0.01 ether}(id);
        vm.prank(artisan);
        vm.expectRevert(paused);
        market.createListing(1 ether, ProductType.Food, "ipfs://x");
        vm.prank(buyer);
        vm.expectRevert(paused);
        carbon.offset{value: 1 ether}(1_000, "");
        vm.prank(buyer);
        vm.expectRevert(paused);
        quests.claim(5, new uint256[](0));

        // Sellers can still withdraw a listing while paused.
        vm.prank(artisan);
        market.cancelListing(id);

        vm.startPrank(owner);
        market.unpause();
        carbon.unpause();
        quests.unpause();
        vm.stopPrank();
        vm.prank(buyer);
        quests.claim(5, new uint256[](0));
    }

    function test_Pause_OnlyOwner() public {
        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        market.pause();
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        carbon.pause();
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        quests.pause();
        vm.stopPrank();
    }

    function test_MarketplaceAdminSetters() public {
        address next = makeAddr("nextContract");
        vm.startPrank(owner);
        market.setPaymentSplitter(next);
        market.setImpactBadge(next);
        market.setMinListingPrice(1 ether);
        market.setArtisanVerified(artisan, false);
        market.setArtisanVerificationRequired(false);
        vm.expectRevert(Marketplace.ZeroPrice.selector);
        market.setMinListingPrice(0);
        vm.expectRevert(Marketplace.ZeroAddress.selector);
        market.setArtisanVerified(address(0), true);
        vm.expectRevert(Marketplace.ZeroAddress.selector);
        market.setPaymentSplitter(address(0));
        vm.expectRevert(Marketplace.ZeroAddress.selector);
        market.setImpactBadge(address(0));
        vm.stopPrank();

        assertEq(address(market.paymentSplitter()), next);
        assertEq(address(market.impactBadge()), next);
        assertEq(market.minListingPrice(), 1 ether);
        assertFalse(market.verifiedArtisan(artisan));
        assertFalse(market.artisanVerificationRequired());

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        market.setArtisanVerified(attacker, true);
    }
}
