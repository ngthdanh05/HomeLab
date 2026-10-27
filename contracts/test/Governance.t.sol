// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Governance} from "../src/Governance.sol";
import {CommunityTreasury} from "../src/CommunityTreasury.sol";
import {MockECO, RejectingReceiver} from "./mocks/Mocks.sol";

contract GovernanceTest is Test {
    MockECO eco;
    CommunityTreasury treasury;
    Governance gov;

    address owner = makeAddr("owner");
    address alice = makeAddr("alice"); // 400
    address bob = makeAddr("bob"); //     300
    address carol = makeAddr("carol"); // 200
    address dave = makeAddr("dave"); //    50 (dưới threshold)
    address eve = makeAddr("eve"); //      50
    address nobody = makeAddr("nobody"); //  0
    address payable recipient = payable(makeAddr("recipient"));

    uint256 constant THRESHOLD = 100 ether;
    uint256 constant QUORUM_BPS = 1000; // 10% của 1000 = 100 ECO
    uint256 constant PERIOD = 7 days;
    uint256 constant AMOUNT = 10 ether;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address indexed recipient,
        uint256 amount,
        uint256 snapshotBlock,
        uint256 deadline,
        string description
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId, address indexed recipient, uint256 amount);
    event ProposalRejected(uint256 indexed proposalId, uint256 votesFor, uint256 votesAgainst);

    function setUp() public {
        eco = new MockECO();
        treasury = new CommunityTreasury(owner);
        gov = new Governance(address(eco), payable(address(treasury)), THRESHOLD, QUORUM_BPS, PERIOD, owner);

        vm.prank(owner);
        treasury.setGovernance(address(gov));
        vm.deal(address(treasury), 100 ether);

        _mintAndDelegate(alice, 400 ether);
        _mintAndDelegate(bob, 300 ether);
        _mintAndDelegate(carol, 200 ether);
        _mintAndDelegate(dave, 50 ether);
        _mintAndDelegate(eve, 50 ether);

        vm.roll(block.number + 10); // checkpoints nằm trong quá khứ
    }

    function _mintAndDelegate(address who, uint256 amt) internal {
        eco.mint(who, amt);
        vm.prank(who);
        eco.delegate(who);
    }

    function _propose() internal returns (uint256) {
        vm.prank(alice);
        return gov.propose(recipient, AMOUNT, "Plant 1000 mangroves");
    }

    // ───────── constructor / config ─────────

    function test_Constructor_State() public view {
        assertEq(address(gov.ecoToken()), address(eco));
        assertEq(address(gov.treasury()), address(treasury));
        assertEq(gov.proposalThreshold(), THRESHOLD);
        assertEq(gov.quorumBps(), QUORUM_BPS);
        assertEq(gov.votingPeriod(), PERIOD);
    }

    function test_Constructor_Reverts() public {
        address payable t = payable(address(treasury));
        vm.expectRevert(Governance.ZeroAddress.selector);
        new Governance(address(0), t, THRESHOLD, QUORUM_BPS, PERIOD, owner);
        vm.expectRevert(Governance.ZeroAddress.selector);
        new Governance(address(eco), payable(address(0)), THRESHOLD, QUORUM_BPS, PERIOD, owner);
        vm.expectRevert(Governance.InvalidParameter.selector);
        new Governance(address(eco), t, THRESHOLD, 0, PERIOD, owner);
        vm.expectRevert(Governance.InvalidParameter.selector);
        new Governance(address(eco), t, THRESHOLD, 10_001, PERIOD, owner);
        vm.expectRevert(Governance.InvalidParameter.selector);
        new Governance(address(eco), t, THRESHOLD, QUORUM_BPS, 1 minutes, owner);
        vm.expectRevert(Governance.InvalidParameter.selector);
        new Governance(address(eco), t, THRESHOLD, QUORUM_BPS, 91 days, owner);
    }

    function test_Setters_OnlyOwner() public {
        vm.startPrank(owner);
        gov.setVotingPeriod(3 days);
        gov.setProposalThreshold(5 ether);
        gov.setQuorumBps(2000);
        vm.stopPrank();
        assertEq(gov.votingPeriod(), 3 days);
        assertEq(gov.proposalThreshold(), 5 ether);
        assertEq(gov.quorumBps(), 2000);

        vm.startPrank(alice);
        bytes memory err = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice);
        vm.expectRevert(err);
        gov.setVotingPeriod(3 days);
        vm.expectRevert(err);
        gov.setProposalThreshold(1);
        vm.expectRevert(err);
        gov.setQuorumBps(1);
        vm.stopPrank();
    }

    function test_Setters_InvalidValues() public {
        vm.startPrank(owner);
        vm.expectRevert(Governance.InvalidParameter.selector);
        gov.setVotingPeriod(1 minutes);
        vm.expectRevert(Governance.InvalidParameter.selector);
        gov.setQuorumBps(0);
        vm.expectRevert(Governance.InvalidParameter.selector);
        gov.setQuorumBps(10_001);
        vm.stopPrank();
    }

    function test_ConfigurableVotingPeriod_AppliedToNewProposal() public {
        vm.prank(owner);
        gov.setVotingPeriod(2 days);
        uint256 id = _propose();
        assertEq(gov.getProposal(id).deadline, block.timestamp + 2 days);
    }

    // ───────── propose ─────────

    function test_Propose_Success() public {
        uint256 expectedSnapshot = block.number - 1;
        uint256 expectedDeadline = block.timestamp + PERIOD;

        vm.expectEmit(true, true, true, true);
        emit ProposalCreated(1, alice, recipient, AMOUNT, expectedSnapshot, expectedDeadline, "Plant 1000 mangroves");
        uint256 id = _propose();

        assertEq(id, 1);
        assertEq(gov.proposalCount(), 1);
        Governance.Proposal memory p = gov.getProposal(id);
        assertEq(p.proposer, alice);
        assertEq(p.recipient, recipient);
        assertEq(p.amount, AMOUNT);
        assertEq(p.snapshotBlock, expectedSnapshot);
        assertEq(p.deadline, expectedDeadline);
        assertEq(p.quorumVotes, 100 ether);
        assertEq(p.votesFor, 0);
        assertEq(p.votesAgainst, 0);
        assertFalse(p.finalized);
    }

    function test_Propose_RevertWhenBelowThreshold() public {
        vm.prank(dave); // 50 < 100
        vm.expectRevert(abi.encodeWithSelector(Governance.BelowProposalThreshold.selector, 50 ether, THRESHOLD));
        gov.propose(recipient, AMOUNT, "x");

        vm.prank(nobody);
        vm.expectRevert(abi.encodeWithSelector(Governance.BelowProposalThreshold.selector, 0, THRESHOLD));
        gov.propose(recipient, AMOUNT, "x");
    }

    function test_Propose_RevertWhenZeroRecipientOrAmount() public {
        vm.startPrank(alice);
        vm.expectRevert(Governance.ZeroAddress.selector);
        gov.propose(payable(address(0)), AMOUNT, "x");
        vm.expectRevert(Governance.ZeroAmount.selector);
        gov.propose(recipient, 0, "x");
        vm.stopPrank();
    }

    function test_GetProposal_RevertWhenNotFound() public {
        vm.expectRevert(abi.encodeWithSelector(Governance.ProposalNotFound.selector, 99));
        gov.getProposal(99);
    }

    // ───────── vote ─────────

    function test_Vote_For_And_Against() public {
        uint256 id = _propose();

        vm.expectEmit(true, true, false, true);
        emit VoteCast(id, alice, true, 400 ether);
        vm.prank(alice);
        gov.vote(id, true);

        vm.expectEmit(true, true, false, true);
        emit VoteCast(id, bob, false, 300 ether);
        vm.prank(bob);
        gov.vote(id, false);

        Governance.Proposal memory p = gov.getProposal(id);
        assertEq(p.votesFor, 400 ether);
        assertEq(p.votesAgainst, 300 ether);
        assertTrue(gov.hasVoted(id, alice));
        assertTrue(gov.hasVoted(id, bob));
        assertFalse(gov.hasVoted(id, carol));
    }

    function test_Vote_RevertOnDoubleVote() public {
        uint256 id = _propose();
        vm.startPrank(alice);
        gov.vote(id, true);
        vm.expectRevert(Governance.AlreadyVoted.selector);
        gov.vote(id, true);
        vm.expectRevert(Governance.AlreadyVoted.selector);
        gov.vote(id, false);
        vm.stopPrank();
    }

    function test_Vote_RevertAfterDeadline() public {
        uint256 id = _propose();
        vm.warp(block.timestamp + PERIOD);
        vm.prank(alice);
        vm.expectRevert(Governance.VotingClosed.selector);
        gov.vote(id, true);
    }

    function test_Vote_RevertWhenProposalNotFound() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Governance.ProposalNotFound.selector, 1));
        gov.vote(1, true);
    }

    function test_Vote_RevertWhenNoVotingPower() public {
        uint256 id = _propose();
        vm.prank(nobody);
        vm.expectRevert(Governance.NoVotingPower.selector);
        gov.vote(id, true);
    }

    function test_Vote_WeightUsesSnapshot_NotCurrentBalance() public {
        uint256 id = _propose();

        // Sau khi propose: bob chuyển hết ECO cho dave + dave tự delegate
        vm.prank(bob);
        eco.transfer(dave, 300 ether);
        vm.prank(dave);
        eco.delegate(dave);
        vm.roll(block.number + 1);

        // dave vote → weight chỉ là 50 (snapshot), không phải 350
        vm.prank(dave);
        gov.vote(id, true);
        assertEq(gov.getProposal(id).votesFor, 50 ether);

        // bob đã chuyển token nhưng vẫn vote được với 300 (snapshot)
        vm.prank(bob);
        gov.vote(id, true);
        assertEq(gov.getProposal(id).votesFor, 350 ether);
    }

    // ───────── execute ─────────

    function test_Execute_Success_FundsReachRecipient() public {
        uint256 id = _propose();
        vm.prank(alice);
        gov.vote(id, true); // 400
        vm.prank(bob);
        gov.vote(id, false); // 300

        vm.warp(block.timestamp + PERIOD);

        uint256 treasuryBefore = address(treasury).balance;
        uint256 recipientBefore = recipient.balance;

        vm.expectEmit(true, true, false, true);
        emit ProposalExecuted(id, recipient, AMOUNT);
        gov.execute(id); // ai cũng gọi được

        assertEq(recipient.balance, recipientBefore + AMOUNT);
        assertEq(address(treasury).balance, treasuryBefore - AMOUNT);
        assertTrue(gov.getProposal(id).finalized);

        assertEq(treasury.disbursementsLength(), 1);
        (uint256 pid, address r, uint256 a,) = treasury.disbursements(0);
        assertEq(pid, id);
        assertEq(r, recipient);
        assertEq(a, AMOUNT);
    }

    function test_Execute_RevertBeforeDeadline() public {
        uint256 id = _propose();
        vm.prank(alice);
        gov.vote(id, true);

        vm.warp(block.timestamp + PERIOD - 1);
        vm.expectRevert(Governance.VotingNotEnded.selector);
        gov.execute(id);
    }

    function test_Execute_RevertWhenQuorumNotReached() public {
        uint256 id = _propose();
        vm.prank(dave);
        gov.vote(id, true); // 50 < quorum 100

        vm.warp(block.timestamp + PERIOD);
        vm.expectRevert(abi.encodeWithSelector(Governance.QuorumNotReached.selector, 50 ether, 100 ether));
        gov.execute(id);
        assertEq(recipient.balance, 0);
    }

    function test_Execute_QuorumExactlyMet() public {
        uint256 id = _propose();
        vm.prank(dave);
        gov.vote(id, true); // 50
        vm.prank(eve);
        gov.vote(id, true); // 50 → tổng 100 = quorum

        vm.warp(block.timestamp + PERIOD);
        gov.execute(id);
        assertEq(recipient.balance, AMOUNT);
    }

    function test_Execute_Rejected_WhenMajorityAgainst() public {
        uint256 id = _propose();
        vm.prank(alice);
        gov.vote(id, false); // 400 against
        vm.prank(bob);
        gov.vote(id, true); // 300 for

        vm.warp(block.timestamp + PERIOD);
        vm.expectEmit(true, false, false, true);
        emit ProposalRejected(id, 300 ether, 400 ether);
        gov.execute(id);

        assertEq(recipient.balance, 0);
        assertEq(address(treasury).balance, 100 ether);
        assertTrue(gov.getProposal(id).finalized);
    }

    function test_Execute_Rejected_WhenTie() public {
        uint256 id = _propose();
        vm.prank(dave);
        gov.vote(id, true); // 50
        vm.prank(eve);
        gov.vote(id, false); // 50

        vm.warp(block.timestamp + PERIOD);
        vm.expectEmit(true, false, false, true);
        emit ProposalRejected(id, 50 ether, 50 ether);
        gov.execute(id);
        assertEq(recipient.balance, 0);
    }

    function test_Execute_RevertWhenAlreadyExecuted() public {
        uint256 id = _propose();
        vm.prank(alice);
        gov.vote(id, true);
        vm.warp(block.timestamp + PERIOD);
        gov.execute(id);

        vm.expectRevert(Governance.AlreadyFinalized.selector);
        gov.execute(id);
        assertEq(recipient.balance, AMOUNT); // không giải ngân lần 2
    }

    function test_Execute_RevertWhenAlreadyRejected() public {
        uint256 id = _propose();
        vm.prank(alice);
        gov.vote(id, false);
        vm.warp(block.timestamp + PERIOD);
        gov.execute(id);

        vm.expectRevert(Governance.AlreadyFinalized.selector);
        gov.execute(id);
    }

    function test_Execute_RevertWhenProposalNotFound() public {
        vm.expectRevert(abi.encodeWithSelector(Governance.ProposalNotFound.selector, 42));
        gov.execute(42);
    }

    function test_Execute_RevertWhenTreasuryInsufficient() public {
        vm.prank(alice);
        uint256 id = gov.propose(recipient, 500 ether, "too much");
        vm.prank(alice);
        gov.vote(id, true);

        vm.warp(block.timestamp + PERIOD);
        vm.expectRevert(abi.encodeWithSelector(CommunityTreasury.InsufficientBalance.selector, 100 ether, 500 ether));
        gov.execute(id);

        // revert → proposal chưa finalized, có thể execute lại sau khi treasury được nạp
        assertFalse(gov.getProposal(id).finalized);
        vm.deal(address(treasury), 600 ether);
        gov.execute(id);
        assertEq(recipient.balance, 500 ether);
    }

    function test_Execute_RevertWhenRecipientRejectsEth() public {
        RejectingReceiver bad = new RejectingReceiver();
        vm.prank(alice);
        uint256 id = gov.propose(payable(address(bad)), AMOUNT, "bad recipient");
        vm.prank(alice);
        gov.vote(id, true);

        vm.warp(block.timestamp + PERIOD);
        vm.expectRevert(CommunityTreasury.TransferFailed.selector);
        gov.execute(id);
        assertFalse(gov.getProposal(id).finalized);
    }

    function test_QuorumFixedAtProposalCreation() public {
        uint256 id = _propose(); // quorum = 100 ECO

        vm.prank(owner);
        gov.setQuorumBps(9000); // đổi sau khi tạo → không ảnh hưởng proposal cũ

        vm.prank(alice);
        gov.vote(id, true);
        vm.warp(block.timestamp + PERIOD);
        gov.execute(id);
        assertEq(recipient.balance, AMOUNT);
    }

    // ───────── Fuzz ─────────

    function testFuzz_ExecuteOutcomeMatchesVotes(bool aliceFor, bool bobFor, bool carolFor) public {
        uint256 id = _propose();
        vm.prank(alice);
        gov.vote(id, aliceFor);
        vm.prank(bob);
        gov.vote(id, bobFor);
        vm.prank(carol);
        gov.vote(id, carolFor);

        uint256 f = (aliceFor ? 400 ether : 0) + (bobFor ? 300 ether : 0) + (carolFor ? 200 ether : 0);
        uint256 a = 900 ether - f;

        vm.warp(block.timestamp + PERIOD);
        gov.execute(id);

        assertEq(recipient.balance, f > a ? AMOUNT : 0);
    }
}
